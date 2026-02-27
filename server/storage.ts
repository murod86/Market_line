import { eq, desc, and, sql } from "drizzle-orm";
import { db } from "./db";
import {
  plans, tenants, roles, employees, categories, products, customers,
  sales, saleItems, deliveries, settings,
  suppliers, purchases, purchaseItems,
  type InsertPlan, type Plan,
  type InsertTenant, type Tenant,
  type InsertRole, type Role,
  type InsertEmployee, type Employee,
  type InsertCategory, type Category,
  type InsertProduct, type Product,
  type InsertCustomer, type Customer,
  type InsertSale, type Sale,
  type InsertSaleItem, type SaleItem,
  type InsertDelivery, type Delivery,
  type InsertSetting, type Setting,
  type InsertSupplier, type Supplier,
  type InsertPurchase, type Purchase,
  type InsertPurchaseItem, type PurchaseItem,
} from "@shared/schema";

export interface IStorage {
  getPlans(): Promise<Plan[]>;
  getPlan(id: string): Promise<Plan | undefined>;
  createPlan(plan: InsertPlan): Promise<Plan>;
  updatePlan(id: string, data: Partial<InsertPlan>): Promise<Plan | undefined>;
  deletePlan(id: string): Promise<void>;

  getAllTenants(): Promise<Tenant[]>;
  createTenant(tenant: InsertTenant): Promise<Tenant>;
  getTenant(id: string): Promise<Tenant | undefined>;
  getTenantByPhone(phone: string): Promise<Tenant | undefined>;
  updateTenant(id: string, data: Partial<InsertTenant>): Promise<Tenant | undefined>;

  getRoles(tenantId: string): Promise<Role[]>;
  getRole(id: string): Promise<Role | undefined>;
  createRole(role: InsertRole): Promise<Role>;
  updateRole(id: string, role: Partial<InsertRole>): Promise<Role | undefined>;
  deleteRole(id: string): Promise<void>;

  getEmployees(tenantId: string): Promise<Employee[]>;
  getEmployee(id: string): Promise<Employee | undefined>;
  getEmployeeByUsername(username: string, tenantId: string): Promise<Employee | undefined>;
  createEmployee(employee: InsertEmployee): Promise<Employee>;
  updateEmployee(id: string, employee: Partial<InsertEmployee>): Promise<Employee | undefined>;

  getCategories(tenantId: string): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: string, category: Partial<InsertCategory>): Promise<Category | undefined>;
  deleteCategory(id: string): Promise<void>;

  getProducts(tenantId: string): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined>;

  getCustomers(tenantId: string): Promise<Customer[]>;
  getCustomer(id: string): Promise<Customer | undefined>;
  getCustomerByPhone(phone: string, tenantId: string): Promise<Customer | undefined>;
  getCustomerByTelegramId(telegramId: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: string, customer: Partial<InsertCustomer>): Promise<Customer | undefined>;
  getCustomerSales(customerId: string): Promise<Sale[]>;

  getSales(tenantId: string): Promise<Sale[]>;
  getSale(id: string): Promise<Sale | undefined>;
  createSale(sale: InsertSale): Promise<Sale>;

  getSaleItems(saleId: string): Promise<SaleItem[]>;
  createSaleItem(item: InsertSaleItem): Promise<SaleItem>;

  getDeliveries(tenantId: string): Promise<Delivery[]>;
  getDelivery(id: string): Promise<Delivery | undefined>;
  createDelivery(delivery: InsertDelivery): Promise<Delivery>;
  updateDelivery(id: string, delivery: Partial<InsertDelivery>): Promise<Delivery | undefined>;

  getSuppliers(tenantId: string): Promise<Supplier[]>;
  getSupplier(id: string): Promise<Supplier | undefined>;
  createSupplier(supplier: InsertSupplier): Promise<Supplier>;
  updateSupplier(id: string, supplier: Partial<InsertSupplier>): Promise<Supplier | undefined>;

  getPurchases(tenantId: string): Promise<Purchase[]>;
  getPurchase(id: string): Promise<Purchase | undefined>;
  createPurchase(purchase: InsertPurchase): Promise<Purchase>;
  getPurchaseItems(purchaseId: string): Promise<PurchaseItem[]>;
  createPurchaseItem(item: InsertPurchaseItem): Promise<PurchaseItem>;

  getSettings(tenantId: string): Promise<Setting[]>;
  getSetting(key: string, tenantId: string): Promise<Setting | undefined>;
  upsertSetting(key: string, value: string, tenantId: string): Promise<Setting>;
}

