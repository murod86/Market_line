import { storage } from "./storage";
import { createHash } from "crypto";

function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

export async function seedTenantData(tenantId: string) {
  const adminRole = await storage.createRole({
    tenantId,
    name: "Administrator",
    permissions: [
      "pos.sell", "pos.discount", "pos.debt_sale",
      "customers.view", "customers.create", "customers.edit",
      "products.view", "products.create", "products.edit", "products.stock",
      "warehouse.view", "roles.view", "roles.manage",
      "employees.view", "employees.manage",
      "deliveries.view", "deliveries.manage",
      "settings.manage", "reports.view",
    ],
  });

  await storage.createRole({
    tenantId,
    name: "Kassir",
    permissions: [
      "pos.sell", "pos.discount",
      "customers.view", "customers.create",
      "products.view",
    ],
  });

  await storage.createRole({
    tenantId,
    name: "Omborchi",
    permissions: [
      "products.view", "products.create", "products.edit", "products.stock",
      "warehouse.view",
    ],
  });

  await storage.createEmployee({
    tenantId,
    fullName: "Administrator",
    phone: "+998900000000",
    username: "admin",
    password: hashPassword("admin123"),
    roleId: adminRole.id,
    active: true,
  });
}

export async function seedDatabase() {
}
