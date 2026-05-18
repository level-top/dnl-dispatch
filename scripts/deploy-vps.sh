#!/usr/bin/env bash

set -euo pipefail

REPO_DIR="${REPO_DIR:-/var/www/dnl-dispatch}"
COMPOSE_FILES=(-f docker-compose.yml -f docker-compose.vps.yml)

cd "$REPO_DIR"

git pull --ff-only origin main
docker compose "${COMPOSE_FILES[@]}" up -d --build --remove-orphans
docker compose "${COMPOSE_FILES[@]}" ps
