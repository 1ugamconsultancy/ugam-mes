Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$sourceDir = "D:\UGAM_MES"
$zipPath = "D:\UGAM_MES\UGAM_MES_Deployable.zip"

if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
}

$filesToZip = @(
  "docker-compose.deploy.yml",
  "docker-compose.yml",
  "load-images.bat",
  "start.bat",
  "stop.bat",
  "README.md",
  "README_DEPLOYMENT.md",
  "INFORMATION_ARCHITECTURE.md",
  "LINE_E2E_TEST_PLAN.md",
  "schema.sql",
  "seed.sql",
  "setup_ugam_mes_db.sql",
  "vial_seed.sql",
  "migration_enterprise_multitenant.sql",
  "migration_qr_code.sql",
  "migration_security_plant_access.sql",
  "migration_upgrade.sql",
  "populate_compliance_data.sql",
  "populate_automotive_ops.sql",
  "align_test_plan_db.sql",
  "security-live-migration.sql",
  "fix_material_images.sql",
  "migration_automotive_seat_assembly.sql",
  "ugam-backend.tar",
  "ugam-frontend.tar"
)

$zip = [System.IO.Compression.ZipFile]::Open($zipPath, [System.IO.Compression.ZipArchiveMode]::Create)

foreach ($file in $filesToZip) {
    $fullPath = Join-Path $sourceDir $file
    if (Test-Path $fullPath) {
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $fullPath, $file, [System.IO.Compression.CompressionLevel]::Fastest)
        Write-Output ("Added " + $file)
    } else {
        Write-Warning ("Not found: " + $fullPath)
    }
}

# Add uploads directory
$uploadsDir = Join-Path $sourceDir "backend\uploads"
if (Test-Path $uploadsDir) {
    Get-ChildItem -Path $uploadsDir -File | ForEach-Object {
        $entryName = "backend/uploads/" + $_.Name
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $_.FullName, $entryName, [System.IO.Compression.CompressionLevel]::Fastest)
        Write-Output ("Added " + $entryName)
    }
}

# Add sample_barcodes directory
$barcodesDir = Join-Path $sourceDir "sample_barcodes"
if (Test-Path $barcodesDir) {
    Get-ChildItem -Path $barcodesDir -File | ForEach-Object {
        $entryName = "sample_barcodes/" + $_.Name
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $_.FullName, $entryName, [System.IO.Compression.CompressionLevel]::Fastest)
        Write-Output ("Added " + $entryName)
    }
}

$zip.Dispose()
Write-Output "UGAM_MES_Deployable.zip packaged successfully."

# Mirror to Lumos_MES
if (Test-Path "D:\Lumos_MES") {
    Copy-Item $zipPath "D:\Lumos_MES\UGAM_MES_Deployable.zip" -Force
    Copy-Item $zipPath "D:\Lumos_MES\Lumos_MES_Deployable.zip" -Force
    Write-Output "Mirrored to D:\Lumos_MES."
}
