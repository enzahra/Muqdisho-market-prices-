# Muqdisho Market Prices - System Design Documentation

Dukumentigan wuxuu faahfaahinayaa qaabdhismeedka nidaamka (System Design), qaabka xogtu u socoto (Data Flow Diagrams), naqshadda database-ka (Database Design), iyo qaabdhismeedka guud ee nidaamka (System Architecture Diagram) ee codsiga **Muqdisho Market Prices**.

Dhammaan jaantusyada (diagrams) waxaa loo qaabeeyay inay leeyihiin **background cad** iyo **far/khad madow** si ay u sahlanaato akhriskoodu iyo daabacaadoodu.

---

## ● 4.6 System Design

Nidaamka kormeerka qiimaha suuqyada Muqdisho (Mogadishu Market Prices System) waxaa loo qaabeeyay inuu u adeego dadweynaha iyo maamulayaasha suuqyada. Qaybtani waxay sharraxaysaa habdhaqanka iyo qaabdhismeedka nidaamka iyadoo la adeegsanayo jaantusyo kala duwan.

### 4.6.1 Use Case Diagram (Jaantuska Isticmaalka)
Jaantuskan wuxuu muujinayaa sida jilayaasha kala duwan (Public User, Category Admin, iyo Super Admin) ay ula falgalaan qaybaha kala duwan ee nidaamka.

```mermaid
%%{init: {
  'theme': 'base',
  'themeVariables': {
    'background': '#ffffff',
    'canvasPhysicalBackgroundColor': '#ffffff',
    'primaryColor': '#ffffff',
    'primaryTextColor': '#000000',
    'primaryBorderColor': '#000000',
    'lineColor': '#000000',
    'secondaryColor': '#ffffff',
    'tertiaryColor': '#ffffff',
    'mainBkg': '#ffffff',
    'actorBkg': '#ffffff',
    'actorBorder': '#000000',
    'actorTextColor': '#000000',
    'actorLineColor': '#000000',
    'signalColor': '#000000',
    'signalTextColor': '#000000',
    'labelTextColor': '#000000',
    'loopLimitColor': '#000000',
    'noteBorderColor': '#000000',
    'noteBkgColor': '#ffffff',
    'noteTextColor': '#000000',
    'nodeBorder': '#000000',
    'nodeTextColor': '#000000',
    'edgeLabelBackground': '#ffffff',
    'clusterBkg': '#ffffff',
    'clusterBorder': '#000000'
  }
}}%%
graph LR
    %% Actors
    PublicUser((Public User))
    CatAdmin((Category Admin))
    SuperAdmin((Super Admin))

    subgraph SystemBoundary [Muqdisho Market System]
        %% Public Use Cases
        UC1[View Price Dashboard]
        UC2[Search and Filter Items]
        UC3[View Reports and Charts]

        %% Shared Admin Use Cases
        UC4[Login to Admin Panel]
        UC5[Update Price - Own Category Only]
        UC6[View Audit Logs]

        %% Super Admin Only
        UC7[Manage Admin Accounts]
        UC8[Manage Categories and Items]
        UC9[Clear Price History / Backup]
        UC10[Register New Admin]
    end

    %% Public User Connections
    PublicUser --> UC1
    PublicUser --> UC2
    PublicUser --> UC3

    %% Category Admin Connections
    CatAdmin --> UC4
    CatAdmin --> UC5

    %% Super Admin Connections
    SuperAdmin --> UC4
    SuperAdmin --> UC5
    SuperAdmin --> UC6
    SuperAdmin --> UC7
    SuperAdmin --> UC8
    SuperAdmin --> UC9
    SuperAdmin --> UC10

    %% Include Relations (requires login)
    UC5 -.-> |includes| UC4
    UC6 -.-> |includes| UC4
    UC7 -.-> |includes| UC4
    UC8 -.-> |includes| UC4
    UC9 -.-> |includes| UC4
    UC10 -.-> |includes| UC4
```

