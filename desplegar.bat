@echo off
REM ===== Despliegue completo del Dashboard de Seguridad Ciudadana =====
setlocal

set ROOT=%~dp0
cd /d "%ROOT%"

echo [1/4] Deteniendo servidores previos en el puerto 4000...
for /f "tokens=5" %%p in ('netstat -ano ^| findstr :4000 ^| findstr LISTENING') do taskkill /PID %%p /F >nul 2>&1

echo [2/4] Compilando el frontend...
cd /d "%ROOT%frontend"
call npm run build >nul 2>&1
if errorlevel 1 ( echo ERROR: fallo el build del frontend & exit /b 1 )

echo [3/4] Verificando catálogo (no se borran los datos cargados)...
cd /d "%ROOT%backend"

echo [4/4] Arrancando el servidor...
start "" cmd /c "node src\server.js"

echo.
echo ============================================================
echo  Dashboard SEGURIDAD CIUDADANA disponible en:
echo      http://localhost:4000
echo ============================================================
start http://localhost:4000
endlocal