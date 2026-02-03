// src/utils/access.js
const { normalizeRole } = require('../middleware/auth');

async function canAccessDriver(pool, user, driverId) {
  const role = normalizeRole(user?.role);
  const uid = Number(user?.id);
  const did = Number(driverId);
  if (!Number.isFinite(did)) return false;

  if (role === 'admin') return true;

  if (role === 'sales') {
    const [rows] = await pool.query('SELECT id FROM Drivers WHERE id = ? AND sales_agent_id = ? LIMIT 1', [did, uid]);
    return rows.length > 0;
  }

  if (role === 'dispatcher') {
    const [rows] = await pool.query(
      'SELECT driverId FROM DispatcherDriverAssignments WHERE dispatcherId = ? AND driverId = ? LIMIT 1',
      [uid, did]
    );
    return rows.length > 0;
  }

  return false;
}

async function canAccessLoad(pool, user, loadId) {
  const role = normalizeRole(user?.role);
  const uid = Number(user?.id);
  const lid = Number(loadId);
  if (!Number.isFinite(lid)) return false;

  if (role === 'admin') return true;

  if (role === 'dispatcher') {
    // Allow loads directly assigned to dispatcher OR loads whose driver is assigned to dispatcher
    const [rows] = await pool.query(
      `SELECT l.id
       FROM Loads l
       WHERE l.id = ?
         AND (
           l.dispatcherId = ?
           OR l.driverName IN (SELECT driverId FROM DispatcherDriverAssignments WHERE dispatcherId = ?)
         )
       LIMIT 1`,
      [lid, uid, uid]
    );
    return rows.length > 0;
  }

  if (role === 'sales') {
    const [rows] = await pool.query(
      `SELECT l.id
       FROM Loads l
       JOIN Drivers d ON d.id = l.driverName
       WHERE l.id = ? AND d.sales_agent_id = ?
       LIMIT 1`,
      [lid, uid]
    );
    return rows.length > 0;
  }

  return false;
}

module.exports = {
  canAccessDriver,
  canAccessLoad,
  canAccessInvoice,
};

async function canAccessInvoice(pool, user, invoiceId) {
  const role = normalizeRole(user?.role);
  const uid = Number(user?.id);
  const iid = Number(invoiceId);
  if (!Number.isFinite(iid)) return false;

  if (role === 'admin') return true;

  if (role === 'sales') {
    const [rows] = await pool.query(
      `SELECT i.InvoiceID
       FROM Invoices i
       JOIN Drivers d ON d.id = i.DriverID
       WHERE i.InvoiceID = ? AND d.sales_agent_id = ?
       LIMIT 1`,
      [iid, uid]
    );
    return rows.length > 0;
  }

  if (role === 'dispatcher') {
    const [rows] = await pool.query(
      `SELECT i.InvoiceID
       FROM Invoices i
       JOIN Drivers d ON d.id = i.DriverID
       JOIN DispatcherDriverAssignments dda
         ON dda.driverId = d.id AND dda.dispatcherId = ?
       WHERE i.InvoiceID = ?
       LIMIT 1`,
      [uid, iid]
    );
    return rows.length > 0;
  }

  return false;
}
