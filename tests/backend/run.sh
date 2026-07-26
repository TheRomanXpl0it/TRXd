#!/bin/bash

set -e

files=(
	usermode_hot_switch.py
	register_team_race.py
	submit_race.py
	instance_types.py
	instance_edge_cases.py
	instance_create_race.py
	instance_create_race_team.py
	instance_lifetimes.py
	registry.py
	registry_auth.py
	discord_webhook.py
)

cd ../../backend/
docker network create trxd-shared-external-test
(timeout 10 ./trxd || true) 2>&1 | grep -q "multiple networks with the same name"
docker network rm -f trxd-shared-external-test
cd -

for file in "${files[@]}"; do
	echo "Running Test: $file"

	cd ../../backend/
	if [[ $file == *"lifetime"* ]]; then
		echo "Using short reclaim interval for lifetime test"
		RECLAIM_INSTANCE_INTERVAL=1 ALLOW_REGISTER=true ./trxd -test-data-WARNING-DO-NOT-USE-IN-PRODUCTION
	else
		ALLOW_REGISTER=true ./trxd -test-data-WARNING-DO-NOT-USE-IN-PRODUCTION
	fi
	./trxd &
	PID=$!

	cd -
	python3 $file

	cd -
	kill $PID
	wait $PID || true
	cd -
done
