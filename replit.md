# MARKET_LINE - Multi-Tenant SaaS Business Management System

## Overview
A comprehensive multi-tenant SaaS business management system built with React + Express + PostgreSQL. Each store owner registers and gets their own isolated workspace. Includes POS (Point of Sale) with 58mm receipt printing, warehouse management, customer management, role-based access, employee management, delivery tracking, supplier management, inventory procurement, and a customer portal with Telegram OTP authentication. App name: MARKET_LINE. UI in Uzbek language.

## Architecture
- **Frontend**: React + TypeScript + Tailwind CSS + shadcn/ui components
- **Backend**: Express.js REST API with session-based auth
- **Database**: PostgreSQL with Drizzle ORM
- **Sessions**: express-session + custom PgSessionStore (stored in PostgreSQL, no connect-pg-simple)
- **Routing**: wouter (frontend)
- **State Management**: TanStack React Query
- **Telegram OTP**: Bot API for OTP verification, webhook for phone linking
- **Multi-tenancy**: All data tables have `tenantId` FK to `tenants` table

## Multi-Tenant SaaS Architecture
- `tenants` table: id, name, ownerName, phone, password, plan, active, createdAt
- All data tables (roles, employees, categories, products, customers, sales, deliveries, suppliers, purchases, settings) have `tenantId` column
- Storage methods require `tenantId` parameter for list/query operations
- Session stores `tenantId`, `ownerId` for admin, `customerId`+`tenantId` for portal
- `requireTenant` middleware enforces auth on admin API routes
- On tenant registration, default roles (Administrator, Kassir, Omborchi) and admin employee are created via `seedTenantData()`

## Routing Structure
- `/` - Landing page (public) with features showcase and pricing plans
- `/auth/login` - Owner login
- `/auth/register` - Owner registration (creates tenant + seeds initial data)
- `/dashboard`, `/pos`, `/products`, etc. - Admin panel (requires tenant auth)
- `/portal` - Customer portal (requires customer auth within a tenant)
- `/dealer-portal` - Dealer portal (phone + password auth within a tenant)
- `/saas-admin` - Super admin panel (password-protected, manages all tenants & plans, change password)

## Admin Modules (/dashboard, /pos, etc.)
1. **Dashboard** - Overview stats (sales, stock, customers, debt)
2. **POS** - Point of Sale with cart, discounts, cash/debt payment, product images, 58mm receipt printing, search & category filter
3. **Warehouse** - Stock overview with catalog view
4. **Categories** - Category CRUD with product counts
5. **Products** - Product CRUD with categories, pricing, stock levels, image upload, units (dona/quti/kg/gram/litr/metr)
6. **Customers** - Customer management with debt tracking, QR code generation (portal link with store+phone prefilled, downloadable PNG with branding)
7. **Deliveries** - Delivery status tracking, print list/individual, "Mahsulot olish" for unknown customers (pickup with product selection, auto stock deduction, delivery_items table)
8. **Suppliers** - Supplier management (name, phone, company, address)
9. **Purchases (Kirim)** - Inventory procurement from suppliers, auto-updates stock
10. **Orders (Buyurtmalar)** - Portal order management with full flow (confirm, send to delivery, shipped, customer receive), status filter, print list and individual order
11. **Dillerlar** - Dealer management: ombordan mahsulot yuklash, mijozga sotish, omborga qaytarish, inventory tracking, transaction history with print; category filter in load dialog; password field for dealer portal access
12. **Roles** - Role creation with granular permissions
12. **Employees** - Employee management with role assignment
13. **Settings** - Company info, Telegram bot config, webhook setup

## Customer Portal (/portal)
- Login with store selector (fetches active tenants from `/api/tenants/public`), Registration (with Telegram OTP), Password Reset
- Catalog browsing with search & category filter, Cart & Order placement
- Orders list with detail view: see products, prices, status
- Order statuses: pending → completed (admin confirms) → delivering (sent to delivery) → shipped (delivery person confirms) → delivered (customer receives)
- Customer can click "Qabul qildim" when order status is "shipped" (via PATCH `/api/portal/orders/:id/receive`)
- When admin sets order to "delivering", a delivery record is auto-created in deliveries table
- PDF export: full orders list or individual order detail (printable HTML)
- Debt Tracking with payment history

## Dealer Portal (/dealer-portal)
- Login with store selector + phone + password (password set by admin)
- Inventory view: see all products loaded by admin with quantities and values
- Sell: select products from inventory, enter customer info, confirm sale (decreases dealer inventory)
- History: view all transactions (load/sell/return) with details
- Debt & Payments: view current debt and payment history
- API: `/api/dealer-portal/login`, `/api/dealer-portal/me`, `/api/dealer-portal/logout`, `/api/dealer-portal/inventory`, `/api/dealer-portal/transactions`, `/api/dealer-portal/payments`, `/api/dealer-portal/sell`

## Key Files
- `shared/schema.ts` - All database schemas with tenantId columns
- `server/routes.ts` - API endpoints (tenant auth + admin + portal + telegram)
- `server/storage.ts` - Tenant-scoped database operations
- `server/seed.ts` - `seedTenantData()` creates default roles/admin for new tenants
- `server/index.ts` - Express app with session middleware
- `client/src/App.tsx` - Main app with landing/auth/admin/portal routing
- `client/src/pages/landing.tsx` - Public landing page
- `client/src/pages/auth/login.tsx` - Owner login
- `client/src/pages/auth/register.tsx` - Owner registration

## Super Admin Panel (/saas-admin)
- Password-protected via `SUPER_ADMIN_PASSWORD` env var (default: admin2025)
- Session field `superAdmin: boolean` with `requireSuperAdmin` middleware
- Features: tenant listing, plan/active toggling, plan CRUD, stats overview, tenant deletion with confirmation, password change
- API: `/api/super/login`, `/api/super/me`, `/api/super/logout`, `/api/super/tenants` (GET/PATCH/DELETE), `/api/super/plans` (GET/POST/PATCH/DELETE), `/api/super/stats`, `/api/super/change-password` (POST)
- Plans table stores pricing info (name, slug, price, maxProducts, maxEmployees, features, sortOrder)
- Landing page pricing dynamically fetches from `/api/plans/public`

## API Routes
- `/api/auth/register` - Owner registration (POST)
- `/api/auth/login` - Owner login (POST)
- `/api/auth/me` - Current tenant/owner info (GET)
- `/api/auth/logout` - Owner logout (POST)
- `/api/portal/*` - Customer portal endpoints (require tenantId)
- `/api/telegram/*` - Telegram webhook and setup
- `/api/super/*` - Super admin endpoints (require superAdmin session)
- `/api/plans/public` - Public plans list (GET, no auth)
- All `/api/*` admin routes use `requireTenant` middleware

## Database Tables
- plans, tenants, roles, employees, categories, products, customers, sales, sale_items, deliveries, delivery_items, settings, suppliers, purchases, purchase_items, dealers, dealer_inventory, dealer_transactions, session

## Language
UI is in Uzbek language (O'zbek tili)

## Design
Glassmorphism with backdrop-blur, colorful sidebar icons, dark gradient backgrounds
