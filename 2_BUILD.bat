@echo off
chcp 65001 >nul
setlocal EnableExtensions
cd /d "%~dp0"
title CP2020 Netrun — Build NSIS installer

echo ========================================
echo  STEP 2: electron-builder  (NSIS Setup)
echo  %CD%
echo ========================================
echo.

if not exist "node_modules\electron-builder\package.json" (
  echo [FAIL] Run 1_INSTALL.bat first
  pause
  exit /b 1
)

set CSC_IDENTITY_AUTO_DISCOVERY=false
set CSC_LINK=
set WIN_CSC_LINK=

echo Building Windows NSIS installer ^(x64^)...
echo Command: npx electron-builder --win nsis --x64
echo.
echo This may take several minutes. Do not close the window.
echo.

npx --no-install electron-builder --win nsis --x64
set EC=%ERRORLEVEL%

echo.
echo Exit code: %EC%
echo.

if not "%EC%"=="0" (
  echo [FAIL] Builder error. Scroll UP for details.
  pause
  exit /b 1
)

echo Looking for Setup EXE...
if exist "dist\" (
  dir /s /b "dist\*.exe"
) else (
  echo [FAIL] no dist folder created
  pause
  exit /b 1
)

echo.
echo [OK] Build finished. Installer is in the dist\ folder.
echo.
pause
endlocal
