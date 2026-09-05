@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ========================================
echo  CP2020 Netrun - full build
echo  %CD%
echo ========================================
echo.
echo [A] Install dependencies
call "%~dp01_INSTALL.bat"
if errorlevel 1 exit /b 1
echo.
echo [B] Compile portable EXE
call "%~dp02_BUILD.bat"
if errorlevel 1 exit /b 1
echo.
echo ALL DONE
pause
