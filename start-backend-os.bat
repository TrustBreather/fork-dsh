@echo off
setlocal

set "BACKEND_ROOT=C:\Users\NCO\OneDrive\Desktop\New folder (22)\backend-os-kernel-integrated"
if not exist "%BACKEND_ROOT%\start_backend.bat" (
  echo ERROR: BackendOS launcher not found:
  echo %BACKEND_ROOT%\start_backend.bat
  pause
  exit /b 1
)

start "BackendOS" cmd /k call "%BACKEND_ROOT%\start_backend.bat"
endlocal
