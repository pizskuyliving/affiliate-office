#!/usr/bin/env bash
# Pasang Affiliate Office di VPS (Ubuntu 24.04). Jalankan: sudo bash deploy/pasang.sh <user-yang-login-claude>
set -euo pipefail
PENGGUNA="${1:?pakai: sudo bash deploy/pasang.sh <user>}"
DIR=/opt/affiliate-office

apt-get update -y
apt-get install -y ffmpeg python3 python3-pil python3-numpy fonts-inter fonts-noto-color-emoji

if [ ! -d "$DIR/.git" ]; then
  git clone https://github.com/pizskuyliving/affiliate-office "$DIR"
fi
mkdir -p "$DIR/data"
[ -f "$DIR/.env" ] || cp "$DIR/.env.contoh" "$DIR/.env"
chown -R "$PENGGUNA":"$PENGGUNA" "$DIR"

sed "s/^User=USER/User=$PENGGUNA/" "$DIR/deploy/affiliate-office.service" > /etc/systemd/system/affiliate-office.service
install -m 755 "$DIR/deploy/affiliate-update" /usr/local/bin/affiliate-update
systemctl daemon-reload
systemctl enable --now affiliate-office
systemctl --no-pager status affiliate-office | head -5
echo "Selesai. Dashboard di http://127.0.0.1:3100 (buka lewat Caddy, lihat deploy/Caddyfile.contoh)."
