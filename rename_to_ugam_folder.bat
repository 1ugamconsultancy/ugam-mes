@echo off
setlocal enabledelayedexpansion
title UGAM Next Gen MES - Workspace Folder Migration

echo ===============================================================================
echo        UGAM NEXT GEN MES - ROOT WORKSPACE FOLDER MIGRATION SCRIPT
echo ===============================================================================
echo.
echo This script will safely:
echo   1. Stop active Docker Compose containers.
echo   2. Rename the project directory from 'D:\Lumos_MES' to 'D:\Ugam_MES'.
echo.
echo NOTE: Please close any open files or editors with active locks on D:\Lumos_MES
echo       before pressing a key to proceed.
echo ===============================================================================
echo.
pause

echo [*] Stopping Docker Compose containers...
cd /d "%~dp0"
docker compose down

echo [*] Moving to parent directory D:\...
cd /d "D:\"

echo [*] Renaming D:\Lumos_MES to D:\Ugam_MES...
ren "Lumos_MES" "Ugam_MES"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ===============================================================================
    echo                     FOLDER RENAMED SUCCESSFULLY!
    echo ===============================================================================
    echo Project path is now: D:\Ugam_MES
    echo.
    echo Next Steps:
    echo   1. In Antigravity / your IDE, open the new workspace: D:\Ugam_MES
    echo   2. Run 'start.bat' inside D:\Ugam_MES to launch the application.
    echo ===============================================================================
) else (
    echo.
    echo [ERROR] Could not rename folder. It might be locked by an active process.
    echo Please close Antigravity / IDE / open terminals and run this script again.
)

echo.
pause
