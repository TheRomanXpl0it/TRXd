#!/bin/sh

set -eu

REPO_ROOT="$(realpath "$(dirname "$0")/..")"
COMPOSE_FILE="$REPO_ROOT/compose.yml"
PROJECT_NAME="${PROJECT_NAME:-trxd}"
NETWORK_NAME="${PROJECT_NAME}_internal"

get_dservice_ip() {
	service="$1"
	container_id="$(docker compose -f "$COMPOSE_FILE" ps -q "$service")"

	if [ -z "$container_id" ]; then
		echo "service '$service' is not running" >&2
		exit 1
	fi

	ip_address="$(docker inspect -f "{{with index .NetworkSettings.Networks \"$NETWORK_NAME\"}}{{.IPAddress}}{{end}}" "$container_id")"

	if [ -z "$ip_address" ]; then
		echo "service '$service' is not attached to network '$NETWORK_NAME'" >&2
		exit 1
	fi

	printf '%s\n' "$ip_address"
}

printf 'POSTGRES_HOST=%s\n' "$(get_dservice_ip postgres)"
printf 'REDIS_HOST=%s\n' "$(get_dservice_ip redis)"
