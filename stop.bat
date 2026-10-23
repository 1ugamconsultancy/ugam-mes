@echo off
title UGAM Next Gen MES - Stop Application

echo ===============================================================================
echo             UGAM NEXT GEN MES - STOPPING APPLICATION CONTAINERS
echo ===============================================================================
echo.

cd /d "%~dp0"

echo [*] Stopping Docker Compose containers...
docker compose down

echo.
echo [*] UGAM Next Gen MES containers have stopped cleanly.
echo.
pause
