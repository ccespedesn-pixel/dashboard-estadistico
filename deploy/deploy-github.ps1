param(
  [string]$Remote = "",
  [string]$Branch = "gh-pages",
  [ValidateSet("live", "static")] [string]$Modo = "live"
)
$ErrorActionPreference = 'Stop'
$dateStr = Get-Date -Format 'yyyy-MM-dd HH:mm'
$root = Split-Path $PSScriptRoot -Parent
$front = Join-Path $root 'frontend'
$tmp = Join-Path $PSScriptRoot '.deploy'

if ($Modo -eq 'static') {
  Write-Output "1/3 Generando snapshot de datos (requiere servidor en :4000)..."
  Push-Location (Join-Path $root 'backend')
  try { node tools/make-snapshot.mjs } finally { Pop-Location }
  Write-Output "2/3 Compilando version ESTATICA (datos al momento)..."
  Push-Location $front
  try { npm run build:static } finally { Pop-Location }
  $origen = Join-Path $front 'dist-static'
}
else {
  Write-Output "1/3 Compilando version LIVE (datos en vivo via tunel)..."
  Push-Location $front
  try { npm run build:live } finally { Pop-Location }
  $origen = Join-Path $front 'dist-live'
}

$repo = Join-Path $tmp 'repo'
if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }
New-Item -ItemType Directory -Force -Path $repo | Out-Null
Get-ChildItem $origen -Force | Copy-Item -Destination $repo -Recurse -Force

if ($Modo -eq 'live') {
  $tunnelTxt = 'C:\Pogramas y otros 2025\PROGRAMA\cloudflared\tunnel-url.txt'
  $base = ""
  if (Test-Path $tunnelTxt) { $base = (Get-Content $tunnelTxt -Raw).Trim() }
  if ($base -eq "") { $base = (Read-Host "URL actual del tunel (ej: https://algo.trycloudflare.com)") }
  Set-Content -Path (Join-Path $repo 'api-public.json') -Value ('{ "base": "' + $base + '" }') -Encoding ascii
  Write-Output "2/3 api-public.json apuntando a: $base"
}

Push-Location $repo
try {
  git init | Out-Null
  git symbolic-ref HEAD "refs/heads/$Branch"
  git config user.email "dashboards@localhost"
  git config user.name "Dashboard Deploy"
  git add -A
  git commit -m "deploy $Modo $dateStr" | Out-Null
  if ($Remote -eq "") { $Remote = git remote get-url origin; if ($LASTEXITCODE -ne 0) { $Remote = "" } }
  if ($Remote -eq "") { throw "Falta el remote. Uso: .\deploy-github.ps1 -Remote https://github.com/USUARIO/REPO.git" }
  git remote add origin $Remote
  Write-Output "3/3 Subiendo a $Remote (rama $Branch)..."
  git push -f origin HEAD:$Branch
}
finally { Pop-Location }

Write-Output ""
Write-Output "LISTO. GitHub Pages actualizado."
Write-Output "Parte para la misma URL: Settings -> Pages -> Source 'Deploy from a branch' -> $Branch / root (si ya estaba activo, no hay que tocar nada)."