// src/controllers/invoicesController.js
// Controller for Invoices CRUD and Transactional Operations
const { pool } = require('../db');
const { tableExists, hasColumns } = require('../utils/schema');
const { getActorUserId, tryInsertAudit } = require('../utils/audit');

function round2(value) {
  const n = Number(value) || 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function computeCommissionAmount(baseAmount, ratePercent) {
  const base = Number(baseAmount) || 0;
  const rate = Number(ratePercent) || 0;
  return round2((base * rate) / 100);
}

// Generate unique invoice number
const generateInvoiceNumber = () => {
  const timestamp = Date.now();
  return `INV-${timestamp}`;
};

// Get all invoices
exports.getAllInvoices = async (req, res) => {
  try {
    const hasPayments = await tableExists(pool, 'InvoicePayments');

    const sql = hasPayments
      ? `SELECT i.*, d.name as driverName, c.CompanyName,
           IFNULL(p.TotalPaid, 0) AS TotalPaid,
           GREATEST(0, (IFNULL(i.TotalAmount, 0) - IFNULL(p.TotalPaid, 0))) AS Balance
         FROM Invoices i
         JOIN Drivers d ON i.DriverID = d.id
         JOIN CompanyDetails c ON i.companyId = c.CompanyID
         LEFT JOIN (
           SELECT InvoiceID, SUM(Amount) AS TotalPaid
           FROM InvoicePayments
           GROUP BY InvoiceID
         ) p ON p.InvoiceID = i.InvoiceID`
      : `SELECT i.*, d.name as driverName, c.CompanyName
         FROM Invoices i
         JOIN Drivers d ON i.DriverID = d.id
         JOIN CompanyDetails c ON i.companyId = c.CompanyID`;

    const [rows] = await pool.query(sql);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get invoice by ID
exports.getInvoiceById = async (req, res) => {
  try {
    const hasPayments = await tableExists(pool, 'InvoicePayments');

    const sql = hasPayments
      ? `SELECT i.*, d.name as driverName, c.CompanyName,
           IFNULL(p.TotalPaid, 0) AS TotalPaid,
           GREATEST(0, (IFNULL(i.TotalAmount, 0) - IFNULL(p.TotalPaid, 0))) AS Balance
         FROM Invoices i
         JOIN Drivers d ON i.DriverID = d.id
         JOIN CompanyDetails c ON i.companyId = c.CompanyID
         LEFT JOIN (
           SELECT InvoiceID, SUM(Amount) AS TotalPaid
           FROM InvoicePayments
           GROUP BY InvoiceID
         ) p ON p.InvoiceID = i.InvoiceID
         WHERE i.InvoiceID = ?`
      : `SELECT i.*, d.name as driverName, c.CompanyName
         FROM Invoices i
         JOIN Drivers d ON i.DriverID = d.id
         JOIN CompanyDetails c ON i.companyId = c.CompanyID
         WHERE i.InvoiceID = ?`;

    const [rows] = await pool.query(sql, [req.params.invoiceId]);
    if (rows.length === 0) return res.status(404).json({ error: 'Invoice not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get all invoices for a specific driver
exports.getInvoicesByDriver = async (req, res) => {
  try {
    const driverId = req.params.driverId;
    const hasPayments = await tableExists(pool, 'InvoicePayments');

    const sql = hasPayments
      ? `SELECT i.*, d.name as driverName, c.CompanyName,
           IFNULL(p.TotalPaid, 0) AS TotalPaid,
           GREATEST(0, (IFNULL(i.TotalAmount, 0) - IFNULL(p.TotalPaid, 0))) AS Balance
         FROM Invoices i
         JOIN Drivers d ON i.DriverID = d.id
         JOIN CompanyDetails c ON i.companyId = c.CompanyID
         LEFT JOIN (
           SELECT InvoiceID, SUM(Amount) AS TotalPaid
           FROM InvoicePayments
           GROUP BY InvoiceID
         ) p ON p.InvoiceID = i.InvoiceID
         WHERE i.DriverID = ?`
      : `SELECT i.*, d.name as driverName, c.CompanyName
         FROM Invoices i
         JOIN Drivers d ON i.DriverID = d.id
         JOIN CompanyDetails c ON i.companyId = c.CompanyID
         WHERE i.DriverID = ?`;

    const [rows] = await pool.query(sql, [driverId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create invoice with transactional logic
// Transactional Steps:
// 1. Get total amount from user
// 2. Create new invoice with provided data
// 3. Update selected loads: set paymentStatus to 'Invoiced' and assign InvoiceNumber
// 4. Return invoice details
exports.createInvoice = async (req, res) => {
  const connection = await pool.getConnection();
  const performedByUserId = getActorUserId(req);
  try {
    const { driverId, selectedLoadIds, companyId, invoiceNumber, commission, totalAmount } = req.body;
    console.log(selectedLoadIds);
    if (!driverId || !companyId) {
      return res.status(400).json({ error: 'driverId and companyId are required' });
    }

    // Start transaction
    await connection.beginTransaction();

    // Create new invoice with user-provided totalAmount
    const finalInvoiceNumber = invoiceNumber || generateInvoiceNumber();
    // console.log('Final Invoice Number:', finalInvoiceNumber);
    const invoiceDate = new Date().toISOString().split('T')[0];
    // If totalAmount isn't provided, auto-calculate from selected loads using driver's percentage.
    let finalTotalAmount = totalAmount;
    let commissionValue = commission;

    if (finalTotalAmount === undefined || finalTotalAmount === null) {
      if (!selectedLoadIds || selectedLoadIds.length === 0) {
        return res.status(400).json({
          error: 'totalAmount is required unless selectedLoadIds are provided for auto-calculation',
        });
      }

      const [driverRows] = await connection.query('SELECT percentage FROM Drivers WHERE id = ?', [driverId]);
      const driverPercentage = Number(driverRows?.[0]?.percentage) || 0;
      commissionValue = commissionValue ?? Math.trunc(driverPercentage);

      const placeholders = selectedLoadIds.map(() => '?').join(',');
      const [loadRows] = await connection.query(
        `SELECT id, loadAmount, netAmount FROM Loads WHERE id IN (${placeholders})`,
        selectedLoadIds
      );

      const computed = loadRows.map((l) => computeCommissionAmount(l.loadAmount, driverPercentage));
      finalTotalAmount = round2(computed.reduce((acc, n) => acc + (Number(n) || 0), 0));
    }

    commissionValue = commissionValue || 0;

    const [invoiceResult] = await connection.query(
      'INSERT INTO Invoices (DriverID, InvoiceNumber, InvoiceDate, TotalAmount, InvoiceStatus, companyId, Commission) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [driverId, finalInvoiceNumber, invoiceDate, finalTotalAmount, 'Pending', companyId, commissionValue]
    );
    // console.log('Invoice Insert Result:', invoiceResult);
    const invoiceId = invoiceResult.insertId;
    console.log('Created Invoice ID:', invoiceId);
    // Update selected loads if provided - batch update in single query
    if (selectedLoadIds && selectedLoadIds.length > 0) {
      const placeholders = selectedLoadIds.map(() => '?').join(',');
      const [updateResult] = await connection.query(
        `UPDATE Loads SET payment_status = 'invoiced', invoice_number = ? WHERE id IN (${placeholders}) AND payment_status = 'unpaid'`,
        [String(invoiceId), ...selectedLoadIds]
      );
      console.log(updateResult);

      // Best-effort line items for auditability (requires schema upgrade)
      if (await tableExists(connection, 'InvoiceLoads')) {
        const [driverRows] = await connection.query('SELECT percentage FROM Drivers WHERE id = ?', [driverId]);
        const driverPercentage = Number(driverRows?.[0]?.percentage) || 0;
        const [loadRows] = await connection.query(
          `SELECT id, loadAmount, netAmount FROM Loads WHERE id IN (${placeholders})`,
          selectedLoadIds
        );
        for (const l of loadRows) {
          const commissionAmount = computeCommissionAmount(l.loadAmount, driverPercentage);
          await connection.query(
            `INSERT INTO InvoiceLoads (InvoiceID, LoadID, LoadAmount, CommissionRate, CommissionBase, CommissionAmount)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [invoiceId, l.id, Number(l.loadAmount) || 0, driverPercentage, 'gross', commissionAmount]
          );
        }
      }
    }

    // Commit transaction
    await connection.commit();

    await tryInsertAudit(pool, {
      entityType: 'Invoice',
      entityId: invoiceId,
      action: 'CREATE',
      performedByUserId,
      beforeJson: null,
      afterJson: JSON.stringify({ driverId, companyId, invoiceId, selectedLoadIds, totalAmount: finalTotalAmount }),
    });

    res.status(201).json({
      InvoiceID: invoiceId,
      InvoiceNumber: finalInvoiceNumber,
      DriverID: driverId,
      TotalAmount: finalTotalAmount,
      Commission: commissionValue,
      InvoiceStatus: 'Pending',
      InvoiceDate: invoiceDate,
      companyId: companyId
    });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
};

// Get loads linked to an invoice
exports.getLoadsForInvoice = async (req, res) => {
  try {
    const invoiceId = req.params.invoiceId;
    const [rows] = await pool.query(
      'SELECT * FROM Loads WHERE invoice_number = ?',
      [String(invoiceId)]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get payments for an invoice (if schema upgrade is applied)
exports.getPaymentsForInvoice = async (req, res) => {
  try {
    const invoiceId = req.params.invoiceId;
    const exists = await tableExists(pool, 'InvoicePayments');
    if (!exists) return res.json([]);

    const [rows] = await pool.query(
      'SELECT * FROM InvoicePayments WHERE InvoiceID = ? ORDER BY PaidAt DESC',
      [invoiceId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get recent audit entries for an invoice (best-effort)
exports.getAuditForInvoice = async (req, res) => {
  try {
    const invoiceId = req.params.invoiceId;
    const exists = await tableExists(pool, 'AuditLog');
    if (!exists) return res.json([]);

    const [rows] = await pool.query(
      `SELECT AuditID, EntityType, EntityID, Action, PerformedByUserID, PerformedAt, BeforeJSON, AfterJSON
       FROM AuditLog
       WHERE EntityType = 'Invoice' AND EntityID = ?
       ORDER BY PerformedAt DESC
       LIMIT 10`,
      [String(invoiceId)]
    );
    res.json(rows);
  } catch (err) {
    // If table/columns don't exist yet, return empty list
    if (err?.code === 'ER_NO_SUCH_TABLE' || err?.code === 'ER_BAD_FIELD_ERROR') return res.json([]);
    res.status(500).json({ error: err.message });
  }
};

// Update invoice
exports.updateInvoice = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const invoiceId = req.params.invoiceId;
    const { InvoiceNumber, InvoiceDate, TotalAmount, InvoiceStatus, PaymentDate } = req.body;

    // Start transaction
    await connection.beginTransaction();

    // Get current invoice to check its status
    const [currentInvoice] = await connection.query(
      'SELECT InvoiceNumber, InvoiceStatus FROM Invoices WHERE InvoiceID = ?',
      [invoiceId]
    );

    if (currentInvoice.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const previousStatus = currentInvoice[0].InvoiceStatus;
    const previousInvoiceNumber = currentInvoice[0].InvoiceNumber;

    // Update invoice
    const [result] = await connection.query(
      'UPDATE Invoices SET InvoiceNumber=?, InvoiceDate=?, TotalAmount=?, InvoiceStatus=?, PaymentDate=? WHERE InvoiceID=?',
      [InvoiceNumber || previousInvoiceNumber, InvoiceDate, TotalAmount, InvoiceStatus || previousStatus, PaymentDate, invoiceId]
    );

    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Update load statuses based on invoice status change - batch update in single query
    if (InvoiceStatus && InvoiceStatus !== previousStatus) {
      let loadStatus = '';
      
      if (InvoiceStatus === 'Paid') {
        loadStatus = 'paid';
      } else if (InvoiceStatus === 'Pending') {
        loadStatus = 'invoiced';
      } else if (InvoiceStatus === 'Cancelled') {
        loadStatus = 'unpaid';
      }

      if (loadStatus) {
        await connection.query(
          'UPDATE Loads SET payment_status = ? WHERE invoice_number = ?',
          [loadStatus, invoiceId]
        );
      }
    }

    // Commit transaction
    await connection.commit();

    res.json({ message: 'Invoice updated successfully', InvoiceID: invoiceId });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
};

// Record a payment (transactional)
// Inserts a payment record (if InvoicePayments exists), then updates invoice status:
// - Pending: paid total = 0
// - Partial: 0 < paid total < TotalAmount
// - Paid: paid total >= TotalAmount
exports.payInvoice = async (req, res) => {
  const connection = await pool.getConnection();
  const performedByUserId = getActorUserId(req);
  try {
    const invoiceId = req.params.invoiceId;
    const paymentDate = new Date().toISOString().split('T')[0];
    const paymentAmount = req.body?.amount; // optional

    let responseStatus = 'Paid';
    let responseTotalPaid = null;
    let responseBalance = null;
    let responseInvoiceTotal = null;
    let responsePayment = null;

    // Start transaction
    await connection.beginTransaction();

    // Ensure invoice exists and get total
    const [invRows] = await connection.query(
      'SELECT TotalAmount FROM Invoices WHERE InvoiceID = ?',
      [invoiceId]
    );
    if (invRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const invoiceTotal = Number(invRows?.[0]?.TotalAmount) || 0;
    responseInvoiceTotal = invoiceTotal;

    // If payments table doesn't exist, fall back to old behavior (mark paid).
    const hasPaymentsTable = await tableExists(connection, 'InvoicePayments');
    if (!hasPaymentsTable) {
      await connection.query(
        'UPDATE Invoices SET InvoiceStatus = ?, PaymentDate = ? WHERE InvoiceID = ?',
        ['Paid', paymentDate, invoiceId]
      );
      await connection.query(
        'UPDATE Loads SET payment_status = ? WHERE invoice_number = ?',
        ['paid', invoiceId]
      );

      responseStatus = 'Paid';
      responseTotalPaid = invoiceTotal;
      responseBalance = 0;
    } else {
      // Insert payment record
      let amountToRecord = Number(paymentAmount);
      if (!Number.isFinite(amountToRecord)) amountToRecord = invoiceTotal;
      if (!Number.isFinite(amountToRecord) || amountToRecord <= 0) {
        await connection.rollback();
        return res.status(400).json({ error: 'Payment amount must be a positive number' });
      }

      const [paymentInsert] = await connection.query(
        'INSERT INTO InvoicePayments (InvoiceID, Amount, Method, Reference, Notes) VALUES (?, ?, ?, ?, ?)',
        [
          invoiceId,
          amountToRecord,
          req.body?.method || null,
          req.body?.reference || null,
          req.body?.notes || null,
        ]
      );

      const paymentId = paymentInsert?.insertId;
      if (paymentId) {
        const [paymentRows] = await connection.query(
          'SELECT PaymentID, InvoiceID, Amount, PaidAt, Method, Reference, Notes FROM InvoicePayments WHERE PaymentID = ?',
          [paymentId]
        );
        responsePayment = paymentRows?.[0] || null;
      }

      // Compute total paid so far
      const [sumRows] = await connection.query(
        'SELECT COALESCE(SUM(Amount), 0) AS totalPaid FROM InvoicePayments WHERE InvoiceID = ?',
        [invoiceId]
      );
      const totalPaid = Number(sumRows?.[0]?.totalPaid) || 0;

      responseTotalPaid = totalPaid;
      responseBalance = Math.max(0, invoiceTotal - totalPaid);

      // Determine status
      let nextStatus = 'Pending';
      if (totalPaid > 0 && totalPaid + 1e-9 < invoiceTotal) nextStatus = 'Partial';
      if (totalPaid + 1e-9 >= invoiceTotal) nextStatus = 'Paid';

      responseStatus = nextStatus;

      await connection.query(
        'UPDATE Invoices SET InvoiceStatus = ?, PaymentDate = ? WHERE InvoiceID = ?',
        [nextStatus, nextStatus === 'Paid' ? paymentDate : null, invoiceId]
      );

      // Loads only become paid when invoice is fully paid
      await connection.query(
        'UPDATE Loads SET payment_status = ? WHERE invoice_number = ?',
        [nextStatus === 'Paid' ? 'paid' : 'invoiced', invoiceId]
      );
    }

    // Commit transaction
    await connection.commit();

    await tryInsertAudit(pool, {
      entityType: 'Invoice',
      entityId: invoiceId,
      action: 'PAY',
      performedByUserId,
      beforeJson: null,
      afterJson: JSON.stringify({
        invoiceId,
        paymentDate,
        amount: paymentAmount,
        method: req.body?.method || null,
        invoiceTotal: responseInvoiceTotal,
        totalPaid: responseTotalPaid,
        balance: responseBalance,
        status: responseStatus,
      }),
    });

    res.json({
      message: 'Payment recorded',
      InvoiceID: invoiceId,
      InvoiceStatus: responseStatus,
      InvoiceTotal: responseInvoiceTotal,
      TotalPaid: responseTotalPaid,
      Balance: responseBalance,
      PaymentDate: responseStatus === 'Paid' ? paymentDate : null,
      Payment: responsePayment,
    });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
};

// Undo invoice payment (transactional)
// Reverts invoice status back to 'Pending', clears PaymentDate, deletes payment records (if table exists)
// and sets associated loads back to 'invoiced'.
exports.undoPayInvoice = async (req, res) => {
  const connection = await pool.getConnection();
  const performedByUserId = getActorUserId(req);
  try {
    const invoiceId = req.params.invoiceId;
    const reason = req?.body?.reason;

    await connection.beginTransaction();

    const [invRows] = await connection.query(
      'SELECT InvoiceStatus, PaymentDate FROM Invoices WHERE InvoiceID = ?',
      [invoiceId]
    );
    if (invRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const before = invRows[0];

    if (!reason || !String(reason).trim()) {
      await connection.rollback();
      return res.status(400).json({ error: 'Undo reason is required' });
    }

    // Delete payment records if schema upgrade is applied
    if (await tableExists(connection, 'InvoicePayments')) {
      await connection.query('DELETE FROM InvoicePayments WHERE InvoiceID = ?', [invoiceId]);
    }

    // Revert invoice
    const [result] = await connection.query(
      'UPDATE Invoices SET InvoiceStatus = ?, PaymentDate = NULL WHERE InvoiceID = ?',
      ['Pending', invoiceId]
    );
    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Revert associated loads back to 'invoiced'
    await connection.query(
      'UPDATE Loads SET payment_status = ? WHERE invoice_number = ?',
      ['invoiced', invoiceId]
    );

    await connection.commit();

    await tryInsertAudit(pool, {
      entityType: 'Invoice',
      entityId: invoiceId,
      action: 'UNDO_PAY',
      performedByUserId,
      beforeJson: JSON.stringify(before),
      afterJson: JSON.stringify({ InvoiceStatus: 'Pending', PaymentDate: null, reason: String(reason).trim() }),
    });

    res.json({ message: 'Invoice payment undone', InvoiceID: invoiceId });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
};

// Delete invoice (transactional)
// Resets associated loads payment_status back to 'Unpaid' when invoice is deleted
exports.deleteInvoice = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const invoiceId = req.params.invoiceId;

    // Start transaction
    await connection.beginTransaction();

    // Delete invoice
    const [result] = await connection.query(
      'DELETE FROM Invoices WHERE InvoiceID = ?',
      [invoiceId]
    );

    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Reset associated loads payment_status back to 'Unpaid' and clear InvoiceID - batch update in single query
    await connection.query(
      'UPDATE Loads SET payment_status = ?, invoice_number = NULL WHERE invoice_number = ?',
      ['unpaid', invoiceId]
    );

    // Commit transaction
    await connection.commit();

    res.json({ message: 'Invoice deleted' });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
};
