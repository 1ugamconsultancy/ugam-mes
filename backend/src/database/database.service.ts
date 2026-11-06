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
      console.log('🔄 Checking and applying Master Data Plant & Org Scoping Migration...');
      const candidatePaths = [
        path.join(__dirname, 'migration_master_data_plant_scoping.sql'),
        path.join(__dirname, '..', 'src', 'database', 'migration_master_data_plant_scoping.sql'),
        path.join(process.cwd(), 'src', 'database', 'migration_master_data_plant_scoping.sql'),
        path.join(process.cwd(), 'dist', 'database', 'migration_master_data_plant_scoping.sql'),
        path.join(process.cwd(), 'migration_master_data_plant_scoping.sql'),
        '/app/migration_master_data_plant_scoping.sql',
        '/app/src/database/migration_master_data_plant_scoping.sql'
      ];
      let sqlContent = '';
      for (const p of candidatePaths) {
        if (fs.existsSync(p)) {
          sqlContent = fs.readFileSync(p, 'utf8');
          console.log(`Found master data scoping migration at: ${p}`);
          break;
        }
      }
      if (sqlContent) {
        await this.pool.query(sqlContent);
        console.log('✅ Master Data Plant & Org Scoping Migration applied successfully!');
      } else {
        console.warn('Could not locate migration_master_data_plant_scoping.sql');
      }
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
      `);

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
      `);

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
        ON CONFLICT (bom_id) DO UPDATE SET plant_id = EXCLUDED.plant_id, organization_id = EXCLUDED.organization_id
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
        ON CONFLICT (routing_id) DO UPDATE SET plant_id = EXCLUDED.plant_id, organization_id = EXCLUDED.organization_id
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
