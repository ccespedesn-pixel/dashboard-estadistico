#!/usr/bin/env bash
set -euo pipefail

echo "=== Setup del dashboard en VPS (Oracle Cloud Ubuntu, 64-bit ARM) ==="
echo "Ejecuta este script como usuario ubuntu (sin sudo):"
echo "  bash ~/setup-vps.sh"

echo "1) Actualizar sistema"
sudo apt-get update -y
sudo apt-get install -y curl git unzip ca-certificates

echo "2) Instalar Node.js 24 (incluye node:sqlite que usa el backend)"
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
fi
sudo apt-get install -y nodejs
node --version

echo "3) Instalar pm2 (mantiene el servidor vivo y lo reanuda al reiniciar)"
sudo npm i -g pm2@latest

echo "4) Instalar cloudflared (tunel Cloudflare)"
if ! command -v cloudflared >/dev/null 2>&1; then
  sudo mkdir -p --mode=0755 /usr/share/keyrings
  curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | sudo tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null
  echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared any main" | sudo tee /etc/apt/sources.list.d/cloudflared.list
  sudo apt-get update -y
  sudo apt-get install -y cloudflared
fi
cloudflared --version

echo "5) Colocar el proyecto: sube primero la carpeta con WinSCP a /home/ubuntu/proyecto"
echo "   EXCLUYE backend/node_modules (ahi se vuelve a instalar); INCLUYE backend/data/dashboard.db"
if [ -d /home/ubuntu/proyecto/backend ]; then
  cd /home/ubuntu/proyecto/backend
  npm install --omit=dev
fi

echo "6) Levantar el servidor con pm2"
cd /home/ubuntu/proyecto/backend
pm2 start src/server.js --name dashboard
pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu

echo "7) Abrir el acceso publico: abre el puerto 4000 en Oracle (Security List) o usa el tunel:"
echo "   Opcion A (URL temporal):"
echo "     cloudflared tunnel --url http://localhost:4000 --logfile /home/ubuntu/cloudflared.log"
echo "   Opcion B (URL permanente, se mantiene igual):"
echo "     Paso 1: inicias sesion en dash.cloudflare.com con tu cuenta"
echo "     Paso 2: 'Zero Trust' -> Networks -> Tunnels -> Create a tunnel -> 'cloudflared'"
echo "     Paso 3: te da un comando como:  cloudflared tunnel login"
echo "     Paso 4: crea el tunel: cloudflared tunnel create dashboard"
echo "     Paso 5: luego se configura el ingress en /etc/netplan o un service systemd"

echo "=== FIN. Corre 'pm2 status' para verificar. ==="