#### Rendered Use Case Diagram:
![Use Case Diagram](./images/use_case_diagram.png)

---

### 4.6.2 Data Flow Diagrams (DFD - Socodka Xogta)

#### DFD Level 0 (Context Diagram)
Jaantuskan wuxuu muujinayaa nidaamka guud oo xiran (Black Box) iyo sida uu xogta ula wadaago jilayaasha dibadda ah.

```mermaid
%%{init: {
  'theme': 'base',
  'themeVariables': {
    'background': '#ffffff',
    'canvasPhysicalBackgroundColor': '#ffffff',
    'primaryColor': '#ffffff',
    'primaryTextColor': '#000000',
    'primaryBorderColor': '#000000',
    'lineColor': '#000000',
    'secondaryColor': '#ffffff',
    'tertiaryColor': '#ffffff',
    'mainBkg': '#ffffff',
    'nodeBorder': '#000000',
    'nodeTextColor': '#000000',
    'edgeLabelBackground': '#ffffff'
  }
}}%%
graph LR
    Public[Public User]
    Admin[Category / Super Admin]
    System((Mogadishu Market Prices System))

    Public -->|Views dashboard request| System
    System -->|Displays price charts & reports| Public

    Admin -->|Login credentials & price updates| System
    System -->|Validation responses & update status| Admin
    System -->|Audit reports & user logs| Admin
```

#### DFD Level 1 (Process Diagram)
Jaantuskan wuxuu u kala jebinayaa nidaamka dhowr habraac oo waaweyn si loo arko meelaha xogtu ka dhex baxdo iyo halka lagu kaydiyo (Database-ka).

```mermaid
%%{init: {
  'theme': 'base',
  'themeVariables': {
    'background': '#ffffff',
    'canvasPhysicalBackgroundColor': '#ffffff',
    'primaryColor': '#ffffff',
    'primaryTextColor': '#000000',
    'primaryBorderColor': '#000000',
    'lineColor': '#000000',
    'secondaryColor': '#ffffff',
    'tertiaryColor': '#ffffff',
    'mainBkg': '#ffffff',
    'nodeBorder': '#000000',
    'nodeTextColor': '#000000',
    'edgeLabelBackground': '#ffffff'
  }
}}%%
graph TD
    %% External Entities
    User([Public User])
    Admin([Administrator])

    %% Databases
    DB[(PostgreSQL Database)]

    %% Processes
    P1(("1.0 Authenticate Admin\nPOST /api/auth/login\nbcrypt + Session Cookie"))
    P2(("2.0 Fetch Price Data\nGET /api/prices\nNo auth required"))
    P3(("3.0 Process Price Update\nPOST /api/prices\nrequireItemAccess + RBAC"))
    P4(("4.0 Generate Audit Log\nAuto-triggered by P3"))
    P5(("5.0 Manage Admin Users\nGET/PATCH/DELETE\n/api/admin/users\nsuperOnly"))

    %% Public User Flows
    User -->|View / Search request| P2
    P2 -->|Query Category + Item + PriceRecord| DB
    DB -->|Return price data| P2
    P2 -->|Render charts & tables| User

    %% Admin Auth Flow
    Admin -->|email + password| P1
    P1 -->|Lookup User by email| DB
    DB -->|User record + hashed password| P1
    P1 -->|Set Session Cookie JWT| Admin

    %% Price Update Flow
    Admin -->|New price + itemId| P3
    P3 -->|Validate range 0-5000 + canAdminModifyCategory| P3
    P3 -->|Save PriceRecord + update currentPrice| DB
    P3 -->|Trigger audit event| P4
    P4 -->|Write AuditLog record| DB

    %% Admin Management Flow
    Admin -->|Admin Registration / Role Update / Delete| P5
    P5 -->|isProtectedSuperAdmin check| P5
    P5 -->|Write / Update / Delete User| DB
```

