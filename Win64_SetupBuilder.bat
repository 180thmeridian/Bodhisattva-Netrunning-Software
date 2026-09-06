@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul 2>&1

title CP2020 Netrun Terminal - Build

REM ============================================================
REM CP2020 Netrun Terminal
REM Unified CHECK + INSTALL + BUILD with detailed diagnostics
REM Target: Windows x64 / NSIS
REM Output: main\
REM Logs: build-logs\
REM ============================================================

cd /d "%~dp0"

set "PROJECT_DIR=%CD%"
set "OUTPUT_DIR=%PROJECT_DIR%\main"
set "LOG_DIR=%PROJECT_DIR%\build-logs"
set "BUILD_LOG=%LOG_DIR%\build.log"
set "DIAG_LOG=%LOG_DIR%\diagnostics.log"

if not exist "%LOG_DIR%" mkdir "%LOG_DIR%" >nul 2>&1

> "%BUILD_LOG%" echo ============================================================
>>"%BUILD_LOG%" echo CP2020 NETRUN TERMINAL - ELECTRON BUILDER LOG
>>"%BUILD_LOG%" echo Project: %PROJECT_DIR%
>>"%BUILD_LOG%" echo ============================================================
>>"%BUILD_LOG%" echo.

> "%DIAG_LOG%" echo ============================================================
>>"%DIAG_LOG%" echo CP2020 NETRUN TERMINAL - BUILD DIAGNOSTICS
>>"%DIAG_LOG%" echo Project: %PROJECT_DIR%
>>"%DIAG_LOG%" echo ============================================================
>>"%DIAG_LOG%" echo.

echo.
echo ============================================================
echo       CP2020 NETRUN TERMINAL - BUILD SYSTEM
echo ============================================================
echo.
echo Project:
echo   %PROJECT_DIR%
echo.
echo Output:
echo   %OUTPUT_DIR%
echo.
echo Logs:
echo   %LOG_DIR%
echo.

REM ============================================================
REM STEP 1 - CHECK PROJECT
REM ============================================================

echo [1/5] Checking project...

if not exist "package.json" (
    call :ERROR "package.json not found. BUILD.bat must be in project root."
    goto :FAIL
)
echo [OK] package.json

if not exist "main.js" (
    call :ERROR "main.js not found."
    goto :FAIL
)
echo [OK] main.js

if not exist "renderer\index.html" (
    call :ERROR "renderer\index.html not found."
    goto :FAIL
)
echo [OK] renderer\index.html

if exist "version.txt" (
    echo [OK] version.txt
) else (
    echo [WARN] version.txt not found.
    >>"%DIAG_LOG%" echo [WARN] version.txt not found.
)

if exist "package-lock.json" (
    echo [OK] package-lock.json
) else (
    echo [WARN] package-lock.json not found.
    >>"%DIAG_LOG%" echo [WARN] package-lock.json not found.
)

echo.

REM ============================================================
REM STEP 2 - CHECK NODE / NPM / NPX
REM ============================================================

echo [2/5] Checking Node.js, npm and npx...

where node >nul 2>&1
if errorlevel 1 (
    call :ERROR "Node.js was not found in PATH."
    goto :FAIL
)

set "NODE_VERSION="
for /f "delims=" %%V in ('node -v 2^>nul') do set "NODE_VERSION=%%V"

if not defined NODE_VERSION (
    call :ERROR "Cannot determine Node.js version."
    goto :FAIL
)

set "NODE_MAJOR=!NODE_VERSION:v=!"
for /f "tokens=1 delims=." %%M in ("!NODE_MAJOR!") do set "NODE_MAJOR=%%M"

set /a NODE_MAJOR_NUM=!NODE_MAJOR! 2>nul
if errorlevel 1 (
    call :ERROR "Cannot parse Node.js major version: !NODE_VERSION!"
    goto :FAIL
)

if !NODE_MAJOR_NUM! LSS 18 (
    call :ERROR "Node.js 18 or newer is required. Installed: !NODE_VERSION!"
    goto :FAIL
)

