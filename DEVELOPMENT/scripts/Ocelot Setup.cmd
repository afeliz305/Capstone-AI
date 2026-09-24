@echo off
setlocal
cd /d "%~dp0.."
node scripts\ocelot-setup.js
echo.
pause
