// src/utils/audit.js
// Best-effort audit logging. No auth is enforced here; callers may pass a user id.

function getActorUserId(req) {
  const header = req.header && req.header('x-user-id');
  const fromHeader = header ? Number(header) : undefined;
  const fromBody = req?.body?.performedByUserId ?? req?.body?.userId;
  const parsedBody = fromBody !== undefined ? Number(fromBody) : undefined;
  const candidate = Number.isFinite(fromHeader) ? fromHeader : parsedBody;
  return Number.isFinite(candidate) ? candidate : null;
}

async function tryInsertAudit(pool, entry) {
  try {
    await pool.query(
      `INSERT INTO AuditLog (EntityType, EntityID, Action, PerformedByUserID, BeforeJSON, AfterJSON)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        entry.entityType,
        String(entry.entityId),
        entry.action,
        entry.performedByUserId,
        entry.beforeJson,
        entry.afterJson,
      ]
    );
  } catch (err) {
    // Ignore if table/columns don't exist yet.
    if (err?.code === 'ER_NO_SUCH_TABLE' || err?.code === 'ER_BAD_FIELD_ERROR') return;
  }
}

module.exports = {
  getActorUserId,
  tryInsertAudit,
};
