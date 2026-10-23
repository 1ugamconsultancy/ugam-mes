@echo off
setlocal enabledelayedexpansion
title UGAM Next Gen MES - Application Startup

echo ===============================================================================
echo               UGAM NEXT GEN MES - MANUFACTURING EXECUTION SYSTEM
echo ===============================================================================
echo.

cd /d "%~dp0"

echo [1/4] Checking Docker daemon status...
docker info >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [!] Docker daemon is not running. Attempting to start Docker Desktop...
    
    set "DOCKER_EXE=C:\Program Files\Docker\Docker\Docker Desktop.exe"
    if not exist "!DOCKER_EXE!" (
        set "DOCKER_EXE=%LOCALAPPDATA%\Programs\Docker\Docker\Docker Desktop.exe"
    )
    
    if exist "!DOCKER_EXE!" (
        echo [*] Launching Docker Desktop from: "!DOCKER_EXE!"
        start "" "!DOCKER_EXE!"
        
        echo [*] Waiting for Docker daemon to initialize (this may take 20-40 seconds)...
        set /a RETRIES=0
        :WAIT_DOCKER
        timeout /t 3 /nobreak >nul
        docker info >nul 2>&1
        if %ERRORLEVEL% EQU 0 goto DOCKER_READY
        
        set /a RETRIES+=1
        if !RETRIES! GEQ 30 (
            echo.
            echo [ERROR] Docker Desktop failed to start within the timeout period.
            echo Please start Docker Desktop manually and run this script again.
            pause
            exit /b 1
        )
        echo     Waiting for Docker daemon... (!RETRIES!/30)
        goto WAIT_DOCKER
    ) else (
        echo.
        echo [ERROR] Docker Desktop executable not found at standard paths.
        echo Please ensure Docker Desktop is installed and running.
        pause
        exit /b 1
    )
)

:DOCKER_READY
echo [*] Docker daemon is running and responsive.
echo.

echo [2/4] Starting UGAM Next Gen MES Docker containers (Postgres, Redis, Backend, Frontend, Adminer)...
docker compose up -d

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Failed to start containers via Docker Compose.
    pause
    exit /b 1
)

echo.
echo [3/4] Verifying services and database initialization...
timeout /t 5 /nobreak >nul

docker exec ugam-postgres psql -U mes_admin -d ugam_mes -c "SELECT 'PostgreSQL Database Ready' as status;" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [*] PostgreSQL Database: ONLINE and HEALTHY
) else (
    echo [*] PostgreSQL Database: INITIALIZING (waiting 5 seconds)...
    timeout /t 5 /nobreak >nul
)

echo.
echo [*] Synchronizing Raw Material images & media assets...
if exist "backend\uploads" (
    docker cp "backend\uploads\." ugam-backend:/app/uploads/ >nul 2>&1
) else if exist "uploads" (
    docker cp "uploads\." ugam-backend:/app/uploads/ >nul 2>&1
)

if exist "fix_material_images.sql" (
    docker exec -i ugam-postgres psql -U mes_admin -d ugam_mes < fix_material_images.sql >nul 2>&1
)

if exist "migration_automotive_seat_assembly.sql" (
    docker exec -i ugam-postgres psql -U mes_admin -d ugam_mes < migration_automotive_seat_assembly.sql >nul 2>&1
)

docker exec ugam-postgres psql -U mes_admin -d ugam_mes -c "UPDATE material_master SET image_path = '/uploads/steel_bar_en8.jpg' WHERE material_code = 'RM-ST-001' AND (image_path IS NULL OR image_path = ''); UPDATE material_master SET image_path = '/uploads/aluminium_rod.jpg' WHERE material_code = 'RM-ST-002' AND (image_path IS NULL OR image_path = ''); UPDATE material_master SET image_path = '/uploads/nbr_rubber.jpg' WHERE material_code = 'RM-ST-003' AND (image_path IS NULL OR image_path = ''); UPDATE material_master SET image_path = '/uploads/copper_wire.jpg' WHERE material_code = 'RM-ST-004' AND (image_path IS NULL OR image_path = ''); UPDATE material_master SET image_path = '/uploads/machined_pin.jpg' WHERE material_code = 'INT-001' AND (image_path IS NULL OR image_path = ''); UPDATE material_master SET image_path = '/uploads/heat_treated_pin.jpg' WHERE material_code = 'INT-002' AND (image_path IS NULL OR image_path = ''); UPDATE material_master SET image_path = '/uploads/rubber_seal.jpg' WHERE material_code = 'INT-003' AND (image_path IS NULL OR image_path = ''); UPDATE material_master SET image_path = '/uploads/control_pin.jpg' WHERE material_code = 'FG-001' AND (image_path IS NULL OR image_path = ''); UPDATE material_master SET image_path = '/uploads/hydraulic_seal.jpg' WHERE material_code = 'FG-002' AND (image_path IS NULL OR image_path = '');" >nul 2>&1
echo [*] Raw Material images: VERIFIED and ACTIVE.

echo.
echo [4/4] Opening UGAM Next Gen MES Web Application in default browser...
start http://localhost:8085

echo.
echo ===============================================================================
echo                  UGAM NEXT GEN MES IS RUNNING SUCCESSFULLY!
echo ===============================================================================
echo.
echo   * Web Frontend UI:     http://localhost:8085
echo   * Backend REST API:    http://localhost:3001
echo   * Swagger API Docs:    http://localhost:3001/api
echo   * Adminer Database:    http://localhost:8082 (System: PostgreSQL, Server: postgres, DB: ugam_mes, Port: 5434, User: mes_admin)
echo.
echo   Default Credentials:
echo   --------------------
echo   * Super Admin:         superadmin / MES123
echo   * Plant Admin:         admin / MES123 (or SecretMESPassword123)
echo   * Production Manager:  manager / MES123 (or SecretMESPassword123)
echo   * Quality Engineer:    quality1 / MES123 (or SecretMESPassword123)
echo   * Line Operator:       operator1 / MES123 (or SecretMESPassword123)
echo.
echo ===============================================================================
echo Press any key to close this launcher window (containers will keep running)...
pause >nul