#### Rendered Data Flow Diagram (DFD):
![Data Flow Diagram](./images/data_flow_diagram.png)

---

### 4.6.3 UML Class Diagram (Jaantuska Heerka Fasalka)
Jaantuskaan wuxuu muujinayaa fasalada (Classes), astaamahooda (Attributes), iyo hababka ay u wada shaqeeyaan (Methods & Relationships).

```mermaid
%%{init: {
  'theme': 'base',
  'themeVariables': {
    'background': '#ffffff',
    'canvasPhysicalBackgroundColor': '#ffffff',
    'primaryColor': '#ffffff',
    'primaryTextColor': '#000000',
    'primaryBorderColor': '#000000',
    'lineColor': '#000000',
    'secondaryColor': '#ffffff',
    'tertiaryColor': '#ffffff',
    'mainBkg': '#ffffff',
    'nodeBorder': '#000000',
    'nodeTextColor': '#000000',
    'edgeLabelBackground': '#ffffff',
    'classText': '#000000'
  }
}}%%
classDiagram
    direction TB
    class User {
        +String id
        +String email
        +String password
        +String fullName
        +Boolean isAdmin
        +String adminRole
        +DateTime createdAt
        +DateTime updatedAt
        +isAdminAccount() Boolean
        +isSuperAdmin() Boolean
    }

    class Category {
        +String id
        +String slug
        +String name
        +String icon
        +String description
        +DateTime createdAt
        +getItems() List~Item~
    }

    class Item {
        +String id
        +String name
        +String slug
        +String categoryId
        +Float currentPrice
        +DateTime createdAt
        +DateTime updatedAt
        +getCategory() Category
        +getPriceRecords() List~PriceRecord~
    }

    class PriceRecord {
        +String id
        +String itemId
        +Float price
        +DateTime timestamp
        +String updatedBy
        +getItem() Item
    }

    class AuditLog {
        +String id
        +String adminEmail
        +String action
        +String details
        +DateTime timestamp
    }

    Category "1" *-- "0..*" Item : contains
    Item "1" *-- "0..*" PriceRecord : tracks
    User "1" --> "0..*" PriceRecord : modifies
    User "1" --> "0..*" AuditLog : triggers
```

#### Rendered UML Class Diagram:
![UML Class Diagram](./images/uml_class_diagram.png)

---

### 4.6.4 Entity-Relationship (ER) Diagram (Xiriirka Kaydka Xogta)
ER Diagram wuxuu sharraxayaa sida shaxda kala duwan ee database-ka ay isugu xiran yihiin, furayaasha asaasiga ah (Primary Keys - PK), iyo kuwa martida ah (Foreign Keys - FK).

```mermaid
%%{init: {
  'theme': 'base',
  'themeVariables': {
    'background': '#ffffff',
    'canvasPhysicalBackgroundColor': '#ffffff',
    'primaryColor': '#ffffff',
    'primaryTextColor': '#000000',
    'primaryBorderColor': '#000000',
    'lineColor': '#000000',
    'secondaryColor': '#ffffff',
    'tertiaryColor': '#ffffff',
    'mainBkg': '#ffffff',
    'nodeBorder': '#000000',
    'nodeTextColor': '#000000',
    'edgeLabelBackground': '#ffffff'
  }
}}%%
erDiagram
    USER {
        string id PK
        string email UK "Unique"
        string password
        string fullName
        boolean isAdmin
        string adminRole "ALL / animals / water / electricity"
        datetime createdAt
        datetime updatedAt
    }
    CATEGORY {
        string id PK
        string slug UK "Unique"
        string name
        string icon
        string description
        datetime createdAt
    }
    ITEM {
        string id PK
        string name
        string slug
        string categoryId FK
        float currentPrice
        datetime createdAt
        datetime updatedAt
    }
    PRICE_RECORD {
        string id PK
        string itemId FK
        float price
        datetime timestamp
        string updatedBy
    }
    AUDIT_LOG {
        string id PK
        string adminEmail
        string action
        string details
        datetime timestamp
    }

    CATEGORY ||--o{ ITEM : "1-to-Many Relation (categoryId)"
    ITEM ||--o{ PRICE_RECORD : "1-to-Many Relation (itemId)"
```

