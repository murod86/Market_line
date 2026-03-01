import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { storage } from "./storage";
import { db, pool } from "./db";
import { products, customers, sales, saleItems, deliveries, purchases, purchaseItems, tenants } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import {
  insertRoleSchema, insertEmployeeSchema, insertCategorySchema,
  insertProductSchema, insertCustomerSchema, insertDeliverySchema,
  insertSupplierSchema, insertDealerSchema,
} from "@shared/schema";
import { createHash } from "crypto";
import multer from "multer";
import path from "path";
import { seedTenantData } from "./seed";

const uploadStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, "uploads/"),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});
const upload = multer({
  storage: uploadStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
});

function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

function stripPassword(employee: any) {
  const { password, ...rest } = employee;
  return rest;
}

const otpStore = new Map<string, { code: string; expiry: number; verified?: boolean }>();

function generateOTP(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

async function getTelegramBotToken(tenantId: string): Promise<string | null> {
  const setting = await storage.getSetting("telegram_bot_token", tenantId);
  if (setting?.value && setting.value.trim() !== "") return setting.value.trim();
  return null;
}

async function getGlobalBotToken(): Promise<string | null> {
  return process.env.SUPER_ADMIN_TELEGRAM_BOT_TOKEN?.trim() || null;
}

async function getGlobalImageChannel(): Promise<string | null> {
  const setting = await storage.getGlobalSetting("global_image_channel");
  return setting?.value?.trim() || null;
}

async function sendTelegramMessage(chatId: string, text: string, token: string): Promise<boolean> {
  if (!token) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });
    const data = await res.json() as any;
    return data.ok === true;
  } catch {
    return false;
  }
}

async function requireTenant(req: Request, res: Response, next: NextFunction) {
  if (!req.session.tenantId || !req.session.ownerId) {
    return res.status(401).json({ message: "Tizimga kirilmagan" });
  }
  const tenant = await storage.getTenant(req.session.tenantId);
  if (!tenant) {
    req.session.destroy(() => {});
    return res.status(401).json({ message: "Do'kon o'chirilgan" });
  }
  if (!tenant.active) {
    req.session.destroy(() => {});
    return res.status(403).json({ message: "Do'kon nofaol holatda" });
  }
  next();
}

