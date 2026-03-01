import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, numeric, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const ALL_MODULES = [
  { key: "pos", label: "Sotuv (POS)" },
  { key: "warehouse", label: "Ombor" },
  { key: "categories", label: "Kategoriyalar" },
  { key: "products", label: "Mahsulotlar" },
  { key: "customers", label: "Mijozlar" },
  { key: "deliveries", label: "Yetkazib berish" },
  { key: "suppliers", label: "Ta'minotchilar" },
  { key: "purchases", label: "Kirim (Xaridlar)" },
  { key: "orders", label: "Buyurtmalar" },
  { key: "dealers", label: "Dillerlar" },
  { key: "roles", label: "Rollar" },
  { key: "employees", label: "Xodimlar" },
  { key: "settings", label: "Sozlamalar" },
] as const;

export const plans = pgTable("plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  price: decimal("price", { precision: 12, scale: 2 }).notNull().default("0"),
  maxProducts: integer("max_products").notNull().default(100),
  maxEmployees: integer("max_employees").notNull().default(3),
  features: jsonb("features").notNull().default(sql`'[]'::jsonb`),
  allowedModules: jsonb("allowed_modules").notNull().default(sql`'[]'::jsonb`),
  trialDays: integer("trial_days").notNull().default(0),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const insertPlanSchema = createInsertSchema(plans).omit({ id: true });
export type InsertPlan = z.infer<typeof insertPlanSchema>;
export type Plan = typeof plans.$inferSelect;

export const tenants = pgTable("tenants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  ownerName: text("owner_name").notNull(),
  phone: text("phone").notNull().unique(),
  password: text("password").notNull(),
  plan: text("plan").notNull().default("free"),
  trialEndsAt: timestamp("trial_ends_at"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertTenantSchema = createInsertSchema(tenants).omit({ id: true, createdAt: true });
export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type Tenant = typeof tenants.$inferSelect;

export const roles = pgTable("roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id),
  name: text("name").notNull(),
  permissions: jsonb("permissions").notNull().default(sql`'[]'::jsonb`),
});

export const insertRoleSchema = createInsertSchema(roles).omit({ id: true });
export type InsertRole = z.infer<typeof insertRoleSchema>;
export type Role = typeof roles.$inferSelect;

export const employees = pgTable("employees", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id),
  fullName: text("full_name").notNull(),
  phone: text("phone").notNull(),
  username: text("username").notNull(),
  password: text("password").notNull(),
  roleId: varchar("role_id").references(() => roles.id),
  active: boolean("active").notNull().default(true),
});

export const insertEmployeeSchema = createInsertSchema(employees).omit({ id: true });
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type Employee = typeof employees.$inferSelect;

export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id),
  name: text("name").notNull(),
  description: text("description"),
});

export const insertCategorySchema = createInsertSchema(categories).omit({ id: true });
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;

export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id),
  name: text("name").notNull(),
  description: text("description"),
  sku: text("sku").notNull(),
  price: decimal("price", { precision: 12, scale: 2 }).notNull(),
  costPrice: decimal("cost_price", { precision: 12, scale: 2 }).notNull(),
  stock: integer("stock").notNull().default(0),
  minStock: integer("min_stock").notNull().default(5),
  categoryId: varchar("category_id").references(() => categories.id),
  imageUrl: text("image_url"),
  unit: text("unit").notNull().default("dona"),
  boxQuantity: integer("box_quantity").notNull().default(1),
  active: boolean("active").notNull().default(true),
});

export const insertProductSchema = createInsertSchema(products).omit({ id: true });
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

export const customers = pgTable("customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id),
  fullName: text("full_name").notNull(),
  phone: text("phone").notNull(),
  password: text("password"),
  address: text("address"),
  telegramId: text("telegram_id"),
  dealerId: varchar("dealer_id").references(() => dealers.id),
  debt: decimal("debt", { precision: 12, scale: 2 }).notNull().default("0"),
  active: boolean("active").notNull().default(true),
});

