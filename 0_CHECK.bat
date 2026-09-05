@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo === CHECK ===
echo Folder: %CD%
echo.
echo node:
where node
node -v
echo.
echo npm:
where npm.cmd
npm.cmd -v
echo.
echo Files:
if exist package.json (echo  package.json YES) else (echo  package.json NO)
if exist main.js (echo  main.js YES) else (echo  main.js NO)
if exist renderer\index.html (echo  renderer\index.html YES) else (echo  renderer\index.html NO)
if exist node_modules\electron (echo  node_modules\electron YES) else (echo  node_modules\electron NO - need install)
if exist node_modules\electron-builder (echo  node_modules\electron-builder YES) else (echo  node_modules\electron-builder NO - need install)
if exist dist (echo  dist folder YES & dir /b dist\*.exe 2>nul) else (echo  dist folder NO)
echo.
pause
