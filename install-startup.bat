@echo off
cd /d "%~dp0"

set "APP_DIR=%~dp0"
set "BAT_FILE=%APP_DIR%start-app.bat"
set "STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "LINK=%STARTUP%\Muqdisho Market Prices.lnk"

powershell -NoProfile -Command ^
  "$s=(New-Object -ComObject WScript.Shell).CreateShortcut('%LINK%');" ^
  "$s.TargetPath='%BAT_FILE%';" ^
  "$s.WorkingDirectory='%APP_DIR%';" ^
  "$s.WindowStyle=7;" ^
  "$s.Description='Kici Muqdisho Market Prices marka computer-ka la shido';" ^
  "$s.Save()"

if exist "%LINK%" (
  echo.
  echo  ✓ Waa la rakibay! App-ku wuxuu si toos ah u kici doonaa markaad computer-ka shido.
  echo  Shortcut: %LINK%
  echo.
  echo  Tijaabi hadda: double-click start-app.bat
  echo  Ka saar: install-startup.bat ka hor run uninstall-startup.bat
  echo.
) else (
  echo Rakibid waa fashilantay.
)

pause
