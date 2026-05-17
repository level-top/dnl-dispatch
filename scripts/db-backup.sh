#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-${ROOT_DIR}/backups/daily}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
COMPOSE_FILE="${COMPOSE_FILE:-${ROOT_DIR}/docker-compose.yml}"

mkdir -p "${BACKUP_DIR}"

timestamp="$(date +%F_%H-%M-%S)"
file_name="dnl-backup-${timestamp}.sql.gz"
tmp_path="${BACKUP_DIR}/${file_name}.tmp"
final_path="${BACKUP_DIR}/${file_name}"

docker compose -f "${COMPOSE_FILE}" exec -T db sh -lc 'exec mysqldump --single-transaction --quick --lock-tables=false -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"' | gzip -c > "${tmp_path}"

mv "${tmp_path}" "${final_path}"

find "${BACKUP_DIR}" -type f -name 'dnl-backup-*.sql.gz' -mtime +"${RETENTION_DAYS}" -delete

echo "Backup created: ${final_path}"