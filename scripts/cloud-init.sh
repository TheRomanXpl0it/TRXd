#!/bin/bash

### TRX CTF 2026 gcp startup script ###
set -Eeuo pipefail

## logger
exec > >(tee -a /var/log/startup.log) 2>&1

# Add aliases here for the ctf user if needed
CTF_ALIASES=(
  "alias ll='ls -la'"
  "alias c='clear'"
  "alias py='python3'"
  "alias up='docker compose up'"
  "alias upd='docker compose up -d'"
  "alias down='docker compose down'"
  "alias build='docker compose build'"
  "alias logs='docker compose logs'"
)

echo "==> Installing prerequisite packages"
apt-get update
apt-get install -y ca-certificates curl git sudo btop tar unzip # add more packages as needed

echo "==> Configuring Docker apt repository"
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc

cat >/etc/apt/sources.list.d/docker.sources <<EOF
Types: deb
URIs: https://download.docker.com/linux/debian
Suites: $(. /etc/os-release && echo "${VERSION_CODENAME}")
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF

echo "==> Installing Docker Engine"
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker

echo "==> Installing ctop"
curl -fsSL https://github.com/bcicen/ctop/releases/download/v0.7.7/ctop-0.7.7-linux-amd64 -o /usr/local/bin/ctop
chmod 0755 /usr/local/bin/ctop

echo "==> Installing lazydocker"
tmpdir="$(mktemp -d)"
curl -fsSL https://github.com/jesseduffield/lazydocker/releases/download/v0.25.2/lazydocker_0.25.2_Linux_x86_64.tar.gz -o "${tmpdir}/lazydocker.tar.gz"
tar -xzf "${tmpdir}/lazydocker.tar.gz" -C "${tmpdir}"
install -m 0755 "${tmpdir}/lazydocker" /usr/local/bin/lazydocker
rm -rf "${tmpdir}"

echo "==> Ensuring local groups"
getent group infra >/dev/null || groupadd infra
getent group docker >/dev/null || groupadd docker

echo "==> Configuring ctf user"
usermod -aG docker ctf
usermod -s /bin/bash ctf

echo "==> Configuring ctf bash aliases"
CTF_HOME="$(getent passwd ctf | cut -d: -f6)"
touch "${CTF_HOME}/.bashrc" "${CTF_HOME}/.bash_aliases"

grep -qxF '[[ -f ~/.bash_aliases ]] && source ~/.bash_aliases' "${CTF_HOME}/.bashrc" || \
  echo '[[ -f ~/.bash_aliases ]] && source ~/.bash_aliases' >> "${CTF_HOME}/.bashrc"

for alias_line in "${CTF_ALIASES[@]}"; do
  grep -qxF "${alias_line}" "${CTF_HOME}/.bash_aliases" || echo "${alias_line}" >> "${CTF_HOME}/.bash_aliases"
done

chown ctf:ctf "${CTF_HOME}/.bashrc" "${CTF_HOME}/.bash_aliases"