export class DatabaseStorage implements IStorage {
  async getPlans(): Promise<Plan[]> {
    return await db.select().from(plans).orderBy(plans.sortOrder);
  }

  async getPlan(id: string): Promise<Plan | undefined> {
    const [plan] = await db.select().from(plans).where(eq(plans.id, id));
    return plan;
  }

  async createPlan(plan: InsertPlan): Promise<Plan> {
    const [created] = await db.insert(plans).values(plan).returning();
    return created;
  }

  async updatePlan(id: string, data: Partial<InsertPlan>): Promise<Plan | undefined> {
    const [updated] = await db.update(plans).set(data).where(eq(plans.id, id)).returning();
    return updated;
  }

  async deletePlan(id: string): Promise<void> {
    await db.delete(plans).where(eq(plans.id, id));
  }

  async getAllTenants(): Promise<Tenant[]> {
    return await db.select().from(tenants).orderBy(desc(tenants.createdAt));
  }

  async createTenant(tenant: InsertTenant): Promise<Tenant> {
    const [created] = await db.insert(tenants).values(tenant).returning();
    return created;
  }

  async getTenant(id: string): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id));
    return tenant;
  }

  async getTenantByPhone(phone: string): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.phone, phone));
    return tenant;
  }

  async updateTenant(id: string, data: Partial<InsertTenant>): Promise<Tenant | undefined> {
    const [updated] = await db.update(tenants).set(data).where(eq(tenants.id, id)).returning();
    return updated;
  }

  async getRoles(tenantId: string): Promise<Role[]> {
    return await db.select().from(roles).where(eq(roles.tenantId, tenantId));
  }

  async getRole(id: string): Promise<Role | undefined> {
    const [role] = await db.select().from(roles).where(eq(roles.id, id));
    return role;
  }

  async createRole(role: InsertRole): Promise<Role> {
    const [created] = await db.insert(roles).values(role).returning();
    return created;
  }

  async updateRole(id: string, role: Partial<InsertRole>): Promise<Role | undefined> {
    const [updated] = await db.update(roles).set(role).where(eq(roles.id, id)).returning();
    return updated;
  }

  async deleteRole(id: string): Promise<void> {
    await db.delete(roles).where(eq(roles.id, id));
  }

  async getEmployees(tenantId: string): Promise<Employee[]> {
    return await db.select().from(employees).where(eq(employees.tenantId, tenantId));
  }

  async getEmployee(id: string): Promise<Employee | undefined> {
    const [employee] = await db.select().from(employees).where(eq(employees.id, id));
    return employee;
  }

  async getEmployeeByUsername(username: string, tenantId: string): Promise<Employee | undefined> {
    const [employee] = await db.select().from(employees).where(
      and(eq(employees.username, username), eq(employees.tenantId, tenantId))
    );
    return employee;
  }

  async createEmployee(employee: InsertEmployee): Promise<Employee> {
    const [created] = await db.insert(employees).values(employee).returning();
    return created;
  }

  async updateEmployee(id: string, employee: Partial<InsertEmployee>): Promise<Employee | undefined> {
    const [updated] = await db.update(employees).set(employee).where(eq(employees.id, id)).returning();
    return updated;
  }

  async getCategories(tenantId: string): Promise<Category[]> {
    return await db.select().from(categories).where(eq(categories.tenantId, tenantId));
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [created] = await db.insert(categories).values(category).returning();
    return created;
  }

  async updateCategory(id: string, category: Partial<InsertCategory>): Promise<Category | undefined> {
    const [updated] = await db.update(categories).set(category).where(eq(categories.id, id)).returning();
    return updated;
  }

  async deleteCategory(id: string): Promise<void> {
    await db.delete(categories).where(eq(categories.id, id));
  }

  async getProducts(tenantId: string): Promise<Product[]> {
    return await db.select().from(products).where(eq(products.tenantId, tenantId));
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [created] = await db.insert(products).values(product).returning();
    return created;
  }

  async updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined> {
    const [updated] = await db.update(products).set(product).where(eq(products.id, id)).returning();
    return updated;
  }

  async getCustomers(tenantId: string): Promise<Customer[]> {
    return await db.select().from(customers).where(eq(customers.tenantId, tenantId));
  }

  async getCustomer(id: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer;
  }

  async getCustomerByPhone(phone: string, tenantId: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(
      and(eq(customers.phone, phone), eq(customers.tenantId, tenantId))
    );
    return customer;
  }

  async getCustomerByTelegramId(telegramId: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.telegramId, telegramId));
    return customer;
  }

  async getCustomerSales(customerId: string): Promise<Sale[]> {
    return await db.select().from(sales).where(eq(sales.customerId, customerId)).orderBy(desc(sales.createdAt));
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const [created] = await db.insert(customers).values(customer).returning();
    return created;
  }

  async updateCustomer(id: string, customer: Partial<InsertCustomer>): Promise<Customer | undefined> {
    const [updated] = await db.update(customers).set(customer).where(eq(customers.id, id)).returning();
    return updated;
  }

  async getSales(tenantId: string): Promise<Sale[]> {
    return await db.select().from(sales).where(eq(sales.tenantId, tenantId)).orderBy(desc(sales.createdAt));
  }

  async getSale(id: string): Promise<Sale | undefined> {
    const [sale] = await db.select().from(sales).where(eq(sales.id, id));
    return sale;
  }

  async createSale(sale: InsertSale): Promise<Sale> {
    const [created] = await db.insert(sales).values(sale).returning();
    return created;
  }

  async getSaleItems(saleId: string): Promise<SaleItem[]> {
    return await db.select().from(saleItems).where(eq(saleItems.saleId, saleId));
  }

  async createSaleItem(item: InsertSaleItem): Promise<SaleItem> {
    const [created] = await db.insert(saleItems).values(item).returning();
    return created;
  }

  async getDeliveries(tenantId: string): Promise<Delivery[]> {
    return await db.select().from(deliveries).where(eq(deliveries.tenantId, tenantId)).orderBy(desc(deliveries.createdAt));
  }

  async getDelivery(id: string): Promise<Delivery | undefined> {
    const [delivery] = await db.select().from(deliveries).where(eq(deliveries.id, id));
    return delivery;
  }

  async createDelivery(delivery: InsertDelivery): Promise<Delivery> {
    const [created] = await db.insert(deliveries).values(delivery).returning();
    return created;
  }

  async updateDelivery(id: string, delivery: Partial<InsertDelivery>): Promise<Delivery | undefined> {
    const [updated] = await db.update(deliveries).set(delivery).where(eq(deliveries.id, id)).returning();
    return updated;
  }

  async getSettings(tenantId: string): Promise<Setting[]> {
    return await db.select().from(settings).where(eq(settings.tenantId, tenantId));
  }

  async getSetting(key: string, tenantId: string): Promise<Setting | undefined> {
    const [setting] = await db.select().from(settings).where(
      and(eq(settings.key, key), eq(settings.tenantId, tenantId))
    );
    return setting;
  }

  async upsertSetting(key: string, value: string, tenantId: string): Promise<Setting> {
    const existing = await this.getSetting(key, tenantId);
    if (existing) {
      const [updated] = await db.update(settings).set({ value }).where(eq(settings.id, existing.id)).returning();
      return updated;
    }
    const [created] = await db.insert(settings).values({ key, value, tenantId }).returning();
    return created;
  }

  async getSuppliers(tenantId: string): Promise<Supplier[]> {
    return await db.select().from(suppliers).where(eq(suppliers.tenantId, tenantId));
  }

  async getSupplier(id: string): Promise<Supplier | undefined> {
    const [supplier] = await db.select().from(suppliers).where(eq(suppliers.id, id));
    return supplier;
  }

  async createSupplier(supplier: InsertSupplier): Promise<Supplier> {
    const [created] = await db.insert(suppliers).values(supplier).returning();
    return created;
  }

  async updateSupplier(id: string, supplier: Partial<InsertSupplier>): Promise<Supplier | undefined> {
    const [updated] = await db.update(suppliers).set(supplier).where(eq(suppliers.id, id)).returning();
    return updated;
  }

  async getPurchases(tenantId: string): Promise<Purchase[]> {
    return await db.select().from(purchases).where(eq(purchases.tenantId, tenantId)).orderBy(desc(purchases.createdAt));
  }

  async getPurchase(id: string): Promise<Purchase | undefined> {
    const [purchase] = await db.select().from(purchases).where(eq(purchases.id, id));
    return purchase;
  }

  async createPurchase(purchase: InsertPurchase): Promise<Purchase> {
    const [created] = await db.insert(purchases).values(purchase).returning();
    return created;
  }

  async getPurchaseItems(purchaseId: string): Promise<PurchaseItem[]> {
    return await db.select().from(purchaseItems).where(eq(purchaseItems.purchaseId, purchaseId));
  }

  async createPurchaseItem(item: InsertPurchaseItem): Promise<PurchaseItem> {
    const [created] = await db.insert(purchaseItems).values(item).returning();
    return created;
  }
}

export const storage = new DatabaseStorage();
