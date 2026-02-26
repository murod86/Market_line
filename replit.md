# MARKET_LINE - Business Management System

## Overview
A comprehensive SaaS business management system built with React + Express + PostgreSQL. Includes POS (Point of Sale), warehouse management, customer management, role-based access, employee management, delivery tracking, supplier management, inventory procurement, and a customer portal with Telegram OTP authentication. App name: MARKET_LINE.

## Architecture
- **Frontend**: React + TypeScript + Tailwind CSS + shadcn/ui components
- **Backend**: Express.js REST API with session-based auth
- **Database**: PostgreSQL with Drizzle ORM
- **Sessions**: express-session + connect-pg-simple (stored in PostgreSQL)
- **Routing**: wouter (frontend)
- **State Management**: TanStack React Query
- **Telegram OTP**: Bot API for OTP verification, webhook for phone linking

## Admin Modules (root path /)
1. **Dashboard** - Overview stats (sales, stock, customers, debt)
2. **POS** - Point of Sale with cart, discounts, cash/debt payment, product images, 58mm receipt printing
3. **Warehouse** - Stock overview with catalog view
4. **Products** - Product CRUD with categories, pricing, stock levels, image upload
5. **Customers** - Customer management with debt tracking
6. **Deliveries** - Delivery status tracking with order details
7. **Suppliers** - Supplier management (name, phone, company, address)
8. **Purchases (Kirim)** - Inventory procurement from suppliers, auto-updates stock
9. **Roles** - Role creation with granular permissions
10. **Employees** - Employee management with role assignment
11. **Settings** - Company info, Telegram bot config, webhook setup

## Customer Portal (/portal)
- **Login** - Phone + password authentication
- **Registration** - Telegram OTP verification flow (phone → OTP → details → register)
- **Password Reset** - Telegram OTP-based password recovery
- **Catalog** - Browse products, filter by category, search
- **Cart & Orders** - Add to cart, place orders (debt-based)
- **Debt Tracking** - View current debt, payment history
- Customer passwords are SHA-256 hashed
- Sessions stored in PostgreSQL via connect-pg-simple

## Telegram OTP System
- Customers link phone to Telegram via bot (/start → share phone)
- OTP codes sent via Telegram Bot API (4-digit, 5-min expiry)
- In-memory OTP store (Map) for short-lived codes
- Bot webhook endpoint: POST /api/telegram/webhook
- Webhook setup endpoint: POST /api/telegram/setup-webhook
- OTP endpoints: send-otp, send-register-otp, verify-otp, register-otp, reset-password

## Key Files
- `shared/schema.ts` - All database schemas and types
- `server/routes.ts` - API endpoints (admin + portal + telegram webhook + OTP)
- `server/storage.ts` - Database operations (DatabaseStorage class)
- `server/index.ts` - Express app with session middleware
- `server/db.ts` - Database connection
- `server/seed.ts` - Seed data (5 customers with passwords)
- `client/src/App.tsx` - Main app with admin/portal routing
- `client/src/components/app-sidebar.tsx` - Admin navigation sidebar
- `client/src/pages/` - Admin page components
- `client/src/pages/portal/` - Customer portal components

## API Routes
- `/api/portal/login` - Customer login (POST)
- `/api/portal/register` - Customer registration (POST)
- `/api/portal/send-otp` - Send OTP for password reset (POST)
- `/api/portal/send-register-otp` - Send OTP for registration (POST)
- `/api/portal/verify-otp` - Verify OTP code (POST)
- `/api/portal/register-otp` - Register with verified OTP (POST)
- `/api/portal/reset-password` - Reset password with OTP (POST)
- `/api/portal/me` - Current customer info (GET)
- `/api/portal/logout` - Customer logout (POST)
- `/api/portal/catalog` - Product catalog (GET)
- `/api/portal/categories` - Categories (GET)
- `/api/portal/orders` - Customer orders (GET/POST)
- `/api/telegram/webhook` - Telegram bot webhook (POST)
- `/api/telegram/setup-webhook` - Setup Telegram webhook (POST)
- All other `/api/*` routes - Admin CRUD operations

## Database Tables
- roles, employees, categories, products, customers, sales, sale_items, deliveries, settings, suppliers, purchases, purchase_items, session (for express-session)

## Test Credentials (Seed Data)
- Customer: +998901111111 / 1111
- Customer: +998902222222 / 2222

## Language
UI is in Uzbek language (O'zbek tili)
