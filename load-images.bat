@echo off
setlocal enabledelayedexpansion
title UGAM / Lumos MES - Load Prebuilt Docker Images
echo ===============================================================================
echo            UGAM / LUMOS MES - LOADING PREBUILT DOCKER CONTAINER IMAGES
echo ===============================================================================
echo.

cd /d "%~dp0"

echo [1/3] Checking Docker daemon status...
docker info >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Docker daemon is not running. Please start Docker Desktop first.
    pause
    exit /b 1
)

echo [2/3] Loading Frontend container image...
if exist "ugam-frontend.tar" (
    docker load -i ugam-frontend.tar
) else if exist "lumos-frontend.tar" (
    docker load -i lumos-frontend.tar
) else (
    echo [ERROR] Frontend image tar file (ugam-frontend.tar or lumos-frontend.tar) not found.
    pause
    exit /b 1
)

echo [3/3] Loading Backend container image...
if exist "ugam-backend.tar" (
    docker load -i ugam-backend.tar
) else if exist "lumos-backend.tar" (
    docker load -i lumos-backend.tar
) else (
    echo [ERROR] Backend image tar file (ugam-backend.tar or lumos-backend.tar) not found.
    pause
    exit /b 1
)

:: Ensure both aliases exist for full compatibility
docker tag ugam_mes-frontend:latest lumos_mes-frontend:latest >nul 2>&1
docker tag ugam_mes-backend:latest lumos_mes-backend:latest >nul 2>&1

echo.
echo ===============================================================================
echo [*] All MES container images have been successfully imported into Docker!
echo You can now launch the application anytime by executing 'start.bat'.
echo ===============================================================================
echo.
pause