where npm >nul 2>&1
if errorlevel 1 (
    call :ERROR "npm was not found in PATH."
    goto :FAIL
)

where npx >nul 2>&1
if errorlevel 1 (
    call :ERROR "npx was not found in PATH."
    goto :FAIL
)

set "NPM_VERSION="
for /f "delims=" %%V in ('npm -v 2^>nul') do set "NPM_VERSION=%%V"

echo [OK] Node.js !NODE_VERSION!
echo [OK] npm !NPM_VERSION!
echo [OK] npx found

>>"%DIAG_LOG%" echo Node.js: !NODE_VERSION!
>>"%DIAG_LOG%" echo npm: !NPM_VERSION!
>>"%DIAG_LOG%" where node
>>"%DIAG_LOG%" where npm
>>"%DIAG_LOG%" where npx
>>"%DIAG_LOG%" echo.

echo.

REM ============================================================
REM STEP 3 - INSTALL / VERIFY DEPENDENCIES
REM ============================================================

echo [3/5] Checking dependencies...

set "NEED_INSTALL=0"

if not exist "node_modules\electron\package.json" (
    echo [INFO] Electron is missing.
    set "NEED_INSTALL=1"
)

if not exist "node_modules\electron-builder\package.json" (
    echo [INFO] electron-builder is missing.
    set "NEED_INSTALL=1"
)

if "!NEED_INSTALL!"=="1" (
    echo.
    echo [INFO] Installing dependencies...
    echo        npm install --no-fund --no-audit
    echo.

    call npm.cmd install --no-fund --no-audit >>"%BUILD_LOG%" 2>&1
    set "INSTALL_EXIT=!ERRORLEVEL!"

    if not "!INSTALL_EXIT!"=="0" (
        call :ERROR "npm install failed with exit code !INSTALL_EXIT!."
        echo.
        echo ----- npm output -----
        type "%BUILD_LOG%"
        echo ----- end npm output -----
        goto :FAIL
    )

    echo [OK] npm install completed.
) else (
    echo [OK] Required dependencies already installed.
)

if not exist "node_modules\electron\package.json" (
    call :ERROR "Electron is missing after npm install."
    goto :FAIL
)

if not exist "node_modules\electron-builder\package.json" (
    call :ERROR "electron-builder is missing after npm install."
    goto :FAIL
)

echo.
echo [INFO] Dependency versions:

call npm.cmd ls electron electron-builder --depth=0 >>"%DIAG_LOG%" 2>&1
call npm.cmd ls electron electron-builder --depth=0
set "NPM_LS_EXIT=!ERRORLEVEL!"

if not "!NPM_LS_EXIT!"=="0" (
    echo [WARN] npm reported dependency-tree problems.
    >>"%DIAG_LOG%" echo [WARN] npm ls exit code: !NPM_LS_EXIT!
)

call npx.cmd --no-install electron-builder --version >>"%DIAG_LOG%" 2>&1
set "BUILDER_VERSION_EXIT=!ERRORLEVEL!"

if not "!BUILDER_VERSION_EXIT!"=="0" (
    call :ERROR "electron-builder executable cannot be started."
    goto :FAIL
)

echo.

REM ============================================================
REM STEP 4 - PREPARE CLEAN OUTPUT
REM ============================================================

echo [4/5] Preparing clean output directory...

REM Remove previous artifacts so an old EXE can never be mistaken
REM for a successful current build.
if exist "%OUTPUT_DIR%" (
    echo [INFO] Removing previous main directory...
    rmdir /s /q "%OUTPUT_DIR%" 2>>"%DIAG_LOG%"
    if exist "%OUTPUT_DIR%" (
        call :ERROR "Cannot remove old output directory: %OUTPUT_DIR%"
        goto :FAIL
    )
)

mkdir "%OUTPUT_DIR%" >nul 2>&1
if errorlevel 1 (
    call :ERROR "Cannot create output directory: %OUTPUT_DIR%"
    goto :FAIL
)

echo [OK] Clean output directory ready.
echo.

REM ============================================================
REM STEP 5 - BUILD
REM ============================================================

