#!/bin/bash
set -euo pipefail
echo "=== Повторный выпуск SSL (Let's Encrypt) ==="
sudo certbot --nginx -d lethalline.ru -d www.lethalline.ru --non-interactive --agree-tos --register-unsafely-without-email --redirect
echo CERTBOT_OK > /tmp/ll-deploy-status
echo Готово.
read -r -p "Enter..."
