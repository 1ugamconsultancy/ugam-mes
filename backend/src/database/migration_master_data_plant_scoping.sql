-- ============================================================================
-- MIGRATION: Multi-Tenant Master Data Isolation & Scoping
-- Scopes materials, vendors, products, equipment, recipes, boms, routings, 
-- batches, calibrations, and work orders to plant_id and organization_id.
-- ============================================================================

-- Step 1: Add organization_id and plant_id columns to all master data & operational tables
ALTER TABLE public.material_master 
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS plant_id UUID REFERENCES public.plants(id) ON DELETE RESTRICT;

ALTER TABLE public.vendors 
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS plant_id UUID REFERENCES public.plants(id) ON DELETE RESTRICT;

ALTER TABLE public.products 
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS plant_id UUID REFERENCES public.plants(id) ON DELETE RESTRICT;

ALTER TABLE public.equipment_master 
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS plant_id UUID REFERENCES public.plants(id) ON DELETE RESTRICT;

ALTER TABLE public.batch_recipes 
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS plant_id UUID REFERENCES public.plants(id) ON DELETE RESTRICT;

ALTER TABLE public.bom_header 
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS plant_id UUID REFERENCES public.plants(id) ON DELETE RESTRICT;

ALTER TABLE public.routing_header 
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS plant_id UUID REFERENCES public.plants(id) ON DELETE RESTRICT;

ALTER TABLE public.work_orders 
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE RESTRICT;

ALTER TABLE public.material_batches 
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS plant_id UUID REFERENCES public.plants(id) ON DELETE RESTRICT;

ALTER TABLE public.equipment_calibrations 
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS plant_id UUID REFERENCES public.plants(id) ON DELETE RESTRICT;

ALTER TABLE public.equipment_qualifications 
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS plant_id UUID REFERENCES public.plants(id) ON DELETE RESTRICT;

ALTER TABLE public.warehouses 
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE RESTRICT;

-- Step 2: Accurate Legacy Data Backfill

-- 2.1 Backfill Work Orders organization_id from plant's organization_id
UPDATE public.work_orders wo
SET organization_id = p.organization_id
FROM public.plants p
WHERE wo.plant_id = p.id AND wo.organization_id IS NULL;

-- 2.2 Backfill Warehouses organization_id from plant
UPDATE public.warehouses w
SET organization_id = p.organization_id
FROM public.plants p
WHERE w.plant_id = p.id AND w.organization_id IS NULL;

-- 2.3 Backfill Pharma Plant
-- Plant: PHARMA-PLANT-01 ('396c9f46-006d-4ade-82d2-6fd1b5c6c5e5' or 'a0000000-0003-3333-3333-333333333333')
-- Org: Ugam Biopharma Solutions Ltd ('e28a835a-2b67-4332-86c7-8c79165f2354' or '10000000-0000-0000-0000-000000000003')
DO $$
DECLARE
  v_pharma_plant UUID;
  v_pharma_org UUID;
  v_auto_plant UUID := 'a0000000-0001-1111-1111-111111111111';
  v_auto_org UUID := '10000000-0000-0000-0000-000000000001';
  v_food_plant UUID := 'a0000000-0002-2222-2222-222222222222';
  v_food_org UUID := '10000000-0000-0000-0000-000000000002';
