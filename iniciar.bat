@echo off
cd /d "%~dp0backend"
echo Iniciando el dashboard de Seguridad Ciudadana...
echo Abriendo navegador en http://localhost:4000
start http://localhost:4000
node src/server.js
