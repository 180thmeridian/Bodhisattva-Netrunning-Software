@echo off
chcp 65001 >nul
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"
title CP2020 Netrun — Environment check

echo ========================================
echo  CP2020 Netrun Terminal — CHECK
echo  %CD%
echo ========================================
echo.

set "OK=1"

where node >nul 2>&1
if errorlevel 1 (
  echo [FAIL] Node.js not found in PATH.
  echo        Install LTS from https://nodejs.org/ and re-open this window.
  set "OK=0"
) else (
  for /f "delims=" %%v in ('node -v 2^>nul') do echo [OK]   Node %%v
  set "MAJOR="
  for /f "usebackq delims=" %%m in (`node -p "process.versions.node.split('.')[0]" 2^>nul`) do set "MAJOR=%%m"
  if defined MAJOR (
    set /a MAJOR_NUM=!MAJOR! 2>nul
    if !MAJOR_NUM! LSS 18 (
      echo [FAIL] Node.js 18+ required ^(found major=!MAJOR!^).
      set "OK=0"
    )
  )
)

where npm >nul 2>&1
if errorlevel 1 (
  echo [FAIL] npm not found in PATH.
  set "OK=0"
) else (
  for /f "delims=" %%v in ('npm -v 2^>nul') do echo [OK]   npm %%v
)

if exist "package.json" (
  echo [OK]   package.json present
) else (
  echo [FAIL] package.json missing
  set "OK=0"
)

if exist "main.js" (
  echo [OK]   main.js present
) else (
  echo [FAIL] main.js missing
  set "OK=0"
)

if exist "renderer\index.html" (
  echo [OK]   renderer\index.html present
) else (
  echo [FAIL] renderer\index.html missing
  set "OK=0"
)

if exist "version.txt" (
  for /f "usebackq delims=" %%v in ("version.txt") do echo [OK]   version.txt = %%v
) else (
  echo [WARN] version.txt missing
)

echo.
if "!OK!"=="1" (
  echo Environment looks good.
  echo Next: 1_INSTALL.bat  then  2_BUILD.bat
) else (
  echo Fix the FAIL items above, then re-run this check.
)
echo.
pause
endlocal
