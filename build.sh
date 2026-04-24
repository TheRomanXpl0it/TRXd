#!/bin/bash

set -eux

export GIT_HASH=$(git rev-parse HEAD)
if ! docker network inspect trxd-shared-internal >/dev/null 2>&1; then
	echo "[!] run scripts/net.sh first"; exit 1
fi
source .env && docker compose -f ./compose.dev.yml build && docker compose -f ./compose.dev.yml down && docker compose -f ./compose.dev.yml up --build -d
echo "Git hash: $GIT_HASH"

docker compose -f ./compose.yml logs -f
