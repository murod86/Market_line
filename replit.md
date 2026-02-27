# MARKET_LINE - Multi-Tenant SaaS Business Management System

## Overview
A comprehensive multi-tenant SaaS business management system built with React + Express + PostgreSQL. Each store owner registers and gets their own isolated workspace. Includes POS (Point of Sale) with 58mm receipt printing, warehouse management, customer management, role-based access, employee management, delivery tracking, supplier management, inventory procurement, and a customer portal with Telegram OTP authentication. App name: MARKET_LINE. UI in Uzbek language.

## Architecture
- **Frontend**: React + TypeScript + Tailwind CSS + shadcn/ui components
- **Backend**: Express.js REST API with session-based auth
- **Database**: PostgreSQL with Drizzle ORM
- **Sessions**: express-session + connect-pg-simple (stored in PostgreSQL)
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

## Admin Modules (/dashboard, /pos, etc.)
1. **Dashboard** - Overview stats (sales, stock, customers, debt)
2. **POS** - Point of Sale with cart, discounts, cash/debt payment, product images, 58mm receipt printing
3. **Warehouse** - Stock overview with catalog view
4. **Categories** - Category CRUD with product counts
5. **Products** - Product CRUD with categories, pricing, stock levels, image upload
6. **Customers** - Customer management with debt tracking
7. **Deliveries** - Delivery status tracking with order details
8. **Suppliers** - Supplier management (name, phone, company, address)
9. **Purchases (Kirim)** - Inventory procurement from suppliers, auto-updates stock
10. **Roles** - Role creation with granular permissions
11. **Employees** - Employee management with role assignment
12. **Settings** - Company info, Telegram bot config, webhook setup

## Customer Portal (/portal)
- Login, Registration (with Telegram OTP), Password Reset
- Catalog browsing, Cart & Orders, Debt Tracking

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

## API Routes
- `/api/auth/register` - Owner registration (POST)
- `/api/auth/login` - Owner login (POST)
- `/api/auth/me` - Current tenant/owner info (GET)
- `/api/auth/logout` - Owner logout (POST)
- `/api/portal/*` - Customer portal endpoints (require tenantId)
- `/api/telegram/*` - Telegram webhook and setup
- All `/api/*` admin routes use `requireTenant` middleware

## Database Tables
- tenants, roles, employees, categories, products, customers, sales, sale_items, deliveries, settings, suppliers, purchases, purchase_items, session

## Language
UI is in Uzbek language (O'zbek tili)

## Design
Glassmorphism with backdrop-blur, colorful sidebar icons, dark gradient backgrounds