export const insertCustomerSchema = createInsertSchema(customers).omit({ id: true });
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customers.$inferSelect;

export const sales = pgTable("sales", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id),
  customerId: varchar("customer_id").references(() => customers.id),
  employeeId: varchar("employee_id").references(() => employees.id),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  discount: decimal("discount", { precision: 12, scale: 2 }).notNull().default("0"),
  paidAmount: decimal("paid_amount", { precision: 12, scale: 2 }).notNull(),
  paymentType: text("payment_type").notNull().default("cash"),
  status: text("status").notNull().default("completed"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSaleSchema = createInsertSchema(sales).omit({ id: true, createdAt: true });
export type InsertSale = z.infer<typeof insertSaleSchema>;
export type Sale = typeof sales.$inferSelect;

export const saleItems = pgTable("sale_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  saleId: varchar("sale_id").references(() => sales.id).notNull(),
  productId: varchar("product_id").references(() => products.id).notNull(),
  quantity: integer("quantity").notNull(),
  price: decimal("price", { precision: 12, scale: 2 }).notNull(),
  total: decimal("total", { precision: 12, scale: 2 }).notNull(),
});

export const insertSaleItemSchema = createInsertSchema(saleItems).omit({ id: true });
export type InsertSaleItem = z.infer<typeof insertSaleItemSchema>;
export type SaleItem = typeof saleItems.$inferSelect;

