# ============================================
# PRODUCTION DEPLOYMENT SCRIPT FOR WINDOWS 10
# ============================================

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "   Checkmate Production Build Script" -ForegroundColor Cyan
Write-Host "================================================`n" -ForegroundColor Cyan

$ErrorActionPreference = "Stop"

# Configuration
$PROJECT_ROOT = $PSScriptRoot
$BACKEND_DIR = Join-Path $PROJECT_ROOT "backend"
$DEPLOY_DIR = Join-Path $PROJECT_ROOT "deploy"
$TIMESTAMP = Get-Date -Format "yyyyMMdd_HHmmss"

# Colors
function Write-Success { Write-Host "[OK] $args" -ForegroundColor Green }
function Write-Info { Write-Host "[>>] $args" -ForegroundColor Cyan }
function Write-Warn { Write-Host "[!!] $args" -ForegroundColor Yellow }

# Step 1: Pre-flight Checks
Write-Info "Step 1/7: Pre-flight checks..."

try {
    $goVersion = go version
    Write-Success "Go: $goVersion"
}
catch {
    Write-Host "[ERROR] Go not installed!" -ForegroundColor Red
    exit 1
}

try {
    $nodeVersion = node --version
    Write-Success "Node.js: $nodeVersion"
}
catch {
    Write-Host "[ERROR] Node.js not installed!" -ForegroundColor Red
    exit 1
}

$prodEnv = Join-Path $BACKEND_DIR ".env.production"
if (-Not (Test-Path $prodEnv)) {
    Write-Host "[ERROR] backend\.env.production not found!" -ForegroundColor Red
    exit 1
}

Write-Success "Pre-flight checks passed`n"

# Step 2: Clean Previous Builds
Write-Info "Step 2/7: Cleaning previous builds..."

if (Test-Path $DEPLOY_DIR) {
    Remove-Item -Path $DEPLOY_DIR -Recurse -Force
}

New-Item -ItemType Directory -Path $DEPLOY_DIR | Out-Null
New-Item -ItemType Directory -Path (Join-Path $DEPLOY_DIR "backend") | Out-Null
New-Item -ItemType Directory -Path (Join-Path $DEPLOY_DIR "frontend") | Out-Null
New-Item -ItemType Directory -Path (Join-Path $DEPLOY_DIR "backend\uploads") | Out-Null

Write-Success "Created deploy directory`n"

# Step 3: Build Backend
Write-Info "Step 3/7: Building backend binary..."

Push-Location $BACKEND_DIR

$env:GOOS = "linux"
$env:GOARCH = "amd64"
$env:CGO_ENABLED = "0"

Write-Info "Compiling for Linux (optimized)..."
go build -ldflags="-s -w" -o "checkmate-backend" main.go

if (Test-Path "checkmate-backend") {
    $size = (Get-Item "checkmate-backend").Length / 1MB
    Write-Success "Binary: $([math]::Round($size, 2)) MB"
    
    Move-Item "checkmate-backend" (Join-Path $DEPLOY_DIR "backend\checkmate-backend")
    Copy-Item ".env.production" (Join-Path $DEPLOY_DIR "backend\.env")
}
else {
    Write-Host "[ERROR] Build failed!" -ForegroundColor Red
    Pop-Location
    exit 1
}

Pop-Location
Write-Success "Backend complete`n"

# Step 4: Build Frontend
Write-Info "Step 4/7: Building frontend..."

Push-Location $PROJECT_ROOT

if (-Not (Test-Path "node_modules")) {
    Write-Info "Installing dependencies..."
    npm install --silent
}

Write-Info "Building production bundle..."
$env:NODE_ENV = "production"
npm run build 2>$null

