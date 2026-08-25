#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Laptop Finder — one-shot deploy on a FREE always-on Ubuntu VM
# (Oracle Cloud Always Free VM  recommended · Google Cloud e2-micro also works)
#
#   1. Create the free VM (Ubuntu 22.04/24.04, any region)
#   2. ssh into it and run:  bash -c "$(curl -fsSL <this script>)"
#      or:  git clone the repo, then:  bash scripts/deploy-vm.sh
#
# Result: site + 24/7 live price monitor on http://<vm-ip>:8080
# (Optionally put Caddy/nginx in front + a domain + free TLS afterwards.)
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/laptop-finder}"
PORT="${PORT:-8080}"
REPO="${1:-https://github.com/manavmehta2500/Laptop-Finder.git}"
BRANCH="${BRANCH:-main}"

export DEBIAN_FRONTEND=noninteractive

echo "==> system dependencies"
sudo apt-get update -y
sudo apt-get install -y curl ca-certificates git ufw

echo "==> Node 22"
if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
node --version

echo "==> code ($BRANCH)"
if [ ! -d "$APP_DIR/.git" ]; then
  sudo git clone --branch "$BRANCH" "$REPO" "$APP_DIR"
else
  sudo git -C "$APP_DIR" fetch origin "$BRANCH"
  sudo git -C "$APP_DIR" reset --hard "origin/$BRANCH"
fi
cd "$APP_DIR"
sudo npm ci

echo "==> Chromium for the real-browser scraper"
sudo npx playwright install --with-deps chromium

echo "==> build site"
sudo npm run build

echo "==> systemd service (always-on monitor, scrapes every 5 min)"
sudo tee /etc/systemd/system/laptop-finder.service >/dev/null <<EOF
[Unit]
Description=Laptop Finder (site + 24/7 price monitor)
After=network-online.target
Wants=network-online.target

[Service]
WorkingDirectory=$APP_DIR
Environment=PORT=$PORT
Environment=PLAYWRIGHT=1
Environment=SCRAPE_INTERVAL_MS=300000
# Optional upgrades — uncomment & fill in:
# Environment=BESTBUY_CLIENT_ID=your-free-bestbuy-api-key
ExecStart=/usr/bin/node server/index.mjs
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
sudo systemctl daemon-reload
sudo systemctl enable --now laptop-finder
sleep 3
sudo systemctl is-active laptop-finder && echo "service: running"

echo "==> firewall"
sudo ufw allow 22/tcp >/dev/null
sudo ufw allow "$PORT/tcp" >/dev/null
sudo ufw --force enable >/dev/null || true

IP=$(hostname -I | awk '{print $1}')
echo
echo "✅ Deployed & running 24/7:  http://$IP:$PORT"
echo
echo "   · monitor scrapes every 5 minutes, prices update live (SSE)"
echo "   · for a domain + free HTTPS: install Caddy (caddy.server.com) pointing at 127.0.0.1:$PORT"
