@echo off
title Muqdisho Market Prices
cd /d "%~dp0"

set "PATH=C:\Program Files\nodejs;%PATH%"

REM PostgreSQL — kici haddii aan socon
sc query postgresql-x64-18 | find "RUNNING" >nul
if errorlevel 1 (
  net start postgresql-x64-18 >nul 2>&1
  timeout /t 3 >nul
)

REM Haddii server hore u socdo, browser kaliya fur oo ka bax
powershell -NoProfile -Command "$c=Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue; if($c){exit 1}else{exit 0}"
if errorlevel 1 (
  start "" "http://localhost:3000/dashboard"
  exit /b 0
)

REM Server-ka ku kici daaqad yar oo gooni ah
start "Muqdisho Server" /MIN /D "%~dp0" cmd /c npm run dev

REM Sug ilaa server-ku diyaar noqdo (max 90 ilbiriqsi)
set /a tries=0
:waitloop
timeout /t 3 >nul
powershell -NoProfile -Command "if(Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue){exit 0}else{exit 1}"
if not errorlevel 1 goto ready
set /a tries+=1
if %tries% lss 30 goto waitloop
exit /b 1

:ready
start "" "http://localhost:3000/dashboard"
exit /b 0
