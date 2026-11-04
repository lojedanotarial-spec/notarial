#!/usr/bin/env bash
# Instala OnlyOffice Docs en un VPS limpio de Contabo (Ubuntu 24.04/26.04).
# Uso: ssh -i ~/.ssh/notarial_oo root@<IP> 'bash -s' < scripts/setup_onlyoffice_contabo.sh
#
# Decisiones (ver conversacion 2026-11-03, ADR de consolidacion de plataformas):
# - Version FIJA de la imagen: nunca ":latest". Un re-deploy no puede saltar de version solo.
# - --network host: el contenedor escucha directo en el host, asi UFW filtra de verdad.
#   (Con "-p 80:80" Docker inserta reglas de iptables ANTES de UFW y el firewall no aplica.)
# - Solo Cloudflare puede llegar a 80/443. SSH abierto, pero solo con clave.
# - JWT_ENABLED=false por ahora: el frontend todavia no firma tokens. Se activa en el
#   cutover a produccion (BACKLOG: "JWT real para OnlyOffice").
# - Swap de 4 GB y logs de Docker acotados para que nunca se llene el disco.
set -euo pipefail

OO_IMAGE="onlyoffice/documentserver:10.0.0.1"
PUBKEY_MARK="notarial-oo-20261103"
export DEBIAN_FRONTEND=noninteractive

echo "== 1/7 Paquetes base"
apt-get update -q
apt-get -y -q upgrade
apt-get install -y -q ca-certificates curl ufw unattended-upgrades

echo "== 2/7 Swap 4 GB"
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 4G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi
echo 'vm.swappiness=10' > /etc/sysctl.d/99-notarial.conf
sysctl -q --system

echo "== 3/7 Docker (repo oficial)"
if ! command -v docker >/dev/null; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -q
  apt-get install -y -q docker-ce docker-ce-cli containerd.io
fi
cat > /etc/docker/daemon.json <<'EOF'
{ "log-driver": "json-file", "log-opts": { "max-size": "10m", "max-file": "3" } }
EOF
systemctl restart docker

echo "== 4/7 Firewall: 22 abierto, 80/443 solo desde Cloudflare"
ufw --force reset >/dev/null
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
for ip in $(curl -fsSL https://www.cloudflare.com/ips-v4) $(curl -fsSL https://www.cloudflare.com/ips-v6); do
  ufw allow proto tcp from "$ip" to any port 80,443 >/dev/null
done
ufw --force enable
ufw status | head -5

echo "== 5/7 SSH solo con clave"
if grep -q "$PUBKEY_MARK" /root/.ssh/authorized_keys 2>/dev/null; then
  cat > /etc/ssh/sshd_config.d/10-notarial.conf <<'EOF'
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin prohibit-password
EOF
  systemctl reload ssh
  echo "login por contrasena desactivado"
else
  echo "ATENCION: la clave $PUBKEY_MARK no esta en authorized_keys; NO se desactiva la contrasena"
fi

echo "== 6/7 OnlyOffice $OO_IMAGE"
docker pull -q "$OO_IMAGE"
docker rm -f onlyoffice >/dev/null 2>&1 || true
mkdir -p /app/onlyoffice/{logs,data,lib}
# Sin certificados: el origen sirve HTTP (80) sin redirigir. Cloudflare (via el Worker oo-proxy)
# entra al origen por el puerto 80; si el origen redirige 80->443 queda en bucle de 301.
# El UFW deja pasar 80/443 solo desde IPs de Cloudflare.
docker run -d --name onlyoffice --restart=always --network host \
  -e JWT_ENABLED=false \
  -v /app/onlyoffice/logs:/var/log/onlyoffice \
  -v /app/onlyoffice/data:/var/www/onlyoffice/Data \
  -v /app/onlyoffice/lib:/var/lib/onlyoffice \
  "$OO_IMAGE"

echo "== 7/7 Esperando healthcheck (hasta 5 min)"
for i in $(seq 1 30); do
  if [ "$(curl -s --max-time 5 http://localhost/healthcheck)" = "true" ]; then
    echo "OnlyOffice listo (intento $i)"
    free -h | head -2
    docker exec onlyoffice cat /var/www/onlyoffice/documentserver/server/Common/config/local.json 2>/dev/null \
      | grep -o '"browser": *{[^}]*}' | head -1 || true
    exit 0
  fi
  sleep 10
done
echo "OnlyOffice no respondio en 5 minutos"; docker logs --tail 50 onlyoffice; exit 1
