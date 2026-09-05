@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul 2>&1
title CP2020 Netrun Terminal — Build

REM ============================================================
REM  CP2020 Netrun Terminal 1.6.6 — dependency check + build
REM  Requires: Node.js 18+ (includes npm)
REM  Does NOT require: Python, Java, Visual Studio, Git
REM ============================================================

cd /d "%~dp0"
echo.
echo  ========================================
echo   CP2020 Netrun Terminal — Build Script
echo  ========================================
echo  Working dir: %CD%
echo.

set "ERR=0"
set "NODE_OK=0"
set "NPM_OK=0"

REM ---------- 1. Node.js ----------
echo [1/5] Checking Node.js...
where node >nul 2>&1
if errorlevel 1 (
  echo.
  echo  [ERROR] Node.js not found in PATH.
  echo.
  echo  Install Node.js 18 LTS or newer:
  echo    https://nodejs.org/
  echo  During setup enable "Add to PATH".
  echo  Then close this window and run build.bat again.
  echo.
  set "ERR=1"
  goto :fail
)

for /f "tokens=*" %%v in ('node -v 2^>nul') do set "NODE_VER=%%v"
echo        Found: !NODE_VER!

REM Parse major version (v18.x.x -> 18)
set "MAJOR=0"
for /f "tokens=1 delims=v." %%a in ("!NODE_VER!") do set "MAJOR=%%a"
if "!MAJOR!"=="" set "MAJOR=0"
if !MAJOR! LSS 18 (
  echo.
  echo  [ERROR] Node.js 18+ required. You have !NODE_VER!
  echo  Download: https://nodejs.org/
  echo.
  set "ERR=1"
  goto :fail
)
set "NODE_OK=1"
echo        OK ^(^>= 18^)

REM ---------- 2. npm ----------
echo [2/5] Checking npm...
where npm >nul 2>&1
if errorlevel 1 (
  echo.
  echo  [ERROR] npm not found. Reinstall Node.js and enable npm.
  echo.
  set "ERR=1"
  goto :fail
)
for /f "tokens=*" %%v in ('npm -v 2^>nul') do set "NPM_VER=%%v"
echo        Found: npm !NPM_VER!
set "NPM_OK=1"
echo        OK

REM ---------- 3. Project files ----------
echo [3/5] Checking project files...
if not exist "package.json" (
  echo  [ERROR] package.json not found. Run this bat from the project root.
  set "ERR=1"
  goto :fail
)
if not exist "main.js" (
  echo  [ERROR] main.js not found.
  set "ERR=1"
  goto :fail
)
if not exist "renderer\index.html" (
  echo  [ERROR] renderer\index.html not found.
  set "ERR=1"
  goto :fail
)
if not exist "version.txt" (
  echo  [WARN] version.txt missing — build will still run.
) else (
  set /p APPVER=<version.txt
  echo        version.txt: !APPVER!
)
echo        OK

REM ---------- 4. npm install ----------
echo [4/5] Installing dependencies ^(npm install^)...
echo        This may take a few minutes on first run.
echo.
call npm install
if errorlevel 1 (
  echo.
  echo  [ERROR] npm install failed.
  echo  Check network, proxy, or try: npm cache clean --force
  set "ERR=1"
  goto :fail
)
echo.
echo        npm install OK

REM Verify electron / electron-builder are present
if not exist "node_modules\electron\package.json" (
  echo  [ERROR] electron not installed after npm install.
  set "ERR=1"
  goto :fail
)
if not exist "node_modules\electron-builder\package.json" (
  echo  [ERROR] electron-builder not installed after npm install.
  set "ERR=1"
  goto :fail
)
echo        electron + electron-builder present

REM ---------- 5. Build ----------
echo [5/5] Building Windows portable ^(npm run dist:win^)...
echo        Output folder: dist\
echo.

set "CSC_IDENTITY_AUTO_DISCOVERY=false"
call npm run dist:win
if errorlevel 1 (
  echo.
  echo  [ERROR] Build failed. See messages above.
  set "ERR=1"
  goto :fail
)

echo.
echo  ========================================
echo   BUILD SUCCESSFUL
echo  ========================================
echo.
if exist "dist\" (
  echo  Artifacts in dist\:
  dir /b "dist\*.exe" 2>nul
  dir /b "dist\*.yml" 2>nul
  echo.
)
echo  Run the portable .exe from the dist folder.
echo  Optional offline renderer patch:
echo    npm run make-update
echo.
pause
exit /b 0

:fail
echo.
echo  ========================================
echo   BUILD FAILED
echo  ========================================
echo  Fix the errors above and run build.bat again.
echo.
pause
exit /b 1
