@echo off
title LHM Madagascar — Backend
color 0A

echo.
echo ============================================================
echo    LHM Madagascar — Installation et démarrage du Backend
echo ============================================================
echo.

cd /d "%~dp0"

echo [1/3] Verification de Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERREUR: Node.js n'est pas installe.
    echo Telechargez Node.js sur https://nodejs.org
    pause
    exit /b 1
)
node --version
echo.

echo [2/3] Installation des dependances...
cd backend
call npm install
if %errorlevel% neq 0 (
    echo ERREUR lors de npm install
    pause
    exit /b 1
)
echo.

echo [3/3] Demarrage du serveur backend...
echo.
echo API disponible sur: http://localhost:5000
echo Dashboard sante:    http://localhost:5000/health
echo.
echo Comptes par defaut:
echo   admin@lhm-madagascar.org / Admin@1234
echo   direction@lhm-madagascar.org / Direction@1234
echo.
node server.js

pause
