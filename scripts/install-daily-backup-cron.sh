#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CRON_SCHEDULE="${CRON_SCHEDULE:-0 2 * * *}"
LOG_FILE="${ROOT_DIR}/backups/backup.log"
COMMAND="cd ${ROOT_DIR} && BACKUP_RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30} bash ${ROOT_DIR}/scripts/db-backup.sh >> ${LOG_FILE} 2>&1"

mkdir -p "${ROOT_DIR}/backups/daily"

existing="$(crontab -l 2>/dev/null || true)"
filtered="$(printf '%s\n' "${existing}" | grep -Fv "${ROOT_DIR}/scripts/db-backup.sh" || true)"

printf '%s\n%s %s\n' "${filtered}" "${CRON_SCHEDULE}" "${COMMAND}" | crontab -

echo "Installed daily backup cron job: ${CRON_SCHEDULE}"
echo "Command: ${COMMAND}"