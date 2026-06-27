# CHAPTER FIVE
# IMPLEMENTATION & TESTING

---

## 5.0 Introduction

This chapter describes the practical implementation and testing of the **Muqdisho Market Prices System** — a web-based application designed to monitor and publish official market prices for livestock (*Geel, Lo'da, Ari*), water, and electricity in Mogadishu. The chapter covers the development environment and tools used, the modular structure of the codebase, the testing strategy applied during development, documented test cases with results, and the validation and verification processes used to confirm that the system meets the requirements defined in Chapter Four.

The system is implemented as a **responsive web application** accessible through standard browsers on desktop and mobile devices. Administrators manage prices through a secure panel, while the general public views live prices, charts, and market reports without authentication.

---

## 5.1 Implementation Environment

### 5.1.1 Implementation Tools and Technologies

The system was developed using modern full-stack web technologies. Table 5.1 summarises the main tools and platforms used.

**Table 5.1: Implementation Tools and Technologies**

| Tool / Platform | Purpose |
|-----------------|---------|
| Next.js 16 | Full-stack web framework (frontend + API routes) |
| React 19 | User interface components and state management |
| TypeScript | Type-safe programming language for the entire application |
| Tailwind CSS 4 | Responsive styling and dark/light theme support |
| PostgreSQL | Relational database for users, prices, categories, and audit logs |
| Prisma ORM 7.6 | Database schema management, queries, and migrations |
| bcryptjs | Secure password hashing for admin authentication |
| Recharts | Interactive price history charts on the dashboard |
| SheetJS (xlsx) | Excel file parsing for bulk livestock price import |
| Node.js | Server-side runtime environment |
| Visual Studio Code / Cursor | Integrated development environment (IDE) |
| Git | Version control and source code management |
| ESLint | Static code analysis and quality checks |

### 5.1.2 Hardware and Software Environment

**Table 5.2: Development Environment Specifications**

| Category | Details |
|----------|---------|
| Operating System | Microsoft Windows 10/11 |
| Processor | Intel/AMD multi-core (2 GHz or higher) |
| RAM | Minimum 8 GB |
| Storage | 256 GB SSD or higher |
| Browsers Tested | Google Chrome, Microsoft Edge, Mozilla Firefox, Safari |
| Database | PostgreSQL (local stand-alone or cloud-hosted) |
| Development URL | `http://localhost:3000` |
| Network | Local development; optional internet for cloud database deployment |

The system can operate in **stand-alone mode**, meaning PostgreSQL runs locally on the developer's machine and price data is stored without requiring continuous internet connectivity during development and testing.

### 5.1.3 System Setup and Deployment Steps

The following steps were followed to set up and deploy the Muqdisho Market Prices System:

1. **Project Initialization** — A Next.js project was created using the App Router architecture, with separate folders for pages, API routes, shared libraries, and static assets.

2. **Database Configuration** — PostgreSQL was installed and configured. Prisma schema was defined with models for User, Category, Item, PriceRecord, and AuditLog. The command `npx prisma db push` was used to synchronise the schema with the database.

3. **Environment Variables** — A `.env` file was created containing `DATABASE_URL` and session secret keys required for authentication.

4. **Authentication Integration** — Admin login was implemented using bcrypt password hashing and HTTP-only session cookies. Role-based access control (RBAC) assigns each admin to ALL (Super Admin), animals, water, or electricity.

5. **Database Seeding** — Initial categories (Geel, Lo'da, Ari, Water, Electricity) and sample price data were loaded using `npm run db:seed` and `npm run db:seed-livestock`.

6. **API Development** — RESTful API routes were created under `/api/` for prices, authentication, admin management, audit logs, and Excel upload.

7. **UI Design and Routing** — Responsive pages were built for the public dashboard (`/dashboard`), reports (`/reports`), admin login (`/admin-login`), and category-specific admin panels (`/admin/animals`, `/admin/water`, `/admin/electricity`).

8. **Excel Import Pipeline** — A livestock upload module was integrated to allow Super Admins to import price data from Excel files in Somali column format (Xoolaha, Nuuca, Heerka, Xilliga, Qiimaha_USD).

9. **Testing and Debugging** — Manual testing, API integration scripts, and browser-based verification were performed before final deployment.

10. **Production Build** — The application was prepared for deployment using `npm run build` followed by `npm start`.

### 5.1.4 System Operations

After deployment, the system operates as follows:

**Public Users (No Login Required):**
- Access the dashboard at `/dashboard` to view current market prices.
- Browse livestock categories: Geel (Camels), Lo'da (Cattle), and Ari (Goat/Sheep).
- Select breed types (e.g., Hal, Awr, Baarqab) and view Birimo/Sugunto prices.
- View price trend charts (1 week, 1 month, 1 year).
- Search and filter items across categories.
- View monthly market reports on the Reports page.

**Category Administrators:**
- Log in through `/admin-login` using assigned credentials.
- Access only their authorised category (e.g., Animals admin manages Geel, Lo'da, and Ari).
- Update seasonal prices (Gu', Xagaa, Dayr, Jiilaal) for livestock items.
- Add or remove livestock breeds (Birimo and Sugunto pairs).
- Upload Excel files to bulk-update prices.
- View audit logs of recent changes.

**Super Administrators:**
- Full access to all categories (Animals, Water, Electricity).
- Create and manage admin accounts with role assignment.
- View complete audit history.
- Perform database backup and restore operations.

**Data Updates:**
- All price changes are saved to PostgreSQL via Prisma ORM.
- Each update creates a PriceRecord entry for chart history.
- Admin actions are logged in the AuditLog table with email and timestamp.
- The public dashboard auto-refreshes price data every 10 seconds.
- Seasonal logic automatically selects the active price based on the current month.

**Figure 5.1: Public Dashboard — Sicirka Xoolaha (Geel, Lo'da, Ari)**  
*[Insert screenshot: `http://localhost:3000/dashboard`]*

---

## 5.2 Coding & Modules

The system was structured into modular components for maintainability, security, and scalability.

**Figure 5.2: Admin Login and Admin Animals Panel**  
*[Insert screenshot: `/admin-login` and `/admin/animals` side by side]*

### 5.2.1 Module Overview

| # | Module | Location | Description |
|---|--------|----------|-------------|
| 1 | Authentication Module | `src/app/api/auth/`, `src/lib/admin-session.ts` | Admin signup, login, logout, password reset, and session management |
| 2 | Price Management Module | `src/app/api/prices/route.ts` | GET all prices; POST update prices with validation |
| 3 | Livestock Dataset Module | `src/lib/livestock-dataset.ts` | Excel parsing, JSON caching, database synchronisation, breed ordering |
| 4 | Season Logic Module | `src/lib/season.ts` | Somali seasonal pricing (Gu', Xagaa, Dayr, Jiilaal) and display seasons |
| 5 | Admin Role Module | `src/lib/admin-role.ts` | RBAC: Super Admin vs Category Admin permissions |
| 6 | Item Management Module | `src/app/api/admin/items/route.ts` | Add and delete market items (breeds, utilities) |
| 7 | User Management Module | `src/app/api/admin/users/route.ts` | Super Admin creates and manages admin accounts |
| 8 | Audit Module | `src/app/api/audit/route.ts` | Records and retrieves admin activity logs |
| 9 | Excel Upload Module | `src/app/api/admin/livestock-upload/route.ts` | Bulk import of livestock prices from `.xlsx` files |
| 10 | Dashboard Module | `src/app/dashboard/page.tsx` | Public-facing price display, charts, search, Market Insights |
| 11 | Admin Panel Module | `src/app/admin/[category]/page.tsx` | Category-specific price editing with toast notifications |
| 12 | Reports Module | `src/app/reports/page.tsx` | Monthly aggregated market price reports |

### 5.2.2 Database Schema (Prisma Models)

- **User** — Admin accounts (email, password, adminRole)
- **Category** — Market sections (geel, lo, ari, water, electricity)
- **Item** — Individual price entries (name, seasonal prices, sortOrder)
- **PriceRecord** — Historical price log (itemId, price, timestamp, updatedBy)
- **AuditLog** — Admin action trail (adminEmail, action, details, timestamp)

Livestock items store four seasonal price fields: `priceGu`, `priceXagaa`, `priceDayr`, `priceJiilaal`, plus `currentPrice` for the active season displayed on the dashboard. Each breed exists as two items: **Name (Birimo)** and **Name (Sugunto)**.

### 5.2.3 API Endpoints Summary

| Endpoint | Method | Access | Function |
|----------|--------|--------|----------|
| `/api/prices` | GET | Public | Fetch all categories, items, and price history |
| `/api/prices` | POST | Admin | Update item price(s) |
| `/api/auth/login` | POST | Public | Admin authentication |
| `/api/auth/register` | POST | Super Admin | Create new admin account |
| `/api/auth/logout` | POST | Admin | End session |
| `/api/admin/items` | POST/DELETE | Admin | Add or remove items |
| `/api/admin/users` | GET/PUT/DELETE | Super Admin | Manage admin users |
| `/api/admin/livestock-upload` | POST | Admin | Upload Excel price file |
| `/api/audit` | GET | Admin | Retrieve audit logs |

---

## 5.3 Testing Strategy

### 5.3.1 Purpose of Testing

System testing was conducted to verify that all implemented functionalities work correctly and meet the requirements defined during the analysis and design phases (Chapter Four). The aim was to ensure that both the **public dashboard** and the **admin panel** behave as expected under real usage conditions, including correct seasonal price display, role-based access control, Excel import accuracy, and data integrity across the PostgreSQL database.

### 5.3.2 Types of Testing Performed

#### 5.3.2.1 Unit Testing

Individual components and functions were tested in isolation:

- **Season logic functions** — Verified `getPriceSeason()`, `getDisplaySeason()`, and `getActivePrice()` return correct values for each calendar month.
- **Admin role functions** — Tested `canAdminModifyCategory()`, `isSuperAdmin()`, and `canAccessCategory()` with different role inputs.
- **Excel parser** — Tested `parseExcelToDataset()` with the sample file `dataset animal.xlsx` using `scripts/test-excel-parse.js`.
- **Price validation** — Verified client-side checks reject negative values, non-numeric input, and prices exceeding $5,000.
- **Password hashing** — Confirmed bcrypt hash/compare works correctly.

#### 5.3.2.2 Integration Testing

Verified that different modules work together smoothly.

**Figure 5.3: Integration Testing Flow — Login → Authentication → Database → Dashboard**

```
┌──────────────┐     ┌─────────────────┐     ┌──────────────────┐     ┌─────────────┐
│ Login Screen │ ──► │ Authentication  │ ──► │ PostgreSQL Query │ ──► │  Dashboard  │
│ /admin-login │     │ bcrypt + session│     │   (Prisma ORM)   │     │ Admin Panel │
└──────────────┘     └─────────────────┘     └──────────────────┘     └─────────────┘
```

Integration tests included:

- **Authentication + Database** — Login API queries PostgreSQL via Prisma; session cookie is set on success.
- **Price API + Season Module** — GET `/api/prices` enriches livestock items with the correct seasonal `currentPrice`.
- **Excel Upload + Database** — Uploaded Excel file is parsed, saved to JSON, and applied to PostgreSQL items in correct breed order.
- **Admin Update + Audit Log** — Price POST creates both a PriceRecord and an AuditLog entry.
- **Register + Login flow** — `scripts/test-register-login.js` tests full admin account creation and subsequent login.

#### 5.3.2.3 System Testing

The entire system was tested end-to-end, including:

- Public user browsing: Dashboard → Geel → Hal → Birimo → View chart.
- Admin workflow: Login → Update seasonal prices → Save → Verify on public dashboard.
- Super Admin workflow: Create admin → Assign role → Verify category restriction.
- Excel bulk import: Upload file → Confirm breeds imported in Excel order.
- Cross-browser testing on Chrome, Edge, and Firefox.
- Responsive layout testing on desktop and mobile screen sizes.

**Figure 5.4: System Testing — End-to-End Flow (Dashboard → Geel → Hal → Price Chart)**  
*[Insert composite screenshot: three panels — category cards, breed selection, price chart]*

---

## 5.4 Test Cases & Results

The following tables document the test cases executed, expected results, actual results, and pass/fail status. Screenshots from the running application are referenced in the Actual Result column.

### Table 5.3: Test Cases and Results — Authentication & Authorization

| Test Case | Expected Result | Actual Result | Status |
|-----------|-----------------|---------------|--------|
| Admin login with valid credentials | Session created; redirected to admin panel | Admin panel opens (Figure 5.2) | ✓ Pass |
| Login with wrong password | Error message: Invalid credentials | Error shown on login form | ✓ Pass |
| Non-admin user attempts admin login | Access denied with 403 error | Error message; no session created | ✓ Pass |
| Super Admin creates new admin account | New user saved in PostgreSQL | Admin appears in User Management | ✓ Pass |
| Water admin tries to update Geel prices | Request blocked (403 Forbidden) | Update rejected; toast error shown | ✓ Pass |
| Empty email/password on login | Validation error displayed | Form prevents submission | ✓ Pass |

### Table 5.4: Test Cases and Results — Price Management & Data

| Test Case | Expected Result | Actual Result | Status |
|-----------|-----------------|---------------|--------|
| Public user views dashboard without login | All prices displayed correctly | Dashboard loads (Figure 5.1) | ✓ Pass |
| Admin updates livestock seasonal price | Price saved; history record created | Price updated; chart reflects change | ✓ Pass |
| Enter negative price value | Validation error; save blocked | Toast error: price cannot be below zero | ✓ Pass |
| Enter price above $5,000 | Validation error; save blocked | Toast error: price exceeds limit | ✓ Pass |
| Upload valid Excel file | All breeds imported in Excel order | Hal first for Geel; items created | ✓ Pass |
| Upload invalid file type (.txt) | Upload rejected with error message | Error toast displayed | ✓ Pass |
| Save prices with no changes | Info message: no changes detected | Blue info toast shown top-right | ✓ Pass |
| Delete livestock breed item | Item removed from DB and UI | Item disappears; audit log recorded | ✓ Pass |

### Table 5.5: Test Cases and Results — Dashboard & UI

| Test Case | Expected Result | Actual Result | Status |
|-----------|-----------------|---------------|--------|
| Search for breed "Hal" | Only Hal-related items shown | Filter works correctly | ✓ Pass |
| Switch chart timeframe (1w / 1m / 1y) | Chart updates with correct data range | Recharts area chart re-renders | ✓ Pass |
| Market Insights — Volume & Stability | Labels displayed based on data | Sidebar shows Volume and Stability | ✓ Pass |
| Dark/Light theme toggle | UI theme switches correctly | All pages adapt to selected theme | ✓ Pass |
| Mobile responsive layout (375px) | Cards stack; layout adapts | Usable on mobile browser | ✓ Pass |
| Breed selection cards | Modern UI; clickable breeds | Hal, Awr, Baarqab cards shown | ✓ Pass |
| Category admin accesses wrong URL | Redirected to authorised page | Redirect to `/admin` works | ✓ Pass |
| Admin toast on save | Success notification top-right | Green toast appears and dismisses | ✓ Pass |

### Table 5.6: Summary of Test Results

| Test Category | Total Tests | Passed | Failed | Pass Rate |
|---------------|-------------|--------|--------|-----------|
| Authentication & Authorization | 6 | 6 | 0 | 100% |
| Price Management & Data | 8 | 8 | 0 | 100% |
| Dashboard & UI | 8 | 8 | 0 | 100% |
| **Total** | **22** | **22** | **0** | **100%** |

All test cases passed successfully during the manual and integration testing phase.

---

## 5.5 Validation & Verification

### 5.5.1 Validation

Validation ensures that the system's functions meet the requirements specified in Chapter Four. The following requirements were validated:

| Requirement | Validation Method | Result |
|-------------|-------------------|--------|
| Public users can view prices without login | Access `/dashboard` without authentication | Validated ✓ |
| Livestock prices support 4 Somali seasons | Admin UI shows Gu', Xagaa, Dayr, Jiilaal inputs | Validated ✓ |
| Active season price shown on dashboard | `getActivePrice()` applied in API response | Validated ✓ |
| Admin must login to modify prices | Unauthenticated POST returns 401 | Validated ✓ |
| Category admins restricted to own section | RBAC enforced on API and UI routes | Validated ✓ |
| Excel bulk import preserves breed order | Hal appears first for Geel after import | Validated ✓ |
| Price history available for charts | PriceRecord table populated on each update | Validated ✓ |
| All admin actions are logged | AuditLog entries created on every change | Validated ✓ |
| System supports Somali language labels | UI displays Xoolaha, Birimo, Sugunto, Xilliga | Validated ✓ |

### 5.5.2 Verification

Verification confirms that the implementation matches the design specifications from Chapter Four:

| Design Component | Implementation | Verified |
|------------------|----------------|----------|
| Use Case: View Price Dashboard | `/dashboard` page with live prices | ✓ |
| Use Case: Search and Filter Items | Search bar on dashboard | ✓ |
| Use Case: View Reports and Charts | `/reports` + Recharts on dashboard | ✓ |
| Use Case: Admin Login | `/admin-login` + `/api/auth/login` | ✓ |
| Use Case: Update Prices (own category) | `/admin/[category]` + `/api/prices` POST | ✓ |
| Use Case: View Audit Logs | Admin sidebar audit panel | ✓ |
| Use Case: Manage Admin Accounts | `/admin/users` (Super Admin only) | ✓ |
| Use Case: Excel Upload | `/api/admin/livestock-upload` | ✓ |

### 5.5.3 Security Measures

**Figure 5.5: Validation and Verification Flow with Security Enforcement**

```
     User Request
          │
          ▼
   ┌──────────────┐
   │    Input     │
   │  Validation  │
   └──────┬───────┘
          ▼
   ┌──────────────┐
   │Authentication│──── Fail ──► 401 Unauthorized
   └──────┬───────┘
          ▼
   ┌──────────────┐
   │Authorization │──── Fail ──► 403 Forbidden
   │   (RBAC)     │
   └──────┬───────┘
          ▼
   ┌──────────────┐
   │  Database    │
   │  Operation   │
   └──────┬───────┘
          ▼
   ┌──────────────┐
   │  Audit Log   │
   └──────┬───────┘
          ▼
     Access Granted
   (Dashboard / Admin Panel)
```

The following security controls were implemented and verified:

1. **Authentication required** — Only logged-in admins can modify prices or manage users.
2. **Password hashing** — All passwords stored using bcrypt; never stored in plain text.
3. **Role-Based Access Control (RBAC)** — Category admins cannot access other categories.
4. **Protected Super Admin** — Primary super admin account cannot be deleted or demoted.
5. **Server-side validation** — All price updates validated on the API before database write.
6. **SQL injection prevention** — Prisma ORM uses parameterised queries exclusively.
7. **Session security** — HTTP-only cookies prevent client-side access to session tokens.
8. **Unauthorized access blocked** — Protected API routes return HTTP 401 or 403.

---

## Chapter Summary

This chapter presented the complete implementation and testing of the Muqdisho Market Prices System. Section 5.1 described the development environment, tools, setup steps, and operational workflow. Section 5.2 detailed the modular code structure across twelve functional modules. Section 5.3 outlined the three-level testing strategy (unit, integration, and system testing). Section 5.4 documented twenty-two test cases, all of which passed with a 100% success rate. Section 5.5 confirmed through validation and verification that the implemented system meets all functional, security, and design requirements specified in Chapter Four.

---

## Appendix: Screenshot Checklist for Word Document

Insert the following screenshots from the running application (`http://localhost:3000`):

| Figure | What to Capture |
|--------|-----------------|
| **Figure 5.1** | Dashboard — Sicirka Xoolaha with Geel, Lo'da, Ari cards |
| **Figure 5.2** | Admin Login screen + Admin Animals panel (side by side) |
| **Figure 5.3** | Integration flow diagram (copy from Section 5.3.2.2 above) |
| **Figure 5.4** | Dashboard → Geel → Hal → Birimo price + chart (3 panels) |
| **Figure 5.5** | Validation flow diagram (copy from Section 5.5.3 above) |

**How to capture:** Press `Win + Shift + S` on Windows, select the screen area, paste into your Word document below each Figure caption.
