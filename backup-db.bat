@echo off
set "PGUSER=postgres"
set "PGHOST=localhost"
set "PGPORT=5432"
set "PGDATABASE=muqdisho_market"
if not "%POSTGRES_DB%"=="" set "PGDATABASE=%POSTGRES_DB%"
if "%POSTGRES_PASSWORD%"=="" (
  set /p POSTGRES_PASSWORD=Enter PostgreSQL password:
)
set "PGPASSWORD=%POSTGRES_PASSWORD%"
if not exist backups mkdir backups
set TIMESTAMP=%date:~-4%-%date:~3,2%-%date:~0,2%_%time:~0,2%-%time:~3,2%
set TIMESTAMP=%TIMESTAMP: =0%
echo Starting database backup...
pg_dump -U %PGUSER% -h %PGHOST% -p %PGPORT% -F c %PGDATABASE% > backups\db_backup_%TIMESTAMP%.dump
if errorlevel 1 (
  echo Backup failed.
  pause
  exit /b 1
)
echo Backup completed! Backup saved in the backups folder.
pause
