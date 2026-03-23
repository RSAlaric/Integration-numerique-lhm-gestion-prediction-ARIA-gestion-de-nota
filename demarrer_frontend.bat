@echo off
title LHM Madagascar — Frontend
color 0B

echo.
echo ============================================================
echo    LHM Madagascar — Installation et démarrage du Frontend
echo ============================================================
echo.

cd /d "%~dp0"

echo [1/2] Installation des dependances React...
cd frontend
call npm install
if %errorlevel% neq 0 (
    echo ERREUR lors de npm install
    pause
    exit /b 1
)
echo.

echo [2/2] Demarrage de l'application React...
echo.
echo Application disponible sur: http://localhost:3000
echo.
echo IMPORTANT: Le backend doit etre deja demarre sur le port 5000
echo.
call npm start

pause
