@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul 2>&1
title CP2020 Netrun Terminal — Dev
cd /d "%~dp0"

set "NODE_CMD="
where node >nul 2>&1
if not errorlevel 1 set "NODE_CMD=node"
if not defined NODE_CMD if exist "%ProgramFiles%\nodejs\node.exe" set "NODE_CMD=%ProgramFiles%\nodejs\node.exe"
if not defined NODE_CMD (
  echo [ERROR] Node.js not found. Install from https://nodejs.org/
  pause
  exit /b 1
)

set "MAJOR="
for /f "usebackq delims=" %%m in (`"!NODE_CMD!" -p "process.versions.node.split('.')[0]" 2^>nul`) do set "MAJOR=%%m"
if not defined MAJOR (
  echo [ERROR] Cannot read Node version. Try: node -v
  pause
  exit /b 1
)
set /a MAJOR_NUM=!MAJOR! 2>nul
if !MAJOR_NUM! LSS 18 (
  echo [ERROR] Node.js 18+ required. You have major=!MAJOR!
  pause
  exit /b 1
)

set "NPM_CMD=npm"
where npm >nul 2>&1
if errorlevel 1 if exist "%ProgramFiles%\nodejs\npm.cmd" set "NPM_CMD=%ProgramFiles%\nodejs\npm.cmd"

if not exist "node_modules\electron\package.json" (
  echo First run: npm install...
  call "!NPM_CMD!" install
  if errorlevel 1 (
    echo npm install failed.
    pause
    exit /b 1
  )
)

echo Starting Netrun Terminal ^(dev^)...
call "!NPM_CMD!" start
if errorlevel 1 pause