BEGIN
  SELECT id, organization_id INTO v_pharma_plant, v_pharma_org 
  FROM public.plants WHERE code = 'PHARMA-PLANT-01' LIMIT 1;
  
  IF v_pharma_plant IS NULL THEN
    v_pharma_plant := '396c9f46-006d-4ade-82d2-6fd1b5c6c5e5';
    v_pharma_org := 'e28a835a-2b67-4332-86c7-8c79165f2354';
  END IF;

  -- Pharma Materials
  UPDATE public.material_master
  SET plant_id = v_pharma_plant, organization_id = v_pharma_org
  WHERE material_code IN ('INT-CRUDE-001', 'RM-SOLV-001', 'RM-WTR-001', 'RM-SALT-001')
     OR material_name ILIKE '%API%' OR material_name ILIKE '%Solvent USP%' OR material_name ILIKE '%Purified Water%';

  -- Pharma Vendors
  UPDATE public.vendors
  SET plant_id = v_pharma_plant, organization_id = v_pharma_org
  WHERE vendor_code LIKE 'VND-PHARMA%' OR vendor_name ILIKE '%AuraBio%' OR vendor_name ILIKE '%Merck%' OR vendor_name ILIKE '%Avantor%';

  -- Pharma Products
  UPDATE public.products
  SET plant_id = v_pharma_plant, organization_id = v_pharma_org
  WHERE sku = 'API-INT-X' OR name ILIKE '%API Intermediate%';

  -- Pharma Equipment Master
  UPDATE public.equipment_master
  SET plant_id = v_pharma_plant, organization_id = v_pharma_org
  WHERE equipment_id IN ('EX-101', 'REC-102', 'FM-101');

  -- Pharma Recipes
  UPDATE public.batch_recipes
  SET plant_id = v_pharma_plant, organization_id = v_pharma_org
  WHERE recipe_code = 'RCP-API-LLE-001' OR recipe_name ILIKE '%Liquid-Liquid Extraction%';

  -- Pharma BOM
  UPDATE public.bom_header
  SET plant_id = v_pharma_plant, organization_id = v_pharma_org
  WHERE bom_id = 'BOM-API-001' OR parent_material = 'API-INT-X';

  -- Pharma Routing
  UPDATE public.routing_header
  SET plant_id = v_pharma_plant, organization_id = v_pharma_org
  WHERE routing_id = 'RT-API-001' OR material_code = 'API-INT-X';

  -- Pharma Material Batches
  UPDATE public.material_batches mb
  SET plant_id = v_pharma_plant, organization_id = v_pharma_org
  FROM public.material_master mm
  WHERE mb.material_id = mm.id AND mm.plant_id = v_pharma_plant;

  -- 2.4 Backfill Automotive Plant
  -- Materials
  UPDATE public.material_master
  SET plant_id = v_auto_plant, organization_id = v_auto_org
  WHERE plant_id IS NULL AND (
    material_code LIKE 'RM-ST%' OR material_code LIKE 'RM-LTH%' OR material_code LIKE 'RM-FOAM%' 
    OR material_code LIKE 'RM-MTR%' OR material_code LIKE 'RM-BLT%' OR material_code LIKE 'RM-WIRE%'
    OR material_code LIKE 'RAW-00%' OR material_code LIKE 'SEAT-%'
    OR material_name ILIKE '%Steel%' OR material_name ILIKE '%Leather%' OR material_name ILIKE '%Foam%'
    OR material_name ILIKE '%Fastener%' OR material_name ILIKE '%Aluminum%' OR material_name ILIKE '%Titanium%'
  );

  -- Vendors
  UPDATE public.vendors
  SET plant_id = v_auto_plant, organization_id = v_auto_org
  WHERE plant_id IS NULL AND (
    vendor_code IN ('VND-001', 'VND-002', 'VND-003', 'VND-004')
    OR vendor_name ILIKE '%Steel Dynamics%' OR vendor_name ILIKE '%Precision Coatings%'
    OR vendor_name ILIKE '%Global Fasteners%' OR vendor_name ILIKE '%Apex Polymers%'
  );

  -- Products
  UPDATE public.products
  SET plant_id = v_auto_plant, organization_id = v_auto_org
  WHERE plant_id IS NULL AND (sku LIKE 'SEAT-%' OR name ILIKE '%Seat Assembly%');

  -- Equipment Master
  UPDATE public.equipment_master
  SET plant_id = v_auto_plant, organization_id = v_auto_org
  WHERE plant_id IS NULL AND equipment_id IN ('CUT-01', 'CNC-01', 'DBR-01', 'HT-01', 'QC-01', 'ASM-01', 'TEST-01', 'QC-02');

  -- Recipes
  UPDATE public.batch_recipes
  SET plant_id = v_auto_plant, organization_id = v_auto_org
  WHERE plant_id IS NULL AND (recipe_code LIKE 'RCP-SEAT%' OR recipe_name ILIKE '%Seat%');

  -- BOMs
  UPDATE public.bom_header
  SET plant_id = v_auto_plant, organization_id = v_auto_org
  WHERE plant_id IS NULL AND (bom_id LIKE 'BOM-SEAT%' OR parent_material LIKE 'SEAT-%');

  -- Routings
  UPDATE public.routing_header
  SET plant_id = v_auto_plant, organization_id = v_auto_org
  WHERE plant_id IS NULL AND (routing_id LIKE 'RT-SEAT%' OR material_code LIKE 'SEAT-%');

  -- Material Batches
  UPDATE public.material_batches mb
  SET plant_id = v_auto_plant, organization_id = v_auto_org
  FROM public.material_master mm
  WHERE mb.material_id = mm.id AND mm.plant_id = v_auto_plant;

  -- Calibrations & Qualifications for Auto machines
  UPDATE public.equipment_calibrations ec
  SET plant_id = v_auto_plant, organization_id = v_auto_org
  WHERE ec.plant_id IS NULL;

  UPDATE public.equipment_qualifications eq
  SET plant_id = v_auto_plant, organization_id = v_auto_org
  WHERE eq.plant_id IS NULL;

  -- 2.5 Backfill Remaining / Food Plant
  UPDATE public.material_master
  SET plant_id = v_food_plant, organization_id = v_food_org
  WHERE plant_id IS NULL;

  UPDATE public.vendors
  SET plant_id = v_food_plant, organization_id = v_food_org
  WHERE plant_id IS NULL;

  UPDATE public.products
  SET plant_id = v_food_plant, organization_id = v_food_org
  WHERE plant_id IS NULL;

  UPDATE public.equipment_master
  SET plant_id = v_food_plant, organization_id = v_food_org
  WHERE plant_id IS NULL;

  UPDATE public.batch_recipes
  SET plant_id = v_food_plant, organization_id = v_food_org
  WHERE plant_id IS NULL;

  UPDATE public.bom_header
  SET plant_id = v_food_plant, organization_id = v_food_org
  WHERE plant_id IS NULL;

  UPDATE public.routing_header
  SET plant_id = v_food_plant, organization_id = v_food_org
  WHERE plant_id IS NULL;

  UPDATE public.material_batches mb
  SET plant_id = v_food_plant, organization_id = v_food_org
  FROM public.material_master mm
  WHERE mb.material_id = mm.id AND mm.plant_id = v_food_plant;

  UPDATE public.material_batches
  SET plant_id = v_auto_plant, organization_id = v_auto_org
  WHERE plant_id IS NULL;

END $$;

-- Step 3: Compound Indexing for High-Performance Scalability
CREATE INDEX IF NOT EXISTS idx_materials_plant_org ON public.material_master (plant_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_vendors_plant_org ON public.vendors (plant_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_products_plant_org ON public.products (plant_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_equipment_plant_org ON public.equipment_master (plant_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_recipes_plant_org ON public.batch_recipes (plant_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_boms_plant_org ON public.bom_header (plant_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_routings_plant_org ON public.routing_header (plant_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_batches_plant_org ON public.material_batches (plant_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_plant_org ON public.work_orders (plant_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_calibrations_plant_org ON public.equipment_calibrations (plant_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_qualifications_plant_org ON public.equipment_qualifications (plant_id, organization_id);
