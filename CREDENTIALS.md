# Lumos / UGAM MES Credentials & Account Reference

All development and test accounts in the system are configured with the standard password:

> **Universal Password**: `MES123`

---

## 1. Shopfloor & Application User Accounts

| Username | Default Password | Role | Name / Description | Primary Use Case |
|---|---|---|---|---|
| **`operator1`** | `MES123` | `OPERATOR` | Rajesh Kumar | Line Operator Workstation (`/operator`), Scanning BOMs, Step 1-6 completion |
| **`supervisor`** | `MES123` | `SUPERVISOR` | Anand Mehta | Quality Supervisor sign-offs, Station Dual E-Signatures, 21 CFR Part 11 Batch Closure |
| **`admin`** | `MES123` | `ADMIN` | System Administrator | Master Data Management, Recipes, Equipment, Users (`/admin`) |
| **`manager`** | `MES123` | `PRODUCTION_MANAGER` | Production Manager | Work Order release, Scheduling, OEE Analytics (`/dashboard`) |
| **`quality1`** | `MES123` | `QUALITY_ENGINEER` | Quality Engineer | CAPA, Deviations, Audit Trail review (`/quality`, `/compliance`) |
| **`superadmin`** | `MES123` | `SUPER_ADMIN` | Global Administrator | Multi-tenant organization & plant management (`/super-admin`) |
| **`operator2`** | `MES123` | `OPERATOR` | Line Operator 2 | Secondary shift operator |
| **`operator3`** | `MES123` | `OPERATOR` | Line Operator 3 | Secondary shift operator |

---

## 2. Infrastructure & Database Credentials

| Service | Host / Port | Username | Password | Database | Configuration File |
|---|---|---|---|---|---|
| **PostgreSQL** | `localhost:5434` (Docker: `postgres:5432`) | `mes_admin` | `SecretMESPassword123` | `ugam_mes` | `docker-compose.yml` |
| **Redis** | `localhost:6380` (Docker: `redis:6379`) | *(none)* | *(no password)* | `0` | `docker-compose.yml` |
| **Backend API** | `http://localhost:3001` (Docker: `3000`) | — | — | — | `backend/.env.example` |
| **Frontend UI** | `http://localhost:8085` (Docker: `80`) | — | — | — | `nginx.conf` |

---

## 3. Files Where Passwords & Hashes Are Defined

1. **Development Password Reset Script**:
   - [`backend/scripts/reset-development-passwords.cjs`](file:///d:/UGAM_MES/backend/scripts/reset-development-passwords.cjs#L15)
   - Code: `const hash = await bcrypt.hash('MES123', 12);`
2. **Shopfloor E-Signature & Batch Closure Defaults**:
   - [`frontend/src/components/DiscreteAssemblyStation.tsx`](file:///d:/UGAM_MES/frontend/src/components/DiscreteAssemblyStation.tsx#L260-L265)
   - Code: `useState<string>('MES123')` and 1-click `"Fill 'MES123'"` button at line 1584.
3. **Container Environment & Ports**:
   - [`docker-compose.yml`](file:///d:/UGAM_MES/docker-compose.yml#L8-L10)
4. **Seed Database Schema**:
   - [`seed.sql`](file:///d:/UGAM_MES/seed.sql#L5-L15)
   - [`setup_ugam_mes_db.sql`](file:///d:/UGAM_MES/setup_ugam_mes_db.sql)
