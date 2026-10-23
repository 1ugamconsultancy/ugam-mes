# UGAM / Lumos MES - Standalone Deployable Package

Next Generation Enterprise Manufacturing Execution System designed for precision discrete manufacturing, electronics/SMT assembly, and regulated production environments (FDA 21 CFR Part 11, IATF 16949, GMP).

---

## 🚀 Quick Start Instructions

### Prerequisites
- Windows 10/11 or Windows Server
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running (with Docker Compose V2)

---

### Option 1: Automated 1-Click Launch (Recommended)
Simply double-click:
```bat
start.bat
```
This launcher will automatically:
1. Verify if the Docker daemon is online (and launches Docker Desktop if it is not yet active).
2. Start the full MES container stack: PostgreSQL, Redis, NestJS Backend, React 19 Frontend, and Adminer Database UI.
3. Validate database initialization and service readiness.
4. Launch your default web browser directly to the MES operator & manager interface at `http://localhost:8085`.

---

### Option 2: Pre-built Offline Image Deployment
If deploying on a factory floor or workstation without an internet connection:
1. Double-click `load-images.bat` to import the pre-built Docker containers (`ugam-frontend.tar`, `ugam-backend.tar`):
   ```bat
   load-images.bat
   ```
2. Run Docker Compose using the standalone deploy configuration:
   ```powershell
   docker compose -f docker-compose.deploy.yml up -d
   ```
3. Open your browser at [http://localhost:8085](http://localhost:8085).

---

### Option 3: Manual Startup via Command Line
```powershell
# From the project root folder (D:\Lumos_MES)
docker compose up -d
```

---

## 🌐 Application Endpoints & Ports

| Service | Protocol / URL | Default Port | Description |
| :--- | :--- | :--- | :--- |
| **MES Frontend Application** | `http://localhost:8085` | `8085` | React 19 + Tailwind touchscreen operator and supervisor portal |
| **Backend REST API** | `http://localhost:3001` | `3001` | NestJS enterprise API engine |
| **Swagger API Docs** | `http://localhost:3001/api` | `3001` | Interactive OpenAPI documentation & testing sandbox |
| **Adminer Database GUI** | `http://localhost:8082` | `8082` | Web-based database management interface |
| **PostgreSQL Database** | `localhost:5434` | `5434` (mapped from 5432) | Core relational storage for MES master data & logs |
| **Redis In-Memory Cache** | `localhost:6380` | `6380` (mapped from 6379) | High-speed cache for telemetry, sessions, and events |

---

## 👤 Default User Accounts & Roles

| Role | Username | Default Password | Access Level & Scope |
| :--- | :--- | :--- | :--- |
| **System Administrator** | `admin` | `SecretMESPassword123` | Full access to SuperAdmin, Theme Engine, and Plant Hierarchy |
| **Production Manager** | `manager` | `SecretMESPassword123` | Work Orders, Gantt Schedule, OEE Analytics, Recipe Authoring |
| **Line Operator** | `operator1` | `SecretMESPassword123` | High-contrast touch terminal, Step execution, 2D QR Verification |
| **Quality Engineer** | `quality1` | `SecretMESPassword123` | 21 CFR Part 11 Digital Signatures, eBR Review, SPC Charts |

---

## 🗄️ Database Access Details (Adminer / External Tools)

- **System:** `PostgreSQL`
- **Server:** `postgres` (or `localhost` if connecting from host machine via DBeaver / pgAdmin)
- **Port:** `5434`
- **Database:** `ugam_mes`
- **Username:** `mes_admin`
- **Password:** `SecretMESPassword123`

---

## 📦 Package Contents & File Structure

```text
D:\Lumos_MES\
├── backend\                         # NestJS Backend source code & Dockerfile
│   ├── src\                         # Modular services (Auth, Compliance, EBR, Materials, OPC, etc.)
│   └── uploads\                     # Uploaded technical drawings, STL 3D models & assets
├── frontend\                        # React 19 Frontend source code & Dockerfile
│   └── src\                         # UI Components, Touchscreen terminals, Theme Engine
├── ugam-backend.tar                 # Standalone pre-built Backend Docker container archive
├── ugam-frontend.tar                # Standalone pre-built Frontend Docker container archive
├── docker-compose.yml               # Development & standard container orchestration file
├── docker-compose.deploy.yml        # Production pre-built image container orchestration file
├── start.bat                        # Automated Windows launcher script
├── stop.bat                         # Graceful shutdown script
├── load-images.bat                  # Offline Docker image importer script
├── schema.sql                       # Core MES database DDL definitions
├── seed.sql                         # Standard master data seed records
├── migration_enterprise_multitenant.sql # Multi-tenant plant and organization schema
├── migration_qr_code.sql            # 2D QR matrix standard schema
├── migration_upgrade.sql            # Core upgrade delta migration
├── populate_compliance_data.sql     # 21 CFR Part 11 regulatory compliance test records
├── setup_ugam_mes_db.sql            # Complete consolidated standalone database setup
├── README.md                        # Project documentation
├── README_DEPLOYMENT.md             # This deployment guide
├── INFORMATION_ARCHITECTURE.md      # MES component design & architectural specifications
└── LINE_E2E_TEST_PLAN.md            # Comprehensive end-to-end line verification test plan
```

---

## 🛑 Stopping the Application
To safely stop all containers and preserve all active database state:
```bat
stop.bat
```
Or run:
```powershell
docker compose down
```
*(All data persists across restarts in Docker volumes `pgdata` and `redisdata`).*