function verifyTenant(resource: { tenantId?: string | null } | undefined, tenantId: string): boolean {
  return !!resource && resource.tenantId === tenantId;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.use("/uploads", (await import("express")).default.static("uploads"));

  app.post("/api/upload", upload.single("image"), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "Rasm yuklanmadi" });
    }

    const tenantId = req.session?.tenantId;
    if (!tenantId) {
      return res.json({ url: `/uploads/${req.file.filename}` });
    }

    try {
      let botToken = await getTelegramBotToken(tenantId);
      const channelSetting = await storage.getSetting("telegram_image_channel", tenantId);
      let channelId = channelSetting?.value?.trim() || "";

      if (!botToken || !channelId) {
        const globalBot = await getGlobalBotToken();
        const globalChannel = await getGlobalImageChannel();
        if (globalBot && globalChannel) {
          botToken = globalBot;
          channelId = globalChannel;
        }
      }

      if (botToken && channelId) {
        const fs = await import("fs");
        const FormData = (await import("form-data")).default;
        const formData = new FormData();
        formData.append("chat_id", channelId);
        formData.append("photo", fs.createReadStream(req.file.path), req.file.originalname);

        const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
          method: "POST",
          body: formData as any,
          headers: formData.getHeaders(),
        });
        const tgData = await tgRes.json() as any;

        if (tgData.ok && tgData.result?.photo) {
          const photo = tgData.result.photo;
          const largest = photo[photo.length - 1];
          const fileId = largest.file_id;

          try { fs.unlinkSync(req.file.path); } catch {}

          const usedGlobal = botToken === (await getGlobalBotToken());
          return res.json({ url: `/api/tg-image/${usedGlobal ? "__global__" : tenantId}/${fileId}` });
        }
      }
    } catch (err) {
      console.error("Telegram upload error:", err);
    }

    res.json({ url: `/uploads/${req.file.filename}` });
  });

  app.get("/api/tg-image/:tenantId/:fileId", async (req, res) => {
    try {
      const { tenantId, fileId } = req.params;
      let botToken: string | null = null;
      if (tenantId === "__global__") {
        botToken = await getGlobalBotToken();
      } else {
        botToken = await getTelegramBotToken(tenantId);
        if (!botToken) botToken = await getGlobalBotToken();
      }
      if (!botToken) return res.status(404).send("Bot token topilmadi");

      const fileRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
      const fileData = await fileRes.json() as any;
      if (!fileData.ok) return res.status(404).send("Fayl topilmadi");

      const filePath = fileData.result.file_path;
      const imageRes = await fetch(`https://api.telegram.org/file/bot${botToken}/${filePath}`);

      res.set("Content-Type", imageRes.headers.get("content-type") || "image/jpeg");
      res.set("Cache-Control", "public, max-age=86400");
      const buffer = Buffer.from(await imageRes.arrayBuffer());
      res.send(buffer);
    } catch {
      res.status(500).send("Rasm yuklanmadi");
    }
  });

  // ===== TENANT AUTH =====
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { name, ownerName, phone, password } = req.body;
      if (!name || !ownerName || !phone || !password) {
        return res.status(400).json({ message: "Barcha maydonlar majburiy" });
      }
      const existing = await storage.getTenantByPhone(phone);
      if (existing) {
        return res.status(400).json({ message: "Bu telefon raqam allaqachon ro'yxatdan o'tgan" });
      }
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 14);
      const tenant = await storage.createTenant({
        name,
        ownerName,
        phone,
        password: hashPassword(password),
        plan: "free",
        trialEndsAt: trialEnd,
        active: true,
      });
      await storage.upsertSetting("company_name", name, tenant.id);
      await storage.upsertSetting("currency", "UZS", tenant.id);
      await storage.upsertSetting("telegram_bot_token", "", tenant.id);
      await storage.upsertSetting("telegram_chat_id", "", tenant.id);
      await seedTenantData(tenant.id);
      req.session.tenantId = tenant.id;
      req.session.tenantName = tenant.name;
      req.session.ownerId = tenant.id;
      req.session.save((err) => {
        if (err) return res.status(500).json({ message: "Session saqlashda xatolik" });
        const { password: _, ...safe } = tenant;
        res.json(safe);
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { phone, password } = req.body;
      if (!phone || !password) {
        return res.status(400).json({ message: "Telefon va parol majburiy" });
      }
      const tenant = await storage.getTenantByPhone(phone);
      if (!tenant) {
        return res.status(401).json({ message: "Telefon raqam yoki parol noto'g'ri" });
      }
      if (tenant.password !== hashPassword(password)) {
        return res.status(401).json({ message: "Telefon raqam yoki parol noto'g'ri" });
      }
      if (!tenant.active) {
        return res.status(403).json({ message: "Hisob nofaol" });
      }
      req.session.tenantId = tenant.id;
      req.session.tenantName = tenant.name;
      req.session.ownerId = tenant.id;
      req.session.save((err) => {
        if (err) return res.status(500).json({ message: "Session saqlashda xatolik" });
        const { password: _, ...safe } = tenant;
        res.json(safe);
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.tenantId || !req.session.ownerId) {
      return res.status(401).json({ message: "Tizimga kirilmagan" });
    }
    const tenant = await storage.getTenant(req.session.tenantId);
    if (!tenant) {
      req.session.destroy(() => {});
      return res.status(401).json({ message: "Do'kon o'chirilgan" });
    }
    if (!tenant.active) {
      req.session.destroy(() => {});
      return res.status(403).json({ message: "Do'kon nofaol holatda" });
    }
    const { password: _, ...safe } = tenant;

    const allPlans = await storage.getPlans();
    const currentPlan = allPlans.find(p => p.slug === tenant.plan);

    const allModuleKeys = ["pos","warehouse","categories","products","customers","deliveries","suppliers","purchases","orders","dealers","roles","employees","settings"];

    const hasTrial = tenant.trialEndsAt != null;
    const isTrialActive = hasTrial && new Date(tenant.trialEndsAt!) > new Date();
    const trialExpired = hasTrial && new Date(tenant.trialEndsAt!) <= new Date();

    let allowedModules: string[] = allModuleKeys;

    if (currentPlan) {
      const planModules = currentPlan.allowedModules as string[];
      if (planModules && planModules.length > 0) {
        allowedModules = planModules;
      } else {
        allowedModules = allModuleKeys;
      }
    }

    if (isTrialActive) {
      allowedModules = allModuleKeys;
    }

    if (trialExpired && currentPlan) {
      const planModules = currentPlan.allowedModules as string[];
      if (planModules && planModules.length > 0) {
        allowedModules = planModules;
      } else {
        allowedModules = allModuleKeys;
      }
    }

    res.json({
      ...safe,
      planDetails: currentPlan ? { name: currentPlan.name, price: currentPlan.price, maxProducts: currentPlan.maxProducts, maxEmployees: currentPlan.maxEmployees } : null,
      allowedModules,
      isTrialActive: !!isTrialActive,
      trialExpired: !!trialExpired,
      trialDaysLeft: isTrialActive && tenant.trialEndsAt ? Math.ceil((new Date(tenant.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0,
    });
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });

  // ===== ROLES =====
  app.get("/api/roles", requireTenant, async (req, res) => {
    const data = await storage.getRoles(req.session.tenantId!);
    res.json(data);
  });

  app.post("/api/roles", requireTenant, async (req, res) => {
    try {
      const parsed = insertRoleSchema.parse({ ...req.body, tenantId: req.session.tenantId });
      const role = await storage.createRole(parsed);
      res.json(role);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/roles/:id", requireTenant, async (req, res) => {
    const existing = await storage.getRole(req.params.id);
    if (!verifyTenant(existing, req.session.tenantId!)) return res.status(404).json({ message: "Role not found" });
    const role = await storage.updateRole(req.params.id, req.body);
    res.json(role);
  });

  app.delete("/api/roles/:id", requireTenant, async (req, res) => {
    const existing = await storage.getRole(req.params.id);
    if (!verifyTenant(existing, req.session.tenantId!)) return res.status(404).json({ message: "Role not found" });
    await storage.deleteRole(req.params.id);
    res.json({ success: true });
  });

  // ===== EMPLOYEES =====
  app.get("/api/employees", requireTenant, async (req, res) => {
    const data = await storage.getEmployees(req.session.tenantId!);
    res.json(data.map(stripPassword));
  });

  app.post("/api/employees", requireTenant, async (req, res) => {
    try {
      const data = { ...req.body, password: hashPassword(req.body.password), tenantId: req.session.tenantId };
      const parsed = insertEmployeeSchema.parse(data);
      const employee = await storage.createEmployee(parsed);
      res.json(stripPassword(employee));
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/employees/:id", requireTenant, async (req, res) => {
    try {
      const existing = await storage.getEmployee(req.params.id);
      if (!verifyTenant(existing, req.session.tenantId!)) return res.status(404).json({ message: "Employee not found" });
      const updateData = { ...req.body };
      if (updateData.password) {
        updateData.password = hashPassword(updateData.password);
      }
      const employee = await storage.updateEmployee(req.params.id, updateData);
      if (!employee) return res.status(404).json({ message: "Employee not found" });
      res.json(stripPassword(employee));
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // ===== CATEGORIES =====
  app.get("/api/categories", requireTenant, async (req, res) => {
    const data = await storage.getCategories(req.session.tenantId!);
    res.json(data);
  });

  app.post("/api/categories", requireTenant, async (req, res) => {
    try {
      const parsed = insertCategorySchema.parse({ ...req.body, tenantId: req.session.tenantId });
      const category = await storage.createCategory(parsed);
      res.json(category);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/categories/:id", requireTenant, async (req, res) => {
    const existing = await storage.getCategories(req.session.tenantId!);
    if (!existing.find(c => c.id === req.params.id)) return res.status(404).json({ message: "Category not found" });
    const category = await storage.updateCategory(req.params.id, req.body);
    res.json(category);
  });

  app.delete("/api/categories/:id", requireTenant, async (req, res) => {
    const existing = await storage.getCategories(req.session.tenantId!);
    if (!existing.find(c => c.id === req.params.id)) return res.status(404).json({ message: "Category not found" });
    await storage.deleteCategory(req.params.id);
    res.json({ success: true });
  });

  // ===== PRODUCTS =====
  app.get("/api/products", requireTenant, async (req, res) => {
    const data = await storage.getProducts(req.session.tenantId!);
    res.json(data);
  });

  app.get("/api/products/:id", requireTenant, async (req, res) => {
    const product = await storage.getProduct(req.params.id);
    if (!verifyTenant(product, req.session.tenantId!)) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  });

  app.post("/api/products", requireTenant, async (req, res) => {
    try {
      const parsed = insertProductSchema.parse({ ...req.body, tenantId: req.session.tenantId });
      const product = await storage.createProduct(parsed);
      res.json(product);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/products/:id", requireTenant, async (req, res) => {
    const existing = await storage.getProduct(req.params.id);
    if (!verifyTenant(existing, req.session.tenantId!)) return res.status(404).json({ message: "Product not found" });
    const product = await storage.updateProduct(req.params.id, req.body);
    res.json(product);
  });

  // ===== CUSTOMERS =====
  app.get("/api/customers", requireTenant, async (req, res) => {
    const data = await storage.getCustomers(req.session.tenantId!);
    res.json(data.map(({ password: _, ...c }) => c));
  });

  app.get("/api/customers/:id", requireTenant, async (req, res) => {
    const customer = await storage.getCustomer(req.params.id);
    if (!verifyTenant(customer, req.session.tenantId!)) return res.status(404).json({ message: "Customer not found" });
    const { password: _, ...safe } = customer;
    res.json(safe);
  });

  app.post("/api/customers", requireTenant, async (req, res) => {
    try {
      const parsed = insertCustomerSchema.parse({ ...req.body, tenantId: req.session.tenantId });
      if (parsed.password) {
        parsed.password = hashPassword(parsed.password);
      }
      const customer = await storage.createCustomer(parsed);
      const { password: _, ...safe } = customer;
      res.json(safe);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/customers/:id", requireTenant, async (req, res) => {
    const existing = await storage.getCustomer(req.params.id);
    if (!verifyTenant(existing, req.session.tenantId!)) return res.status(404).json({ message: "Customer not found" });
    const updateData = { ...req.body };
    if (updateData.password) {
      updateData.password = hashPassword(updateData.password);
    }
    const customer = await storage.updateCustomer(req.params.id, updateData);
    if (!customer) return res.status(404).json({ message: "Customer not found" });
    const { password: _, ...safe } = customer;
    res.json(safe);
  });

  // ===== SALES (POS) =====
  app.get("/api/sales", requireTenant, async (req, res) => {
    const data = await storage.getSales(req.session.tenantId!);
    res.json(data);
  });

  app.get("/api/sales/:id", requireTenant, async (req, res) => {
    const sale = await storage.getSale(req.params.id);
    if (!verifyTenant(sale, req.session.tenantId!)) return res.status(404).json({ message: "Sale not found" });
    const items = await storage.getSaleItems(req.params.id);
    res.json({ ...sale, items });
  });

  app.post("/api/sales", requireTenant, async (req, res) => {
    try {
      const { items, customerId, discount, paidAmount, paymentType, employeeId } = req.body;
      const tenantId = req.session.tenantId!;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "Items are required" });
      }

      const result = await db.transaction(async (tx) => {
        let totalAmount = 0;
        for (const item of items) {
          totalAmount += item.quantity * item.price;
        }
        const finalTotal = totalAmount - (discount || 0);

        const [sale] = await tx.insert(sales).values({
          tenantId,
          customerId: customerId || null,
          employeeId: employeeId || null,
          totalAmount: finalTotal.toFixed(2),
          discount: (discount || 0).toFixed(2),
          paidAmount: (paidAmount || finalTotal).toFixed(2),
          paymentType: paymentType || "cash",
          status: "completed",
        }).returning();

        for (const item of items) {
          await tx.insert(saleItems).values({
            saleId: sale.id,
            productId: item.productId,
            quantity: item.quantity,
            price: Number(item.price).toFixed(2),
            total: (item.quantity * item.price).toFixed(2),
          });

          const [product] = await tx.select().from(products).where(eq(products.id, item.productId));
          if (product) {
            await tx.update(products).set({
              stock: product.stock - item.quantity,
            }).where(eq(products.id, item.productId));
          }
        }

        if (customerId && paymentType === "debt") {
          const [customer] = await tx.select().from(customers).where(eq(customers.id, customerId));
          if (customer) {
            const debtAmount = finalTotal - (paidAmount || 0);
            const newDebt = Number(customer.debt) + debtAmount;
            await tx.update(customers).set({
              debt: newDebt.toFixed(2),
            }).where(eq(customers.id, customerId));
          }
        }

        return sale;
      });

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== DELIVERIES =====
  app.get("/api/deliveries", requireTenant, async (req, res) => {
    const data = await storage.getDeliveries(req.session.tenantId!);
    res.json(data);
  });

  app.get("/api/deliveries/:id/items", requireTenant, async (req, res) => {
    const delivery = await storage.getDelivery(req.params.id);
    if (!verifyTenant(delivery, req.session.tenantId!)) return res.status(404).json({ message: "Yetkazib berish topilmadi" });
    if (delivery.saleId) {
      const sale = await storage.getSale(delivery.saleId);
      const items = await storage.getSaleItems(delivery.saleId);
      const allProducts = await storage.getProducts(req.session.tenantId!);
      const enrichedItems = items.map((item) => {
        const product = allProducts.find((p) => p.id === item.productId);
        return { ...item, productName: product?.name, productImage: product?.imageUrl };
      });
      res.json({ sale, items: enrichedItems });
    } else {
      const items = await storage.getDeliveryItems(delivery.id);
      const allProducts = await storage.getProducts(req.session.tenantId!);
      const enrichedItems = items.map((item) => {
        const product = allProducts.find((p) => p.id === item.productId);
        return { ...item, productName: product?.name || "Noma'lum", productImage: product?.imageUrl };
      });
      const totalAmount = items.reduce((sum, i) => sum + Number(i.total), 0);
      res.json({ sale: { totalAmount: totalAmount.toFixed(2) }, items: enrichedItems });
    }
  });

  app.post("/api/deliveries", requireTenant, async (req, res) => {
    try {
      const parsed = insertDeliverySchema.parse({ ...req.body, tenantId: req.session.tenantId });
      const delivery = await storage.createDelivery(parsed);
      res.json(delivery);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/deliveries/pickup", requireTenant, async (req, res) => {
    try {
      const tenantId = req.session.tenantId!;
      const pickupSchema = z.object({
        customerName: z.string().optional(),
        customerPhone: z.string().optional().nullable(),
        address: z.string().min(1, "Manzil kiritilmagan"),
        notes: z.string().optional().nullable(),
        items: z.array(z.object({
          productId: z.string().min(1),
          quantity: z.number().int().positive("Miqdor musbat bo'lishi kerak"),
        })).min(1, "Mahsulotlar tanlanmagan"),
      });
      const parsed = pickupSchema.parse(req.body);
      const { customerName, customerPhone, address, notes, items } = parsed;
      for (const item of items) {
        const product = await storage.getProduct(item.productId);
        if (!product) {
          return res.status(400).json({ message: `Mahsulot topilmadi` });
        }
        if (product.stock < item.quantity) {
          return res.status(400).json({ message: `${product.name}: omborda yetarli emas (${product.stock} ${product.unit} bor)` });
        }
      }
      const delivery = await storage.createDelivery({
        tenantId,
        saleId: null,
        customerId: null,
        address,
        status: "in_transit",
        notes: notes || null,
        customerName: customerName || "Noma'lum mijoz",
        customerPhone: customerPhone || null,
      });
      for (const item of items) {
        const product = await storage.getProduct(item.productId);
        if (!product) continue;
        const total = Number(product.price) * item.quantity;
        await storage.createDeliveryItem({
          deliveryId: delivery.id,
          productId: item.productId,
          quantity: item.quantity,
          price: product.price,
          total: total.toFixed(2),
        });
        await storage.updateProduct(product.id, { stock: product.stock - item.quantity });
      }
      res.json(delivery);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/deliveries/:id", requireTenant, async (req, res) => {
    const existing = await storage.getDelivery(req.params.id);
    if (!verifyTenant(existing, req.session.tenantId!)) return res.status(404).json({ message: "Delivery not found" });
    const delivery = await storage.updateDelivery(req.params.id, req.body);
    if (req.body.status === "delivered" && existing.saleId) {
      const sale = await storage.getSale(existing.saleId);
      if (sale && sale.status === "delivering") {
        await storage.updateSale(sale.id, { status: "shipped" } as any);
      }
    }
    res.json(delivery);
  });

  // ===== SUPPLIERS =====
  app.get("/api/suppliers", requireTenant, async (req, res) => {
    const data = await storage.getSuppliers(req.session.tenantId!);
    res.json(data);
  });

  app.post("/api/suppliers", requireTenant, async (req, res) => {
    try {
      const parsed = insertSupplierSchema.parse({ ...req.body, tenantId: req.session.tenantId });
      const supplier = await storage.createSupplier(parsed);
      res.json(supplier);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/suppliers/:id", requireTenant, async (req, res) => {
    const existing = await storage.getSupplier(req.params.id);
    if (!verifyTenant(existing, req.session.tenantId!)) return res.status(404).json({ message: "Ta'minotchi topilmadi" });
    const supplier = await storage.updateSupplier(req.params.id, req.body);
    res.json(supplier);
  });

  // ===== DEALERS (DILLERLAR) =====
  app.get("/api/dealers", requireTenant, async (req, res) => {
    const data = await storage.getDealers(req.session.tenantId!);
    res.json(data);
  });

  app.post("/api/dealers", requireTenant, async (req, res) => {
    try {
      const data = { ...req.body, tenantId: req.session.tenantId };
      if (data.password) {
        data.password = hashPassword(data.password);
      }
      const parsed = insertDealerSchema.parse(data);
      const dealer = await storage.createDealer(parsed);
      const { password: _, ...safe } = dealer;
      res.json(safe);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/dealers/:id", requireTenant, async (req, res) => {
    const existing = await storage.getDealer(req.params.id);
    if (!verifyTenant(existing, req.session.tenantId!)) return res.status(404).json({ message: "Diller topilmadi" });
    const { name, phone, vehicleInfo, active, password } = req.body;
    const updateData: any = { name, phone, vehicleInfo, active };
    if (password) {
      updateData.password = hashPassword(password);
    }
    const dealer = await storage.updateDealer(req.params.id, updateData);
    if (dealer) {
      const { password: _, ...safe } = dealer;
      res.json(safe);
    } else {
      res.json(dealer);
    }
  });

  app.delete("/api/dealers/:id", requireTenant, async (req, res) => {
    try {
      const dealer = await storage.getDealer(req.params.id);
      if (!verifyTenant(dealer, req.session.tenantId!)) return res.status(404).json({ message: "Diller topilmadi" });
      await storage.deleteDealer(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/dealers/:id/inventory", requireTenant, async (req, res) => {
    const dealer = await storage.getDealer(req.params.id);
    if (!verifyTenant(dealer, req.session.tenantId!)) return res.status(404).json({ message: "Diller topilmadi" });
    const inventory = await storage.getDealerInventory(req.params.id);
    const allProducts = await storage.getProducts(req.session.tenantId!);
    const enriched = inventory.filter(i => i.quantity > 0).map((item) => {
      const product = allProducts.find((p) => p.id === item.productId);
      return {
        ...item,
        productName: product?.name || "Noma'lum",
        productUnit: product?.unit || "dona",
        productPrice: product?.price || "0",
        productImage: product?.imageUrl || null,
        boxQuantity: product?.boxQuantity || 1,
      };
    });
    res.json(enriched);
  });

  app.get("/api/dealers/:id/transactions", requireTenant, async (req, res) => {
    const dealer = await storage.getDealer(req.params.id);
    if (!verifyTenant(dealer, req.session.tenantId!)) return res.status(404).json({ message: "Diller topilmadi" });
    const transactions = await storage.getDealerTransactions(req.params.id);
    const allProducts = await storage.getProducts(req.session.tenantId!);
    const enriched = transactions.map((tx) => {
      const product = allProducts.find((p) => p.id === tx.productId);
      return { ...tx, productName: product?.name || "Noma'lum", productUnit: product?.unit || "dona" };
    });
    res.json(enriched);
  });

  app.post("/api/dealers/:id/load", requireTenant, async (req, res) => {
    try {
      const tenantId = req.session.tenantId!;
      const dealer = await storage.getDealer(req.params.id);
      if (!verifyTenant(dealer, tenantId)) return res.status(404).json({ message: "Diller topilmadi" });

      const loadSchema = z.object({
        items: z.array(z.object({
          productId: z.string().min(1),
          quantity: z.number().int().positive(),
        })).min(1, "Mahsulotlar tanlanmagan"),
        notes: z.string().optional().nullable(),
        paymentType: z.enum(["debt", "cash", "partial"]).default("debt"),
        paidAmount: z.number().min(0).default(0),
      });
      const { items, notes, paymentType, paidAmount } = loadSchema.parse(req.body);

      for (const item of items) {
        const product = await storage.getProduct(item.productId);
        if (!product || product.tenantId !== tenantId) {
          return res.status(400).json({ message: "Mahsulot topilmadi" });
        }
        if (product.stock < item.quantity) {
          return res.status(400).json({ message: `${product.name}: omborda yetarli emas (${product.stock} ${product.unit} bor)` });
        }
      }

      for (const item of items) {
        const product = await storage.getProduct(item.productId);
        if (!product) continue;
        await storage.updateProduct(item.productId, { stock: product.stock - item.quantity });
        const existing = await storage.getDealerInventoryItem(req.params.id, item.productId);
        const newQty = (existing?.quantity || 0) + item.quantity;
        await storage.upsertDealerInventory(req.params.id, item.productId, newQty, tenantId);
        await storage.createDealerTransaction({
          tenantId,
          dealerId: req.params.id,
          type: "load",
          productId: item.productId,
          quantity: item.quantity,
          price: product.price,
          total: (Number(product.price) * item.quantity).toFixed(2),
          notes: notes || null,
        });
      }

      let totalLoaded = 0;
      for (const item of items) {
        const product = await storage.getProduct(item.productId);
        if (product) totalLoaded += Number(product.price) * item.quantity;
      }

      if (paymentType === "partial" && paidAmount <= 0) {
        return res.status(400).json({ message: "Qisman to'lovda summa kiritilishi shart" });
      }
      if (paymentType === "partial" && paidAmount >= totalLoaded) {
        return res.status(400).json({ message: "Qisman to'lov jami summadan kam bo'lishi kerak" });
      }

      const debtAmount = paymentType === "cash" ? 0 : paymentType === "debt" ? totalLoaded : Math.max(0, totalLoaded - paidAmount);
      const currentDebt = Number(dealer!.debt);
      await storage.updateDealer(req.params.id, { debt: (currentDebt + debtAmount).toFixed(2) });

      if (paymentType === "cash" || paymentType === "partial") {
        const paid = paymentType === "cash" ? totalLoaded : paidAmount;
        await storage.createPayment({
          tenantId,
          dealerId: req.params.id,
          amount: paid.toFixed(2),
          method: "cash",
          type: "dealer",
          notes: `Mahsulot olishda to'lov (${paymentType === "cash" ? "to'liq naqd" : "qisman"})`,
        });
      }

      res.json({ message: "Mahsulotlar dillerga yuklandi", totalLoaded, debtAmount });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/dealers/:id/sell", requireTenant, async (req, res) => {
    try {
      const tenantId = req.session.tenantId!;
      const dealer = await storage.getDealer(req.params.id);
      if (!verifyTenant(dealer, tenantId)) return res.status(404).json({ message: "Diller topilmadi" });

      const sellSchema = z.object({
        items: z.array(z.object({
          productId: z.string().min(1),
          quantity: z.number().int().positive(),
        })).min(1),
        customerName: z.string().optional(),
        customerPhone: z.string().optional().nullable(),
        notes: z.string().optional().nullable(),
      });
      const { items, customerName, customerPhone, notes } = sellSchema.parse(req.body);

      for (const item of items) {
        const inv = await storage.getDealerInventoryItem(req.params.id, item.productId);
        if (!inv || inv.quantity < item.quantity) {
          const product = await storage.getProduct(item.productId);
          return res.status(400).json({ message: `${product?.name || "Mahsulot"}: dillerda yetarli emas` });
        }
      }

      for (const item of items) {
        const product = await storage.getProduct(item.productId);
        if (!product) continue;
        const inv = await storage.getDealerInventoryItem(req.params.id, item.productId);
        const newQty = (inv?.quantity || 0) - item.quantity;
        await storage.upsertDealerInventory(req.params.id, item.productId, newQty, tenantId);
        await storage.createDealerTransaction({
          tenantId,
          dealerId: req.params.id,
          type: "sell",
          productId: item.productId,
          quantity: item.quantity,
          price: product.price,
          total: (Number(product.price) * item.quantity).toFixed(2),
          customerName: customerName || null,
          customerPhone: customerPhone || null,
          notes: notes || null,
        });
      }

      res.json({ message: "Sotish muvaffaqiyatli" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/dealers/:id/return", requireTenant, async (req, res) => {
    try {
      const tenantId = req.session.tenantId!;
      const dealer = await storage.getDealer(req.params.id);
      if (!verifyTenant(dealer, tenantId)) return res.status(404).json({ message: "Diller topilmadi" });

      const returnSchema = z.object({
        items: z.array(z.object({
          productId: z.string().min(1),
          quantity: z.number().int().positive(),
        })).min(1),
        notes: z.string().optional().nullable(),
      });
      const { items, notes } = returnSchema.parse(req.body);

      for (const item of items) {
        const inv = await storage.getDealerInventoryItem(req.params.id, item.productId);
        if (!inv || inv.quantity < item.quantity) {
          const product = await storage.getProduct(item.productId);
          return res.status(400).json({ message: `${product?.name || "Mahsulot"}: dillerda yetarli emas` });
        }
      }

      for (const item of items) {
        const product = await storage.getProduct(item.productId);
        if (!product) continue;
        const inv = await storage.getDealerInventoryItem(req.params.id, item.productId);
        const newQty = (inv?.quantity || 0) - item.quantity;
        await storage.upsertDealerInventory(req.params.id, item.productId, newQty, tenantId);
        await storage.updateProduct(item.productId, { stock: product.stock + item.quantity });
        await storage.createDealerTransaction({
          tenantId,
          dealerId: req.params.id,
          type: "return",
          productId: item.productId,
          quantity: item.quantity,
          price: product.price,
          total: (Number(product.price) * item.quantity).toFixed(2),
          notes: notes || null,
        });
      }

      let totalReturned = 0;
      for (const item of items) {
        const product = await storage.getProduct(item.productId);
        if (product) totalReturned += Number(product.price) * item.quantity;
      }
      const currentDebt = Number(dealer!.debt);
      await storage.updateDealer(req.params.id, { debt: Math.max(0, currentDebt - totalReturned).toFixed(2) });

      res.json({ message: "Mahsulotlar omborga qaytarildi" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // ===== PAYMENTS (TO'LOVLAR) =====
  app.get("/api/payments", requireTenant, async (req, res) => {
    const { type, entityId } = req.query;
    const data = await storage.getPayments(
      req.session.tenantId!,
      type as string | undefined,
      entityId as string | undefined
    );
    res.json(data);
  });

  app.post("/api/payments/customer", requireTenant, async (req, res) => {
    try {
      const tenantId = req.session.tenantId!;
      const paySchema = z.object({
        customerId: z.string().min(1),
        amount: z.number().positive("Summa musbat bo'lishi kerak"),
        method: z.string().default("cash"),
        notes: z.string().optional().nullable(),
      });
      const { customerId, amount, method, notes } = paySchema.parse(req.body);

      const customer = await storage.getCustomer(customerId);
      if (!customer || customer.tenantId !== tenantId) {
        return res.status(404).json({ message: "Mijoz topilmadi" });
      }

      const currentDebt = Number(customer.debt);
      if (amount > currentDebt) {
        return res.status(400).json({ message: `Qarz summasi ${currentDebt.toFixed(2)} UZS. Bundan ko'p to'lab bo'lmaydi` });
      }

      const newDebt = (currentDebt - amount).toFixed(2);
      await storage.updateCustomer(customerId, { debt: newDebt });
      const payment = await storage.createPayment({
        tenantId,
        type: "customer",
        customerId,
        dealerId: null,
        amount: amount.toFixed(2),
        method,
        notes: notes || null,
      });

      res.json({ payment, newDebt });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/payments/dealer", requireTenant, async (req, res) => {
    try {
      const tenantId = req.session.tenantId!;
      const paySchema = z.object({
        dealerId: z.string().min(1),
        amount: z.number().positive("Summa musbat bo'lishi kerak"),
        method: z.string().default("cash"),
        notes: z.string().optional().nullable(),
      });
      const { dealerId, amount, method, notes } = paySchema.parse(req.body);

      const dealer = await storage.getDealer(dealerId);
      if (!dealer || dealer.tenantId !== tenantId) {
        return res.status(404).json({ message: "Diller topilmadi" });
      }

      const currentDebt = Number(dealer.debt);
      if (amount > currentDebt) {
        return res.status(400).json({ message: `Diller qarzi ${currentDebt.toFixed(2)} UZS. Bundan ko'p to'lab bo'lmaydi` });
      }

      const newDebt = (currentDebt - amount).toFixed(2);
      await storage.updateDealer(dealerId, { debt: newDebt });
      const payment = await storage.createPayment({
        tenantId,
        type: "dealer",
        customerId: null,
        dealerId,
        amount: amount.toFixed(2),
        method,
        notes: notes || null,
      });

      res.json({ payment, newDebt });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // ===== PURCHASES (KIRIM) =====
  app.get("/api/purchases", requireTenant, async (req, res) => {
    const data = await storage.getPurchases(req.session.tenantId!);
    res.json(data);
  });

  app.get("/api/purchases/:id", requireTenant, async (req, res) => {
    const purchase = await storage.getPurchase(req.params.id);
    if (!verifyTenant(purchase, req.session.tenantId!)) return res.status(404).json({ message: "Kirim topilmadi" });
    const items = await storage.getPurchaseItems(req.params.id);
    const allProducts = await storage.getProducts(req.session.tenantId!);
    const enrichedItems = items.map((item) => {
      const product = allProducts.find((p) => p.id === item.productId);
      return { ...item, productName: product?.name, productImage: product?.imageUrl };
    });
    res.json({ ...purchase, items: enrichedItems });
  });

  app.post("/api/purchases", requireTenant, async (req, res) => {
    try {
      const { supplierId, items, paidAmount, notes } = req.body;
      const tenantId = req.session.tenantId!;
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "Mahsulotlar majburiy" });
      }

      for (const item of items) {
        if (!item.productId || typeof item.productId !== "string") {
          return res.status(400).json({ message: "Mahsulot ID noto'g'ri" });
        }
        if (!item.quantity || Number(item.quantity) < 1) {
          return res.status(400).json({ message: "Miqdor musbat son bo'lishi kerak" });
        }
        if (!item.costPrice || Number(item.costPrice) <= 0) {
          return res.status(400).json({ message: "Tan narxi majburiy" });
        }
      }

      const result = await db.transaction(async (tx) => {
        let totalAmount = 0;
        const processedItems = [];

        for (const item of items) {
          const stockQuantity = Math.round(Number(item.quantity));
          const unitCost = Number(item.costPrice);
          const itemTotal = stockQuantity * unitCost;
          totalAmount += itemTotal;
          processedItems.push({ ...item, stockQuantity, unitCost, itemTotal });
        }

        const paid = Number(paidAmount || 0);
        const [purchase] = await tx.insert(purchases).values({
          tenantId,
          supplierId: supplierId || null,
          totalAmount: totalAmount.toFixed(2),
          paidAmount: paid.toFixed(2),
          notes: notes || null,
        }).returning();

        for (const pi of processedItems) {
          await tx.insert(purchaseItems).values({
            purchaseId: purchase.id,
            productId: pi.productId,
            quantity: pi.stockQuantity,
            costPrice: pi.unitCost.toFixed(2),
            total: pi.itemTotal.toFixed(2),
          });

          const [product] = await tx.select().from(products).where(eq(products.id, pi.productId));
          if (product) {
            await tx.update(products).set({
              stock: product.stock + pi.stockQuantity,
              costPrice: pi.unitCost.toFixed(2),
            }).where(eq(products.id, pi.productId));
          }
        }

        return purchase;
      });

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== SETTINGS =====
  app.get("/api/settings", requireTenant, async (req, res) => {
    const data = await storage.getSettings(req.session.tenantId!);
    res.json(data);
  });

  app.post("/api/settings", requireTenant, async (req, res) => {
    const { key, value } = req.body;
    if (!key || value === undefined) {
      return res.status(400).json({ message: "Key and value are required" });
    }
    const setting = await storage.upsertSetting(key, value, req.session.tenantId!);
    res.json(setting);
  });

  app.get("/api/tenants/public", async (_req, res) => {
    try {
      const allTenants = await db.select({
        id: tenants.id,
        name: tenants.name,
      }).from(tenants).where(eq(tenants.active, true));
      res.json(allTenants);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== DEALER PORTAL AUTH =====
  const requireDealer = (req: any, res: any, next: any) => {
    if (!req.session.dealerId) {
      return res.status(401).json({ message: "Tizimga kirilmagan" });
    }
    next();
  };

  app.post("/api/dealer-portal/login", async (req, res) => {
    try {
      const { phone, password, tenantId } = req.body;
      if (!phone || !password) {
        return res.status(400).json({ message: "Telefon va parol majburiy" });
      }
      if (!tenantId) {
        return res.status(400).json({ message: "Do'kon tanlanmagan" });
      }
      const dealer = await storage.getDealerByPhone(phone, tenantId);
      if (!dealer || !dealer.password) {
        return res.status(401).json({ message: "Telefon raqam yoki parol noto'g'ri" });
      }
      if (dealer.password !== hashPassword(password)) {
        return res.status(401).json({ message: "Telefon raqam yoki parol noto'g'ri" });
      }
      if (!dealer.active) {
        return res.status(403).json({ message: "Hisob nofaol" });
      }
      req.session.dealerId = dealer.id;
      req.session.dealerName = dealer.name;
      req.session.tenantId = tenantId;
      req.session.ownerId = undefined;
      req.session.customerId = undefined;
      req.session.customerName = undefined;
      req.session.superAdmin = undefined;
      const { password: _, ...safe } = dealer;
      res.json(safe);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/dealer-portal/me", async (req, res) => {
    if (!req.session.dealerId) {
      return res.status(401).json({ message: "Tizimga kirilmagan" });
    }
    const dealer = await storage.getDealer(req.session.dealerId);
    if (!dealer) return res.status(404).json({ message: "Diller topilmadi" });
    const { password: _, ...safe } = dealer;
    res.json(safe);
  });

  app.post("/api/dealer-portal/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });

  app.get("/api/dealer-portal/inventory", requireDealer, async (req, res) => {
    const dealerId = req.session.dealerId!;
    const tenantId = req.session.tenantId!;
    const inventory = await storage.getDealerInventory(dealerId);
    const allProducts = await storage.getProducts(tenantId);
    const enriched = inventory.filter(i => i.quantity > 0).map((item) => {
      const product = allProducts.find((p) => p.id === item.productId);
      return {
        ...item,
        productName: product?.name || "Noma'lum",
        productUnit: product?.unit || "dona",
        productPrice: product?.price || "0",
        productCostPrice: product?.costPrice || "0",
        productImage: product?.imageUrl || null,
        boxQuantity: product?.boxQuantity || 1,
      };
    });
    res.json(enriched);
  });

  app.get("/api/dealer-portal/transactions", requireDealer, async (req, res) => {
    const dealerId = req.session.dealerId!;
    const tenantId = req.session.tenantId!;
    const transactions = await storage.getDealerTransactions(dealerId);
    const allProducts = await storage.getProducts(tenantId);
    const enriched = transactions.map((tx) => {
      const product = allProducts.find((p) => p.id === tx.productId);
      return { ...tx, productName: product?.name || "Noma'lum", productUnit: product?.unit || "dona" };
    });
    res.json(enriched);
  });

  app.get("/api/dealer-portal/payments", requireDealer, async (req, res) => {
    const dealerId = req.session.dealerId!;
    const payments = await storage.getPayments(req.session.tenantId!);
    const dealerPayments = payments.filter((p: any) => p.dealerId === dealerId);
    res.json(dealerPayments);
  });

  app.post("/api/dealer-portal/sell", requireDealer, async (req, res) => {
    try {
      const dealerId = req.session.dealerId!;
      const tenantId = req.session.tenantId!;
      const dealer = await storage.getDealer(dealerId);
      if (!dealer) return res.status(404).json({ message: "Diller topilmadi" });

      const sellSchema = z.object({
        items: z.array(z.object({
          productId: z.string().min(1),
          quantity: z.number().int().positive(),
          price: z.number().positive(),
        })).min(1, "Mahsulotlar tanlanmagan"),
        customerName: z.string().optional().nullable(),
        customerPhone: z.string().optional().nullable(),
        dealerCustomerId: z.string().optional().nullable(),
        notes: z.string().optional().nullable(),
        paymentType: z.enum(["cash", "debt", "partial"]).default("cash"),
        paidAmount: z.number().min(0).default(0),
      });
      const { items, customerName, customerPhone, dealerCustomerId, notes, paymentType, paidAmount } = sellSchema.parse(req.body);

      let totalAmount = 0;
      for (const item of items) {
        const inv = await storage.getDealerInventoryItem(dealerId, item.productId);
        if (!inv || inv.quantity < item.quantity) {
          return res.status(400).json({ message: "Omborda yetarli mahsulot yo'q" });
        }
        totalAmount += item.price * item.quantity;
      }

      if (paymentType === "partial") {
        if (paidAmount <= 0) return res.status(400).json({ message: "Qisman to'lovda summa kiritilishi shart" });
        if (paidAmount >= totalAmount) return res.status(400).json({ message: "Qisman to'lov jami summadan kam bo'lishi kerak" });
      }

      const paymentLabel = paymentType === "cash" ? "Naqd" : paymentType === "debt" ? "Qarzga" : `Qisman (${paidAmount} UZS)`;
      const noteText = `${paymentLabel} | Mijoz: ${customerName || "Noma'lum"}${customerPhone ? ` (${customerPhone})` : ""}${notes ? ` | ${notes}` : ""}`;

      for (const item of items) {
        const inv = await storage.getDealerInventoryItem(dealerId, item.productId);
        if (!inv) continue;
        await storage.upsertDealerInventory(dealerId, item.productId, inv.quantity - item.quantity, tenantId);
        await storage.createDealerTransaction({
          tenantId,
          dealerId,
          productId: item.productId,
          type: "sell",
          quantity: item.quantity,
          price: String(item.price),
          total: (item.price * item.quantity).toFixed(2),
          customerName: customerName || null,
          customerPhone: customerPhone || null,
          notes: noteText,
        });
      }

      const debtAmount = paymentType === "cash" ? 0 : paymentType === "debt" ? totalAmount : Math.max(0, totalAmount - paidAmount);

      if (debtAmount > 0 && dealerCustomerId) {
        const dc = await storage.getDealerCustomer(dealerCustomerId);
        if (dc && dc.dealerId === dealerId) {
          const newCustomerDebt = Number(dc.debt) + debtAmount;
          await storage.updateDealerCustomer(dc.id, { debt: newCustomerDebt.toFixed(2) } as any);
        }
      }

      res.json({ success: true, totalAmount, debtAmount });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/dealer-portal/deliveries", requireDealer, async (req, res) => {
    try {
      const dealerId = req.session.dealerId!;
      const tenantId = req.session.tenantId!;
      const allDeliveries = await storage.getDeliveries(tenantId);
      const dealerDeliveries = allDeliveries.filter(d => d.dealerId === dealerId);
      const enriched = await Promise.all(dealerDeliveries.map(async (d) => {
        const customer = d.customerId ? await storage.getCustomer(d.customerId) : null;
        let items: any[] = [];
        if (d.saleId) {
          const saleItems = await storage.getSaleItems(d.saleId);
          const allProducts = await storage.getProducts(tenantId);
          items = saleItems.map(si => {
            const product = allProducts.find(p => p.id === si.productId);
            return { ...si, productName: product?.name || "Noma'lum", productUnit: product?.unit || "dona" };
          });
        }
        return {
          ...d,
          customerName: customer?.fullName || d.customerName || "Noma'lum",
          customerPhone: customer?.phone || d.customerPhone || "",
          customerAddress: customer?.address || d.address || "",
          items,
        };
      }));
      res.json(enriched);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/dealer-portal/deliveries/:id", requireDealer, async (req, res) => {
    try {
      const dealerId = req.session.dealerId!;
      const tenantId = req.session.tenantId!;
      const delivery = await storage.getDelivery(req.params.id);
      if (!delivery || delivery.dealerId !== dealerId) {
        return res.status(404).json({ message: "Yetkazish topilmadi" });
      }
      const { status } = req.body;
      const valid: Record<string, string[]> = {
        pending: ["in_transit"],
        in_transit: ["delivered"],
      };
      const allowed = valid[delivery.status];
      if (!allowed || !allowed.includes(status)) {
        return res.status(400).json({ message: "Bu holatdan o'tkazish mumkin emas" });
      }
      const updated = await storage.updateDelivery(delivery.id, { status });
      if (status === "delivered" && delivery.saleId) {
        const sale = await storage.getSale(delivery.saleId);
        if (sale && sale.status === "delivering") {
          await storage.updateSale(sale.id, { status: "shipped" } as any);
        }
      }
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== DEALER PORTAL - CUSTOMER MANAGEMENT =====
  app.get("/api/dealer-portal/customers", requireDealer, async (req, res) => {
    try {
      const dealerId = req.session.dealerId!;
      const customers = await storage.getDealerCustomers(dealerId);
      res.json(customers);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/dealer-portal/customers", requireDealer, async (req, res) => {
    try {
      const dealerId = req.session.dealerId!;
      const tenantId = req.session.tenantId!;
      const { name, phone } = req.body;
      if (!name) return res.status(400).json({ message: "Ism majburiy" });
      const customer = await storage.createDealerCustomer({
        dealerId,
        tenantId,
        name,
        phone: phone || null,
        debt: "0",
      });
      res.json(customer);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/dealer-portal/customers/:id", requireDealer, async (req, res) => {
    try {
      const dealerId = req.session.dealerId!;
      const dc = await storage.getDealerCustomer(req.params.id);
      if (!dc || dc.dealerId !== dealerId) return res.status(404).json({ message: "Mijoz topilmadi" });
      const updated = await storage.updateDealerCustomer(dc.id, req.body);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/dealer-portal/customers/:id/payment", requireDealer, async (req, res) => {
    try {
      const dealerId = req.session.dealerId!;
      const tenantId = req.session.tenantId!;
      const dc = await storage.getDealerCustomer(req.params.id);
      if (!dc || dc.dealerId !== dealerId) return res.status(404).json({ message: "Mijoz topilmadi" });

      const { amount, method, notes } = req.body;
      const payAmount = Number(amount);
      if (!payAmount || payAmount <= 0) return res.status(400).json({ message: "Summa noto'g'ri" });
      if (payAmount > Number(dc.debt)) return res.status(400).json({ message: "Summa qarzdan ko'p bo'lishi mumkin emas" });

      const newDebt = Number(dc.debt) - payAmount;
      await storage.updateDealerCustomer(dc.id, { debt: newDebt.toFixed(2) } as any);

      await storage.createPayment({
        tenantId,
        type: "dealer_customer",
        dealerId,
        customerId: null,
        amount: payAmount.toFixed(2),
        method: method || "cash",
        notes: notes || `${dc.name} dan to'lov`,
      });

      res.json({ success: true, newDebt: newDebt.toFixed(2) });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== CUSTOMER PORTAL AUTH =====
  app.post("/api/portal/login", async (req, res) => {
    try {
      const { phone, password, tenantId } = req.body;
      if (!phone || !password) {
        return res.status(400).json({ message: "Telefon va parol majburiy" });
      }
      if (!tenantId) {
        return res.status(400).json({ message: "Do'kon tanlanmagan" });
      }
      const customer = await storage.getCustomerByPhone(phone, tenantId);
      if (!customer || !customer.password) {
        return res.status(401).json({ message: "Telefon raqam yoki parol noto'g'ri" });
      }
      if (customer.password !== hashPassword(password)) {
        return res.status(401).json({ message: "Telefon raqam yoki parol noto'g'ri" });
      }
      if (!customer.active) {
        return res.status(403).json({ message: "Hisob nofaol" });
      }
      req.session.customerId = customer.id;
      req.session.customerName = customer.fullName;
      req.session.tenantId = tenantId;
      const { password: _, ...safe } = customer;
      res.json(safe);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/portal/register", async (req, res) => {
    try {
      const { fullName, phone, password, address, tenantId } = req.body;
      if (!fullName || !phone || !password) {
        return res.status(400).json({ message: "Ism, telefon va parol majburiy" });
      }
      if (!tenantId) {
        return res.status(400).json({ message: "Do'kon tanlanmagan" });
      }
      const existing = await storage.getCustomerByPhone(phone, tenantId);
      if (existing) {
        return res.status(400).json({ message: "Bu telefon raqam allaqachon ro'yxatdan o'tgan" });
      }
      const customer = await storage.createCustomer({
        fullName,
        phone,
        password: hashPassword(password),
        address: address || null,
        telegramId: null,
        tenantId,
        active: true,
        debt: "0",
      });
      req.session.customerId = customer.id;
      req.session.customerName = customer.fullName;
      req.session.tenantId = tenantId;
      const { password: _, ...safe } = customer;
      res.json(safe);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/portal/me", async (req, res) => {
    if (!req.session.customerId) {
      return res.status(401).json({ message: "Tizimga kirilmagan" });
    }
    const customer = await storage.getCustomer(req.session.customerId);
    if (!customer) {
      return res.status(401).json({ message: "Mijoz topilmadi" });
    }
    const { password: _, ...safe } = customer;
    res.json(safe);
  });

  app.post("/api/portal/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });

  app.post("/api/portal/send-otp", async (req, res) => {
    try {
      const { phone, tenantId } = req.body;
      if (!phone || !tenantId) {
        return res.status(400).json({ message: "Telefon raqam va do'kon majburiy" });
      }
      const customer = await storage.getCustomerByPhone(phone, tenantId);
      if (!customer) {
        return res.status(404).json({ message: "Bu telefon raqam ro'yxatdan o'tmagan" });
      }
      if (!customer.telegramId) {
        return res.status(400).json({ message: "Telegram bog'lanmagan. Avval Telegram botga /start yuboring" });
      }
      if (!customer.active) {
        return res.status(403).json({ message: "Hisob nofaol" });
      }
      const token = await getTelegramBotToken(tenantId);
      if (!token) {
        return res.status(500).json({ message: "Telegram bot sozlanmagan" });
      }
      const code = generateOTP();
      otpStore.set(phone + tenantId, { code, expiry: Date.now() + 5 * 60 * 1000 });
      const sent = await sendTelegramMessage(
        customer.telegramId,
        `🔐 <b>MARKET_LINE</b>\n\nSizning tasdiqlash kodingiz: <b>${code}</b>\n\nKod 5 daqiqa amal qiladi.`,
        token
      );
      if (!sent) {
        return res.status(500).json({ message: "Telegram xabar yuborib bo'lmadi" });
      }
      res.json({ success: true, message: "OTP kod Telegramga yuborildi" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/portal/verify-otp", async (req, res) => {
    try {
      const { phone, code, tenantId } = req.body;
      if (!phone || !code || !tenantId) {
        return res.status(400).json({ message: "Telefon, kod va do'kon majburiy" });
      }
      const key = phone + tenantId;
      const stored = otpStore.get(key);
      if (!stored) {
        return res.status(400).json({ message: "OTP kod topilmadi. Qayta yuboring" });
      }
      if (Date.now() > stored.expiry) {
        otpStore.delete(key);
        return res.status(400).json({ message: "OTP kod muddati tugagan. Qayta yuboring" });
      }
      if (stored.code !== code) {
        return res.status(400).json({ message: "OTP kod noto'g'ri" });
      }
      otpStore.set(key, { ...stored, verified: true });
      res.json({ success: true, message: "OTP tasdiqlandi" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/portal/register-otp", async (req, res) => {
    try {
      const { phone, code, fullName, password, address, tenantId } = req.body;
      if (!phone || !code || !fullName || !password || !tenantId) {
        return res.status(400).json({ message: "Barcha majburiy maydonlarni to'ldiring" });
      }
      const key = phone + tenantId;
      const stored = otpStore.get(key);
      if (!stored || stored.code !== code || !stored.verified) {
        return res.status(400).json({ message: "OTP tasdiqlanmagan" });
      }
      if (Date.now() > stored.expiry) {
        otpStore.delete(key);
        return res.status(400).json({ message: "OTP kod muddati tugagan" });
      }
      const existing = await storage.getCustomerByPhone(phone, tenantId);
      if (existing) {
        if (existing.password) {
          return res.status(400).json({ message: "Bu telefon raqam allaqachon ro'yxatdan o'tgan" });
        }
        const updated = await storage.updateCustomer(existing.id, {
          fullName,
          password: hashPassword(password),
          address: address || null,
        });
        otpStore.delete(key);
        req.session.customerId = updated!.id;
        req.session.customerName = updated!.fullName;
        req.session.tenantId = tenantId;
        const { password: _, ...safe } = updated!;
        return res.json(safe);
      }
      const customer = await storage.createCustomer({
        fullName, phone,
        password: hashPassword(password),
        address: address || null,
        telegramId: null, tenantId,
        active: true, debt: "0",
      });
      otpStore.delete(key);
      req.session.customerId = customer.id;
      req.session.customerName = customer.fullName;
      req.session.tenantId = tenantId;
      const { password: _, ...safe } = customer;
      res.json(safe);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/portal/reset-password", async (req, res) => {
    try {
      const { phone, code, newPassword, tenantId } = req.body;
      if (!phone || !code || !newPassword || !tenantId) {
        return res.status(400).json({ message: "Barcha maydonlarni to'ldiring" });
      }
      const key = phone + tenantId;
      const stored = otpStore.get(key);
      if (!stored || stored.code !== code || !stored.verified) {
        return res.status(400).json({ message: "OTP tasdiqlanmagan" });
      }
      if (Date.now() > stored.expiry) {
        otpStore.delete(key);
        return res.status(400).json({ message: "OTP kod muddati tugagan" });
      }
      const customer = await storage.getCustomerByPhone(phone, tenantId);
      if (!customer) {
        return res.status(404).json({ message: "Mijoz topilmadi" });
      }
      await storage.updateCustomer(customer.id, { password: hashPassword(newPassword) });
      otpStore.delete(key);
      req.session.customerId = customer.id;
      req.session.customerName = customer.fullName;
      req.session.tenantId = tenantId;
      res.json({ success: true, message: "Parol yangilandi" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/portal/send-register-otp", async (req, res) => {
    try {
      const { phone, tenantId } = req.body;
      if (!phone || !tenantId) {
        return res.status(400).json({ message: "Telefon raqam va do'kon majburiy" });
      }
      const existing = await storage.getCustomerByPhone(phone, tenantId);
      if (existing && existing.password) {
        return res.status(400).json({ message: "Bu telefon raqam allaqachon ro'yxatdan o'tgan. Tizimga kiring" });
      }
      if (!existing || !existing.telegramId) {
        return res.status(400).json({ message: "Telegram bog'lanmagan. Avval Telegram botga /start yuborib, telefon raqamingizni ulang" });
      }
      const token = await getTelegramBotToken(tenantId);
      if (!token) {
        return res.status(500).json({ message: "Telegram bot sozlanmagan" });
      }
      const code = generateOTP();
      const key = phone + tenantId;
      otpStore.set(key, { code, expiry: Date.now() + 5 * 60 * 1000 });
      const sent = await sendTelegramMessage(
        existing.telegramId,
        `🔐 <b>MARKET_LINE</b>\n\nRo'yxatdan o'tish kodi: <b>${code}</b>\n\nKod 5 daqiqa amal qiladi.`,
        token
      );
      if (!sent) {
        return res.status(500).json({ message: "Telegram xabar yuborib bo'lmadi. Bot tokenni tekshiring" });
      }
      res.json({ success: true, message: "OTP kod Telegramga yuborildi" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/telegram/webhook/:tenantId", async (req, res) => {
    try {
      const { tenantId } = req.params;
      const { message } = req.body;
      if (!message) return res.json({ ok: true });

      const chatId = message.chat?.id?.toString();
      const text = message.text?.trim();
      const contact = message.contact;

      if (!chatId) return res.json({ ok: true });

      const token = await getTelegramBotToken(tenantId);
      if (!token) return res.json({ ok: true });

      if (text === "/start") {
        await sendTelegramMessage(chatId,
          `👋 <b>MARKET_LINE</b> botiga xush kelibsiz!\n\n` +
          `📱 Telefon raqamingizni ulash uchun pastdagi tugmani bosing yoki telefon raqamingizni yozing.\n\n` +
          `Masalan: <code>+998901234567</code>`,
          token
        );
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: "📞 Telefon raqamingizni yuboring:",
            reply_markup: {
              keyboard: [[{ text: "📞 Telefon raqamni yuborish", request_contact: true }]],
              resize_keyboard: true,
              one_time_keyboard: true,
            },
          }),
        });
        return res.json({ ok: true });
      }

      if (contact && contact.phone_number) {
        let phone = contact.phone_number;
        if (!phone.startsWith("+")) phone = "+" + phone;
        let customer = await storage.getCustomerByPhone(phone, tenantId);
        if (!customer) {
          customer = await storage.createCustomer({
            fullName: `${contact.first_name || ""} ${contact.last_name || ""}`.trim() || "Telegram foydalanuvchi",
            phone, password: null, address: null, telegramId: chatId,
            tenantId, active: true, debt: "0",
          });
          await sendTelegramMessage(chatId,
            `✅ Telefon raqamingiz bog'landi!\n\n📱 ${phone}\n\nEndi portalda OTP orqali ro'yxatdan o'tishingiz mumkin.`,
            token
          );
        } else {
          await storage.updateCustomer(customer.id, { telegramId: chatId });
          await sendTelegramMessage(chatId,
            `✅ Telegram hisobingiz bog'landi!\n\n📱 ${phone}\n\nEndi OTP xizmatlari faol.`,
            token
          );
        }
        return res.json({ ok: true });
      }

      if (text && /^\+?\d{10,15}$/.test(text.replace(/\s/g, ""))) {
        let phone = text.replace(/\s/g, "");
        if (!phone.startsWith("+")) phone = "+" + phone;
        let customer = await storage.getCustomerByPhone(phone, tenantId);
        if (!customer) {
          customer = await storage.createCustomer({
            fullName: `${message.from?.first_name || ""} ${message.from?.last_name || ""}`.trim() || "Telegram foydalanuvchi",
            phone, password: null, address: null, telegramId: chatId,
            tenantId, active: true, debt: "0",
          });
          await sendTelegramMessage(chatId,
            `✅ Telefon raqamingiz bog'landi!\n\n📱 ${phone}\n\nEndi portalda OTP orqali ro'yxatdan o'tishingiz mumkin.`,
            token
          );
        } else {
          await storage.updateCustomer(customer.id, { telegramId: chatId });
          await sendTelegramMessage(chatId,
            `✅ Telegram hisobingiz bog'landi!\n\n📱 ${phone}\n\nEndi OTP xizmatlari faol.`,
            token
          );
        }
        return res.json({ ok: true });
      }

      await sendTelegramMessage(chatId,
        `❓ Tushunmadim. Iltimos telefon raqamingizni yuboring yoki /start bosing.`,
        token
      );
      res.json({ ok: true });
    } catch (error: any) {
      console.error("Telegram webhook error:", error);
      res.json({ ok: true });
    }
  });

  app.post("/api/telegram/setup-webhook", requireTenant, async (req, res) => {
    try {
      const tenantId = req.session.tenantId!;
      const token = await getTelegramBotToken(tenantId);
      if (!token) {
        return res.status(400).json({ message: "Telegram bot token sozlanmagan" });
      }
      const { webhookUrl } = req.body;
      if (!webhookUrl) {
        return res.status(400).json({ message: "Webhook URL majburiy" });
      }
      const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: `${webhookUrl}/api/telegram/webhook/${tenantId}` }),
      });
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/portal/catalog", async (req, res) => {
    const tenantId = req.session.tenantId;
    if (!tenantId) return res.status(400).json({ message: "Do'kon tanlanmagan" });
    const allProducts = await storage.getProducts(tenantId);
    const catalog = allProducts
      .filter(p => p.active && p.stock > 0)
      .map(({ costPrice, minStock, ...p }) => p);
    res.json(catalog);
  });

  app.get("/api/portal/categories", async (req, res) => {
    const tenantId = req.session.tenantId;
    if (!tenantId) return res.status(400).json({ message: "Do'kon tanlanmagan" });
    const data = await storage.getCategories(tenantId);
    res.json(data);
  });

  app.get("/api/portal/orders", async (req, res) => {
    if (!req.session.customerId) {
      return res.status(401).json({ message: "Tizimga kirilmagan" });
    }
    const customerSales = await storage.getCustomerSales(req.session.customerId);
    res.json(customerSales);
  });

  app.get("/api/portal/orders/:id", async (req, res) => {
    if (!req.session.customerId) {
      return res.status(401).json({ message: "Tizimga kirilmagan" });
    }
    const sale = await storage.getSale(req.params.id);
    if (!sale || sale.customerId !== req.session.customerId) {
      return res.status(404).json({ message: "Buyurtma topilmadi" });
    }
    const items = await storage.getSaleItems(req.params.id);
    const itemsWithProducts = await Promise.all(
      items.map(async (item) => {
        const product = await storage.getProduct(item.productId);
        return { ...item, product: product ? { name: product.name, unit: product.unit, imageUrl: product.imageUrl } : null };
      })
    );
    res.json({ ...sale, items: itemsWithProducts });
  });

  app.post("/api/portal/orders", async (req, res) => {
    if (!req.session.customerId || !req.session.tenantId) {
      return res.status(401).json({ message: "Tizimga kirilmagan" });
    }
    try {
      const { items, address, notes } = req.body;
      const tenantId = req.session.tenantId;
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "Mahsulotlar majburiy" });
      }

      const result = await db.transaction(async (tx) => {
        let totalAmount = 0;
        for (const item of items) {
          const [product] = await tx.select().from(products).where(eq(products.id, item.productId));
          if (!product || product.stock < item.quantity) {
            throw new Error(`${product?.name || "Mahsulot"} stokda yetarli emas`);
          }
          totalAmount += item.quantity * Number(product.price);
        }

        const [sale] = await tx.insert(sales).values({
          tenantId,
          customerId: req.session.customerId!,
          employeeId: null,
          totalAmount: totalAmount.toFixed(2),
          discount: "0",
          paidAmount: "0",
          paymentType: "debt",
          status: "pending",
        }).returning();

        for (const item of items) {
          const [product] = await tx.select().from(products).where(eq(products.id, item.productId));
          await tx.insert(saleItems).values({
            saleId: sale.id,
            productId: item.productId,
            quantity: item.quantity,
            price: product!.price,
            total: (item.quantity * Number(product!.price)).toFixed(2),
          });
          await tx.update(products).set({
            stock: product!.stock - item.quantity,
          }).where(eq(products.id, item.productId));
        }

        const [customer] = await tx.select().from(customers).where(eq(customers.id, req.session.customerId!));
        if (customer) {
          const newDebt = Number(customer.debt) + totalAmount;
          await tx.update(customers).set({ debt: newDebt.toFixed(2) }).where(eq(customers.id, req.session.customerId!));
        }

        if (address) {
          await tx.insert(deliveries).values({
            tenantId,
            saleId: sale.id,
            customerId: req.session.customerId!,
            address,
            status: "pending",
            notes: notes || null,
          });
        }

        return sale;
      });

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/portal/orders/:id/receive", async (req, res) => {
    if (!req.session.customerId) {
      return res.status(401).json({ message: "Tizimga kirilmagan" });
    }
    try {
      const sale = await storage.getSale(req.params.id);
      if (!sale || sale.customerId !== req.session.customerId) {
        return res.status(404).json({ message: "Buyurtma topilmadi" });
      }
      if (sale.status !== "shipped") {
        return res.status(400).json({ message: "Faqat topshirilgan buyurtmani qabul qilish mumkin" });
      }
      await storage.updateSale(req.params.id, { status: "delivered" });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== ADMIN ORDER MANAGEMENT =====
  app.get("/api/portal-orders", requireTenant, async (req, res) => {
    try {
      const tenantId = req.session.tenantId!;
      const allSales = await storage.getSales(tenantId);
      const portalOrders = allSales.filter(s => s.employeeId === null && s.customerId !== null);
      const ordersWithDetails = await Promise.all(portalOrders.map(async (sale) => {
        const items = await storage.getSaleItems(sale.id);
        const customer = sale.customerId ? await storage.getCustomer(sale.customerId) : null;
        const itemsWithProducts = await Promise.all(items.map(async (item) => {
          const product = await storage.getProduct(item.productId);
          return { ...item, productName: product?.name || "Noma'lum", productUnit: product?.unit || "dona" };
        }));
        return { ...sale, items: itemsWithProducts, customerName: customer?.fullName || "Noma'lum", customerPhone: customer?.phone || "" };
      }));
      res.json(ordersWithDetails);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/portal-orders/:id/status", requireTenant, async (req, res) => {
    try {
      const tenantId = req.session.tenantId!;
      const { status, dealerId } = req.body;
      const validTransitions: Record<string, string[]> = {
        pending: ["completed", "cancelled"],
        completed: ["delivering", "cancelled"],
        delivering: ["shipped", "cancelled"],
      };
      const sale = await storage.getSale(req.params.id);
      if (!sale || !verifyTenant(sale, tenantId)) {
        return res.status(404).json({ message: "Buyurtma topilmadi" });
      }
      if (sale.employeeId !== null) {
        return res.status(400).json({ message: "Bu portal buyurtmasi emas" });
      }
      const allowed = validTransitions[sale.status];
      if (!allowed || !allowed.includes(status)) {
        return res.status(400).json({ message: "Bu holatdan o'tkazish mumkin emas" });
      }
      if (status === "cancelled") {
        const items = await storage.getSaleItems(sale.id);
        for (const item of items) {
          const product = await storage.getProduct(item.productId);
          if (product) {
            await storage.updateProduct(product.id, { stock: product.stock + item.quantity });
          }
        }
        if (sale.customerId) {
          const customer = await storage.getCustomer(sale.customerId);
          if (customer) {
            const newDebt = Math.max(0, Number(customer.debt) - Number(sale.totalAmount));
            await storage.updateCustomer(customer.id, { debt: newDebt.toFixed(2) } as any);
          }
        }
      }
      if (status === "delivering" && sale.customerId) {
        const customer = await storage.getCustomer(sale.customerId);
        const existingDeliveries = await storage.getDeliveries(tenantId);
        const hasDelivery = existingDeliveries.some(d => d.saleId === sale.id);
        if (!hasDelivery && customer) {
          let assignedDealerId: string | null = null;
          if (dealerId) {
            const dealer = await storage.getDealer(dealerId);
            if (!dealer || dealer.tenantId !== tenantId || !dealer.active) {
              return res.status(400).json({ message: "Diller topilmadi yoki nofaol" });
            }
            assignedDealerId = dealerId;
          }
          await storage.createDelivery({
            tenantId,
            saleId: sale.id,
            customerId: sale.customerId,
            dealerId: assignedDealerId,
            address: customer.address || "Manzil ko'rsatilmagan",
            status: assignedDealerId ? "pending" : "in_transit",
            notes: assignedDealerId ? "Dillerga tayinlangan" : null,
          });
        }
      }
      const updated = await storage.updateSale(sale.id, { status } as any);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== DASHBOARD STATS =====
  app.get("/api/stats", requireTenant, async (req, res) => {
    try {
      const tenantId = req.session.tenantId!;
      const allProducts = await storage.getProducts(tenantId);
      const allCustomers = await storage.getCustomers(tenantId);
      const allSales = await storage.getSales(tenantId);

      const totalProducts = allProducts.length;
      const lowStockProducts = allProducts.filter(p => p.stock <= p.minStock).length;
      const totalCustomers = allCustomers.length;
      const totalDebt = allCustomers.reduce((sum, c) => sum + Number(c.debt), 0);
      const totalSales = allSales.length;
      const totalRevenue = allSales.reduce((sum, s) => sum + Number(s.totalAmount), 0);

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todaySales = allSales.filter(s => new Date(s.createdAt) >= todayStart);
      const todayRevenue = todaySales.reduce((sum, s) => sum + Number(s.totalAmount), 0);

      res.json({
        totalProducts, lowStockProducts, totalCustomers, totalDebt,
        totalSales, totalRevenue, todaySales: todaySales.length, todayRevenue,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== SUPER ADMIN =====
  function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
    if (!req.session.superAdmin) {
      return res.status(401).json({ message: "Super admin huquqi kerak" });
    }
    next();
  }

  const superLoginAttempts = new Map<string, { count: number; lastAttempt: number }>();

  app.post("/api/super/login", async (req, res) => {
    try {
      const ip = req.ip || "unknown";
      const now = Date.now();
      const attempt = superLoginAttempts.get(ip);
      if (attempt && attempt.count >= 5 && now - attempt.lastAttempt < 15 * 60 * 1000) {
        return res.status(429).json({ message: "Juda ko'p urinish. 15 daqiqadan keyin qayta urinib ko'ring." });
      }

      const { password } = req.body;
      const superPassword = process.env.SUPER_ADMIN_PASSWORD;
      if (!superPassword) {
        return res.status(500).json({ message: "Super admin parol sozlanmagan" });
      }
      const crypto = await import("crypto");
      const passStr = String(password || "");
      const passHash = crypto.createHash("sha256").update(passStr).digest();
      const expectedHash = crypto.createHash("sha256").update(superPassword).digest();
      const isMatch = passStr.length > 0 && crypto.timingSafeEqual(passHash, expectedHash);
      if (!isMatch) {
        const prev = superLoginAttempts.get(ip) || { count: 0, lastAttempt: now };
        superLoginAttempts.set(ip, { count: prev.count + 1, lastAttempt: now });
        return res.status(401).json({ message: "Parol noto'g'ri" });
      }
      superLoginAttempts.delete(ip);
      req.session.superAdmin = true;
      req.session.save((err) => {
        if (err) return res.status(500).json({ message: "Session saqlashda xatolik" });
        res.json({ success: true });
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  const superOtpStore = new Map<string, { code: string; expiry: number; purpose: string }>();

  app.post("/api/super/send-otp", async (req, res) => {
    try {
      const { purpose } = req.body;
      const botToken = process.env.SUPER_ADMIN_TELEGRAM_BOT_TOKEN;
      const chatId = process.env.SUPER_ADMIN_TELEGRAM_CHAT_ID;
      if (!botToken || !chatId) {
        return res.status(500).json({ message: "Telegram bot sozlanmagan" });
      }
      const code = generateOTP();
      superOtpStore.set("super_admin", { code, expiry: Date.now() + 5 * 60 * 1000, purpose: purpose || "login" });

      const purposeText = purpose === "reset" ? "Parolni tiklash" : "Tizimga kirish";
      const sent = await sendTelegramMessage(
        chatId,
        `🔐 <b>MARKET_LINE Super Admin</b>\n\n${purposeText} uchun OTP kod:\n\n<code>${code}</code>\n\n⏱ 5 daqiqa ichida amal qiladi.`,
        botToken
      );
      if (!sent) {
        return res.status(500).json({ message: "Telegram xabar yuborilmadi" });
      }
      res.json({ success: true, message: "OTP kod Telegramga yuborildi" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/super/verify-otp", async (req, res) => {
    try {
      const { code, purpose } = req.body;
      const stored = superOtpStore.get("super_admin");
      if (!stored || stored.expiry < Date.now()) {
        superOtpStore.delete("super_admin");
        return res.status(400).json({ message: "OTP kod muddati tugagan yoki topilmadi" });
      }
      if (stored.code !== String(code)) {
        return res.status(400).json({ message: "OTP kod noto'g'ri" });
      }
      superOtpStore.delete("super_admin");

      if (purpose === "reset") {
        return res.json({ success: true, resetAllowed: true });
      }
      req.session.superAdmin = true;
      req.session.save((err) => {
        if (err) return res.status(500).json({ message: "Session saqlashda xatolik" });
        res.json({ success: true });
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  const superResetVerified = new Set<string>();

  app.post("/api/super/verify-reset-otp", async (req, res) => {
    try {
      const { code } = req.body;
      const stored = superOtpStore.get("super_admin");
      if (!stored || stored.expiry < Date.now() || stored.purpose !== "reset") {
        superOtpStore.delete("super_admin");
        return res.status(400).json({ message: "OTP kod muddati tugagan yoki topilmadi" });
      }
      if (stored.code !== String(code)) {
        return res.status(400).json({ message: "OTP kod noto'g'ri" });
      }
      superOtpStore.delete("super_admin");
      const resetToken = Date.now().toString(36) + Math.random().toString(36).slice(2);
      superResetVerified.add(resetToken);
      setTimeout(() => superResetVerified.delete(resetToken), 10 * 60 * 1000);
      res.json({ success: true, resetToken });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/super/reset-password", async (req, res) => {
    try {
      const { resetToken, newPassword } = req.body;
      if (!newPassword || String(newPassword).length < 4) {
        return res.status(400).json({ message: "Parol kamida 4 ta belgidan iborat bo'lishi kerak" });
      }
      if (!resetToken || !superResetVerified.has(resetToken)) {
        return res.status(401).json({ message: "Ruxsat berilmadi. Avval OTP tasdiqlang." });
      }
      superResetVerified.delete(resetToken);
      process.env.SUPER_ADMIN_PASSWORD = String(newPassword);
      res.json({ success: true, message: "Parol muvaffaqiyatli o'zgartirildi" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/super/me", (req, res) => {
    if (!req.session.superAdmin) {
      return res.status(401).json({ message: "Tizimga kirilmagan" });
    }
    res.json({ superAdmin: true });
  });

  const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, "Joriy parolni kiriting"),
    newPassword: z.string().min(4, "Yangi parol kamida 4 ta belgidan iborat bo'lishi kerak"),
  });

  app.post("/api/super/change-password", requireSuperAdmin, async (req, res) => {
    try {
      const parsed = changePasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0].message });
      }
      const { currentPassword, newPassword } = parsed.data;
      const superPassword = process.env.SUPER_ADMIN_PASSWORD || "admin2025";
      if (currentPassword !== superPassword) {
        return res.status(401).json({ message: "Joriy parol noto'g'ri" });
      }
      process.env.SUPER_ADMIN_PASSWORD = newPassword;
      res.json({ success: true, message: "Parol muvaffaqiyatli o'zgartirildi" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/super/global-settings", requireSuperAdmin, async (_req, res) => {
    const channelSetting = await storage.getGlobalSetting("global_image_channel");
    res.json({
      globalImageChannel: channelSetting?.value || "",
    });
  });

  app.post("/api/super/global-settings", requireSuperAdmin, async (req, res) => {
    const { globalImageChannel } = req.body;
    if (globalImageChannel !== undefined) {
      await storage.upsertGlobalSetting("global_image_channel", globalImageChannel || "");
    }
    res.json({ success: true });
  });

  app.post("/api/super/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });

  app.get("/api/super/tenants", requireSuperAdmin, async (_req, res) => {
    const data = await storage.getAllTenants();
    res.json(data.map(({ password: _, ...t }) => t));
  });

  app.patch("/api/super/tenants/:id", requireSuperAdmin, async (req, res) => {
    const { plan, active } = req.body;
    const updateData: any = {};
    if (plan !== undefined) updateData.plan = plan;
    if (active !== undefined) updateData.active = active;
    const tenant = await storage.updateTenant(req.params.id, updateData);
    if (!tenant) return res.status(404).json({ message: "Do'kon topilmadi" });
    const { password: _, ...safe } = tenant;
    res.json(safe);
  });

  app.post("/api/super/tenants", requireSuperAdmin, async (req, res) => {
    try {
      const { name, ownerName, phone, password, plan, telegramChatId, telegramImageChannel } = req.body;
      if (!name || !ownerName || !phone || !password) {
        return res.status(400).json({ message: "Barcha maydonlar majburiy" });
      }
      const existing = await storage.getTenantByPhone(phone);
      if (existing) {
        return res.status(400).json({ message: "Bu telefon raqam allaqachon ro'yxatdan o'tgan" });
      }
      const selectedPlan = plan || "free";
      const allPlans = await storage.getPlans();
      const planObj = allPlans.find(p => p.slug === selectedPlan);
      const trialEnd = planObj && planObj.trialDays > 0 ? new Date(Date.now() + planObj.trialDays * 86400000) : null;

      const tenant = await storage.createTenant({
        name,
        ownerName,
        phone,
        password: hashPassword(password),
        plan: selectedPlan,
        trialEndsAt: trialEnd,
        active: true,
      });
      await storage.upsertSetting("company_name", name, tenant.id);
      await storage.upsertSetting("currency", "UZS", tenant.id);
      await storage.upsertSetting("telegram_bot_token", "", tenant.id);
      await storage.upsertSetting("telegram_chat_id", telegramChatId || "", tenant.id);
      await storage.upsertSetting("telegram_image_channel", telegramImageChannel || "", tenant.id);
      await seedTenantData(tenant.id);
      const { password: _, ...safe } = tenant;
      res.json(safe);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/super/tenants/:id", requireSuperAdmin, async (req, res) => {
    try {
      const tenant = await storage.getTenant(req.params.id);
      if (!tenant) return res.status(404).json({ message: "Do'kon topilmadi" });
      const { active, plan } = req.body;
      const updateData: any = {};
      if (typeof active === "boolean") updateData.active = active;
      if (plan) updateData.plan = plan;
      const updated = await storage.updateTenant(req.params.id, updateData);
      if (!updated?.active) {
        await pool.query(`DELETE FROM "session" WHERE "sess"::text LIKE $1`, [`%"tenantId":"${req.params.id}"%`]);
      }
      const { password: _, ...safe } = updated!;
      res.json(safe);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/super/tenants/:id", requireSuperAdmin, async (req, res) => {
    try {
      const tenant = await storage.getTenant(req.params.id);
      if (!tenant) return res.status(404).json({ message: "Do'kon topilmadi" });
      await pool.query(`DELETE FROM "session" WHERE "sess"::text LIKE $1`, [`%"tenantId":"${req.params.id}"%`]);
      await storage.deleteTenant(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/super/plans", requireSuperAdmin, async (_req, res) => {
    const data = await storage.getPlans();
    res.json(data);
  });

  const planBodySchema = z.object({
    name: z.string().min(1),
    slug: z.string().min(1),
    price: z.string().or(z.number()).transform(String),
    maxProducts: z.number().int().min(0).default(100),
    maxEmployees: z.number().int().min(0).default(3),
    features: z.array(z.string()).default([]),
    allowedModules: z.array(z.string()).default([]),
    trialDays: z.number().int().min(0).default(0),
    active: z.boolean().default(true),
    sortOrder: z.number().int().default(0),
  });

  app.post("/api/super/plans", requireSuperAdmin, async (req, res) => {
    try {
      const parsed = planBodySchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message || "Noto'g'ri ma'lumot" });
      const plan = await storage.createPlan(parsed.data as any);
      res.json(plan);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/super/plans/:id", requireSuperAdmin, async (req, res) => {
    try {
      const parsed = planBodySchema.partial().safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message || "Noto'g'ri ma'lumot" });
      const plan = await storage.updatePlan(req.params.id, parsed.data as any);
      if (!plan) return res.status(404).json({ message: "Reja topilmadi" });
      res.json(plan);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/super/plans/:id", requireSuperAdmin, async (req, res) => {
    await storage.deletePlan(req.params.id);
    res.json({ success: true });
  });

  app.get("/api/super/stats", requireSuperAdmin, async (_req, res) => {
    const allTenants = await storage.getAllTenants();
    const allPlans = await storage.getPlans();
    const activeTenants = allTenants.filter(t => t.active).length;
    const planCounts: Record<string, number> = {};
    for (const t of allTenants) {
      planCounts[t.plan] = (planCounts[t.plan] || 0) + 1;
    }
    res.json({
      totalTenants: allTenants.length,
      activeTenants,
      planCounts,
      totalPlans: allPlans.length,
    });
  });

  app.get("/api/plans/public", async (_req, res) => {
    const data = await storage.getPlans();
    res.json(data.filter(p => p.active));
  });

  return httpServer;
}
