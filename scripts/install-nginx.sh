#!/bin/bash
set -euo pipefail
echo "=== Установка nginx + certbot для lethalline.ru ==="
sudo apt-get update
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y nginx certbot python3-certbot-nginx
sudo ufw allow OpenSSH || true
sudo ufw allow 80/tcp || true
sudo ufw allow 443/tcp || true
nginx -v
certbot --version
echo INSTALL_OK > /tmp/ll-install-ok
echo
echo "Готово. Можно закрыть это окно."
read -r -p "Нажмите Enter..."