echo [5/5] Building Windows x64 NSIS installer...
echo.
echo Command:
echo   npx --no-install electron-builder --win nsis --x64 --config.directories.output=main
echo.
echo Full builder output is being written to:
echo   %BUILD_LOG%
echo.

set "CSC_IDENTITY_AUTO_DISCOVERY=false"
set "CSC_LINK="
set "WIN_CSC_LINK="

>>"%DIAG_LOG%" echo.
>>"%DIAG_LOG%" echo ============================================================
>>"%DIAG_LOG%" echo Environment before electron-builder
>>"%DIAG_LOG%" echo ============================================================
>>"%DIAG_LOG%" echo CSC_IDENTITY_AUTO_DISCOVERY=%CSC_IDENTITY_AUTO_DISCOVERY%
>>"%DIAG_LOG%" echo Output directory=%OUTPUT_DIR%
>>"%DIAG_LOG%" echo.

>>"%BUILD_LOG%" echo.
>>"%BUILD_LOG%" echo ============================================================
>>"%BUILD_LOG%" echo ELECTRON-BUILDER START
>>"%BUILD_LOG%" echo ============================================================
>>"%BUILD_LOG%" echo Command: npx --no-install electron-builder --win nsis --x64 --config.directories.output=main
>>"%BUILD_LOG%" echo.

call npx.cmd --no-install electron-builder --win nsis --x64 --config.directories.output=main >>"%BUILD_LOG%" 2>&1
set "BUILD_EXIT=!ERRORLEVEL!"

>>"%BUILD_LOG%" echo.
>>"%BUILD_LOG%" echo ============================================================
>>"%BUILD_LOG%" echo electron-builder exit code: !BUILD_EXIT!
>>"%BUILD_LOG%" echo ============================================================

echo.
echo electron-builder exit code: !BUILD_EXIT!
echo.

if not "!BUILD_EXIT!"=="0" (
    call :ERROR "electron-builder failed with exit code !BUILD_EXIT!."

    echo ============================================================
    echo              ELECTRON-BUILDER ERROR OUTPUT
    echo ============================================================
    echo.
    type "%BUILD_LOG%"
    echo.
    echo ============================================================
    echo Full log:
    echo   %BUILD_LOG%
    echo Diagnostics:
    echo   %DIAG_LOG%
    echo ============================================================
    goto :FAIL
)

REM ============================================================
REM VERIFY CURRENT BUILD RESULT
REM ============================================================

echo Verifying generated installer...

set "SETUP_FOUND=0"
set "SETUP_FILE="

for /f "delims=" %%F in ('dir /b /s "%OUTPUT_DIR%\*.exe" 2^>nul') do (
    set "SETUP_FOUND=1"
    set "SETUP_FILE=%%F"
)

if "!SETUP_FOUND!"=="0" (
    call :ERROR "electron-builder returned exit code 0, but no EXE was found in %OUTPUT_DIR%."
    echo.
    echo ----- builder output -----
    type "%BUILD_LOG%"
    echo ----- end builder output -----
    goto :FAIL
)

echo.
echo ============================================================
echo                    BUILD SUCCESSFUL
echo ============================================================
echo.
echo Installer:
echo   !SETUP_FILE!
echo.
echo Output directory:
echo   %OUTPUT_DIR%
echo.
echo Builder log:
echo   %BUILD_LOG%
echo.
echo Diagnostics:
echo   %DIAG_LOG%
echo.
echo ============================================================
echo.

pause
endlocal
exit /b 0


REM ============================================================
REM ERROR ROUTINE
REM ============================================================

:ERROR
echo.
echo [ERROR] %~1
>>"%DIAG_LOG%" echo [ERROR] %~1
exit /b 0


REM ============================================================
REM FAILURE HANDLER
REM ============================================================

:FAIL
echo.
echo ============================================================
echo                       BUILD FAILED
echo ============================================================
echo.
echo The detailed logs are saved here:
echo.
echo   %BUILD_LOG%
echo   %DIAG_LOG%
echo.
echo Open build.log first and look at the last error lines.
echo.
echo ============================================================
echo.

pause
endlocal
exit /b 1