#### Rendered Entity-Relationship Diagram (ERD):
![Entity-Relationship Diagram](./images/er_diagram.png)

---

## ● 4.7 Database Design (Naqshadda Database-ka)

Nidaamka wuxuu adeegsadaa kaydka xogta ee **PostgreSQL** iyadoo la marayo **Prisma ORM**. Dhammaan aqoonsiyada (IDs) waxay isticmaalaan habka `cuid()` ee dhalinta ID-yo caalami ah oo gaar ah (globally unique).

#### 1. Shaxda Isticmaalaha (`User` Table)
Waxay kaydisaa maamulayaasha iyo xuquuqaha ay leeyihiin.
*   **Primary Key:** `id` (VARCHAR)
*   **Unique Index:** `email` (Si looga hortago laba akoon oo isku email ah)

| Magaca Goobta (Field) | Nooca Xogta (Data Type) | Nullable | Xayiraad / Default | Sharraxaad |
| :--- | :--- | :--- | :--- | :--- |
| `id` | VARCHAR(30) | Maya | PK, `default(cuid())` | Aqoonsiga gaarka ah ee isticmaalaha. |
| `email` | VARCHAR(255) | Maya | Unique | Email-ka loginka loo isticmaalo. |
| `password` | VARCHAR(255) | Maya | None | Password-ka oo loo kaydiyay hab qarsoodi ah (hashed). |
| `fullName` | VARCHAR(255) | Haa | None | Magaca buuxa ee isticmaalaha (waa ikhtiyaari). |
| `isAdmin` | BOOLEAN | Maya | `default(false)` | Calaamad muujinaysa inuu maamule yahay. |
| `adminRole` | VARCHAR(50) | Haa | `default("ALL")` | Role-ka: `ALL` (Super Admin), `animals`, `water`, `electricity`. |
| `createdAt` | TIMESTAMP | Maya | `default(now())` | Waqtiga akoonka la abuuray. |
| `updatedAt` | TIMESTAMP | Maya | Auto-updating | Waqtiga ugu dambeeyay ee wax laga beddelay. |

#### 2. Shaxda Qaybaha (`Category` Table)
Waxay kaydisaa qaybaha waaweyn ee qiimaha la kormeero (tusaale: Xoolaha, Biyaha, Korontada).
*   **Primary Key:** `id` (VARCHAR)
*   **Unique Index:** `slug` (URL-friendly string)

| Magaca Goobta (Field) | Nooca Xogta (Data Type) | Nullable | Xayiraad / Default | Sharraxaad |
| :--- | :--- | :--- | :--- | :--- |
| `id` | VARCHAR(30) | Maya | PK, `default(cuid())` | Aqoonsiga qaybta. |
| `slug` | VARCHAR(100) | Maya | Unique | Aqoonsi saaxiib la ah URL-ka (tusaale: "animals"). |
| `name` | VARCHAR(255) | Maya | None | Magaca qaybta (tusaale: "Xoolaha Nool"). |
| `icon` | VARCHAR(100) | Haa | None | Magaca icon-ka UI-ga lagu soo bandhigayo. |
| `description`| TEXT | Haa | None | Faahfaahin ku saabsan qaybta. |
| `createdAt` | TIMESTAMP | Maya | `default(now())` | Waqtiga la abuuray qaybta. |

