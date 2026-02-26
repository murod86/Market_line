import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { products, customers, sales, saleItems, deliveries } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import {
  insertRoleSchema, insertEmployeeSchema, insertCategorySchema,
  insertProductSchema, insertCustomerSchema, insertDeliverySchema,
} from "@shared/schema";
import { createHash } from "crypto";

function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

function stripPassword(employee: any) {
  const { password, ...rest } = employee;
  return rest;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ===== ROLES =====
  app.get("/api/roles", async (_req, res) => {
    const data = await storage.getRoles();
    res.json(data);
  });

  app.post("/api/roles", async (req, res) => {
    try {
      const parsed = insertRoleSchema.parse(req.body);
      const role = await storage.createRole(parsed);
      res.json(role);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/roles/:id", async (req, res) => {
    const role = await storage.updateRole(req.params.id, req.body);
    if (!role) return res.status(404).json({ message: "Role not found" });
    res.json(role);
  });

  app.delete("/api/roles/:id", async (req, res) => {
    await storage.deleteRole(req.params.id);
    res.json({ success: true });
  });

  // ===== EMPLOYEES =====
  app.get("/api/employees", async (_req, res) => {
    const data = await storage.getEmployees();
    res.json(data.map(stripPassword));
  });

  app.post("/api/employees", async (req, res) => {
    try {
      const data = { ...req.body, password: hashPassword(req.body.password) };
      const parsed = insertEmployeeSchema.parse(data);
      const employee = await storage.createEmployee(parsed);
      res.json(stripPassword(employee));
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/employees/:id", async (req, res) => {
    try {
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
  app.get("/api/categories", async (_req, res) => {
    const data = await storage.getCategories();
    res.json(data);
  });

  app.post("/api/categories", async (req, res) => {
    try {
      const parsed = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(parsed);
      res.json(category);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/categories/:id", async (req, res) => {
    const category = await storage.updateCategory(req.params.id, req.body);
    if (!category) return res.status(404).json({ message: "Category not found" });
    res.json(category);
  });

  app.delete("/api/categories/:id", async (req, res) => {
    await storage.deleteCategory(req.params.id);
    res.json({ success: true });
  });

  // ===== PRODUCTS =====
  app.get("/api/products", async (_req, res) => {
    const data = await storage.getProducts();
    res.json(data);
  });

  app.get("/api/products/:id", async (req, res) => {
    const product = await storage.getProduct(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  });

  app.post("/api/products", async (req, res) => {
    try {
      const parsed = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(parsed);
      res.json(product);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/products/:id", async (req, res) => {
    const product = await storage.updateProduct(req.params.id, req.body);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  });

  // ===== CUSTOMERS =====
  app.get("/api/customers", async (_req, res) => {
    const data = await storage.getCustomers();
    res.json(data.map(({ password: _, ...c }) => c));
  });

  app.get("/api/customers/:id", async (req, res) => {
    const customer = await storage.getCustomer(req.params.id);
    if (!customer) return res.status(404).json({ message: "Customer not found" });
    const { password: _, ...safe } = customer;
    res.json(safe);
  });

  app.post("/api/customers", async (req, res) => {
    try {
      const parsed = insertCustomerSchema.parse(req.body);
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

  app.patch("/api/customers/:id", async (req, res) => {
    const updateData = { ...req.body };
    if (updateData.password) {
      updateData.password = hashPassword(updateData.password);
    }
    const customer = await storage.updateCustomer(req.params.id, updateData);
    if (!customer) return res.status(404).json({ message: "Customer not found" });
    const { password: _, ...safe } = customer;
    res.json(safe);
  });

  // ===== SALES (POS) - Transactional =====
  app.get("/api/sales", async (_req, res) => {
    const data = await storage.getSales();
    res.json(data);
  });

  app.get("/api/sales/:id", async (req, res) => {
    const sale = await storage.getSale(req.params.id);
    if (!sale) return res.status(404).json({ message: "Sale not found" });
    const items = await storage.getSaleItems(req.params.id);
    res.json({ ...sale, items });
  });

  app.post("/api/sales", async (req, res) => {
    try {
      const { items, customerId, discount, paidAmount, paymentType, employeeId } = req.body;

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
  app.get("/api/deliveries", async (_req, res) => {
    const data = await storage.getDeliveries();
    res.json(data);
  });

  app.post("/api/deliveries", async (req, res) => {
    try {
      const parsed = insertDeliverySchema.parse(req.body);
      const delivery = await storage.createDelivery(parsed);
      res.json(delivery);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/deliveries/:id", async (req, res) => {
    const delivery = await storage.updateDelivery(req.params.id, req.body);
    if (!delivery) return res.status(404).json({ message: "Delivery not found" });
    res.json(delivery);
  });

  // ===== SETTINGS =====
  app.get("/api/settings", async (_req, res) => {
    const data = await storage.getSettings();
    res.json(data);
  });

  app.post("/api/settings", async (req, res) => {
    const { key, value } = req.body;
    if (!key || value === undefined) {
      return res.status(400).json({ message: "Key and value are required" });
    }
    const setting = await storage.upsertSetting(key, value);
    res.json(setting);
  });

  // ===== CUSTOMER PORTAL AUTH =====
  app.post("/api/portal/login", async (req, res) => {
    try {
      const { phone, password } = req.body;
      if (!phone || !password) {
        return res.status(400).json({ message: "Telefon va parol majburiy" });
      }
      const customer = await storage.getCustomerByPhone(phone);
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
      const { password: _, ...safe } = customer;
      res.json(safe);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/portal/register", async (req, res) => {
    try {
      const { fullName, phone, password, address } = req.body;
      if (!fullName || !phone || !password) {
        return res.status(400).json({ message: "Ism, telefon va parol majburiy" });
      }
      const existing = await storage.getCustomerByPhone(phone);
      if (existing) {
        return res.status(400).json({ message: "Bu telefon raqam allaqachon ro'yxatdan o'tgan" });
      }
      const customer = await storage.createCustomer({
        fullName,
        phone,
        password: hashPassword(password),
        address: address || null,
        telegramId: null,
        active: true,
        debt: "0",
      });
      req.session.customerId = customer.id;
      req.session.customerName = customer.fullName;
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

  app.get("/api/portal/catalog", async (req, res) => {
    const allProducts = await storage.getProducts();
    const catalog = allProducts
      .filter(p => p.active && p.stock > 0)
      .map(({ costPrice, minStock, ...p }) => p);
    res.json(catalog);
  });

  app.get("/api/portal/categories", async (_req, res) => {
    const data = await storage.getCategories();
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
    res.json({ ...sale, items });
  });

  app.post("/api/portal/orders", async (req, res) => {
    if (!req.session.customerId) {
      return res.status(401).json({ message: "Tizimga kirilmagan" });
    }
    try {
      const { items, address, notes } = req.body;
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "Mahsulotlar majburiy" });
      }

      for (const item of items) {
        if (!item.productId || typeof item.productId !== "string") {
          return res.status(400).json({ message: "Mahsulot ID noto'g'ri" });
        }
        if (!Number.isInteger(item.quantity) || item.quantity < 1) {
          return res.status(400).json({ message: "Miqdor musbat butun son bo'lishi kerak" });
        }
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
          await tx.update(customers).set({
            debt: newDebt.toFixed(2),
          }).where(eq(customers.id, req.session.customerId!));
        }

        if (address) {
          await tx.insert(deliveries).values({
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

  // ===== DASHBOARD STATS =====
  app.get("/api/stats", async (_req, res) => {
    try {
      const allProducts = await storage.getProducts();
      const allCustomers = await storage.getCustomers();
      const allSales = await storage.getSales();

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
        totalProducts,
        lowStockProducts,
        totalCustomers,
        totalDebt,
        totalSales,
        totalRevenue,
        todaySales: todaySales.length,
        todayRevenue,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  return httpServer;
}
