@echo off
setlocal

cd /d "%~dp0"

echo ============================================
echo CP2020 Netrun Terminal - Development
echo ============================================
echo.
echo Project:
echo %CD%
echo.

if not exist "package.json" (
    echo ERROR: package.json not found!
    echo.
    pause
    exit /b 1
)

echo Starting application...
echo.

npm start

echo.
echo ============================================
echo Application has exited.
echo ============================================
echo.

pause