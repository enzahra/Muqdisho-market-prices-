@echo off
title Neon Database Setup — Muqdisho Market Prices
cd /d "%~dp0"

echo.
echo  ============================================
echo   Neon Database Setup (Vercel / Online)
echo  ============================================
echo.

if not exist ".env" (
  echo QALAD: .env file ma jiro. Ku dar DATABASE_URL Neon connection string.
  pause
  exit /b 1
)

findstr /I "neon.tech" .env >nul
if errorlevel 1 (
  echo DIGNIIN: .env DATABASE_URL ma u muuqato Neon.
  echo Hubi in .env uu leeyahay Neon connection string ka hor inta aadan sii wadin.
  echo.
  pause
)

echo [1/4] Schema-ka database-ka la sync-gareynayo...
call npx prisma db push
if errorlevel 1 goto fail

echo.
echo [2/4] Categories iyo items aasaasiga ah...
call npm run db:seed
if errorlevel 1 goto fail

echo.
echo [3/4] Xoolaha (livestock) xogta buuxda...
call npm run db:seed-livestock
if errorlevel 1 goto fail

echo.
echo [4/5] Super admin...
call npm run db:super-admin
if errorlevel 1 goto fail

echo.
echo [5/5] Biyaha iyo korontada...
call npm run db:seed-utilities
if errorlevel 1 goto fail

echo.
echo  ✓ Database-ka Neon waa diyaar!
echo.
echo  Hadda Vercel-ka ku dar Environment Variables:
echo    DATABASE_URL     = Neon connection string (.env-kaaga)
echo    ADMIN_SESSION_SECRET = string random ah (tusaale: muqdisho-secret-2026)
echo.
echo  Kadib Vercel: Deployments -^> Redeploy
echo  Link: https://muqdisho-market-prices.vercel.app
echo.
pause
exit /b 0

:fail
echo.
echo  QALAD: Setup wuu fashilmay. Hubi DATABASE_URL iyo internet.
pause
exit /b 1
