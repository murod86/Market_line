# Smart POS - Business Management System

## Overview
A comprehensive SaaS business management system built with React + Express + PostgreSQL. Includes POS (Point of Sale), warehouse management, customer management, role-based access, employee management, and delivery tracking.

## Architecture
- **Frontend**: React + TypeScript + Tailwind CSS + shadcn/ui components
- **Backend**: Express.js REST API
- **Database**: PostgreSQL with Drizzle ORM
- **Routing**: wouter (frontend)
- **State Management**: TanStack React Query

## Modules
1. **Dashboard** - Overview stats (sales, stock, customers, debt)
2. **POS** - Point of Sale with cart, discounts, cash/debt payment
3. **Warehouse** - Stock overview with catalog view
4. **Products** - Product CRUD with categories, pricing, stock levels
5. **Customers** - Customer management with debt tracking
6. **Deliveries** - Delivery status tracking
7. **Roles** - Role creation with granular permissions
8. **Employees** - Employee management with role assignment
9. **Settings** - Company info, Telegram bot config

## Key Files
- `shared/schema.ts` - All database schemas and types
- `server/routes.ts` - API endpoints
- `server/storage.ts` - Database operations (DatabaseStorage class)
- `server/db.ts` - Database connection
- `server/seed.ts` - Seed data
- `client/src/App.tsx` - Main app with routing and sidebar
- `client/src/components/app-sidebar.tsx` - Navigation sidebar
- `client/src/pages/` - All page components

## Database Tables
- roles, employees, categories, products, customers, sales, sale_items, deliveries, settings

## Language
UI is in Uzbek language (O'zbek tili)
