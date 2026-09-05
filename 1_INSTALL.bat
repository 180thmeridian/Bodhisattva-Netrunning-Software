@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo === STEP 1: npm install ===
echo Folder: %CD%
echo.
echo This downloads packages. Wait 5-15 minutes. Do not close.
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo FAIL: Node.js not found. Install from https://nodejs.org/
  pause
  exit /b 1
)

echo Running: npm.cmd install
echo.
npm.cmd install --no-fund --no-audit
set EC=%ERRORLEVEL%
echo.
echo Exit code: %EC%
echo.

if not "%EC%"=="0" (
  echo FAIL: npm install error. Text is ABOVE.
  pause
  exit /b 1
)

if not exist "node_modules\electron\package.json" (
  echo FAIL: electron folder missing after install
  pause
  exit /b 1
)
if not exist "node_modules\electron-builder\package.json" (
  echo FAIL: electron-builder folder missing after install
  pause
  exit /b 1
)

echo OK: dependencies installed.
echo Next: run 2_BUILD.bat
echo.
pause
