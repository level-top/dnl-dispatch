// src/utils/schema.js
// Lightweight schema introspection with in-memory caching.

const cache = new Map();

async function getTableColumns(pool, tableName) {
  const key = String(tableName);
  if (cache.has(key)) return cache.get(key);

  const [rows] = await pool.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [tableName]
  );

  const columns = new Set(rows.map((r) => r.COLUMN_NAME));
  cache.set(key, columns);
  return columns;
}

async function tableExists(pool, tableName) {
  const cols = await getTableColumns(pool, tableName);
  return cols.size > 0;
}

async function hasColumns(pool, tableName, columnNames) {
  const cols = await getTableColumns(pool, tableName);
  return columnNames.every((c) => cols.has(c));
}

function clearSchemaCache() {
  cache.clear();
}

module.exports = {
  getTableColumns,
  tableExists,
  hasColumns,
  clearSchemaCache,
};
