// src/controllers/agreementsController.js
// Public endpoints for viewing and signing agreements via token link.
const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const puppeteer = require('puppeteer');
const { pool } = require('../db');

function sha256Hex(input) {
  return crypto.createHash('sha256').update(String(input)).digest('hex');
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function mergePlaceholders(html, values) {
  let out = String(html || '');
  for (const [key, rawValue] of Object.entries(values || {})) {
    const safe = escapeHtml(rawValue ?? '');
    const re = new RegExp(`{{\\s*${escapeRegExp(key)}\\s*}}`, 'g');
    out = out.replace(re, safe);
  }
  return out;
}

function defaultAgreementBodyHtml() {
  return `
    <p class="p">This agreement is between <strong>{{company.name}}</strong> (the “Company”) and <strong>{{driver.name}}</strong> (the “Driver”).</p>
    <p class="p">By signing, the Driver agrees to the terms and conditions described in this document.</p>
    <p class="p"><strong>Driver Info</strong></p>
    <ul>
      <li>Name: {{driver.name}}</li>
      <li>MC #: {{driver.mcNumber}}</li>
      <li>Truck Type: {{driver.truckType}}</li>
      <li>Contact: {{driver.contactNumber}}</li>
      <li>Email: {{driver.email}}</li>
      <li>Percentage: {{driver.percentage}}</li>
    </ul>
    <p class="p"><strong>Key points (example):</strong></p>
    <ul>
      <li>Driver will provide transportation services as assigned.</li>
      <li>Driver will maintain valid operating authority, insurance, and required documents.</li>
      <li>Payments, deductions, and settlement terms are governed by Company policy.</li>
      <li>Driver agrees to comply with safety, compliance, and load handling requirements.</li>
    </ul>
  `;
}

function buildAgreementHtml({
  companyName,
  companyLogoUrl,
  companyAddress,
  companyPhone,
  companyEmail,
  driverName,
  driverMcNumber,
  driverTruckType,
  driverContactNumber,
  driverEmail,
  driverPercentage,
  agreementBodyHtml,
  showSignature,
  signerName,
  signatureDataUrl,
  signedAtIso,
}) {
  const safeCompanyName = escapeHtml(companyName || '');
  const safeCompanyLogoUrl = escapeHtml(companyLogoUrl || '');
  const safeDriverName = escapeHtml(driverName || '');
  const safeSignerName = escapeHtml(signerName || '');
  const safeSignedAt = escapeHtml(signedAtIso || '');

  const mergedAgreementBodyHtml = mergePlaceholders(
    agreementBodyHtml || defaultAgreementBodyHtml(),
    {
      'company.name': companyName || '',
      'company.address': companyAddress || '',
      'company.phone': companyPhone || '',
      'company.email': companyEmail || '',
      'driver.name': driverName || '',
      'driver.mcNumber': driverMcNumber || '',
      'driver.mc_number': driverMcNumber || '',
      'driver.truckType': driverTruckType || '',
      'driver.contactNumber': driverContactNumber || '',
      'driver.email': driverEmail || '',
      'driver.percentage': driverPercentage ?? '',
      today: new Date().toISOString().slice(0, 10),
      date: new Date().toISOString().slice(0, 10),
    }
  );

  const signatureBlock = showSignature
    ? `
      <div class="section">
        <h2>Signature</h2>
        <div class="sig-row">
          <div class="sig-box">
            <div class="sig-label">Signature</div>
            ${signatureDataUrl ? `<img class="sig-img" src="${signatureDataUrl}" />` : ''}
          </div>
          <div class="sig-meta">
            <div><strong>Signed Name:</strong> ${safeSignerName || '-'}</div>
            <div><strong>Signed At:</strong> ${safeSignedAt || '-'}</div>
          </div>
        </div>
      </div>
    `
    : '';

  return `
  <!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Driver Agreement</title>
      <style>
        body { font-family: Arial, Helvetica, sans-serif; color: #111827; margin: 0; padding: 24px; }
        .container { max-width: 900px; margin: 0 auto; }
        h1 { font-size: 22px; margin: 0 0 6px 0; }
        .muted { color: #6b7280; font-size: 12px; margin-bottom: 18px; }
        .header { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 10px; }
        .logo { height: 54px; width: auto; object-fit: contain; }
        .company { display: flex; flex-direction: column; gap: 2px; }
        .company-name { font-size: 18px; font-weight: 700; color: #0f172a; }
        .company-meta { font-size: 11px; color: #6b7280; }
        .section { border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px; margin-bottom: 14px; }
        .section h2 { font-size: 14px; margin: 0 0 10px 0; color: #1f2937; }
        .p { font-size: 12.5px; line-height: 1.6; margin: 0 0 10px 0; }
        ul { margin: 8px 0 0 16px; padding: 0; font-size: 12.5px; line-height: 1.6; }
        .sig-row { display: flex; gap: 12px; align-items: flex-start; }
        .sig-box { flex: 1; border: 1px dashed #9ca3af; border-radius: 10px; padding: 10px; min-height: 110px; }
        .sig-label { font-size: 11px; color: #6b7280; margin-bottom: 8px; }
        .sig-img { width: 100%; max-height: 160px; object-fit: contain; }
        .sig-meta { width: 280px; font-size: 12px; color: #111827; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="company">
            <div class="company-name">${safeCompanyName || 'Company'}</div>
            <div class="company-meta">
              ${escapeHtml(companyAddress || '')}${companyAddress ? ' • ' : ''}${escapeHtml(companyPhone || '')}${companyPhone ? ' • ' : ''}${escapeHtml(companyEmail || '')}
            </div>
          </div>
          ${safeCompanyLogoUrl ? `<img class="logo" src="${safeCompanyLogoUrl}" alt="Logo" />` : ''}
        </div>

        <h1>Driver Agreement</h1>
        <div class="muted">Driver: <strong>${safeDriverName || '-'}</strong></div>

        <div class="section">
          <h2>Agreement</h2>
          ${mergedAgreementBodyHtml}
        </div>

        ${signatureBlock}
      </div>
    </body>
  </html>
  `;
}

function parsePngDataUrl(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  const m = dataUrl.match(/^data:image\/(png);base64,(.+)$/i);
  if (!m) return null;
  return Buffer.from(m[2], 'base64');
}

function getClientIp(req) {
  // With cors/open usage, trust Express default. If behind proxy, configure app.set('trust proxy', 1).
  return req.ip;
}

exports.getAgreementByToken = async (req, res) => {
  try {
    const token = req.params.token;
    const tokenHash = sha256Hex(token);

    const [rows] = await pool.query(
      `SELECT a.*, d.name as driverName, d.MC_number as driverMcNumber, d.truckType as driverTruckType, d.contactNumber as driverContactNumber, d.email as driverEmail, d.percentage as driverPercentage
       FROM DriverAgreements a
       JOIN Drivers d ON d.id = a.driverId
       WHERE a.tokenHash = ?
       LIMIT 1`,
      [tokenHash]
    );

    if (rows.length === 0) return res.status(404).json({ error: 'Agreement not found' });

    const agreement = rows[0];

    if (agreement.expiresAt && new Date(agreement.expiresAt).getTime() < Date.now()) {
      return res.status(410).json({ error: 'Agreement link has expired' });
    }

    if (!agreement.viewedAt) {
      await pool.query('UPDATE DriverAgreements SET viewedAt = NOW() WHERE id = ? AND viewedAt IS NULL', [agreement.id]);
    }

    await pool.query(
      `INSERT IGNORE INTO AgreementTemplate (id, companyNameOverride, logoUrlOverride, agreementBodyHtml)
       VALUES (1, NULL, NULL, NULL)`
    );

    const [templateRows] = await pool.query(
      'SELECT companyNameOverride, logoUrlOverride, agreementBodyHtml FROM AgreementTemplate WHERE id = 1 LIMIT 1'
    );
    const template = templateRows[0] || {};

    const [companyRows] = await pool.query(
      'SELECT CompanyName, Address, Phone, Email, LogoURL FROM CompanyDetails ORDER BY CompanyID ASC LIMIT 1'
    );
    const company = companyRows[0] || {};

    const effectiveCompanyName = template.companyNameOverride || company.CompanyName || '';
    const effectiveLogoUrl = template.logoUrlOverride || company.LogoURL || '';

    const html = buildAgreementHtml({
      companyName: effectiveCompanyName,
      companyLogoUrl: effectiveLogoUrl,
      companyAddress: company.Address || '',
      companyPhone: company.Phone || '',
      companyEmail: company.Email || '',
      driverName: agreement.driverName,
      driverMcNumber: agreement.driverMcNumber,
      driverTruckType: agreement.driverTruckType,
      driverContactNumber: agreement.driverContactNumber,
      driverEmail: agreement.driverEmail,
      driverPercentage: agreement.driverPercentage,
      agreementBodyHtml: template.agreementBodyHtml,
      showSignature: agreement.status === 'signed',
      signerName: agreement.signerName,
      signatureDataUrl: null,
      signedAtIso: agreement.signedAt ? new Date(agreement.signedAt).toISOString() : null,
    });

    res.json({
      id: agreement.id,
      driverId: agreement.driverId,
      driverName: agreement.driverName,
      status: agreement.status,
      createdAt: agreement.createdAt,
      expiresAt: agreement.expiresAt,
      signedAt: agreement.signedAt,
      signerName: agreement.signerName,
      signedPdfPath: agreement.signedPdfPath,
      agreementHtml: html,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.signAgreementByToken = async (req, res) => {
  try {
    const token = req.params.token;
    const tokenHash = sha256Hex(token);

    const { signerName, signatureDataUrl } = req.body || {};
    const signaturePng = parsePngDataUrl(signatureDataUrl);

    if (!signerName || typeof signerName !== 'string' || signerName.trim().length < 2) {
      return res.status(400).json({ error: 'Signer name is required' });
    }

    if (!signaturePng) {
      return res.status(400).json({ error: 'Signature is required' });
    }

    const [rows] = await pool.query(
      `SELECT a.*, d.name as driverName, d.MC_number as driverMcNumber, d.truckType as driverTruckType, d.contactNumber as driverContactNumber, d.email as driverEmail, d.percentage as driverPercentage
       FROM DriverAgreements a
       JOIN Drivers d ON d.id = a.driverId
       WHERE a.tokenHash = ?
       LIMIT 1`,
      [tokenHash]
    );

    if (rows.length === 0) return res.status(404).json({ error: 'Agreement not found' });

    const agreement = rows[0];

    if (agreement.expiresAt && new Date(agreement.expiresAt).getTime() < Date.now()) {
      return res.status(410).json({ error: 'Agreement link has expired' });
    }

    if (agreement.status === 'signed') {
      return res.status(409).json({ error: 'Agreement already signed' });
    }

    const agreementDirFs = path.join(__dirname, '..', '..', 'uploads', 'agreements', String(agreement.id));
    await fs.mkdir(agreementDirFs, { recursive: true });

    const signatureFs = path.join(agreementDirFs, 'signature.png');
    await fs.writeFile(signatureFs, signaturePng);

    const signaturePath = `/uploads/agreements/${agreement.id}/signature.png`;

    await pool.query(
      `INSERT IGNORE INTO AgreementTemplate (id, companyNameOverride, logoUrlOverride, agreementBodyHtml)
       VALUES (1, NULL, NULL, NULL)`
    );

    const [templateRows] = await pool.query(
      'SELECT companyNameOverride, logoUrlOverride, agreementBodyHtml FROM AgreementTemplate WHERE id = 1 LIMIT 1'
    );
    const template = templateRows[0] || {};

    const [companyRows] = await pool.query(
      'SELECT CompanyName, Address, Phone, Email, LogoURL FROM CompanyDetails ORDER BY CompanyID ASC LIMIT 1'
    );
    const company = companyRows[0] || {};

    const effectiveCompanyName = template.companyNameOverride || company.CompanyName || '';
    const effectiveLogoUrl = template.logoUrlOverride || company.LogoURL || '';

    const signedAt = new Date();
    const html = buildAgreementHtml({
      companyName: effectiveCompanyName,
      companyLogoUrl: effectiveLogoUrl,
      companyAddress: company.Address || '',
      companyPhone: company.Phone || '',
      companyEmail: company.Email || '',
      driverName: agreement.driverName,
      driverMcNumber: agreement.driverMcNumber,
      driverTruckType: agreement.driverTruckType,
      driverContactNumber: agreement.driverContactNumber,
      driverEmail: agreement.driverEmail,
      driverPercentage: agreement.driverPercentage,
      agreementBodyHtml: template.agreementBodyHtml,
      showSignature: true,
      signerName: signerName.trim(),
      signatureDataUrl,
      signedAtIso: signedAt.toISOString(),
    });

    const browser = await puppeteer.launch();
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });

      const pdfFs = path.join(agreementDirFs, 'signed.pdf');
      await fs.writeFile(pdfFs, pdfBuffer);

      const signedPdfPath = `/uploads/agreements/${agreement.id}/signed.pdf`;

      await pool.query(
        `UPDATE DriverAgreements
         SET status='signed', signedAt=NOW(), signerName=?, signerIp=?, signerUserAgent=?, signatureImagePath=?, signedPdfPath=?
         WHERE id = ?`,
        [
          signerName.trim(),
          getClientIp(req),
          String(req.headers['user-agent'] || '').slice(0, 512),
          signaturePath,
          signedPdfPath,
          agreement.id,
        ]
      );

      res.json({
        message: 'Agreement signed',
        id: agreement.id,
        driverId: agreement.driverId,
        signedAt: signedAt.toISOString(),
        signedPdfPath,
      });
    } finally {
      await browser.close();
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
