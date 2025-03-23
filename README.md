# POS SaaS Application

A comprehensive Point of Sale Software-as-a-Service application built with Supastarter.

## Table of Contents

- [Overview](#overview)
- [Technologies](#technologies)
- [Codebase Structure](#codebase-structure)
- [Database Schema](#database-schema)
  - [Authentication & User Management](#authentication--user-management)
  - [Organization & Multi-tenancy](#organization--multi-tenancy)
  - [Product Management](#product-management)
  - [Inventory Management](#inventory-management)
  - [Sales Management](#sales-management)
  - [Customer Management](#customer-management)
  - [Procurement Management](#procurement-management)
  - [Financial Management](#financial-management)
  - [HR Management](#hr-management)
  - [Other Business Operations](#other-business-operations)
  - [Schema Relationship Highlights](#schema-relationship-highlights)
- [Authentication](#authentication)
- [API Documentation](#api-documentation)
  - [Organization API](#organization-api)
  - [Product API](#product-api)
  - [Rack API](#rack-api)
  - [Category API](#category-api)
  - [Unit API](#unit-api)
  - [Brand API](#brand-api)
  - [Inventory API (Planned)](#inventory-api-planned)
- [Development Guide](#development-guide)
- [Next Steps](#next-steps)

## Overview

The POS SaaS App is a cloud-based Point of Sale system designed for small to medium-sized businesses. It streamlines sales, inventory management, customer tracking, and other operational tasks through an intuitive and scalable platform.

### Key Goals
- Easy-to-use interface for managing daily sales transactions
- Real-time inventory tracking across multiple outlets
- Multi-outlet operations with centralized control
- Integration with external business tools (accounting, CRM)

## Technologies

This application is built using:

- **Framework**: [Next.js](https://nextjs.org/) with App Router
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **UI**: [Shadcn UI](https://ui.shadcn.com/), [Radix UI](https://www.radix-ui.com/), [Tailwind CSS](https://tailwindcss.com/)
- **Database ORM**: [Prisma](https://www.prisma.io/)
- **API**: [Hono](https://hono.dev/) with OpenAPI
- **Authentication**: Custom auth system with session, passkey, and OAuth support
- **Validation**: [Zod](https://zod.dev/)
- **Base Template**: [Supastarter](https://supastarter.dev/)
- **State Management**: Server components with minimal client-side state
- **URL State**: [nuqs](https://github.com/47ng/nuqs)

## Codebase Structure

The application follows a monorepo structure from Supastarter:

```
/packages
  /app                 # Next.js App Router (frontend)
    /components        # Reusable UI components
    /app               # Application routes and pages
  /api                 # API routes
    /src
      /routes          # API route handlers
      /middleware      # Auth and admin middleware
  /auth                # Authentication configuration
  /database            # Prisma schema and database utilities
  /i18n                # Internationalization
  /logs                # Logging configuration
  /mail                # Email templates and sending logic
  /payments            # Payment processing 
  /storage             # File storage utilities
  /utils               # Shared utility functions
```

## Database Schema

The application uses a comprehensive Prisma schema designed to support all aspects of a modern POS system. Below is a detailed breakdown of the models organized by functional area:

### Authentication & User Management

```prisma
model User {
  id            String      @id @default(cuid())
  name          String?
  email         String      @unique
  emailVerified DateTime?
  image         String?
  password      String?
  role          String      @default("user")
  sessions      Session[]
  accounts      Account[]
  verifications Verification[]
  passkeys      Passkey[]
  members       Member[]
  employees     Employee[]
}

model Session {
  id           String   @id @default(cuid())
  userId       String
  expires      DateTime
  sessionToken String   @unique
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([provider, providerAccountId])
}

model Verification {
  id         String   @id @default(cuid())
  userId     String?
  token      String   @unique
  expires    DateTime
  user       User?    @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Passkey {
  id           String   @id @default(cuid())
  userId       String
  credentialId String   @unique
  publicKey    String
  counter      Int
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

### Organization & Multi-tenancy

```prisma
model Organization {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique
  logo        String?
  members     Member[]
  invitations Invitation[]
  outlets     Outlet[]
  products    Product[]
  categories  Category[]
  racks       Rack[]
  units       Unit[]
  brands      Brand[]
  inventory   Inventory[]
  customers   Customer[]
  sales       Sale[]
  purchases   PurchaseOrg[]
  suppliers   Supplier[]
  settings    Setting[]
}

model Member {
  id             String       @id @default(cuid())
  userId         String
  organizationId String
  role           String       @default("MEMBER")
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  @@unique([userId, organizationId])
}

model Invitation {
  id             String       @id @default(cuid())
  email          String
  token          String       @unique
  organizationId String
  role           String       @default("MEMBER")
  expires        DateTime
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
}
```

### Product Management

```prisma
model Product {
  id             String       @id @default(cuid())
  name           String
  sku            String?
  barcode        String?
  description    String?
  price          Decimal      @default(0)
  cost           Decimal      @default(0)
  taxRate        Decimal      @default(0)
  image          String?
  isActive       Boolean      @default(true)
  organizationId String
  categoryId     String?
  brandId        String?
  unitId         String?
  rackId         String?
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  category       Category?    @relation(fields: [categoryId], references: [id])
  brand          Brand?       @relation(fields: [brandId], references: [id])
  unit           Unit?        @relation(fields: [unitId], references: [id])
  rack           Rack?        @relation(fields: [rackId], references: [id])
  inventory      Inventory[]
  saleItems      SaleItem[]
  variations     Variation[]
  purchaseItems  PurchaseItem[]
  warranties     Warranty[]
}

model Category {
  id             String       @id @default(cuid())
  name           String
  description    String?
  parentId       String?
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  parent         Category?    @relation("CategoryHierarchy", fields: [parentId], references: [id])
  children       Category[]   @relation("CategoryHierarchy")
  products       Product[]
}

model Rack {
  id             String       @id @default(cuid())
  name           String
  location       String?
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  products       Product[]
}

model Unit {
  id             String       @id @default(cuid())
  name           String
  abbreviation   String?
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  products       Product[]
}

model Brand {
  id             String       @id @default(cuid())
  name           String
  description    String?
  logo           String?
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  products       Product[]
}

model Variation {
  id             String       @id @default(cuid())
  productId      String
  name           String
  product        Product      @relation(fields: [productId], references: [id], onDelete: Cascade)
  attributes     Attribute[]
}

model Attribute {
  id             String       @id @default(cuid())
  variationId    String
  name           String
  value          String
  variation      Variation    @relation(fields: [variationId], references: [id], onDelete: Cascade)
}
```

### Inventory Management

```prisma
model Inventory {
  id             String       @id @default(cuid())
  productId      String
  outletId       String
  quantity       Int          @default(0)
  minQuantity    Int          @default(0)
  maxQuantity    Int?
  organizationId String
  product        Product      @relation(fields: [productId], references: [id], onDelete: Cascade)
  outlet         Outlet       @relation(fields: [outletId], references: [id], onDelete: Cascade)
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  logs           InventoryLog[]
  @@unique([productId, outletId])
}

model InventoryLog {
  id             String       @id @default(cuid())
  inventoryId    String
  previousQty    Int
  newQty         Int
  change         Int
  reason         String
  performedBy    String
  performedById  String
  inventory      Inventory    @relation(fields: [inventoryId], references: [id], onDelete: Cascade)
}

model Transfer {
  id             String       @id @default(cuid())
  productId      String
  fromOutletId   String
  toOutletId     String
  quantity       Int
  status         String       @default("PENDING") // PENDING, COMPLETED, CANCELLED
  notes          String?
  createdById    String
  product        Product      @relation(fields: [productId], references: [id], onDelete: Cascade)
  fromOutlet     Outlet       @relation("TransferFromOutlet", fields: [fromOutletId], references: [id])
  toOutlet       Outlet       @relation("TransferToOutlet", fields: [toOutletId], references: [id])
}

model Damage {
  id             String       @id @default(cuid())
  productId      String
  outletId       String
  quantity       Int
  reason         String
  notes          String?
  reportedById   String
  product        Product      @relation(fields: [productId], references: [id], onDelete: Cascade)
  outlet         Outlet       @relation(fields: [outletId], references: [id], onDelete: Cascade)
}
```

### Sales Management

```prisma
model Outlet {
  id             String       @id @default(cuid())
  name           String
  address        String?
  phone          String?
  email          String?
  isActive       Boolean      @default(true)
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  inventory      Inventory[]
  sales          Sale[]
  transfersFrom  Transfer[]   @relation("TransferFromOutlet")
  transfersTo    Transfer[]   @relation("TransferToOutlet")
  damages        Damage[]
}

model Sale {
  id             String       @id @default(cuid())
  invoiceNumber  String
  date           DateTime     @default(now())
  status         String       @default("COMPLETED") // PENDING, COMPLETED, CANCELLED
  subtotal       Decimal      @default(0)
  taxAmount      Decimal      @default(0)
  discountAmount Decimal      @default(0)
  total          Decimal      @default(0)
  paidAmount     Decimal      @default(0)
  changeAmount   Decimal      @default(0)
  paymentMethod  String       @default("CASH") // CASH, CARD, TRANSFER, etc.
  customerId     String?
  outletId       String
  organizationId String
  customer       Customer?    @relation(fields: [customerId], references: [id])
  outlet         Outlet       @relation(fields: [outletId], references: [id], onDelete: Cascade)
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  items          SaleItem[]
  returns        SaleReturn[]
}

model SaleItem {
  id             String       @id @default(cuid())
  saleId         String
  productId      String
  quantity       Int
  unitPrice      Decimal
  discount       Decimal      @default(0)
  tax            Decimal      @default(0)
  total          Decimal
  sale           Sale         @relation(fields: [saleId], references: [id], onDelete: Cascade)
  product        Product      @relation(fields: [productId], references: [id], onDelete: Cascade)
}

model SaleReturn {
  id             String       @id @default(cuid())
  saleId         String
  date           DateTime     @default(now())
  reason         String
  amount         Decimal
  status         String       @default("COMPLETED") // PENDING, COMPLETED, REJECTED
  sale           Sale         @relation(fields: [saleId], references: [id], onDelete: Cascade)
}

model Promotion {
  id             String       @id @default(cuid())
  name           String
  description    String?
  discountType   String       // PERCENTAGE, FIXED
  discountValue  Decimal
  startDate      DateTime
  endDate        DateTime
  isActive       Boolean      @default(true)
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
}
```

### Customer Management

```prisma
model Customer {
  id             String       @id @default(cuid())
  name           String
  email          String?
  phone          String?
  address        String?
  taxId          String?
  notes          String?
  customerGroupId String?
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  customerGroup  CustomerGroup? @relation(fields: [customerGroupId], references: [id])
  sales          Sale[]
  payments       CustomerReceive[]
}

model CustomerGroup {
  id             String       @id @default(cuid())
  name           String
  description    String?
  discountRate   Decimal      @default(0)
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  customers      Customer[]
}

model CustomerReceive {
  id             String       @id @default(cuid())
  customerId     String
  amount         Decimal
  paymentMethod  String
  reference      String?
  date           DateTime     @default(now())
  notes          String?
  customer       Customer     @relation(fields: [customerId], references: [id], onDelete: Cascade)
}
```

### Procurement Management

```prisma
model Supplier {
  id             String       @id @default(cuid())
  name           String
  contactName    String?
  email          String?
  phone          String?
  address        String?
  taxId          String?
  website        String?
  notes          String?
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  purchases      PurchaseOrg[]
  payments       SupplierPayment[]
}

model PurchaseOrg {
  id             String       @id @default(cuid())
  reference      String
  date           DateTime     @default(now())
  status         String       @default("COMPLETED") // PENDING, COMPLETED, CANCELLED
  subtotal       Decimal      @default(0)
  taxAmount      Decimal      @default(0)
  discountAmount Decimal      @default(0)
  total          Decimal
  paidAmount     Decimal      @default(0)
  dueAmount      Decimal      @default(0)
  notes          String?
  supplierId     String
  organizationId String
  supplier       Supplier     @relation(fields: [supplierId], references: [id], onDelete: Cascade)
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  items          PurchaseItem[]
  returns        PurchaseReturn[]
}

model PurchaseItem {
  id             String       @id @default(cuid())
  purchaseId     String
  productId      String
  quantity       Int
  unitPrice      Decimal
  total          Decimal
  purchase       PurchaseOrg  @relation(fields: [purchaseId], references: [id], onDelete: Cascade)
  product        Product      @relation(fields: [productId], references: [id], onDelete: Cascade)
}

model PurchaseReturn {
  id             String       @id @default(cuid())
  purchaseId     String
  date           DateTime     @default(now())
  reason         String
  amount         Decimal
  status         String       @default("COMPLETED") // PENDING, COMPLETED, REJECTED
  purchase       PurchaseOrg  @relation(fields: [purchaseId], references: [id], onDelete: Cascade)
}

model SupplierPayment {
  id             String       @id @default(cuid())
  supplierId     String
  amount         Decimal
  paymentMethod  String
  reference      String?
  date           DateTime     @default(now())
  notes          String?
  supplier       Supplier     @relation(fields: [supplierId], references: [id], onDelete: Cascade)
}
```

### Financial Management

```prisma
model AccountOrg {
  id             String       @id @default(cuid())
  name           String
  accountType    String       // ASSETS, LIABILITIES, EQUITY, REVENUE, EXPENSES
  code           String?
  description    String?
  balance        Decimal      @default(0)
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  transactions   Transaction[]
}

model Transaction {
  id             String       @id @default(cuid())
  accountId      String
  amount         Decimal
  type           String       // DEBIT, CREDIT
  reference      String?
  description    String?
  date           DateTime     @default(now())
  account        AccountOrg   @relation(fields: [accountId], references: [id], onDelete: Cascade)
}

model Expense {
  id             String       @id @default(cuid())
  reference      String?
  date           DateTime     @default(now())
  amount         Decimal
  description    String?
  categoryId     String
  organizationId String
  category       ExpenseCategory @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
}

model ExpenseCategory {
  id             String       @id @default(cuid())
  name           String
  description    String?
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  expenses       Expense[]
}

model Income {
  id             String       @id @default(cuid())
  reference      String?
  date           DateTime     @default(now())
  subtotal       Decimal      @default(0)
  taxAmount      Decimal      @default(0)
  total          Decimal
  description    String?
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  items          IncomeItem[]
}

model IncomeItem {
  id             String       @id @default(cuid())
  incomeId       String
  description    String
  amount         Decimal
  income         Income       @relation(fields: [incomeId], references: [id], onDelete: Cascade)
}
```

### HR Management

```prisma
model Employee {
  id             String       @id @default(cuid())
  userId         String?
  name           String
  email          String
  phone          String?
  address        String?
  position       String?
  department     String?
  joinDate       DateTime     @default(now())
  salary         Decimal?
  roleId         String?
  organizationId String
  user           User?        @relation(fields: [userId], references: [id])
  role           Role?        @relation(fields: [roleId], references: [id])
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  attendance     Attendance[]
  payrolls       Payroll[]
}

model Role {
  id             String       @id @default(cuid())
  name           String
  description    String?
  permissions    String[]
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  employees      Employee[]
}

model Attendance {
  id             String       @id @default(cuid())
  employeeId     String
  checkIn        DateTime
  checkOut       DateTime?
  note           String?
  employee       Employee     @relation(fields: [employeeId], references: [id], onDelete: Cascade)
}

model Payroll {
  id             String       @id @default(cuid())
  employeeId     String
  periodStart    DateTime
  periodEnd      DateTime
  basicSalary    Decimal
  allowances     Decimal      @default(0)
  deductions     Decimal      @default(0)
  netAmount      Decimal
  paymentDate    DateTime?
  status         String       @default("PENDING") // PENDING, PAID, CANCELLED
  notes          String?
  employee       Employee     @relation(fields: [employeeId], references: [id], onDelete: Cascade)
}
```

### Other Business Operations

```prisma
model Setting {
  id             String       @id @default(cuid())
  key            String
  value          String
  description    String?
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  @@unique([key, organizationId])
}

model Warranty {
  id             String       @id @default(cuid())
  productId      String
  duration       Int          // Duration in days
  terms          String?
  isActive       Boolean      @default(true)
  product        Product      @relation(fields: [productId], references: [id], onDelete: Cascade)
}

model FixedAsset {
  id             String       @id @default(cuid())
  name           String
  purchaseDate   DateTime
  purchasePrice  Decimal
  currentValue   Decimal
  depreciationRate Decimal    @default(0)
  category       String?
  location       String?
  serialNumber   String?
  notes          String?
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
}

model Booking {
  id             String       @id @default(cuid())
  customerId     String
  bookingDate    DateTime
  startTime      DateTime
  endTime        DateTime
  status         String       @default("PENDING") // PENDING, CONFIRMED, COMPLETED, CANCELLED
  notes          String?
  organizationId String
  customer       Customer     @relation(fields: [customerId], references: [id], onDelete: Cascade)
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
}

model Quotation {
  id             String       @id @default(cuid())
  reference      String
  customerId     String
  validUntil     DateTime
  subtotal       Decimal      @default(0)
  taxAmount      Decimal      @default(0)
  discountAmount Decimal      @default(0)
  total          Decimal
  status         String       @default("PENDING") // PENDING, ACCEPTED, REJECTED, EXPIRED
  notes          String?
  organizationId String
  customer       Customer     @relation(fields: [customerId], references: [id], onDelete: Cascade)
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
}

model AiChat {
  id             String       @id @default(cuid())
  userId         String
  systemPrompt   String?
  messages       Json         // Array of { role, content }
  title          String?
  organizationId String?
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  organization   Organization? @relation(fields: [organizationId], references: [id], onDelete: SetNull)
}

model DeliveryPartner {
  id             String       @id @default(cuid())
  name           String
  contactPerson  String?
  phone          String?
  email          String?
  website        String?
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
}

model Installment {
  id             String       @id @default(cuid())
  saleId         String
  totalAmount    Decimal
  paidAmount     Decimal      @default(0)
  remainingAmount Decimal
  installmentCount Int
  nextDueDate    DateTime
  status         String       @default("ACTIVE") // ACTIVE, COMPLETED, DEFAULTED
  sale           Sale         @relation(fields: [saleId], references: [id], onDelete: Cascade)
}
```

### Schema Relationship Highlights

- **Organization** is the central entity with one-to-many relationships to most other models, enabling complete multi-tenancy.
- **User** connects to **Member** to link users to organizations with specific roles.
- **Product** belongs to an **Organization** and links to **Category**, **Brand**, **Unit**, and **Rack**.
- **Inventory** connects **Products** and **Outlets**, tracking stock per product per outlet.
- **Sale** links to **Outlet**, **Customer**, and multiple **SaleItems**, with each **SaleItem** referencing a **Product**.
- **Employee** can be linked to a **User** account and has a **Role** defining their permissions.
- **PurchaseOrg** tracks purchases from **Suppliers** with **PurchaseItems** referencing **Products**.

This comprehensive schema provides a robust foundation for managing all aspects of retail business operations including sales, inventory, customers, procurement, finance, and HR across multiple outlets.

## Authentication

The application uses a custom authentication system with:

- **Session-based authentication**: Persistent login sessions
- **OAuth providers**: Social login support
- **Passkey support**: Passwordless WebAuthn authentication
- **Email verification**: Account verification process
- **Role-based access**: Different permission levels:
  - **Admin**: Full system access
  - **Manager**: Organization management
  - **Member**: Basic access

Authentication is handled through middleware:
- `authMiddleware`: Verifies user is authenticated
- `adminMiddleware`: Ensures user has admin privileges

## API Documentation

The API is built using Hono with OpenAPI integration for validation and documentation. Each route follows a consistent pattern:

1. Route definition with path and HTTP method
2. Middleware for authentication and authorization
3. Request validation using Zod schemas
4. OpenAPI documentation using `describeRoute`
5. Handler function with business logic

### Organization API

Manages multi-tenant organizations within the system.

**Endpoints**:
- `GET /organizations`: List all organizations (admin only)
- `GET /organizations/:id`: Get organization details
- `POST /organizations`: Create a new organization
- `PUT /organizations/:id`: Update organization details
- `DELETE /organizations/:id`: Delete an organization (admin only)

### Product API

Manages the product catalog.

**Endpoints**:
- `GET /products`: List products with filtering and pagination
- `GET /products/:id`: Get product details
- `POST /products`: Create a new product
- `PUT /products/:id`: Update product details
- `DELETE /products/:id`: Remove a product

### Rack API

Organizes product storage locations.

**Endpoints**:
- `GET /racks`: List all racks
- `GET /racks/:id`: Get rack details
- `POST /racks`: Create a new rack
- `PUT /racks/:id`: Update rack details
- `DELETE /racks/:id`: Remove a rack

### Category API

Categorizes products for easier management.

**Endpoints**:
- `GET /categories`: List all categories
- `GET /categories/:id`: Get category details
- `POST /categories`: Create a new category
- `PUT /categories/:id`: Update category details
- `DELETE /categories/:id`: Remove a category

### Unit API

Defines measurement units for products.

**Endpoints**:
- `GET /units`: List all units
- `GET /units/:id`: Get unit details
- `POST /units`: Create a new unit
- `PUT /units/:id`: Update unit details
- `DELETE /units/:id`: Remove a unit

### Brand API

Manages product brands.

**Endpoints**:
- `GET /brands`: List all brands
- `GET /brands/:id`: Get brand details
- `POST /brands`: Create a new brand
- `PUT /brands/:id`: Update brand details
- `DELETE /brands/:id`: Remove a brand

### Inventory API (Planned)

Real-time stock management across outlets.

**Endpoints** (to be implemented):
- `GET /inventory`: List inventory items with filtering
- `GET /inventory/:id`: Get inventory details
- `POST /inventory`: Create a new inventory entry
- `PUT /inventory/:id`: Update inventory details
- `DELETE /inventory/:id`: Remove an inventory entry
- `POST /inventory/adjust`: Adjust stock levels
- `POST /inventory/transfer`: Transfer stock between outlets
- `GET /inventory/stock`: Get stock levels for a product
- `GET /inventory/low-stock`: List products with low stock
- `GET /inventory/:id/log`: View inventory change history

#### Implementation Example

```typescript
// Example of how to implement the Inventory API
export const inventoryRouter = new Hono().basePath("/inventory");

// Schema for inventory operations
const inventorySchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  outletId: z.string().min(1, "Outlet ID is required"),
  quantity: z.number().int().min(0, "Quantity must be a positive number"),
  minQuantity: z.number().int().min(0).optional(),
  maxQuantity: z.number().int().optional(),
});

// GET /inventory - List inventory items
inventoryRouter.get(
  "/",
  authMiddleware,
  validator(
    "query",
    z.object({
      organizationId: z.string().min(1, "Organization ID is required"),
      productId: z.string().optional(),
      outletId: z.string().optional(),
      minQuantity: z.string().optional().transform(Number),
      maxQuantity: z.string().optional().transform(Number),
      search: z.string().optional(),
      limit: z.string().optional().default("10").transform(Number),
      offset: z.string().optional().default("0").transform(Number),
      sortBy: z.string().optional().default("updatedAt"),
      sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
    }),
  ),
  describeRoute({
    tags: ["Inventory"],
    summary: "Get inventory items with filtering",
    responses: {
      200: {
        description: "List of inventory items",
        content: {
          "application/json": {
            schema: resolver(
              z.object({
                items: z.array(
                  z.object({
                    id: z.string(),
                    productId: z.string(),
                    outletId: z.string(),
                    quantity: z.number(),
                    minQuantity: z.number(),
                    maxQuantity: z.number().nullable(),
                    createdAt: z.string(),
                    updatedAt: z.string(),
                  }),
                ),
                total: z.number(),
              }),
            ),
          },
        },
      },
      401: { description: "Unauthorized" },
      403: { description: "Forbidden" },
    },
  }),
  async (c) => {
    const { 
      organizationId, productId, outletId, minQuantity, 
      maxQuantity, search, limit, offset, sortBy, sortOrder 
    } = c.req.valid("query");
    const user = c.get("user");

    // Check if user belongs to organization
    const membership = await db.member.findFirst({
      where: { userId: user.id, organizationId },
    });
    
    if (!membership && user.role !== "admin") {
      throw new HTTPException(403, { message: "Forbidden" });
    }

    // Build query filters
    const where: any = { organizationId };
    
    if (productId) where.productId = productId;
    if (outletId) where.outletId = outletId;
    if (minQuantity !== undefined) where.quantity = { gte: minQuantity };
    if (maxQuantity !== undefined) {
      where.quantity = { ...where.quantity, lte: maxQuantity };
    }
    
    if (search) {
      where.OR = [
        {
          product: {
            name: { contains: search, mode: 'insensitive' }
          }
        },
        {
          outlet: {
            name: { contains: search, mode: 'insensitive' }
          }
        }
      ];
    }

    const items = await db.inventory.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { [sortBy]: sortOrder },
      include: {
        product: { select: { name: true } },
        outlet: { select: { name: true } }
      }
    });

    const total = await db.inventory.count({ where });

    return c.json({ items, total });
  }
);

// POST /inventory/adjust - Adjust stock level
inventoryRouter.post(
  "/adjust",
  authMiddleware,
  validator(
    "json",
    z.object({
      inventoryId: z.string().min(1, "Inventory ID is required"),
      quantity: z.number().int(),
      reason: z.string().min(1, "Reason is required"),
    })
  ),
  describeRoute({
    tags: ["Inventory"],
    summary: "Adjust inventory stock level",
    responses: {
      200: {
        description: "Stock adjusted successfully",
        content: {
          "application/json": {
            schema: resolver(
              z.object({
                id: z.string(),
                productId: z.string(),
                outletId: z.string(),
                quantity: z.number(),
                previousQuantity: z.number(),
                change: z.number(),
              }),
            ),
          },
        },
      },
      400: { description: "Invalid input" },
      401: { description: "Unauthorized" },
      403: { description: "Forbidden" },
      404: { description: "Inventory not found" },
    },
  }),
  async (c) => {
    const { inventoryId, quantity, reason } = c.req.valid("json");
    const user = c.get("user");

    // Find the inventory item
    const inventory = await db.inventory.findUnique({
      where: { id: inventoryId },
      include: { 
        organization: true 
      }
    });

    if (!inventory) {
      throw new HTTPException(404, { message: "Inventory not found" });
    }

    // Check authorization
    const membership = await db.member.findFirst({
      where: { 
        userId: user.id, 
        organizationId: inventory.organizationId,
        role: { in: ["ADMIN", "MANAGER"] }
      },
    });

    if (!membership && user.role !== "admin") {
      throw new HTTPException(403, { message: "Forbidden" });
    }

    // Prevent negative stock
    const newQuantity = inventory.quantity + quantity;
    if (newQuantity < 0) {
      throw new HTTPException(400, { message: "Insufficient stock" });
    }

    // Use transaction to ensure data consistency
    const result = await db.$transaction(async (tx) => {
      // Update inventory
      const updatedInventory = await tx.inventory.update({
        where: { id: inventoryId },
        data: { quantity: newQuantity },
      });

      // Create log entry
      await tx.inventoryLog.create({
        data: {
          id: `invlog_${nanoid(10)}`,
          inventoryId,
          previousQty: inventory.quantity,
          newQty: newQuantity,
          change: quantity,
          reason,
          performedBy: user.name || user.email,
          performedById: user.id,
        },
      });

      return {
        ...updatedInventory,
        previousQuantity: inventory.quantity,
        change: quantity,
      };
    });

    return c.json(result);
  }
);
```

## Development Guide

### Setting Up a New API

1. **Create a Router File**:
   ```typescript
   // packages/api/src/routes/your-feature/router.ts
   import { db } from "@repo/database";
   import { Hono } from "hono";
   import { describeRoute } from "hono-openapi";
   import { resolver, validator } from "hono-openapi/zod";
   import { HTTPException } from "hono/http-exception";
   import { nanoid } from "nanoid";
   import { z } from "zod";
   import { authMiddleware } from "../../middleware/auth";
   
   export const yourFeatureRouter = new Hono().basePath("/your-feature");
   
   // Add your endpoints here
   ```

2. **Define Validation Schemas**:
   ```typescript
   const createSchema = z.object({
     name: z.string().min(1, "Name is required"),
     description: z.string().optional(),
     organizationId: z.string().min(1, "Organization ID is required"),
   });
   ```

3. **Implement CRUD Endpoints**:
   - Create GET, POST, PUT, DELETE endpoints
   - Add appropriate middleware
   - Use validator and describeRoute for each endpoint
   - Implement the handler functions

4. **Register in API Index**:
   ```typescript
   // packages/api/src/index.ts
   import { yourFeatureRouter } from "./routes/your-feature/router";
   
   // Add to existing routers
   app.route("/api", yourFeatureRouter);
   ```

### Database Schema Updates

1. **Update Prisma Schema**:
   ```prisma
   // packages/database/schema.prisma
   model YourModel {
     id            String      @id @default(cuid())
     name          String
     description   String?
     organization  Organization @relation(fields: [organizationId], references: [id])
     organizationId String
     createdAt     DateTime    @default(now())
     updatedAt     DateTime    @updatedAt
   
     @@index([organizationId])
   }
   ```

2. **Generate Prisma Client**:
   ```bash
   npx prisma generate
   ```

3. **Run Migrations**:
   ```bash
   npx prisma migrate dev --name add_your_model
   ```

### Frontend Implementation

1. **Create API Client**:
   ```typescript
   // packages/app/utils/api-clients/your-feature.ts
   import { apiClient } from "../api-client";
   
   export const yourFeatureApi = {
     getAll: async (params: { organizationId: string }) => {
       return apiClient.get("/your-feature", { params });
     },
     
     getById: async (id: string) => {
       return apiClient.get(`/your-feature/${id}`);
     },
     
     create: async (data: CreateYourFeatureData) => {
       return apiClient.post("/your-feature", data);
     },
     
     update: async (id: string, data: UpdateYourFeatureData) => {
       return apiClient.put(`/your-feature/${id}`, data);
     },
     
     delete: async (id: string) => {
       return apiClient.delete(`/your-feature/${id}`);
     },
   };
   ```

2. **Create UI Components**:
   - List view
   - Detail view
   - Create/Edit forms
   - Delete confirmation

## Next Steps

1. **Implement Inventory API**:
   - Follow the detailed plan for inventory management
   - Focus on stock tracking, adjustments, and transfers

2. **Develop Sales and Order Systems**:
   - Create endpoints for recording sales transactions
   - Link sales to inventory updates

3. **Build Customer Management**:
   - Implement customer profiles and history
   - Add loyalty program features

4. **Add Reporting and Analytics**:
   - Sales reports and inventory trends
   - Business performance insights

5. **External Integrations**:
   - Connect with accounting tools
   - Integrate with e-commerce platforms

---

This POS SaaS App is built on [Supastarter](https://supastarter.dev/), a modern Next.js starter template that provides best practices for building scalable SaaS applications. The monorepo structure, authentication system, and API patterns all follow Supastarter conventions.

For more information about Supastarter-specific patterns, refer to the [official documentation](https://supastarter.dev/docs/nextjs).
