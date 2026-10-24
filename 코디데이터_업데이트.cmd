@echo off
rem 코디 시뮬레이터 데이터 업데이트. 더블클릭하면 GMS_WEEK_BOSS\tools\coordi_update.js를 실행한다
chcp 65001 > nul
cd /d "%~dp0GMS_WEEK_BOSS"
node tools\coordi_update.js %*
echo.
pause
