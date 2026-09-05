@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo === STEP 2: electron-builder ===
echo Folder: %CD%
echo.

if not exist "node_modules\electron-builder\package.json" (
  echo FAIL: run 1_INSTALL.bat first
  pause
  exit /b 1
)

set CSC_IDENTITY_AUTO_DISCOVERY=false
set CSC_LINK=
set WIN_CSC_LINK=

echo Building portable EXE...
echo Command: npx electron-builder --win portable --x64
echo.

npx --no-install electron-builder --win portable --x64
set EC=%ERRORLEVEL%

echo.
echo Exit code: %EC%
echo.

if not "%EC%"=="0" (
  echo FAIL: builder error. Scroll UP for details.
  pause
  exit /b 1
)

echo Looking for EXE...
if exist "dist\" (
  dir /s /b "dist\*.exe"
) else (
  echo FAIL: no dist folder created
  pause
  exit /b 1
)

echo.
echo OK if you see a .exe path above.
echo.
pause
