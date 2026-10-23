-- ============================================================================
-- FILE: fix_material_images.sql
-- DESCRIPTION: Idempotent script to ensure all raw material & component records
-- have their corresponding preview images assigned in material_master.
-- ============================================================================

UPDATE material_master SET image_path = '/uploads/steel_bar_en8.jpg' WHERE material_code = 'RM-ST-001' AND (image_path IS NULL OR image_path = '');
UPDATE material_master SET image_path = '/uploads/aluminium_rod.jpg' WHERE material_code = 'RM-ST-002' AND (image_path IS NULL OR image_path = '');
UPDATE material_master SET image_path = '/uploads/nbr_rubber.jpg' WHERE material_code = 'RM-ST-003' AND (image_path IS NULL OR image_path = '');
UPDATE material_master SET image_path = '/uploads/copper_wire.jpg' WHERE material_code = 'RM-ST-004' AND (image_path IS NULL OR image_path = '');
UPDATE material_master SET image_path = '/uploads/machined_pin.jpg' WHERE material_code = 'INT-001' AND (image_path IS NULL OR image_path = '');
UPDATE material_master SET image_path = '/uploads/heat_treated_pin.jpg' WHERE material_code = 'INT-002' AND (image_path IS NULL OR image_path = '');
UPDATE material_master SET image_path = '/uploads/rubber_seal.jpg' WHERE material_code = 'INT-003' AND (image_path IS NULL OR image_path = '');
UPDATE material_master SET image_path = '/uploads/control_pin.jpg' WHERE material_code = 'FG-001' AND (image_path IS NULL OR image_path = '');
UPDATE material_master SET image_path = '/uploads/hydraulic_seal.jpg' WHERE material_code = 'FG-002' AND (image_path IS NULL OR image_path = '');
