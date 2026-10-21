@echo off
setlocal
cd /d "%~dp0"

if not defined BACKEND_OS_ROOT set "BACKEND_OS_ROOT=%~dp0..\backend-os-kernel-integrated"
for %%I in ("%BACKEND_OS_ROOT%") do set "BACKEND_ROOT=%%~fI"
if not exist "%BACKEND_ROOT%\start_backend.bat" (
  echo ERROR: BackendOS launcher not found:
  echo %BACKEND_ROOT%\start_backend.bat
  pause
  exit /b 1
)

start "BackendOS" cmd /k call "%BACKEND_ROOT%\start_backend.bat"
endlocal