export const deliveries = pgTable("deliveries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id),
  saleId: varchar("sale_id").references(() => sales.id),
  customerId: varchar("customer_id").references(() => customers.id),
  dealerId: varchar("dealer_id").references(() => dealers.id),
  address: text("address").notNull(),
  status: text("status").notNull().default("pending"),
  notes: text("notes"),
  customerName: text("customer_name"),
  customerPhone: text("customer_phone"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertDeliverySchema = createInsertSchema(deliveries).omit({ id: true, createdAt: true });
export type InsertDelivery = z.infer<typeof insertDeliverySchema>;
export type Delivery = typeof deliveries.$inferSelect;

export const deliveryItems = pgTable("delivery_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  deliveryId: varchar("delivery_id").references(() => deliveries.id).notNull(),
  productId: varchar("product_id").references(() => products.id).notNull(),
  quantity: integer("quantity").notNull(),
  price: numeric("price", { precision: 12, scale: 2 }).notNull(),
  total: numeric("total", { precision: 12, scale: 2 }).notNull(),
});

export const insertDeliveryItemSchema = createInsertSchema(deliveryItems).omit({ id: true });
export type InsertDeliveryItem = z.infer<typeof insertDeliveryItemSchema>;
export type DeliveryItem = typeof deliveryItems.$inferSelect;

export const dealers = pgTable("dealers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id),
  name: text("name").notNull(),
  phone: text("phone"),
  password: text("password"),
  vehicleInfo: text("vehicle_info"),
  debt: decimal("debt", { precision: 12, scale: 2 }).notNull().default("0"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertDealerSchema = createInsertSchema(dealers).omit({ id: true, createdAt: true });
export type InsertDealer = z.infer<typeof insertDealerSchema>;
export type Dealer = typeof dealers.$inferSelect;

export const dealerInventory = pgTable("dealer_inventory", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id),
  dealerId: varchar("dealer_id").references(() => dealers.id).notNull(),
  productId: varchar("product_id").references(() => products.id).notNull(),
  quantity: integer("quantity").notNull().default(0),
});

export const insertDealerInventorySchema = createInsertSchema(dealerInventory).omit({ id: true });
export type InsertDealerInventory = z.infer<typeof insertDealerInventorySchema>;
export type DealerInventory = typeof dealerInventory.$inferSelect;

export const dealerTransactions = pgTable("dealer_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id),
  dealerId: varchar("dealer_id").references(() => dealers.id).notNull(),
  type: text("type").notNull(),
  productId: varchar("product_id").references(() => products.id).notNull(),
  quantity: integer("quantity").notNull(),
  price: decimal("price", { precision: 12, scale: 2 }).notNull().default("0"),
  total: decimal("total", { precision: 12, scale: 2 }).notNull().default("0"),
  customerName: text("customer_name"),
  customerPhone: text("customer_phone"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertDealerTransactionSchema = createInsertSchema(dealerTransactions).omit({ id: true, createdAt: true });
export type InsertDealerTransaction = z.infer<typeof insertDealerTransactionSchema>;
export type DealerTransaction = typeof dealerTransactions.$inferSelect;

export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id),
  type: text("type").notNull(),
  customerId: varchar("customer_id").references(() => customers.id),
  dealerId: varchar("dealer_id").references(() => dealers.id),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  method: text("method").notNull().default("cash"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPaymentSchema = createInsertSchema(payments).omit({ id: true, createdAt: true });
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;

export const dealerCustomers = pgTable("dealer_customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id),
  dealerId: varchar("dealer_id").references(() => dealers.id).notNull(),
  name: text("name").notNull(),
  phone: text("phone"),
  debt: decimal("debt", { precision: 12, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertDealerCustomerSchema = createInsertSchema(dealerCustomers).omit({ id: true, createdAt: true });
export type InsertDealerCustomer = z.infer<typeof insertDealerCustomerSchema>;
export type DealerCustomer = typeof dealerCustomers.$inferSelect;

export const suppliers = pgTable("suppliers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id),
  name: text("name").notNull(),
  phone: text("phone"),
  company: text("company"),
  address: text("address"),
  active: boolean("active").notNull().default(true),
});

export const insertSupplierSchema = createInsertSchema(suppliers).omit({ id: true });
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type Supplier = typeof suppliers.$inferSelect;

export const purchases = pgTable("purchases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id),
  supplierId: varchar("supplier_id").references(() => suppliers.id),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  paidAmount: decimal("paid_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPurchaseSchema = createInsertSchema(purchases).omit({ id: true, createdAt: true });
export type InsertPurchase = z.infer<typeof insertPurchaseSchema>;
export type Purchase = typeof purchases.$inferSelect;

export const purchaseItems = pgTable("purchase_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  purchaseId: varchar("purchase_id").references(() => purchases.id).notNull(),
  productId: varchar("product_id").references(() => products.id).notNull(),
  quantity: integer("quantity").notNull(),
  costPrice: decimal("cost_price", { precision: 12, scale: 2 }).notNull(),
  total: decimal("total", { precision: 12, scale: 2 }).notNull(),
});

export const insertPurchaseItemSchema = createInsertSchema(purchaseItems).omit({ id: true });
export type InsertPurchaseItem = z.infer<typeof insertPurchaseItemSchema>;
export type PurchaseItem = typeof purchaseItems.$inferSelect;

export const settings = pgTable("settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id),
  key: text("key").notNull(),
  value: text("value").notNull(),
});

export const insertSettingSchema = createInsertSchema(settings).omit({ id: true });
export type InsertSetting = z.infer<typeof insertSettingSchema>;
export type Setting = typeof settings.$inferSelect;

export const globalSettings = pgTable("global_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
});

export type GlobalSetting = typeof globalSettings.$inferSelect;

export const ALL_PERMISSIONS = [
  "pos.sell",
  "pos.discount",
  "pos.debt_sale",
  "customers.view",
  "customers.create",
  "customers.edit",
  "products.view",
  "products.create",
  "products.edit",
  "products.stock",
  "warehouse.view",
  "roles.view",
  "roles.manage",
  "employees.view",
  "employees.manage",
  "deliveries.view",
  "deliveries.manage",
  "dealers.view",
  "dealers.manage",
  "settings.manage",
  "reports.view",
] as const;

export type Permission = typeof ALL_PERMISSIONS[number];
