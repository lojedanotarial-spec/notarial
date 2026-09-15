#!/bin/bash
set -e

# Runbook para instalar OnlyOffice Document Server en la VM Oracle
# Correr esto POR SSH en la VM recien creada, no en la compu local.
#
# Uso:
#   1. ssh -i ~/.ssh/oracle_onlyoffice ubuntu@<IP_PUBLICA>
#   2. Copiar este script a la VM (scp) o pegarlo directo
#   3. bash setup_onlyoffice_oracle.sh

echo "=== Actualizando sistema ==="
sudo apt-get update -y || echo "apt-get update tuvo warnings no criticos (ej. mirror desincronizado en iconos AppStream), continuando"
sudo apt-get upgrade -y || echo "apt-get upgrade tuvo warnings no criticos, continuando"

echo "=== Configurando swap (4GB, pedido oficial de OnlyOffice Docs) ==="
if [ ! -f /swapfile ]; then
  sudo fallocate -l 4G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
  sudo sysctl vm.swappiness=10
  echo "vm.swappiness=10" | sudo tee -a /etc/sysctl.conf
else
  echo "swapfile ya existe, salteando"
fi
free -h

echo "=== Instalando Docker ==="
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

echo "=== Firewall local (iptables) ==="
POLICY=$(sudo iptables -L INPUT | head -1)
echo "Politica actual INPUT: $POLICY"
if echo "$POLICY" | grep -q "ACCEPT"; then
  echo "Politica default ya es ACCEPT (comun en Clouding/proveedores que filtran a nivel de plataforma, no de SO) -- no hace falta agregar reglas locales."
else
  echo "Politica default NO es ACCEPT -- agregando reglas explicitas para 80/443"
  sudo iptables -I INPUT 1 -m state --state NEW -p tcp --dport 80 -j ACCEPT
  sudo iptables -I INPUT 1 -m state --state NEW -p tcp --dport 443 -j ACCEPT
  sudo netfilter-persistent save || true
fi
echo "RECORDATORIO: en proveedores con firewall a nivel de plataforma (Clouding, Oracle Security Lists, etc.) hay que abrir 80/443/22 tambien ahi, esto de arriba no alcanza solo."

echo "=== Levantando OnlyOffice Document Server ==="
# JWT_ENABLED=false: el frontend de Notarial (OnlyOfficeEditor.jsx/oo-callback.js) no firma
# requests con token -- imagenes recientes de onlyoffice/documentserver traen JWT activado
# por default (a diferencia de la version vieja que corria en GCP), lo que rompe la carga
# del editor con errorCode -20 "token con formato incorrecto" si no se desactiva.
# TODO backlog: implementar JWT real (generar secreto + firmar en oo-callback.js y en el
# armado de la config del documento) en vez de desactivarlo -- ver PROYECTO.md.
sudo docker run -i -t -d -p 80:80 -p 443:443 \
  -e JWT_ENABLED=false \
  --restart=always \
  --name onlyoffice-documentserver \
  onlyoffice/documentserver

echo "=== Listo. Verificar con: ==="
echo "curl -s -o /dev/null -w '%{http_code}\n' http://localhost/healthcheck"
echo ""
echo "RECORDATORIO MANUAL (fuera de este script):"
echo "1. En la consola Oracle: Networking -> tu VCN -> Security Lists -> agregar Ingress Rules para 80 y 443 (0.0.0.0/0)"
echo "2. Reservar la IP publica como estatica (Networking -> IP Management)"
echo "3. Actualizar el DNS en Cloudflare: onlyoffice.notarial.lat -> nueva IP"
echo "4. Verificar VITE_ONLYOFFICE_URL en Vercel sigue apuntando a https://onlyoffice.notarial.lat (no cambia, solo el DNS por detras)"
