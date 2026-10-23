-- Migration: Multi-Tenant Organizations, Plants & Theme Settings
-- Enables Super Admin to add/edit Organizations, Plants, and Plant Theme Palettes

-- 1. Extend user_role ENUM to include SUPER_ADMIN
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'user_role' AND e.enumlabel = 'SUPER_ADMIN') THEN
        ALTER TYPE user_role ADD VALUE 'SUPER_ADMIN' BEFORE 'ADMIN';
    END IF;
END $$;

-- 2. Create Organizations Table
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    industry_type VARCHAR(50) NOT NULL DEFAULT 'AUTOMOTIVE',
    logo_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Update Plants Table
ALTER TABLE plants ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE plants ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'Asia/Kolkata';
ALTER TABLE plants ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'ACTIVE';

-- 4. Create Plant Theme Settings Table
CREATE TABLE IF NOT EXISTS plant_theme_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    plant_id UUID REFERENCES plants(id) ON DELETE CASCADE,
    theme_name VARCHAR(100) NOT NULL DEFAULT 'Ugam Corporate Navy',
    palette_type VARCHAR(50) NOT NULL DEFAULT 'PRESET',
    is_dark_mode BOOLEAN DEFAULT FALSE,
    colors JSONB NOT NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_plant_theme UNIQUE (plant_id)
);

-- 5. Update Users Table
ALTER TABLE users ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS plant_id UUID REFERENCES plants(id) ON DELETE SET NULL;

-- 6. Seed Organizations
INSERT INTO organizations (id, name, code, industry_type, is_active)
VALUES 
    ('10000000-0000-0000-0000-000000000001', 'Ugam Precision Automotive Group', 'UGAM-AUTO', 'AUTOMOTIVE', TRUE),
    ('10000000-0000-0000-0000-000000000002', 'GreenHarvest Foods & Beverages Ltd', 'GH-FOODS', 'FOOD_BEVERAGE', TRUE)
ON CONFLICT (code) DO UPDATE 
SET name = EXCLUDED.name, industry_type = EXCLUDED.industry_type, is_active = EXCLUDED.is_active;

-- 7. Associate existing plant AUTO-PLANT-01 to UGAM-AUTO
UPDATE plants 
SET organization_id = '10000000-0000-0000-0000-000000000001',
    timezone = 'Asia/Kolkata',
    status = 'ACTIVE'
WHERE code = 'AUTO-PLANT-01';

-- 8. Seed second plant for Food & Beverage
INSERT INTO plants (id, organization_id, name, code, location, timezone, status)
VALUES 
    ('a0000000-0002-2222-2222-222222222222', '10000000-0000-0000-0000-000000000002', 'GreenHarvest Dairy & Beverage Line 1', 'FOOD-PLANT-01', 'Whitefield Industrial Area, Bangalore, India', 'Asia/Kolkata', 'ACTIVE')
ON CONFLICT (code) DO UPDATE 
SET name = EXCLUDED.name, location = EXCLUDED.location, organization_id = EXCLUDED.organization_id;

-- 9. Seed Themes for both plants
-- Automotive Plant Theme: Ugam Corporate Navy
INSERT INTO plant_theme_settings (id, organization_id, plant_id, theme_name, palette_type, is_dark_mode, colors)
VALUES (
    'e0000000-0001-1111-1111-111111111111',
    '10000000-0000-0000-0000-000000000001',
    'a0000000-0001-1111-1111-111111111111',
    'Ugam Corporate Navy',
    'PRESET',
    FALSE,
    '{
        "bgPrimary": "#FFFFFF",
        "bgSection": "#F4F5F6",
        "bgCard": "#FFFFFF",
        "textPrimary": "#171717",
        "textSecondary": "#475569",
        "borderColor": "rgba(23, 74, 124, 0.20)",
        "colorPrimary": "#174A7C",
        "colorCorporate": "#142A45",
        "colorAccent": "#F5A623",
        "colorRunning": "#10B981",
        "colorIdle": "#F5A623",
        "colorBreakdown": "#EF4444"
    }'::jsonb
)
ON CONFLICT (plant_id) DO UPDATE 
SET theme_name = EXCLUDED.theme_name, colors = EXCLUDED.colors;

-- Food Plant Theme: Cleanroom Food Emerald
INSERT INTO plant_theme_settings (id, organization_id, plant_id, theme_name, palette_type, is_dark_mode, colors)
VALUES (
    'e0000000-0002-2222-2222-222222222222',
    '10000000-0000-0000-0000-000000000002',
    'a0000000-0002-2222-2222-222222222222',
    'Cleanroom Food Emerald',
    'PRESET',
    FALSE,
    '{
        "bgPrimary": "#F0FDF4",
        "bgSection": "#DCFCE7",
        "bgCard": "#FFFFFF",
        "textPrimary": "#064E3B",
        "textSecondary": "#047857",
        "borderColor": "rgba(5, 150, 105, 0.25)",
        "colorPrimary": "#059669",
        "colorCorporate": "#065F46",
        "colorAccent": "#10B981",
        "colorRunning": "#10B981",
        "colorIdle": "#F59E0B",
        "colorBreakdown": "#EF4444"
    }'::jsonb
)
ON CONFLICT (plant_id) DO UPDATE 
SET theme_name = EXCLUDED.theme_name, colors = EXCLUDED.colors;

-- 10. Seed Super Admin User
INSERT INTO users (id, username, email, password_hash, role, first_name, last_name, is_active)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'superadmin',
    'superadmin@ugamconsultancy.com',
    '$2b$10$SecretPasswordHashPlaceholderForTestingOnly1234567890',
    'SUPER_ADMIN',
    'Super',
    'Administrator',
    TRUE
)
ON CONFLICT (username) DO UPDATE 
SET role = 'SUPER_ADMIN', is_active = TRUE;

-- 11. Associate existing automotive users to UGAM-AUTO and AUTO-PLANT-01
UPDATE users 
SET organization_id = '10000000-0000-0000-0000-000000000001',
    plant_id = 'a0000000-0001-1111-1111-111111111111'
WHERE username IN ('admin', 'manager', 'supervisor', 'operator1', 'quality1');

-- 12. Seed a food operator user
INSERT INTO users (id, username, email, password_hash, role, first_name, last_name, is_active, organization_id, plant_id)
VALUES (
    '44444444-4444-4444-4444-444444444445',
    'food_op1',
    'food_op1@greenharvest.com',
    '$2b$10$SecretPasswordHashPlaceholderForTestingOnly1234567890',
    'OPERATOR',
    'Ramesh',
    'Kumar (Food Line)',
    TRUE,
    '10000000-0000-0000-0000-000000000002',
    'a0000000-0002-2222-2222-222222222222'
)
ON CONFLICT (username) DO UPDATE 
SET organization_id = EXCLUDED.organization_id, plant_id = EXCLUDED.plant_id, is_active = TRUE;
