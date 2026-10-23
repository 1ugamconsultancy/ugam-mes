# UGAM Next Gen MES - Enterprise Manufacturing Execution System

**Security upgrade:** Before starting the updated backend, follow [the account audit and plant-access migration guide](SECURITY_REMEDIATION.md). The former demo passwords and embedded JWT secret no longer work. Existing databases must be migrated and placeholder accounts reset individually.

UGAM Next Gen MES is a full-stack, enterprise-grade Manufacturing Execution System designed for SMT assembly and discrete manufacturing industries. It provides live SMT line OEE monitoring, Capable-to-Promise Gantt scheduling, high-contrast touchscreen Operator terminals, quality checklist SPC control limits, and backward/forward batch lot genealogies.

---

## ⚙️ PostgreSQL Setup & Configuration

This project is configured to run with a PostgreSQL database. Below are the setup instructions depending on your deployment scenario:

### Scenario A: Automated Setup (Using Docker Compose)
If you run the application using Docker, PostgreSQL is configured automatically:
1. The `docker-compose.yml` launches a PostgreSQL 15 container (`mes-postgres`) on port `5432`.
2. On initial startup, Docker executes [schema.sql](file:///d:/UGAM_MES/schema.sql) and [seed.sql](file:///d:/UGAM_MES/seed.sql) to initialize the tables and seed equipment profiles.
3. A local volume `pgdata` is created to persist database transactions across container restarts.

To run:
```bash
docker compose up --build -d
```

---

### Scenario B: Local / External PostgreSQL Setup (Manual)
If you prefer to run the database natively on your host machine without Docker:

#### 1. Create the Database & User
Open your PostgreSQL terminal (psql) or pgAdmin and run the following queries:
```sql
-- Create the MES administration user
CREATE USER mes_admin WITH PASSWORD 'SecretMESPassword123';

-- Create the MES execution database
CREATE DATABASE ugam_mes OWNER mes_admin;

-- Grant permissions to the user
GRANT ALL PRIVILEGES ON DATABASE ugam_mes TO mes_admin;
```

#### 2. Initialize Schema & Populate Seed Data
Execute the setup scripts against your newly created database. In your command terminal, run:
```bash
# Import the tables, enums, and foreign keys
psql -U mes_admin -d ugam_mes -f d:\UGAM_MES\schema.sql

# Populate Precision Equipment and Master Data
psql -U mes_admin -d ugam_mes -f d:\UGAM_MES\seed.sql
```

#### 3. Configure Backend Connection Environment Variables
Create a `.env` file inside [backend/](file:///d:/UGAM_MES/backend) (or set them directly in your environment):
```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=mes_admin
DB_PASSWORD=SecretMESPassword123
DB_DATABASE=ugam_mes
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=
APP_MODE=production
ALLOWED_ORIGINS=http://localhost:8085,http://localhost:5173
OPC_ALLOWED_ENDPOINTS=
```

---

## 🚀 Running Backend & Frontend Locally
Once your local PostgreSQL is running and initialized:

1. **Start Backend API (NestJS)**:
   ```bash
   cd d:\UGAM_MES\backend
   npm install
   npm run start:dev
   ```
2. **Start Frontend Client (React 19 + Vite)**:
   ```bash
   cd d:\UGAM_MES\frontend
   npm install --legacy-peer-deps
   npm run dev
   ```
3. Navigate to **`http://localhost:5173`** to access the MES portal!
