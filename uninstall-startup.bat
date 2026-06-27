@echo off
set "LINK=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\Muqdisho Market Prices.lnk"

if exist "%LINK%" (
  del "%LINK%"
  echo Shortcut-ka startup waa laga saaray.
) else (
  echo Startup shortcut ma jiro.
)

pause
