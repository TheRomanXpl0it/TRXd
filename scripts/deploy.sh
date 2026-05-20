#!/bin/bash

export GIT_HASH=$(git rev-parse HEAD)
docker compose -f ./compose.yml build
docker compose -f ./compose.yml up -d
echo "Git hash: $GIT_HASH"
