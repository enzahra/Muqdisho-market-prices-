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
if "%~1"=="" (
    echo Please drag and drop a backup file onto this script, or provide the file path as an argument.
    pause
    exit /b
)
echo Restoring database from %1...
pg_restore -U %PGUSER% -h %PGHOST% -p %PGPORT% -d %PGDATABASE% -1 -c %1
if errorlevel 1 (
    echo Restore failed.
    pause
    exit /b 1
)
echo Restore completed!
pause