#### 3. Shaxda Agabyada (`Item` Table)
Waxay kaydisaa waxyaabaha gaarka ah ee qiimaha laga kormeero.
*   **Primary Key:** `id` (VARCHAR)
*   **Foreign Key:** `categoryId` oo tilmaamaysa `Category(id)` on delete Restrict.
*   **Composite Unique:** `[slug, categoryId]` (Si looga hortago in labo agab oo isku magac ah lagu daro hal qayb).

| Magaca Goobta (Field) | Nooca Xogta (Data Type) | Nullable | Xayiraad / Default | Sharraxaad |
| :--- | :--- | :--- | :--- | :--- |
| `id` | VARCHAR(30) | Maya | PK, `default(cuid())` | Aqoonsiga agabka. |
| `name` | VARCHAR(255) | Maya | None | Magaca agabka (tusaale: "Ari (Goat)"). |
| `slug` | VARCHAR(255) | Maya | None | URL-safe slug. |
| `categoryId` | VARCHAR(30) | Maya | FK | Ku xiraha shaxda Category. |
| `currentPrice` | DOUBLE PRECISION| Maya | `default(0.0)` | Qiimaha ugu dambeeyay ee hadda suuqa jooga (USD). |
| `createdAt` | TIMESTAMP | Maya | `default(now())` | Waqtiga lagu daray nidaamka. |
| `updatedAt` | TIMESTAMP | Maya | Auto-updating | Waqtiga ugu dambeeyay ee qiimaha la beddelay. |

#### 4. Shaxda Diiwaanka Qiimaha (`PriceRecord` Table)
Waxay kaydisaa taariikhda qiimaha (history) si looga soo saaro garaafyada (analytics).
*   **Primary Key:** `id` (VARCHAR)
*   **Foreign Key:** `itemId` oo tilmaamaysa `Item(id)` on delete Cascade.

| Magaca Goobta (Field) | Nooca Xogta (Data Type) | Nullable | Xayiraad / Default | Sharraxaad |
| :--- | :--- | :--- | :--- | :--- |
| `id` | VARCHAR(30) | Maya | PK, `default(cuid())` | Aqoonsiga diiwaanka. |
| `itemId` | VARCHAR(30) | Maya | FK | Tilmaamaha agabka qiimaha laga beddelay. |
| `price` | DOUBLE PRECISION| Maya | None | Qiimihii la galiyay waqtigaas. |
| `timestamp` | TIMESTAMP | Maya | `default(now())` | Waqtiga saxda ah ee qiimaha la diiwangeliyay. |
| `updatedBy` | VARCHAR(255) | Haa | None | Email-ka maamulihii beddelay qiimaha. |

#### 5. Shaxda Log-yada Hantidhawrka (`AuditLog` Table)
Waxay kaydisaa dhammaan falalka maamulayaashu sameeyaan si loo ilaaliyo amniga iyo daahfurnaanta.
*   **Primary Key:** `id` (VARCHAR)

| Magaca Goobta (Field) | Nooca Xogta (Data Type) | Nullable | Xayiraad / Default | Sharraxaad |
| :--- | :--- | :--- | :--- | :--- |
| `id` | VARCHAR(30) | Maya | PK, `default(cuid())` | Aqoonsiga log-ga. |
| `adminEmail` | VARCHAR(255) | Maya | None | Email-ka maamulaha falka sameeyay. |
| `action` | VARCHAR(100) | Maya | None | Falka la sameeyay (tusaale: "Price Updated"). |
| `details` | TEXT | Haa | None | Faahfaahinta falka (tusaale agabka la beddelay). |
| `timestamp` | TIMESTAMP | Maya | `default(now())` | Waqtiga falku dhacay. |

---

## ● 4.8 System Architecture Diagram (Qaabdhismeedka Guud)

Jaantuskaan wuxuu muujinayaa qaabka uu u dhisanyahay nidaamka (Next.js Application), qaybaha amniga (Middleware & Authentication), dhuumaha xogta (APIs & ORM Prisma), iyo kaydinta xogta (PostgreSQL).

