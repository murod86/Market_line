import { storage } from "./storage";
import { db } from "./db";
import { roles, categories, products, customers, employees } from "@shared/schema";
import { createHash } from "crypto";

function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

export async function seedDatabase() {
  const existingRoles = await storage.getRoles();
  if (existingRoles.length > 0) return;

  const adminRole = await storage.createRole({
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

  const cashierRole = await storage.createRole({
    name: "Kassir",
    permissions: [
      "pos.sell", "pos.discount",
      "customers.view", "customers.create",
      "products.view",
    ],
  });

  const warehouseRole = await storage.createRole({
    name: "Omborchi",
    permissions: [
      "products.view", "products.create", "products.edit", "products.stock",
      "warehouse.view",
    ],
  });

  await storage.createEmployee({
    fullName: "Sardor Aliyev",
    phone: "+998901234567",
    username: "admin",
    password: hashPassword("admin123"),
    roleId: adminRole.id,
    active: true,
  });

  await storage.createEmployee({
    fullName: "Dilshod Karimov",
    phone: "+998901234568",
    username: "kassir",
    password: hashPassword("kassir123"),
    roleId: cashierRole.id,
    active: true,
  });

  await storage.createEmployee({
    fullName: "Bekzod Rahimov",
    phone: "+998901234569",
    username: "ombor",
    password: hashPassword("ombor123"),
    roleId: warehouseRole.id,
    active: true,
  });

  const cat1 = await storage.createCategory({ name: "Oziq-ovqat", description: "Oziq-ovqat mahsulotlari" });
  const cat2 = await storage.createCategory({ name: "Ichimliklar", description: "Ichimlik mahsulotlari" });
  const cat3 = await storage.createCategory({ name: "Maishiy texnika", description: "Uy-ro'zg'or buyumlari" });
  const cat4 = await storage.createCategory({ name: "Gigiena", description: "Shaxsiy gigiena vositalari" });

  const productData = [
    { name: "Oltin non", sku: "ON-001", price: "8000", costPrice: "6000", stock: 150, categoryId: cat1.id, unit: "dona", description: "Yumshoq oq non" },
    { name: "Coca-Cola 1L", sku: "CC-001", price: "12000", costPrice: "9000", stock: 200, categoryId: cat2.id, unit: "dona", description: "Gazli ichimlik" },
    { name: "Pepsi 1.5L", sku: "PP-001", price: "14000", costPrice: "10500", stock: 180, categoryId: cat2.id, unit: "dona", description: "Gazli ichimlik" },
    { name: "Tushonka 500g", sku: "TU-001", price: "35000", costPrice: "28000", stock: 80, categoryId: cat1.id, unit: "dona", description: "Go'sht konservasi" },
    { name: "Shakar 1kg", sku: "SH-001", price: "15000", costPrice: "12000", stock: 300, categoryId: cat1.id, unit: "kg", description: "Oq shakar" },
    { name: "Pishloq 1kg", sku: "PI-001", price: "85000", costPrice: "70000", stock: 45, categoryId: cat1.id, unit: "kg", description: "Tabiiy pishloq" },
    { name: "Choy 100g", sku: "CH-001", price: "25000", costPrice: "18000", stock: 120, categoryId: cat2.id, unit: "dona", description: "Qora choy" },
    { name: "Sovun", sku: "SV-001", price: "8000", costPrice: "5500", stock: 250, categoryId: cat4.id, unit: "dona", description: "Antibakterial sovun" },
    { name: "Shampun 400ml", sku: "SM-001", price: "32000", costPrice: "24000", stock: 90, categoryId: cat4.id, unit: "dona", description: "Soch uchun shampun" },
    { name: "Elektr choynak", sku: "EC-001", price: "180000", costPrice: "140000", stock: 15, categoryId: cat3.id, unit: "dona", description: "1.7L elektr choynak" },
    { name: "Un 2kg", sku: "UN-001", price: "18000", costPrice: "14000", stock: 200, categoryId: cat1.id, unit: "dona", description: "Yuqori navli un" },
    { name: "Sariyog' 200g", sku: "SY-001", price: "22000", costPrice: "17000", stock: 160, categoryId: cat1.id, unit: "dona", description: "Tabiiy sariyog'" },
  ];

  for (const p of productData) {
    await storage.createProduct({
      ...p,
      minStock: 5,
      imageUrl: null,
      active: true,
    });
  }

  const customerData = [
    { fullName: "Aziz Toshmatov", phone: "+998901111111", address: "Toshkent, Chilonzor 7", debt: "250000" },
    { fullName: "Gulnora Karimova", phone: "+998902222222", address: "Toshkent, Yunusobod 4", debt: "0" },
    { fullName: "Bobur Xasanov", phone: "+998903333333", address: "Toshkent, Sergeli 8", debt: "180000" },
    { fullName: "Malika Rahimova", phone: "+998904444444", address: "Toshkent, Mirzo Ulugbek", debt: "0" },
    { fullName: "Rustam Saidov", phone: "+998905555555", address: "Toshkent, Yakkasaroy", debt: "520000" },
  ];

  for (const c of customerData) {
    await storage.createCustomer({
      ...c,
      telegramId: null,
      active: true,
    });
  }

  await storage.upsertSetting("telegram_bot_token", "");
  await storage.upsertSetting("telegram_chat_id", "");
  await storage.upsertSetting("company_name", "Smart POS");
  await storage.upsertSetting("currency", "UZS");
}
