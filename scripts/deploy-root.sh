#!/bin/bash
set -euo pipefail

echo "=== Деплой lethalline.ru (нужен пароль sudo) ==="

sudo apt-get update
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y nginx certbot python3-certbot-nginx

# Firewall (если ufw активен)
sudo ufw allow OpenSSH || true
sudo ufw allow 'Nginx Full' || true
sudo ufw allow 80/tcp || true
sudo ufw allow 443/tcp || true

# Nginx site
sudo cp /home/lethalline/LethalLine/deploy/nginx-lethalline.ru.conf /etc/nginx/sites-available/lethalline.ru
sudo ln -sfn /etc/nginx/sites-available/lethalline.ru /etc/nginx/sites-enabled/lethalline.ru
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl enable nginx
sudo systemctl restart nginx

# systemd app
sudo cp /home/lethalline/LethalLine/deploy/lethalline.service /etc/systemd/system/lethalline.service
sudo systemctl daemon-reload
sudo systemctl enable lethalline
sudo systemctl restart lethalline

sleep 2
systemctl is-active lethalline
systemctl is-active nginx

# TLS — требует проброс 80/443 на эту VM
echo "=== Выпуск сертификата Let's Encrypt ==="
sudo certbot --nginx -d lethalline.ru -d www.lethalline.ru --non-interactive --agree-tos --register-unsafely-without-email --redirect || {
  echo "CERTBOT_FAILED: проверь проброс портов 80/443 на 192.168.0.105"
  echo CERTBOT_FAILED > /tmp/ll-deploy-status
  exit 1
}

echo DEPLOY_OK > /tmp/ll-deploy-status
echo
echo "Готово: https://lethalline.ru"
read -r -p "Нажмите Enter, чтобы закрыть..."