```mermaid
%%{init: {
  'theme': 'base',
  'themeVariables': {
    'background': '#ffffff',
    'canvasPhysicalBackgroundColor': '#ffffff',
    'primaryColor': '#ffffff',
    'primaryTextColor': '#000000',
    'primaryBorderColor': '#000000',
    'lineColor': '#000000',
    'secondaryColor': '#ffffff',
    'tertiaryColor': '#ffffff',
    'mainBkg': '#ffffff',
    'nodeBorder': '#000000',
    'nodeTextColor': '#000000',
    'edgeLabelBackground': '#ffffff'
  }
}}%%
graph TD
    subgraph ClientSpace [Client Environment]
        Browser["Web Browser\nChrome / Firefox / Safari"]
        Pages["Pages: / Dashboard\n/reports\n/admin/*\n/admin-login"]
        Browser --- Pages
    end

    subgraph NextJSServer [Next.js Server - Local Host]

        subgraph Middleware [Next.js Middleware - matcher: /admin/*]
            CookieGuard["Session Cookie Authenticator\nparseSessionCookieEdge()\nRedirects to /admin-login if not authenticated"]
        end

        subgraph APIRoutes [API Route Handlers]
            AuthAPI["POST /api/auth/login\nPOST /api/auth/logout\nGET  /api/auth/me\nPOST /api/auth/register"]
            PriceAPI["GET    /api/prices  (public)\nPOST   /api/prices  (requireItemAccess)\nDELETE /api/prices  (superOnly)"]
            AuditAPI["GET /api/audit  (requireAdmin)"]
            AdminUsersAPI["GET/PATCH/DELETE /api/admin/users  (superOnly)"]
            AdminItemsAPI["GET/POST /api/admin/items  (requireCategoryAccess)"]
        end

        subgraph RBACLib [RBAC & Auth Library]
            SessionParser["parseSessionCookie()\ncreateSessionToken()"]
            RoleGuard["requireAdmin()\nrequireItemAccess()\nrequireCategoryAccess()\ncanAdminModifyCategory()\nisProtectedSuperAdmin()"]
        end

        Prisma["Prisma ORM Client\nAuto-maps DB models"]
    end

    subgraph DataStorage [Data Storage - Local]
        PostgreSQL[("PostgreSQL Database\nTables: User, Category,\nItem, PriceRecord, AuditLog")]
        BackupScript["backup-db.bat\n+ backup-db.js"]
        BackupsDir["backups/\nJSON Backup Files"]
    end

    %% Flow
    Browser -->|HTTP Request + Session Cookie| CookieGuard
    CookieGuard -->|Pass through if authenticated| APIRoutes
    APIRoutes --> RBACLib
    RBACLib --> Prisma
    Prisma -->|SQL via TCP/IP| PostgreSQL
    PostgreSQL -->|Batch Trigger| BackupScript
    BackupScript -->|Writes JSON| BackupsDir
```

#### Rendered System Architecture Diagram:
![System Architecture Diagram](./images/system_architecture_diagram.png)

### Astaamaha Muhiimka ah ee Qaabdhismeedka (Key Architectural Traits):
1. **Standalone Isolation:** Nidaamku wuxuu si buuxda ugu shaqeeyaa deegaanka maxalliga ah (local environment) asagoon u baahnayn internet ama daruur (cloud servers) si uu u keydiyo ama u akhriyo xogta.
2. **Role-Based Access Control (RBAC):** Middleware-ka Next.js (`RouteGuard` iyo `RoleGuard`) wuxuu xaqiijiyaa in admin kasta uu beddeli karo oo kaliya qaybta (category) loo xilsaaray.
3. **Automated Portability:** Nidaamku wuxuu leeyahay scripts (`backup-db.bat`) oo si toos ah u dhalinaya JSON backup ah dhammaan xogta isagoo ku kaydinaya meel amni ah oo maxalli ah.