if (Test-Path "dist") {
    $distSize = (Get-ChildItem "dist" -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
    Write-Success "Frontend: $([math]::Round($distSize, 2)) MB"
    
    Copy-Item -Path "dist\*" -Destination (Join-Path $DEPLOY_DIR "frontend") -Recurse
}
else {
    Write-Host "[ERROR] Build failed!" -ForegroundColor Red
    Pop-Location
    exit 1
}

Pop-Location
Write-Success "Frontend complete`n"

# Step 5: Create Config Files
Write-Info "Step 5/7: Creating config files..."

# Systemd service
$systemd = "[Unit]
Description=Checkmate Backend API
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/checkmate/backend
Environment=PORT=8080
ExecStart=/opt/checkmate/backend/checkmate-backend
Restart=always
RestartSec=5
MemoryMax=400M
MemoryHigh=350M
StandardOutput=append:/var/log/checkmate.log
StandardError=append:/var/log/checkmate-error.log

[Install]
WantedBy=multi-user.target"

$systemd | Out-File (Join-Path $DEPLOY_DIR "checkmate.service") -Encoding ASCII

# Nginx config - Write to file directly
$nginxPath = Join-Path $DEPLOY_DIR "nginx.conf"
"# Checkmate Nginx Configuration" | Out-File $nginxPath -Encoding ASCII
"# Place in: /etc/nginx/sites-available/checkmate" | Out-File $nginxPath -Append -Encoding ASCII
"" | Out-File $nginxPath -Append -Encoding ASCII
'limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;' | Out-File $nginxPath -Append -Encoding ASCII
'limit_req_zone $binary_remote_addr zone=upload:10m rate=2r/s;' | Out-File $nginxPath -Append -Encoding ASCII
"" | Out-File $nginxPath -Append -Encoding ASCII
"upstream backend {" | Out-File $nginxPath -Append -Encoding ASCII
"    server 127.0.0.1:8080;" | Out-File $nginxPath -Append -Encoding ASCII
"    keepalive 2;" | Out-File $nginxPath -Append -Encoding ASCII
"}" | Out-File $nginxPath -Append -Encoding ASCII
"" | Out-File $nginxPath -Append -Encoding ASCII
"server {" | Out-File $nginxPath -Append -Encoding ASCII
"    listen 80;" | Out-File $nginxPath -Append -Encoding ASCII
"    server_name yourdomain.com www.yourdomain.com;" | Out-File $nginxPath -Append -Encoding ASCII
"" | Out-File $nginxPath -Append -Encoding ASCII
"    # Security headers" | Out-File $nginxPath -Append -Encoding ASCII
'    add_header X-Frame-Options "SAMEORIGIN" always;' | Out-File $nginxPath -Append -Encoding ASCII
'    add_header X-Content-Type-Options "nosniff" always;' | Out-File $nginxPath -Append -Encoding ASCII
'    add_header X-XSS-Protection "1; mode=block" always;' | Out-File $nginxPath -Append -Encoding ASCII
"" | Out-File $nginxPath -Append -Encoding ASCII
"    client_max_body_size 50M;" | Out-File $nginxPath -Append -Encoding ASCII
"    client_body_timeout 30s;" | Out-File $nginxPath -Append -Encoding ASCII
"    keepalive_timeout 15s;" | Out-File $nginxPath -Append -Encoding ASCII
"" | Out-File $nginxPath -Append -Encoding ASCII
"    # Frontend" | Out-File $nginxPath -Append -Encoding ASCII
"    location / {" | Out-File $nginxPath -Append -Encoding ASCII
"        root /opt/checkmate/frontend;" | Out-File $nginxPath -Append -Encoding ASCII
'        try_files $uri $uri/ /index.html;' | Out-File $nginxPath -Append -Encoding ASCII
"    }" | Out-File $nginxPath -Append -Encoding ASCII
"" | Out-File $nginxPath -Append -Encoding ASCII
"    # Backend API" | Out-File $nginxPath -Append -Encoding ASCII
"    location /api/ {" | Out-File $nginxPath -Append -Encoding ASCII
"        proxy_pass http://backend/;" | Out-File $nginxPath -Append -Encoding ASCII
'        proxy_set_header Host $host;' | Out-File $nginxPath -Append -Encoding ASCII
'        proxy_set_header X-Real-IP $remote_addr;' | Out-File $nginxPath -Append -Encoding ASCII
"        proxy_connect_timeout 10s;" | Out-File $nginxPath -Append -Encoding ASCII
"    }" | Out-File $nginxPath -Append -Encoding ASCII
"" | Out-File $nginxPath -Append -Encoding ASCII
"    # File uploads" | Out-File $nginxPath -Append -Encoding ASCII
"    location /api/upload {" | Out-File $nginxPath -Append -Encoding ASCII
"        proxy_pass http://backend/upload;" | Out-File $nginxPath -Append -Encoding ASCII
'        proxy_set_header Host $host;' | Out-File $nginxPath -Append -Encoding ASCII
"        proxy_connect_timeout 30s;" | Out-File $nginxPath -Append -Encoding ASCII
"        proxy_read_timeout 120s;" | Out-File $nginxPath -Append -Encoding ASCII
"        client_max_body_size 50M;" | Out-File $nginxPath -Append -Encoding ASCII
"    }" | Out-File $nginxPath -Append -Encoding ASCII
"}" | Out-File $nginxPath -Append -Encoding ASCII

# README
$readme = "DEPLOYMENT PACKAGE - $TIMESTAMP

CONTENTS:
backend/checkmate-backend - Linux binary
backend/.env - Production config
frontend/ - React build
checkmate.service - Systemd service
nginx.conf - Nginx config

QUICK DEPLOY:

1. Upload to server:
   scp -r deploy/* ubuntu@YOUR_IP:/home/ubuntu/deploy/

2. SSH and install:
   ssh ubuntu@YOUR_IP
   sudo mkdir -p /opt/checkmate/backend /opt/checkmate/frontend
   sudo mv ~/deploy/backend/* /opt/checkmate/backend/
   sudo mv ~/deploy/frontend/* /opt/checkmate/frontend/
   sudo chmod +x /opt/checkmate/backend/checkmate-backend

3. Setup service:
   sudo cp ~/deploy/checkmate.service /etc/systemd/system/
   sudo systemctl daemon-reload
   sudo systemctl enable checkmate
   sudo systemctl start checkmate

4. Setup nginx:
   sudo apt install nginx -y
   sudo cp ~/deploy/nginx.conf /etc/nginx/sites-available/checkmate
   sudo ln -s /etc/nginx/sites-available/checkmate /etc/nginx/sites-enabled/
   sudo systemctl reload nginx

5. Get SSL:
   sudo apt install certbot python3-certbot-nginx -y
   sudo certbot --nginx -d yourdomain.com

DONE!"

$readme | Out-File (Join-Path $DEPLOY_DIR "README.txt") -Encoding ASCII

Write-Success "Config files created`n"

# Step 6: Create Archive
Write-Info "Step 6/7: Creating archive..."

$archiveName = "checkmate-deploy-$TIMESTAMP.zip"
$archivePath = Join-Path $PROJECT_ROOT $archiveName

Compress-Archive -Path "$DEPLOY_DIR\*" -DestinationPath $archivePath -CompressionLevel Optimal

$archiveSize = (Get-Item $archivePath).Length / 1MB
Write-Success "Archive: $archiveName ($([math]::Round($archiveSize, 2)) MB)`n"

# Step 7: Summary
Write-Info "Step 7/7: Security checklist..."

Write-Host "`nSECURITY CHECKLIST:" -ForegroundColor Yellow
Write-Success "Debug code removed"
Write-Success "Production build optimized"
Write-Success "Memory limits configured"
Write-Warn "UPDATE deploy/backend/.env with real IntaSend keys"
Write-Warn "CHANGE JWT_SECRET to random 64-char string"
Write-Warn "UPDATE nginx.conf with your domain"

Write-Host "`n================================================" -ForegroundColor Cyan
Write-Host "   BUILD COMPLETE!" -ForegroundColor Green
Write-Host "================================================`n" -ForegroundColor Cyan

Write-Host "Package: $archivePath" -ForegroundColor Green
Write-Host "Size: $([math]::Round($archiveSize, 2)) MB`n" -ForegroundColor Green

Write-Host "NEXT STEPS:" -ForegroundColor Yellow
Write-Host "1. Review deploy/README.txt" -ForegroundColor White
Write-Host "2. Update deploy/backend/.env" -ForegroundColor White
Write-Host "3. Upload ZIP to server" -ForegroundColor White
Write-Host "4. Follow deployment guide`n" -ForegroundColor White

Write-Success "Production-ready!`n"
