#!/bin/bash
set -e
echo "Restarting lethalline..."
sudo systemctl daemon-reload
sudo systemctl kill -s SIGKILL lethalline || true
sudo systemctl reset-failed lethalline || true
sudo systemctl start lethalline
sleep 2
systemctl is-active lethalline
echo RESTART_OK > /tmp/ll-restart-ok
read -r -p "Enter to close..."
