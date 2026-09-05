@echo off
setlocal EnableExtensions
chcp 65001 >nul 2>&1
title CP2020 Netrun Terminal — Dev
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js not found. Install from https://nodejs.org/
  pause
  exit /b 1
)

if not exist "node_modules\electron\package.json" (
  echo First run: installing dependencies...
  call npm install
  if errorlevel 1 (
    echo npm install failed.
    pause
    exit /b 1
  )
)

echo Starting Netrun Terminal ^(dev^)...
call npm start
if errorlevel 1 pause
