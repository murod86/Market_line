import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import session from "express-session";
import { pool } from "./db";
import { Store } from "express-session";

class PgSessionStore extends Store {
  private pruneInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    super();
    this.setupTable().catch(console.error);
    this.pruneInterval = setInterval(() => this.pruneSessions(), 15 * 60 * 1000);
  }

  private async setupTable() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "session" (
        "sid" varchar NOT NULL COLLATE "default",
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL,
        CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
      ) WITH (OIDS=FALSE);
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "global_settings" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "key" varchar(255) NOT NULL UNIQUE,
        "value" text NOT NULL,
        "updated_at" timestamp DEFAULT now()
      );
    `);
    const migrations = [
      `ALTER TABLE sales ADD COLUMN IF NOT EXISTS dealer_id varchar REFERENCES dealers(id)`,
      `ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS dealer_id varchar REFERENCES dealers(id)`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS dealer_id varchar REFERENCES dealers(id)`,
      `ALTER TABLE dealer_customers ADD COLUMN IF NOT EXISTS password varchar(255)`,
      `ALTER TABLE dealer_customers ADD COLUMN IF NOT EXISTS address text`,
      `ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS cost_price decimal(12,2) NOT NULL DEFAULT 0`,
      `CREATE TABLE IF NOT EXISTS expenses (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
        tenant_id varchar REFERENCES tenants(id),
        title text NOT NULL,
        amount decimal(12,2) NOT NULL,
        category text NOT NULL DEFAULT 'boshqa',
        notes text,
        created_at timestamp NOT NULL DEFAULT now()
      )`,
      `UPDATE plans SET allowed_modules = allowed_modules || '["expenses"]'::jsonb WHERE NOT allowed_modules::text LIKE '%expenses%'`,
      `UPDATE sale_items si SET cost_price = p.cost_price FROM products p WHERE si.product_id = p.id AND si.cost_price = 0 AND p.cost_price > 0`,
      `ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS returned_qty decimal(12,2) NOT NULL DEFAULT 0`,
      `ALTER TABLE dealer_transactions ADD COLUMN IF NOT EXISTS sale_group_id varchar`,
      `ALTER TABLE sale_items ALTER COLUMN quantity TYPE double precision`,
      `ALTER TABLE delivery_items ALTER COLUMN quantity TYPE double precision`,
      `ALTER TABLE dealer_inventory ALTER COLUMN quantity TYPE double precision`,
      `ALTER TABLE dealer_transactions ALTER COLUMN quantity TYPE double precision`,
      `ALTER TABLE products ALTER COLUMN stock TYPE double precision`,
      `ALTER TABLE purchase_items ALTER COLUMN quantity TYPE double precision`,
    ];
    for (const m of migrations) {
      try { await pool.query(m); } catch {}
    }
  }

  private async pruneSessions() {
    try { await pool.query(`DELETE FROM "session" WHERE "expire" < NOW()`); } catch {}
  }

  get(sid: string, callback: (err?: any, session?: session.SessionData | null) => void) {
    pool.query(`SELECT "sess" FROM "session" WHERE "sid" = $1 AND "expire" > NOW()`, [sid])
      .then(result => callback(null, result.rows.length ? result.rows[0].sess : null))
      .catch(err => callback(err));
  }

  set(sid: string, sessionData: session.SessionData, callback?: (err?: any) => void) {
    const maxAge = sessionData.cookie?.maxAge || 86400000;
    const expire = new Date(Date.now() + maxAge);
    pool.query(
      `INSERT INTO "session" ("sid", "sess", "expire") VALUES ($1, $2, $3)
       ON CONFLICT ("sid") DO UPDATE SET "sess" = $2, "expire" = $3`,
      [sid, JSON.stringify(sessionData), expire]
    )
      .then(() => callback?.())
      .catch(err => callback?.(err));
  }

  destroy(sid: string, callback?: (err?: any) => void) {
    pool.query(`DELETE FROM "session" WHERE "sid" = $1`, [sid])
      .then(() => callback?.())
      .catch(err => callback?.(err));
  }

  touch(sid: string, sessionData: session.SessionData, callback?: (err?: any) => void) {
    const maxAge = sessionData.cookie?.maxAge || 86400000;
    const expire = new Date(Date.now() + maxAge);
    pool.query(`UPDATE "session" SET "expire" = $1 WHERE "sid" = $2`, [expire, sid])
      .then(() => callback?.())
      .catch(err => callback?.(err));
  }
}

const app = express();
app.set("trust proxy", 1);
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

declare module "express-session" {
  interface SessionData {
    tenantId?: string;
    tenantName?: string;
    ownerId?: string;
    customerId?: string;
    customerName?: string;
    dealerId?: string;
    dealerName?: string;
    superAdmin?: boolean;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

app.use(
  session({
    store: new PgSessionStore(),
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    },
  })
);

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const { seedDatabase } = await import("./seed");
  await seedDatabase();
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port} [build-v2]`);
    },
  );
})();
