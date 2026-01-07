// src/controllers/settlementsController.js
// Weekly settlement invoicing (commission-based) for drivers.

const { pool } = require('../db');
const { tableExists, hasColumns } = require('../utils/schema');
const { getActorUserId, tryInsertAudit } = require('../utils/audit');

function yyyymmdd(dateStr) {
  return String(dateStr).replace(/-/g, '');
}

function round2(value) {
  const n = Number(value) || 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function computeCommissionAmount(baseAmount, ratePercent) {
  const base = Number(baseAmount) || 0;
  const rate = Number(ratePercent) || 0;
  return round2((base * rate) / 100);
}

exports.createWeeklyDriverInvoice = async (req, res) => {
  const connection = await pool.getConnection();
  const performedByUserId = getActorUserId(req);

  try {
    const {
      driverId,
      companyId,
      periodStart,
      periodEnd,
      commissionBase = 'gross',
      invoiceNumber,
      dueDate,
      notes,
    } = req.body;

    if (!driverId || !companyId || !periodStart || !periodEnd) {
      return res.status(400).json({
        error: 'driverId, companyId, periodStart, and periodEnd are required (YYYY-MM-DD).',
      });
    }

    const [driverRows] = await connection.query('SELECT id, name, percentage FROM Drivers WHERE id = ?', [driverId]);
    if (driverRows.length === 0) return res.status(404).json({ error: 'Driver not found' });

    const driver = driverRows[0];
    const commissionRate = Number(driver.percentage) || 0;

    // Select delivered loads in the period that are not yet invoiced (unpaid).
    // NOTE: Uses dropOff_dateTime (exists today). When you add Loads.delivered_at, you can switch to that.
    const [loads] = await connection.query(
      `SELECT id, loadAmount, netAmount, loadStatus, payment_status, dropOff_dateTime, dateTime
       FROM Loads
       WHERE driverName = ?
         AND LOWER(loadStatus) = 'delivered'
         AND payment_status = 'unpaid'
         AND COALESCE(dropOff_dateTime, dateTime) >= ?
         AND COALESCE(dropOff_dateTime, dateTime) < DATE_ADD(?, INTERVAL 1 DAY)`,
      [driverId, periodStart, periodEnd]
    );

    if (loads.length === 0) {
      return res.status(409).json({
        error: 'No eligible delivered loads found for this driver in the selected period.',
      });
    }

    const items = loads.map((l) => {
      const baseAmount =
        String(commissionBase).toLowerCase() === 'net'
          ? (l.netAmount ?? l.loadAmount)
          : l.loadAmount;

      const commissionAmount = computeCommissionAmount(baseAmount, commissionRate);

      return {
        loadId: l.id,
        loadAmount: Number(l.loadAmount) || 0,
        commissionRate,
        commissionBase: String(commissionBase).toLowerCase() === 'net' ? 'net' : 'gross',
        commissionAmount,
      };
    });

    const totalAmount = round2(items.reduce((acc, it) => acc + (Number(it.commissionAmount) || 0), 0));

    const finalInvoiceNumber =
      invoiceNumber || `DRV${driverId}-${yyyymmdd(periodStart)}-${yyyymmdd(periodEnd)}`;

    await connection.beginTransaction();

    const invoiceColumns = ['DriverID', 'InvoiceNumber', 'InvoiceDate', 'TotalAmount', 'InvoiceStatus', 'companyId', 'Commission'];
    const invoiceValues = [
      driverId,
      finalInvoiceNumber,
      new Date().toISOString().split('T')[0],
      totalAmount,
      'Pending',
      companyId,
      Math.trunc(commissionRate),
    ];

    // Optional columns (only if present)
    if (await hasColumns(connection, 'Invoices', ['PeriodStart'])) {
      invoiceColumns.push('PeriodStart');
      invoiceValues.push(periodStart);
    }
    if (await hasColumns(connection, 'Invoices', ['PeriodEnd'])) {
      invoiceColumns.push('PeriodEnd');
      invoiceValues.push(periodEnd);
    }
    if (dueDate && (await hasColumns(connection, 'Invoices', ['DueDate']))) {
      invoiceColumns.push('DueDate');
      invoiceValues.push(dueDate);
    }
    if (notes && (await hasColumns(connection, 'Invoices', ['Notes']))) {
      invoiceColumns.push('Notes');
      invoiceValues.push(notes);
    }

    const placeholders = invoiceColumns.map(() => '?').join(', ');

    const [invoiceResult] = await connection.query(
      `INSERT INTO Invoices (${invoiceColumns.join(', ')}) VALUES (${placeholders})`,
      invoiceValues
    );

    const invoiceId = invoiceResult.insertId;

    const loadIds = items.map((it) => it.loadId);
    const loadPlaceholders = loadIds.map(() => '?').join(',');

    await connection.query(
      `UPDATE Loads
       SET payment_status = 'invoiced', invoice_number = ?
       WHERE id IN (${loadPlaceholders}) AND payment_status = 'unpaid'`,
      [String(invoiceId), ...loadIds]
    );

    // Best-effort insert into InvoiceLoads table if present.
    if (await tableExists(connection, 'InvoiceLoads')) {
      for (const it of items) {
        await connection.query(
          `INSERT INTO InvoiceLoads (InvoiceID, LoadID, LoadAmount, CommissionRate, CommissionBase, CommissionAmount)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [invoiceId, it.loadId, it.loadAmount, it.commissionRate, it.commissionBase, it.commissionAmount]
        );
      }
    }

    await connection.commit();

    await tryInsertAudit(pool, {
      entityType: 'Invoice',
      entityId: invoiceId,
      action: 'CREATE_WEEKLY',
      performedByUserId,
      beforeJson: null,
      afterJson: JSON.stringify({ driverId, companyId, periodStart, periodEnd, commissionRate, totalAmount, loadIds }),
    });

    res.status(201).json({
      InvoiceID: invoiceId,
      InvoiceNumber: finalInvoiceNumber,
      DriverID: driverId,
      companyId,
      InvoiceStatus: 'Pending',
      TotalAmount: totalAmount,
      CommissionRate: commissionRate,
      PeriodStart: periodStart,
      PeriodEnd: periodEnd,
      items,
    });
  } catch (err) {
    try {
      await connection.rollback();
    } catch {}

    res.status(500).json({
      error: err.message,
      hint: 'If you just added schema_upgrade_weekly_settlement.sql, import it into MySQL and restart the server.',
    });
  } finally {
    connection.release();
  }
};
