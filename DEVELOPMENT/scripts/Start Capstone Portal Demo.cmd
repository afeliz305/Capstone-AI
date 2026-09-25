@echo off
setlocal
cd /d "%~dp0.."
if not exist package.json (
  echo Could not find DEVELOPMENT\package.json. Keep this launcher inside DEVELOPMENT\scripts.
  pause
  exit /b 1
)
npm.cmd run demo:portal
if errorlevel 1 pause
