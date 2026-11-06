import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Pool, QueryResult } from 'pg';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private pool: Pool;
  private isConnected = false;

  onModuleInit() {
    const dbUrl = process.env.DATABASE_URL;
    const isCloud = Boolean(
      dbUrl ||
      process.env.RENDER ||
      (process.env.DB_HOST && process.env.DB_HOST !== 'localhost' && process.env.DB_HOST !== 'postgres')
    );

    this.pool = dbUrl
      ? new Pool({
          connectionString: dbUrl,
          ssl: { rejectUnauthorized: false },
          max: 10,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 5000,
        })
      : new Pool({
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432', 10),
          user: process.env.DB_USERNAME || 'mes_admin',
          password: process.env.DB_PASSWORD || 'SecretMESPassword123',
          database: process.env.DB_DATABASE || 'ugam_mes',
          ssl: isCloud ? { rejectUnauthorized: false } : false,
          max: 10,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 5000,
        });

    // Test connection
    this.pool.query('SELECT NOW()')
      .then(async () => {
        this.isConnected = true;
        console.log('Successfully connected to PostgreSQL Database Server');
        await this.autoBootstrapIfEmpty();
        await this.runMasterDataScopingMigration();
        await this.autoEnsurePharmaPlantAndUsers();
      })
      .catch((err) => {
        this.isConnected = false;
        console.warn('PostgreSQL database connection failed. Error:', err.message);
      });
  }

  private async autoBootstrapIfEmpty() {
    try {
      const check = await this.pool.query(
        "SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users'"
      );
      if (check.rowCount === 0) {
        console.log('⚠️ Database is empty. Running auto-bootstrap from setup_ugam_mes_db.sql...');
        const candidatePaths = [
          path.join(process.cwd(), 'setup_ugam_mes_db.sql'),
          path.join(__dirname, '..', 'setup_ugam_mes_db.sql'),
          path.join(__dirname, '..', '..', 'setup_ugam_mes_db.sql'),
          '/app/setup_ugam_mes_db.sql',
        ];
        let sqlContent = '';
        for (const p of candidatePaths) {
          if (fs.existsSync(p)) {
            sqlContent = fs.readFileSync(p, 'utf8');
            console.log(`Found bootstrap script at: ${p}`);
            break;
          }
        }
        if (sqlContent) {
          const cleanSql = sqlContent
            .split('\n')
            .filter(line => !line.trim().startsWith('\\'))
            .join('\n');
          await this.pool.query("SET search_path = public, pg_catalog;");
          await this.pool.query(cleanSql);
          await this.pool.query("SET search_path = public, pg_catalog;");
          console.log('✅ Auto-bootstrap completed successfully! All tables, stations and seed users initialized.');
        } else {
          console.warn('Could not locate setup_ugam_mes_db.sql for auto-bootstrap.');
        }
      } else {
        console.log('PostgreSQL database schema verified (users table exists).');
      }
    } catch (err: any) {
      console.error('Error during auto-bootstrap check:', err?.message || err);
    }
  }

  
  
    public async runMasterDataScopingMigration() {
    try {
      console.log('🔄 Applying Master Data Plant & Org Scoping Schema...');
      const statements = [
        "ALTER TABLE public.material_master ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE RESTRICT, ADD COLUMN IF NOT EXISTS plant_id UUID REFERENCES public.plants(id) ON DELETE RESTRICT;",
        "ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE RESTRICT, ADD COLUMN IF NOT EXISTS plant_id UUID REFERENCES public.plants(id) ON DELETE RESTRICT;",
        "ALTER TABLE public.products ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE RESTRICT, ADD COLUMN IF NOT EXISTS plant_id UUID REFERENCES public.plants(id) ON DELETE RESTRICT;",
        "ALTER TABLE public.equipment_master ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE RESTRICT, ADD COLUMN IF NOT EXISTS plant_id UUID REFERENCES public.plants(id) ON DELETE RESTRICT;",
        "ALTER TABLE public.batch_recipes ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE RESTRICT, ADD COLUMN IF NOT EXISTS plant_id UUID REFERENCES public.plants(id) ON DELETE RESTRICT;",
        "ALTER TABLE public.bom_header ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE RESTRICT, ADD COLUMN IF NOT EXISTS plant_id UUID REFERENCES public.plants(id) ON DELETE RESTRICT;",
        "ALTER TABLE public.bom_component ADD COLUMN IF NOT EXISTS revision VARCHAR(10) DEFAULT 'A';",
        "ALTER TABLE public.routing_header ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE RESTRICT, ADD COLUMN IF NOT EXISTS plant_id UUID REFERENCES public.plants(id) ON DELETE RESTRICT;",
        "ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE RESTRICT;",
        "ALTER TABLE public.material_batches ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE RESTRICT, ADD COLUMN IF NOT EXISTS plant_id UUID REFERENCES public.plants(id) ON DELETE RESTRICT;",
        "ALTER TABLE public.equipment_calibrations ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE RESTRICT, ADD COLUMN IF NOT EXISTS plant_id UUID REFERENCES public.plants(id) ON DELETE RESTRICT;",
        "ALTER TABLE public.equipment_qualifications ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE RESTRICT, ADD COLUMN IF NOT EXISTS plant_id UUID REFERENCES public.plants(id) ON DELETE RESTRICT;",
        "ALTER TABLE public.warehouses ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE RESTRICT;",
        "ALTER TABLE public.serialized_units ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE RESTRICT, ADD COLUMN IF NOT EXISTS plant_id UUID REFERENCES public.plants(id) ON DELETE RESTRICT;",
        "ALTER TABLE public.product_genealogy_events ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE RESTRICT, ADD COLUMN IF NOT EXISTS plant_id UUID REFERENCES public.plants(id) ON DELETE RESTRICT;",
        "ALTER TABLE public.genealogy ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE RESTRICT, ADD COLUMN IF NOT EXISTS plant_id UUID REFERENCES public.plants(id) ON DELETE RESTRICT;",
        "ALTER TABLE public.inventory_balances ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE RESTRICT;",
        "ALTER TABLE public.production_logs ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE RESTRICT, ADD COLUMN IF NOT EXISTS plant_id UUID REFERENCES public.plants(id) ON DELETE RESTRICT;",
        "ALTER TABLE public.dispensing_records ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE RESTRICT, ADD COLUMN IF NOT EXISTS plant_id UUID REFERENCES public.plants(id) ON DELETE RESTRICT;",
        "ALTER TABLE public.electronic_signatures ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE RESTRICT, ADD COLUMN IF NOT EXISTS plant_id UUID REFERENCES public.plants(id) ON DELETE RESTRICT;",
        "ALTER TABLE public.material_consumptions ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE RESTRICT, ADD COLUMN IF NOT EXISTS plant_id UUID REFERENCES public.plants(id) ON DELETE RESTRICT;",
        "ALTER TABLE public.material_inventory ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE RESTRICT, ADD COLUMN IF NOT EXISTS plant_id UUID REFERENCES public.plants(id) ON DELETE RESTRICT;",
        "ALTER TABLE public.material_transactions ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE RESTRICT, ADD COLUMN IF NOT EXISTS plant_id UUID REFERENCES public.plants(id) ON DELETE RESTRICT;",
      ];
      for (const sql of statements) {
        try {
          await this.pool.query(sql);
        } catch (e: any) {
          console.warn('Migration column note:', e.message);
        }
      }

      // Safe Backfills
      const backfills = [
        "UPDATE public.work_orders wo SET organization_id = p.organization_id FROM public.plants p WHERE wo.plant_id = p.id AND wo.organization_id IS NULL;",
        "UPDATE public.warehouses w SET organization_id = p.organization_id FROM public.plants p WHERE w.plant_id = p.id AND w.organization_id IS NULL;",
        "UPDATE public.material_master SET plant_id = 'a0000000-0001-1111-1111-111111111111', organization_id = '10000000-0000-0000-0000-000000000001' WHERE plant_id IS NULL AND (material_code LIKE 'RM-ST%' OR material_code LIKE 'RM-LTH%' OR material_code LIKE 'RM-FOAM%' OR material_code LIKE 'RAW-00%' OR material_code LIKE 'SEAT-%');",
        "UPDATE public.vendors SET plant_id = 'a0000000-0001-1111-1111-111111111111', organization_id = '10000000-0000-0000-0000-000000000001' WHERE plant_id IS NULL AND vendor_code NOT LIKE 'VND-PHARMA%';",
        "UPDATE public.products SET plant_id = 'a0000000-0001-1111-1111-111111111111', organization_id = '10000000-0000-0000-0000-000000000001' WHERE plant_id IS NULL AND sku != 'API-INT-X';",
        "UPDATE public.equipment_master SET plant_id = 'a0000000-0001-1111-1111-111111111111', organization_id = '10000000-0000-0000-0000-000000000001' WHERE plant_id IS NULL AND equipment_id NOT IN ('EX-101', 'REC-102', 'FM-101');",
        "UPDATE public.batch_recipes SET plant_id = 'a0000000-0001-1111-1111-111111111111', organization_id = '10000000-0000-0000-0000-000000000001' WHERE plant_id IS NULL AND recipe_code != 'RCP-API-LLE-001';",
        "UPDATE public.bom_header SET plant_id = 'a0000000-0001-1111-1111-111111111111', organization_id = '10000000-0000-0000-0000-000000000001' WHERE plant_id IS NULL AND bom_id != 'BOM-API-001';",
        "UPDATE public.routing_header SET plant_id = 'a0000000-0001-1111-1111-111111111111', organization_id = '10000000-0000-0000-0000-000000000001' WHERE plant_id IS NULL AND routing_id != 'RT-API-001';",
        "UPDATE public.material_batches mb SET plant_id = mm.plant_id, organization_id = mm.organization_id FROM public.material_master mm WHERE mb.material_id = mm.id AND mb.plant_id IS NULL;",
        "UPDATE public.equipment_calibrations SET plant_id = 'a0000000-0001-1111-1111-111111111111', organization_id = '10000000-0000-0000-0000-000000000001' WHERE plant_id IS NULL;",
        "UPDATE public.equipment_qualifications SET plant_id = 'a0000000-0001-1111-1111-111111111111', organization_id = '10000000-0000-0000-0000-000000000001' WHERE plant_id IS NULL;",
        "UPDATE public.serialized_units su SET plant_id = wo.plant_id, organization_id = wo.organization_id FROM public.work_orders wo WHERE su.work_order_id = wo.id AND (su.plant_id IS NULL OR su.organization_id IS NULL);",
        "UPDATE public.serialized_units SET plant_id = 'a0000000-0001-1111-1111-111111111111', organization_id = '10000000-0000-0000-0000-000000000001' WHERE plant_id IS NULL;",
        "UPDATE public.product_genealogy_events ge SET plant_id = wo.plant_id, organization_id = wo.organization_id FROM public.work_orders wo WHERE ge.work_order_id = wo.id AND (ge.plant_id IS NULL OR ge.organization_id IS NULL);",
        "UPDATE public.product_genealogy_events SET plant_id = 'a0000000-0001-1111-1111-111111111111', organization_id = '10000000-0000-0000-0000-000000000001' WHERE plant_id IS NULL;",
        "UPDATE public.inventory_balances ib SET organization_id = p.organization_id FROM public.plants p WHERE ib.plant_id = p.id AND ib.organization_id IS NULL;",
        "UPDATE public.inventory_balances SET organization_id = '10000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;",
        "UPDATE public.production_logs pl SET plant_id = wo.plant_id, organization_id = wo.organization_id FROM public.work_orders wo WHERE pl.work_order_id = wo.id AND (pl.plant_id IS NULL OR pl.organization_id IS NULL);",
        "UPDATE public.production_logs SET plant_id = 'a0000000-0001-1111-1111-111111111111', organization_id = '10000000-0000-0000-0000-000000000001' WHERE plant_id IS NULL;",
        "UPDATE public.dispensing_records dr SET plant_id = wo.plant_id, organization_id = wo.organization_id FROM public.work_orders wo WHERE dr.work_order_id = wo.id AND (dr.plant_id IS NULL OR dr.organization_id IS NULL);",
        "UPDATE public.dispensing_records SET plant_id = 'a0000000-0001-1111-1111-111111111111', organization_id = '10000000-0000-0000-0000-000000000001' WHERE plant_id IS NULL;",
        "UPDATE public.genealogy g SET plant_id = a.plant_id, organization_id = pl.organization_id FROM public.machines m JOIN public.lines l ON l.id = m.line_id JOIN public.areas a ON a.id = l.area_id JOIN public.plants pl ON pl.id = a.plant_id WHERE m.code = g.machine_id AND (g.plant_id IS NULL OR g.organization_id IS NULL);",
        "UPDATE public.genealogy SET plant_id = 'a0000000-0001-1111-1111-111111111111', organization_id = '10000000-0000-0000-0000-000000000001' WHERE plant_id IS NULL;",
        "UPDATE public.electronic_signatures es SET plant_id = u.plant_id, organization_id = u.organization_id FROM public.users u WHERE es.user_id = u.id AND (es.plant_id IS NULL OR es.organization_id IS NULL);",
        "UPDATE public.electronic_signatures SET plant_id = 'a0000000-0001-1111-1111-111111111111', organization_id = '10000000-0000-0000-0000-000000000001' WHERE plant_id IS NULL;",
        "UPDATE public.material_consumptions mc SET plant_id = wo.plant_id, organization_id = wo.organization_id FROM public.work_orders wo WHERE mc.work_order_id = wo.id AND (mc.plant_id IS NULL OR mc.organization_id IS NULL);",
        "UPDATE public.material_consumptions SET plant_id = 'a0000000-0001-1111-1111-111111111111', organization_id = '10000000-0000-0000-0000-000000000001' WHERE plant_id IS NULL;",
        "UPDATE public.material_inventory mi SET plant_id = mb.plant_id, organization_id = mb.organization_id FROM public.material_batches mb WHERE mi.material_batch_id = mb.id AND (mi.plant_id IS NULL OR mi.organization_id IS NULL);",
        "UPDATE public.material_inventory SET plant_id = 'a0000000-0001-1111-1111-111111111111', organization_id = '10000000-0000-0000-0000-000000000001' WHERE plant_id IS NULL;",
        "UPDATE public.material_transactions mt SET plant_id = mb.plant_id, organization_id = mb.organization_id FROM public.material_batches mb WHERE mt.material_batch_id = mb.id AND (mt.plant_id IS NULL OR mt.organization_id IS NULL);",
        "UPDATE public.material_transactions SET plant_id = 'a0000000-0001-1111-1111-111111111111', organization_id = '10000000-0000-0000-0000-000000000001' WHERE plant_id IS NULL;",
      ];
      for (const sql of backfills) {
        try {
          await this.pool.query(sql);
        } catch (e: any) {
          console.warn('Backfill step note:', e.message);
        }
      }

      // Indexes
      const indexes = [
        "CREATE INDEX IF NOT EXISTS idx_materials_plant_org ON public.material_master (plant_id, organization_id);",
        "CREATE INDEX IF NOT EXISTS idx_vendors_plant_org ON public.vendors (plant_id, organization_id);",
        "CREATE INDEX IF NOT EXISTS idx_products_plant_org ON public.products (plant_id, organization_id);",
        "CREATE INDEX IF NOT EXISTS idx_equipment_plant_org ON public.equipment_master (plant_id, organization_id);",
        "CREATE INDEX IF NOT EXISTS idx_recipes_plant_org ON public.batch_recipes (plant_id, organization_id);",
        "CREATE INDEX IF NOT EXISTS idx_boms_plant_org ON public.bom_header (plant_id, organization_id);",
        "CREATE INDEX IF NOT EXISTS idx_routings_plant_org ON public.routing_header (plant_id, organization_id);",
        "CREATE INDEX IF NOT EXISTS idx_batches_plant_org ON public.material_batches (plant_id, organization_id);",
        "CREATE INDEX IF NOT EXISTS idx_work_orders_plant_org ON public.work_orders (plant_id, organization_id);",
        "CREATE INDEX IF NOT EXISTS idx_calibrations_plant_org ON public.equipment_calibrations (plant_id, organization_id);",
        "CREATE INDEX IF NOT EXISTS idx_qualifications_plant_org ON public.equipment_qualifications (plant_id, organization_id);"
      ];
      for (const sql of indexes) {
        try {
          await this.pool.query(sql);
        } catch (e: any) {
          console.warn('Index step note:', e.message);
        }
      }
      console.log('✅ Master Data Plant & Org Scoping applied completely!');
    } catch (err: any) {
      console.error('Error applying master data scoping migration:', err?.message || err);
    }
  }

  public async autoEnsurePharmaPlantAndUsers() {
    try {
      console.log('🔍 Checking Pharma Liquid-Liquid Extraction Plant, operations, and user allocations...');
      
      // 1. Ensure Organization: Ugam Biopharma Solutions Ltd
      let orgId = 'e28a835a-2b67-4332-86c7-8c79165f2354';
      const existingOrg = await this.pool.query(
        "SELECT id FROM public.organizations WHERE code = 'UGAM-PHARMA' OR name ILIKE '%Ugam Biopharma%' LIMIT 1"
      );
      if (existingOrg.rowCount && existingOrg.rowCount > 0) {
        orgId = existingOrg.rows[0].id;
        console.log(`Using existing Pharma organization ID: ${orgId}`);
      } else {
        await this.pool.query(`
          INSERT INTO public.organizations (id, name, code, industry_type, logo_url, is_active, created_at, updated_at)
          VALUES ($1, 'Ugam Biopharma Solutions Ltd', 'UGAM-PHARMA', 'PHARMACEUTICAL', NULL, true, NOW(), NOW())
          ON CONFLICT (id) DO UPDATE SET is_active = true
        `, [orgId]);
        console.log(`Created Pharma organization ID: ${orgId}`);
      }

      // 2. Ensure Plant: Pharma Liquid-Liquid Extraction Plant
      let plantId = '396c9f46-006d-4ade-82d2-6fd1b5c6c5e5';
      const existingPlant = await this.pool.query(
        "SELECT id FROM public.plants WHERE code = 'PHARMA-PLANT-01' LIMIT 1"
      );
      if (existingPlant.rowCount && existingPlant.rowCount > 0) {
        plantId = existingPlant.rows[0].id;
        await this.pool.query(
          "UPDATE public.plants SET organization_id = $1, status = 'ACTIVE' WHERE id = $2",
          [orgId, plantId]
        );
        console.log(`Using existing Pharma plant ID: ${plantId}`);
      } else {
        await this.pool.query(`
          INSERT INTO public.plants (id, name, code, location, created_at, organization_id, timezone, status)
          VALUES ($1, 'Pharma Liquid-Liquid Extraction Plant', 'PHARMA-PLANT-01', 'Biotech Park, Hyderabad, India', NOW(), $2, 'Asia/Kolkata', 'ACTIVE')
          ON CONFLICT (id) DO UPDATE SET organization_id = $2, status = 'ACTIVE'
        `, [plantId, orgId]);
        console.log(`Created Pharma plant ID: ${plantId}`);
      }

      // 3. Ensure Theme Settings
      const existingTheme = await this.pool.query(
        "SELECT id FROM public.plant_theme_settings WHERE plant_id = $1 LIMIT 1",
        [plantId]
      );
      if (!existingTheme.rowCount || existingTheme.rowCount === 0) {
        await this.pool.query(`
          INSERT INTO public.plant_theme_settings (id, organization_id, plant_id, theme_name, palette_type, is_dark_mode, colors, updated_at)
          VALUES (
            gen_random_uuid(), $1, $2, 'Cleanroom Cyan', 'PRESET', false,
            '{"bgPrimary": "#FFFFFF", "bgSection": "#F8FAFC", "bgCard": "#FFFFFF", "textPrimary": "#0F172A", "textSecondary": "#475569", "borderColor": "rgba(14, 116, 144, 0.25)", "colorPrimary": "#0E7490", "colorCorporate": "#155E75", "colorAccent": "#10B981"}',
            NOW()
          )
        `, [orgId, plantId]);
      }

      // 4. Ensure Users: pharma_op1, pharma_qa1, pharma_admin
      // Universal password hash for MES123: $2b$10$rNfm3NBFktkLEcTITstS7uuEgElrD7a/yWNJN7pWp98aokhGgiZxW
      const mes123Hash = '$2b$10$rNfm3NBFktkLEcTITstS7uuEgElrD7a/yWNJN7pWp98aokhGgiZxW';
      
      const usersToEnsure = [
        {
          username: 'pharma_op1',
          email: 'pharma_op1@ugambiopharma.com',
          role: 'OPERATOR',
          firstName: 'Aakash',
          lastName: 'Verma (Extraction OP)',
        },
        {
          username: 'pharma_qa1',
          email: 'pharma_qa1@ugambiopharma.com',
          role: 'QUALITY_ENGINEER',
          firstName: 'Dr. Priya',
          lastName: 'Sen (QA Compliance)',
        },
        {
          username: 'pharma_admin',
          email: 'pharma_admin@ugambiopharma.com',
          role: 'ADMIN',
          firstName: 'Dr. Ramesh',
          lastName: 'Joshi (Plant Director)',
        },
      ];

      for (const u of usersToEnsure) {
        const userCheck = await this.pool.query(
          "SELECT id FROM public.users WHERE username = $1 LIMIT 1",
          [u.username]
        );
        if (userCheck.rowCount && userCheck.rowCount > 0) {
          await this.pool.query(`
            UPDATE public.users
            SET password_hash = $1,
                role = $2,
                organization_id = $3,
                plant_id = $4,
                first_name = $5,
                last_name = $6,
                is_active = true,
                updated_at = NOW()
            WHERE username = $7
          `, [mes123Hash, u.role, orgId, plantId, u.firstName, u.lastName, u.username]);
        } else {
          await this.pool.query(`
            INSERT INTO public.users (
              id, username, email, password_hash, role, first_name, last_name, is_active, created_at, updated_at, organization_id, plant_id, session_version
            )
            VALUES (
              gen_random_uuid(), $1, $2, $3, $4, $5, $6, true, NOW(), NOW(), $7, $8, 0
            )
          `, [u.username, u.email, mes123Hash, u.role, u.firstName, u.lastName, orgId, plantId]);
        }
        console.log(`✅ User ${u.username} provisioned & allocated to Pharma Plant.`);
      }

      // 5. Ensure Area: WC-API-EXT
      let areaId = 'a1111111-0009-1111-1111-111111111111';
      const existingArea = await this.pool.query("SELECT id FROM public.areas WHERE code = 'WC-API-EXT' LIMIT 1");
      if (existingArea.rowCount && existingArea.rowCount > 0) {
        areaId = existingArea.rows[0].id;
        await this.pool.query("UPDATE public.areas SET plant_id = $1 WHERE id = $2", [plantId, areaId]);
      } else {
        await this.pool.query(`
          INSERT INTO public.areas (id, plant_id, name, code, created_at)
          VALUES ($1, $2, 'API Synthesis & Extraction Center', 'WC-API-EXT', NOW())
          ON CONFLICT (id) DO UPDATE SET plant_id = $2
        `, [areaId, plantId]);
      }

      // 6. Ensure Line: LINE-LLE-01
      let lineId = '40111111-0005-1111-1111-111111111111';
      const existingLine = await this.pool.query("SELECT id FROM public.lines WHERE code = 'LINE-LLE-01' LIMIT 1");
      if (existingLine.rowCount && existingLine.rowCount > 0) {
        lineId = existingLine.rows[0].id;
        await this.pool.query("UPDATE public.lines SET area_id = $1 WHERE id = $2", [areaId, lineId]);
      } else {
        await this.pool.query(`
          INSERT INTO public.lines (id, area_id, name, code, created_at)
          VALUES ($1, $2, 'Liquid-Liquid Extraction Train 01', 'LINE-LLE-01', NOW())
          ON CONFLICT (id) DO UPDATE SET area_id = $2
        `, [lineId, areaId]);
      }

      // 7. Ensure Machine: EX-101
      let machineId = 'e1111111-0010-1111-1111-111111111111';
      const existingMachine = await this.pool.query("SELECT id FROM public.machines WHERE code = 'EX-101' LIMIT 1");
      if (existingMachine.rowCount && existingMachine.rowCount > 0) {
        machineId = existingMachine.rows[0].id;
        await this.pool.query("UPDATE public.machines SET line_id = $1, status = 'RUNNING' WHERE id = $2", [lineId, machineId]);
      } else {
        await this.pool.query(`
          INSERT INTO public.machines (id, line_id, name, code, status, last_status_change, created_at)
          VALUES ($1, $2, 'Extraction Vessel EX-101', 'EX-101', 'RUNNING', NOW(), NOW())
          ON CONFLICT (id) DO UPDATE SET line_id = $2, status = 'RUNNING'
        `, [machineId, lineId]);
      }

      // 8. Ensure Equipment Master: EX-101
      await this.pool.query(`
        INSERT INTO public.equipment_master (equipment_id, equipment_name, work_center, equipment_type, manufacturer, model, capacity_per_shift, oee_applicable, status, plant_id, organization_id)
        VALUES ('EX-101', 'Extraction Vessel EX-101', 'WC-API-EXT', 'EXTRACTION_VESSEL', 'Pfaudler Reactor Systems', 'GL-EX-250', 500, 'Y', 'RUNNING', $1, $2)
        ON CONFLICT (equipment_id) DO UPDATE SET status = 'RUNNING', work_center = 'WC-API-EXT', plant_id = EXCLUDED.plant_id, organization_id = EXCLUDED.organization_id
      `, [plantId, orgId]);

      // 9. Ensure Warehouse and Location
      let warehouseId = 'b0000000-0003-3333-3333-333333333333';
      const existingWh = await this.pool.query("SELECT id FROM public.warehouses WHERE code = 'WH-PHARMA-01' LIMIT 1");
      if (existingWh.rowCount && existingWh.rowCount > 0) {
        warehouseId = existingWh.rows[0].id;
        await this.pool.query("UPDATE public.warehouses SET plant_id = $1 WHERE id = $2", [plantId, warehouseId]);
      } else {
        await this.pool.query(`
          INSERT INTO public.warehouses (id, code, name, location, created_at, plant_id)
          VALUES ($1, 'WH-PHARMA-01', 'Pharma API Cleanroom Warehouse', 'Zone A Cleanroom Air-lock', NOW(), $2)
          ON CONFLICT (id) DO UPDATE SET plant_id = $2
        `, [warehouseId, plantId]);
      }

      await this.pool.query(`
        INSERT INTO public.storage_locations (id, warehouse_id, area, rack, bin, code, created_at)
        VALUES ('b1111111-0003-1111-1111-111111111111', $1, 'Cleanroom Area', 'RACK-01', 'BIN-01', 'LOC-PHARMA-01', NOW())
        ON CONFLICT (id) DO NOTHING
      `, [warehouseId]);

      // 10. Product: API Intermediate X
      let productId = '30111111-0008-1111-1111-111111111111';
      const existingProd = await this.pool.query("SELECT id FROM public.products WHERE sku = 'API-INT-X' LIMIT 1");
      if (existingProd.rowCount && existingProd.rowCount > 0) {
        productId = existingProd.rows[0].id;
      } else {
        await this.pool.query(`
          INSERT INTO public.products (id, sku, name, description, uom, created_at)
          VALUES ($1, 'API-INT-X', 'API Intermediate X', 'High-Purity Active Pharmaceutical Ingredient Intermediate X (Recovered Organic Phase Solution)', 'KG', NOW())
          ON CONFLICT (id) DO NOTHING
        `, [productId]);
      }

      
      // 10b. Ensure Pharma Vendors
      await this.pool.query(`
        INSERT INTO public.vendors (id, vendor_code, vendor_name, qualification_status, audit_date, contact_information, approved_materials, created_at, plant_id, organization_id)
        VALUES
        ('ba000001-0001-1111-1111-111111111111', 'VND-PHARMA-01', 'AuraBio Synthesis Unit', 'QUALIFIED', NOW(), 'Hyderabad Biotech Park; contact@aurabio.in', '["INT-CRUDE-001"]', NOW(), $1, $2),
        ('ba000001-0002-1111-1111-111111111111', 'VND-PHARMA-02', 'Merck Millipore Bio', 'QUALIFIED', NOW(), 'Darmstadt / Mumbai; pharma-supply@merckgroup.com', '["RM-SOLV-001"]', NOW(), $1, $2),
        ('ba000001-0003-1111-1111-111111111111', 'VND-PHARMA-03', 'Avantor Performance Materials', 'QUALIFIED', NOW(), 'Radnor PA / Bengaluru; apm-orders@avantorsciences.com', '["RM-SALT-001"]', NOW(), $1, $2)
        ON CONFLICT (vendor_code) DO UPDATE SET plant_id = EXCLUDED.plant_id, organization_id = EXCLUDED.organization_id
      `, [plantId, orgId]);

      // 11. Materials Master
      await this.pool.query(`
        INSERT INTO public.material_master (id, material_code, material_name, material_type, category, uom, manufacturer, vendor_id, shelf_life_days, storage_conditions, image_path, status, created_at, plant_id, organization_id)
        VALUES
        ('ca000001-0001-1111-1111-111111111111', 'INT-CRUDE-001', 'Crude API Reaction Mixture', 'INTERMEDIATE', 'RAW_PHARMA', 'KG', 'AuraBio Synthesis Unit', 'ba000001-0001-1111-1111-111111111111', 180, '2-8°C Controlled Cold Room', '', 'APPROVED', NOW(), $1, $2),
        ('ca000001-0002-1111-1111-111111111111', 'RM-SOLV-001', 'Ethyl Acetate Solvent USP', 'RAW_MATERIAL', 'SOLVENT', 'L', 'Merck Millipore Bio', 'ba000001-0002-1111-1111-111111111111', 730, 'Flammable Storage Cabinet 15-25°C', '', 'APPROVED', NOW(), $1, $2),
        ('ca000001-0003-1111-1111-111111111111', 'RM-WTR-001', 'Purified Water USP', 'RAW_MATERIAL', 'WATER', 'L', 'In-House Generation Loop', NULL, 30, 'Ambient Loop WFI Circulation', '', 'APPROVED', NOW(), $1, $2),
        ('ca000001-0004-1111-1111-111111111111', 'RM-SALT-001', 'Sodium Chloride Reagent USP', 'RAW_MATERIAL', 'SALT', 'KG', 'Avantor Performance Materials', 'ba000001-0003-1111-1111-111111111111', 1095, 'Dry Ambient Storage < 60% RH', '', 'APPROVED', NOW(), $1, $2)
        ON CONFLICT (material_code) DO UPDATE SET plant_id = EXCLUDED.plant_id, organization_id = EXCLUDED.organization_id
      `, [plantId, orgId]);

      // 12. Material Batches & Inventory
      await this.pool.query(`
        INSERT INTO public.material_batches (id, goods_receipt_id, material_id, batch_number, supplier_batch, quantity, uom, manufacturing_date, expiry_date, status, created_at, heat_number, plant_id, organization_id)
        VALUES
        ('cb000001-0001-1111-1111-111111111111', NULL, 'ca000001-0001-1111-1111-111111111111', 'LOT-API-CRUDE-04', 'SPL-CRD-889', 120, 'KG', NOW() - INTERVAL '10 days', NOW() + INTERVAL '170 days', 'RELEASED', NOW(), NULL, $1, $2),
        ('cb000001-0002-1111-1111-111111111111', NULL, 'ca000001-0002-1111-1111-111111111111', 'LOT-EA-SOLV-22', 'MRK-EA-5541', 250, 'L', NOW() - INTERVAL '30 days', NOW() + INTERVAL '700 days', 'RELEASED', NOW(), NULL, $1, $2),
        ('cb000001-0003-1111-1111-111111111111', NULL, 'ca000001-0003-1111-1111-111111111111', 'LOT-WTR-USP-01', 'WFI-LOOP-01', 500, 'L', NOW() - INTERVAL '2 days', NOW() + INTERVAL '28 days', 'RELEASED', NOW(), NULL, $1, $2)
        ON CONFLICT (id) DO UPDATE SET plant_id = EXCLUDED.plant_id, organization_id = EXCLUDED.organization_id
      `, [plantId, orgId]);

      await this.pool.query(`
        INSERT INTO public.inventory_balances (id, product_id, lot_number, quantity, wip_status, location_code, created_at, updated_at, plant_id)
        VALUES
        ('db000001-0001-1111-1111-111111111111', $1, 'LOT-API-CRUDE-04', 120, 'RELEASED', 'LOC-PHARMA-01', NOW(), NOW(), $2),
        ('db000001-0002-1111-1111-111111111111', $1, 'LOT-EA-SOLV-22', 250, 'RELEASED', 'LOC-PHARMA-01', NOW(), NOW(), $2)
        ON CONFLICT (id) DO NOTHING
      `, [productId, plantId]);

      // 13. BOM
      await this.pool.query(`
        INSERT INTO public.bom_header (bom_id, parent_material, revision, effective_from, effective_to, status, plant_id, organization_id)
        VALUES ('BOM-API-001', 'API-INT-X', 'A', '2026-01-01', NULL, 'RELEASED', $1, $2)
        ON CONFLICT (bom_id, revision) DO UPDATE SET plant_id = EXCLUDED.plant_id, organization_id = EXCLUDED.organization_id
      `, [plantId, orgId]);

      await this.pool.query(`
        INSERT INTO public.bom_component (id, bom_id, line_no, parent_material, component_material, component_type, qty, uom)
        VALUES
        ('bc000001-0001-1111-1111-111111111111', 'BOM-API-001', 10, 'API-INT-X', 'INT-CRUDE-001', 'RAW', 65.0, 'KG'),
        ('bc000001-0002-1111-1111-111111111111', 'BOM-API-001', 20, 'API-INT-X', 'RM-SOLV-001', 'RAW', 45.0, 'L'),
        ('bc000001-0003-1111-1111-111111111111', 'BOM-API-001', 30, 'API-INT-X', 'RM-WTR-001', 'RAW', 20.0, 'L')
        ON CONFLICT (id) DO NOTHING
      `);

      // 14. Routing
      await this.pool.query(`
        INSERT INTO public.routing_header (routing_id, material_code, revision, description, status, plant_id, organization_id)
        VALUES ('RT-API-001', 'API-INT-X', 'A', '13-Step GMP Liquid-Liquid Extraction Train', 'RELEASED', $1, $2)
        ON CONFLICT (routing_id, revision) DO UPDATE SET plant_id = EXCLUDED.plant_id, organization_id = EXCLUDED.organization_id
      `, [plantId, orgId]);

      await this.pool.query(`
        INSERT INTO public.routing_operation (id, routing_id, operation_no, operation_code, operation_name, work_center, machine_code)
        VALUES
        ('ea000001-0001-1111-1111-111111111111', 'RT-API-001', 1, 'OP-01', 'Verify API intermediate and solvent lots', 'WC-API-EXT', 'EX-101'),
        ('ea000001-0002-1111-1111-111111111111', 'RT-API-001', 2, 'OP-02', 'Verify extraction vessel', 'WC-API-EXT', 'EX-101'),
        ('ea000001-0003-1111-1111-111111111111', 'RT-API-001', 3, 'OP-03', 'Charge API intermediate solution', 'WC-API-EXT', 'EX-101'),
        ('ea000001-0004-1111-1111-111111111111', 'RT-API-001', 4, 'OP-04', 'Add extraction solvent', 'WC-API-EXT', 'EX-101'),
        ('ea000001-0005-1111-1111-111111111111', 'RT-API-001', 5, 'OP-05', 'Mix phases', 'WC-API-EXT', 'EX-101'),
        ('ea000001-0006-1111-1111-111111111111', 'RT-API-001', 6, 'OP-06', 'Stop mixing and allow settling', 'WC-API-EXT', 'EX-101'),
        ('ea000001-0007-1111-1111-111111111111', 'RT-API-001', 7, 'OP-07', 'Verify interface formation', 'WC-API-EXT', 'EX-101'),
        ('ea000001-0008-1111-1111-111111111111', 'RT-API-001', 8, 'OP-08', 'Verify aqueous phase conductivity', 'WC-API-EXT', 'EX-101'),
        ('ea000001-0009-1111-1111-111111111111', 'RT-API-001', 9, 'OP-09', 'Verify organic phase / carryover', 'WC-API-EXT', 'EX-101'),
        ('ea000001-0010-1111-1111-111111111111', 'RT-API-001', 10, 'OP-10', 'Collect designated API-containing phase', 'WC-API-EXT', 'EX-101'),
        ('ea000001-0011-1111-1111-111111111111', 'RT-API-001', 11, 'OP-11', 'Perform final in-process QC', 'WC-API-EXT', 'EX-101'),
        ('ea000001-0012-1111-1111-111111111111', 'RT-API-001', 12, 'OP-12', 'QA review and approval', 'WC-API-EXT', 'EX-101'),
        ('ea000001-0013-1111-1111-111111111111', 'RT-API-001', 13, 'OP-13', 'Transfer to next processing stage', 'WC-API-EXT', 'EX-101')
        ON CONFLICT (id) DO NOTHING
      `);

      // 15. Recipe: RCP-API-LLE-001
      let recipeId = 'f1111111-0006-1111-1111-111111111111';
      const existingRcp = await this.pool.query("SELECT id FROM public.batch_recipes WHERE recipe_code = 'RCP-API-LLE-001' LIMIT 1");
      if (existingRcp.rowCount && existingRcp.rowCount > 0) {
        recipeId = existingRcp.rows[0].id;
      } else {
        await this.pool.query(`
          INSERT INTO public.batch_recipes (
            id, product_id, recipe_code, recipe_name, version, master_formula, bom, process_instructions, planned_yield_pct, status, created_by, created_at, evidence_requirements, plant_id, organization_id
          )
          VALUES (
            $1, $2, 'RCP-API-LLE-001', 'Liquid–Liquid Extraction Process Recipe for API Intermediate X', 'A',
            '{"process": "Liquid-Liquid Extraction", "targetBatchSizeKg": 100, "phaseA": "Aqueous phase (Crude API + dissolved salts)", "phaseB": "Organic phase (Ethyl Acetate extraction solvent)", "extractionVessel": "EX-101"}',
            '[{"component_code": "INT-CRUDE-001", "component_name": "Crude API Reaction Mixture", "component_type": "INTERMEDIATE", "quantity": 65.0, "uom": "KG", "line_no": 10}, {"component_code": "RM-SOLV-001", "component_name": "Ethyl Acetate Solvent USP", "component_type": "RAW", "quantity": 45.0, "uom": "L", "line_no": 20}, {"component_code": "RM-WTR-001", "component_name": "Purified Water USP", "component_type": "RAW", "quantity": 20.0, "uom": "L", "line_no": 30}]',
            '[
              {"step": 1, "operation_no": 1, "operation_code": "OP-01", "operation_name": "Verify API intermediate and solvent lots", "work_center": "WC-API-EXT", "machine_code": "EX-101", "instruction": "Scan 2D QR barcoded containers for Crude API Mixture INT-CRUDE-001 and Solvent RM-SOLV-001. Confirm analytical QA release status in LIMS.", "verification": "Material scan and released status", "signoff_role": "Operator"},
              {"step": 2, "operation_no": 2, "operation_code": "OP-02", "operation_name": "Verify extraction vessel", "work_center": "WC-API-EXT", "machine_code": "EX-101", "instruction": "Inspect Extraction Vessel EX-101 cleanliness tag, CIP/SIP certificate validity, and vessel pressure integrity.", "verification": "Cleaning and equipment status", "signoff_role": "Operator"},
              {"step": 3, "operation_no": 3, "operation_code": "OP-03", "operation_name": "Charge API intermediate solution", "work_center": "WC-API-EXT", "machine_code": "EX-101", "instruction": "Transfer 65.0 kg (+/- 0.5 kg) of Crude API aqueous solution into EX-101 via calibrated mass flow meter FM-101.", "verification": "Quantity verification", "signoff_role": "Operator"},
              {"step": 4, "operation_no": 4, "operation_code": "OP-04", "operation_name": "Add extraction solvent", "work_center": "WC-API-EXT", "machine_code": "EX-101", "instruction": "Charge 45.0 L (+/- 0.5 L) of approved USP Ethyl Acetate process solvent into EX-101 under nitrogen blanket.", "verification": "Material identity and quantity", "signoff_role": "Operator"},
              {"step": 5, "operation_no": 5, "operation_code": "OP-05", "operation_name": "Mix phases", "work_center": "WC-API-EXT", "machine_code": "EX-101", "instruction": "Engage EX-101 agitator at 250 RPM (+/- 20 RPM) for 45 minutes at 22-25°C jacket temperature to ensure maximum solute mass transfer.", "verification": "RPM, time, temperature", "signoff_role": "Operator", "cpp": "Mixing Speed: 250 RPM, Duration: 45 min, Temp: 23.5°C"},
              {"step": 6, "operation_no": 6, "operation_code": "OP-06", "operation_name": "Stop mixing and allow settling", "work_center": "WC-API-EXT", "machine_code": "EX-101", "instruction": "Halt agitator. Allow biphasic liquid mixture to disengage under quiescent conditions for 60 minutes minimum.", "verification": "Settling time", "signoff_role": "Operator", "cpp": "Settling Time: >= 60 min quiescent"},
              {"step": 7, "operation_no": 7, "operation_code": "OP-07", "operation_name": "Verify interface formation", "work_center": "WC-API-EXT", "machine_code": "EX-101", "instruction": "Visually inspect sight glass and optical boundary sensor to confirm sharp meniscus interface disengagement between aqueous and organic layers.", "verification": "Interface position and stability", "signoff_role": "Operator", "cpp": "Interface Meniscus: 50% +/- 2%, Sharp Boundary"},
              {"step": 8, "operation_no": 8, "operation_code": "OP-08", "operation_name": "Verify aqueous phase conductivity", "work_center": "WC-API-EXT", "machine_code": "EX-101", "instruction": "Sample lower aqueous phase and record in-line toroidal conductivity probe reading. Confirm high ionic reading (> 45 mS/cm).", "verification": "Approved conductivity range", "signoff_role": "Quality Inspector", "cpp": "Aqueous Conductivity: > 45 mS/cm (Target: 52.4 mS/cm)"},
              {"step": 9, "operation_no": 9, "operation_code": "OP-09", "operation_name": "Verify organic phase / carryover", "work_center": "WC-API-EXT", "machine_code": "EX-101", "instruction": "Sample upper organic phase. Verify low conductivity (< 0.20 mS/cm) to confirm absence of aqueous ionic salt carryover.", "verification": "Conductivity where suitable, plus required QC tests", "signoff_role": "Quality Inspector", "cpp": "Organic Conductivity: < 0.20 mS/cm (Target: 0.08 mS/cm)"},
              {"step": 10, "operation_no": 10, "operation_code": "OP-10", "operation_name": "Collect designated API-containing phase", "work_center": "WC-API-EXT", "machine_code": "EX-101", "instruction": "Activate automated bottom transfer valve interlock to drain aqueous waste to holding tank, then divert recovered organic API phase to receiver REC-102.", "verification": "Valve interlock and collection traceability", "signoff_role": "Operator"},
              {"step": 11, "operation_no": 11, "operation_code": "OP-11", "operation_name": "Perform final in-process QC", "work_center": "WC-API-EXT", "machine_code": "EX-101", "instruction": "Submit representative sample of organic stream to analytical lab: Karl Fischer moisture (< 0.50% w/w) and residual solvent assay (>= 98.5%).", "verification": "Required tests and specifications", "signoff_role": "Quality Engineer", "cpp": "Water Content: < 0.50% w/w, HPLC Assay: >= 98.5%"},
              {"step": 12, "operation_no": 12, "operation_code": "OP-12", "operation_name": "QA review and approval", "work_center": "WC-API-EXT", "machine_code": "EX-101", "instruction": "QA officer reviews electronic batch record dossier, verified sensor logs, and IPQC certificates. Commit 21 CFR Part 11 digital signature.", "verification": "Electronic signature", "signoff_role": "Quality Manager"},
              {"step": 13, "operation_no": 13, "operation_code": "OP-13", "operation_name": "Transfer to next processing stage", "work_center": "WC-API-EXT", "machine_code": "EX-101", "instruction": "Authorize transfer of recovered organic phase to downstream Crystallization & Solvent Recovery Stage. Seal batch genealogy.", "verification": "WO step completion and genealogy", "signoff_role": "Production Supervisor"}
            ]',
            98.50, 'ACTIVE', '11111111-1111-1111-1111-111111111111', NOW(),
            '{"criticalProcessParameters": [
              {"parameter": "Mixing speed", "target": "250 RPM", "range": "230 - 270 RPM", "whyItMatters": "Influences extraction and emulsion formation"},
              {"parameter": "Mixing duration", "target": "45 min", "range": "40 - 50 min", "whyItMatters": "Influences mass transfer between phases"},
              {"parameter": "Temperature", "target": "23.5°C", "range": "20.0 - 25.0°C", "whyItMatters": "Influences solubility, conductivity, and separation"},
              {"parameter": "Settling time", "target": "60 min", "range": "55 - 75 min", "whyItMatters": "Allows the phases to disengage"},
              {"parameter": "Interface level", "target": "50.0%", "range": "48.0 - 52.0%", "whyItMatters": "Helps prevent collection of the wrong phase"},
              {"parameter": "Aqueous conductivity", "target": "52.4 mS/cm", "range": "> 45 mS/cm", "whyItMatters": "Helps identify the conductive aqueous phase"},
              {"parameter": "Organic stream conductivity", "target": "0.08 mS/cm", "range": "< 0.20 mS/cm", "whyItMatters": "May indicate ionic aqueous carryover, if measurable"},
              {"parameter": "Water content", "target": "0.32% w/w", "range": "< 0.50% w/w", "whyItMatters": "Helps quantify moisture in the recovered organic phase"},
              {"parameter": "Residual solvent / assay", "target": "99.4%", "range": ">= 98.5%", "whyItMatters": "Supports API-intermediate quality assessment"}
            ]}'
          )
          ON CONFLICT (id) DO UPDATE SET plant_id = $3, organization_id = $4
        `, [recipeId, productId, plantId, orgId]);
      }

      // 16. Work Order: WO-API-2026-001
      const existingWo = await this.pool.query("SELECT id FROM public.work_orders WHERE wo_number = 'WO-API-2026-001' LIMIT 1");
      if (existingWo.rowCount && existingWo.rowCount > 0) {
        await this.pool.query(
          "UPDATE public.work_orders SET plant_id = $1, status = 'IN_PROGRESS' WHERE id = $2",
          [plantId, existingWo.rows[0].id]
        );
      } else {
        await this.pool.query(`
          INSERT INTO public.work_orders (
            id, wo_number, product_id, target_quantity, completed_quantity, scrap_quantity,
            planned_start, planned_end, actual_start, actual_end, status,
            created_by, created_at, updated_at, plant_id, revision, recipe_id,
            evidence_snapshot, reviewed_snapshot, completed_by, reviewed_by,
            shortfall_approval, legacy_unverified, organization_id
          )
          VALUES (
            '80111111-0008-1111-1111-111111111111',
            'WO-API-2026-001',
            $1, 100, 45, 0,
            NOW() - INTERVAL '1 day', NOW() + INTERVAL '2 days', NOW() - INTERVAL '6 hours', NULL, 'IN_PROGRESS',
            '11111111-1111-1111-1111-111111111111', NOW(), NOW(),
            $2, 0, $3,
            NULL, NULL, NULL, NULL, NULL, false, $4
          )
          ON CONFLICT (id) DO UPDATE SET plant_id = $2, organization_id = $4, status = 'IN_PROGRESS'
        `, [productId, plantId, recipeId, orgId]);
      }

      // 17. Seed Pharma Serialized Units & Genealogy for WO-API-2026-001
      const woId = existingWo.rowCount && existingWo.rowCount > 0 ? existingWo.rows[0].id : '80111111-0008-1111-1111-111111111111';

      // Seed Finished Goods Inventory Balance for Pharma
      await this.pool.query(`
        INSERT INTO public.inventory_balances (
          id, plant_id, organization_id, product_id, lot_number, quantity, wip_status, location_code, created_at, updated_at
        )
        VALUES (
          '90111111-0009-1111-1111-111111111111', $1, $2, $3, 'LOT-API-2026-001', 45.0000, 'RELEASED', 'WH-PHARMA-FG / RACK-01', NOW(), NOW()
        )
        ON CONFLICT (lot_number) DO UPDATE SET plant_id = $1, organization_id = $2
      `, [plantId, orgId, productId]);

      // Seed 5 Serialized Units for Pharma
      const pharmaSerials = [
        { sn: 'API-2026-001-U01', status: 'FINISHED_INVENTORY', op: 13, loc: 'WH-PHARMA-FG / RACK-01 / BIN-A1' },
        { sn: 'API-2026-001-U02', status: 'FINISHED_INVENTORY', op: 13, loc: 'WH-PHARMA-FG / RACK-01 / BIN-A2' },
        { sn: 'API-2026-001-U03', status: 'FINISHED_INVENTORY', op: 13, loc: 'WH-PHARMA-FG / RACK-01 / BIN-A3' },
        { sn: 'API-2026-001-U04', status: 'UNDER_ASSEMBLY', op: 8, loc: 'LINE-LLE-01 / EX-101 / EXTRACT-BAY' },
        { sn: 'API-2026-001-U05', status: 'UNDER_ASSEMBLY', op: 5, loc: 'LINE-LLE-01 / EX-101 / MIXING-BAY' }
      ];

      for (const su of pharmaSerials) {
        await this.pool.query(`
          INSERT INTO public.serialized_units (
            id, work_order_id, product_id, serial_number, status, current_operation_no, current_work_center, warehouse_location, plant_id, organization_id, created_at, updated_at
          )
          VALUES (
            gen_random_uuid(), $1, $2, $3, $4, $5, 'WC-API-EXT', $6, $7, $8, NOW(), NOW()
          )
          ON CONFLICT (serial_number) DO UPDATE SET plant_id = $7, organization_id = $8, status = $4, warehouse_location = $6
        `, [woId, productId, su.sn, su.status, su.op, su.loc, plantId, orgId]);

        // Seed 5W1H Genealogy Events for this unit
        await this.pool.query(`
          INSERT INTO public.product_genealogy_events (
            unit_serial, work_order_id, operation_no, operation_name, work_center, machine_id,
            component_code, component_name, component_lot, supplier_code, supplier_name, inventory_location,
            operator_username, operator_signature, inspector_username, inspector_signature, dual_signature_verified,
            quality_status, quality_inspection_text, parameters, timestamp, plant_id, organization_id
          )
          VALUES 
          ($1, $2, 1, 'Verify API intermediate and solvent lots', 'WC-API-EXT', 'EX-101', 'INT-CRUDE-001', 'Crude API Reaction Mixture', 'LOT-API-CRUDE-04', 'VND-PHARMA-01', 'BioPure Synthesis India Pvt Ltd', 'WH-PHARMA-RM / AIRLOCK-01', 'pharma_op1', 'Aakash Verma (Extraction OP)', 'pharma_qa1', 'Dr. Priya Sen (QA Compliance)', true, 'PASS', 'Analytical CoA verified against EP/USP monograph standards', '{"limsCoaVerified": true, "rawLot": "LOT-API-CRUDE-04"}', NOW() - INTERVAL '4 hours', $3, $4),
          ($1, $2, 5, 'Mix phases', 'WC-API-EXT', 'EX-101', 'RM-SOLV-001', 'Ethyl Acetate Solvent USP', 'LOT-SOLV-2026-02', 'VND-PHARMA-02', 'SolvChem Specialities Ltd', 'WH-PHARMA-SOLV / FLAMMABLE-BAY-2', 'pharma_op1', 'Aakash Verma (Extraction OP)', 'pharma_qa1', 'Dr. Priya Sen (QA Compliance)', true, 'PASS', 'Agitation speed and jacket temperature within validated ranges', '{"mixingSpeedRpm": 250, "temperatureC": 23.5, "mixingDurationMin": 45}', NOW() - INTERVAL '3 hours', $3, $4),
          ($1, $2, 8, 'Verify aqueous phase conductivity', 'WC-API-EXT', 'EX-101', 'INT-CRUDE-001', 'Aqueous Waste Layer', 'LOT-AQ-EXT-01', 'VND-PHARMA-01', 'BioPure Synthesis India Pvt Ltd', 'EX-101 Sump', 'pharma_op1', 'Aakash Verma (Extraction OP)', 'pharma_qa1', 'Dr. Priya Sen (QA Compliance)', true, 'PASS', 'High ionic conductivity confirms complete salt extraction into aqueous phase', '{"conductivityMsCm": 52.4, "specification": "> 45 mS/cm"}', NOW() - INTERVAL '2 hours', $3, $4),
          ($1, $2, 9, 'Verify organic phase / carryover', 'WC-API-EXT', 'EX-101', 'API-INT-X', 'Recovered Organic API Layer', 'LOT-API-2026-001', 'VND-PHARMA-01', 'BioPure Synthesis India Pvt Ltd', 'REC-102 Receiver', 'pharma_op1', 'Aakash Verma (Extraction OP)', 'pharma_qa1', 'Dr. Priya Sen (QA Compliance)', true, 'PASS', 'Low organic conductivity confirms negligible aqueous carryover (< 0.20 mS/cm)', '{"conductivityMsCm": 0.08, "specification": "< 0.20 mS/cm"}', NOW() - INTERVAL '1 hour', $3, $4)
          ON CONFLICT DO NOTHING
        `, [su.sn, woId, plantId, orgId]);
      }

      // Seed 2 Production Logs for Pharma
      await this.pool.query(`
        INSERT INTO public.production_logs (
          id, work_order_id, machine_id, operator_id, timestamp, count_good, count_scrap, plant_id, organization_id
        )
        VALUES 
        (gen_random_uuid(), $1, 'd1111111-0004-1111-1111-111111111111', '348818bf-4f01-4545-b4d1-6af46a51a858', NOW() - INTERVAL '2 hours', 45, 0, $2, $3)
        ON CONFLICT DO NOTHING
      `, [woId, plantId, orgId]);

      console.log('🎉 Pharma Liquid-Liquid Extraction Plant, operations, and users fully ensured & linked!');
    } catch (err: any) {
      console.error('Error in autoEnsurePharmaPlantAndUsers:', err?.message || err);
    }
  }

  async onModuleDestroy() {
    if (this.pool) {
      await this.pool.end();
    }
  }

  async query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    if (!this.isConnected) {
      throw new Error('Database connection is currently offline');
    }
    return this.pool.query<T>(text, params);
  }

  isDatabaseOnline(): boolean {
    return this.isConnected;
  }
}
