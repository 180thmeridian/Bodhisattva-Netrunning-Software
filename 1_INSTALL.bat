@echo off
chcp 65001 >nul
setlocal EnableExtensions
cd /d "%~dp0"
title CP2020 Netrun — Install dependencies

echo ========================================
echo  STEP 1: npm install
echo  %CD%
echo ========================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [FAIL] Node.js not found. Install from https://nodejs.org/
  pause
  exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
  echo [FAIL] npm not found.
  pause
  exit /b 1
)

echo Running: npm install --no-fund --no-audit
echo.
call npm.cmd install --no-fund --no-audit
set EC=%ERRORLEVEL%
echo.
echo Exit code: %EC%
echo.

if not "%EC%"=="0" (
  echo [FAIL] npm install error. Scroll up for details.
  pause
  exit /b 1
)

if not exist "node_modules\electron\package.json" (
  echo [FAIL] electron missing after install
  pause
  exit /b 1
)
if not exist "node_modules\electron-builder\package.json" (
  echo [FAIL] electron-builder missing after install
  pause
  exit /b 1
)

echo [OK] Dependencies installed.
echo Next: run 2_BUILD.bat  ^(NSIS installer^)  or  run-dev.bat  ^(dev mode^)
echo.
pause
endlocal
