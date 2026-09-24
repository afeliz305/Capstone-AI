@echo off
setlocal
cd /d "%~dp0.."
where node >nul 2>&1
if errorlevel 1 (
  echo Node.js was not found. Install Node.js LTS, then reopen this launcher.
  echo See docs\TEAM_SETUP_GUIDE.md for setup instructions.
  pause
  exit /b 1
)
node scripts\start-demo.js
echo.
pause
