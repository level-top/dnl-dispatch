// src/controllers/agreementTemplateController.js
const { pool } = require('../db');

function normalizeRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    companyNameOverride: row.companyNameOverride ?? null,
    logoUrlOverride: row.logoUrlOverride ?? null,
    agreementBodyHtml: row.agreementBodyHtml ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function ensureTemplateRow() {
  await pool.query(
    `INSERT IGNORE INTO AgreementTemplate (id, companyNameOverride, logoUrlOverride, agreementBodyHtml)
     VALUES (1, NULL, NULL, NULL)`
  );
}

exports.getAgreementTemplate = async (req, res) => {
  try {
    await ensureTemplateRow();

    const [templateRows] = await pool.query(
      'SELECT id, companyNameOverride, logoUrlOverride, agreementBodyHtml, createdAt, updatedAt FROM AgreementTemplate WHERE id = 1 LIMIT 1'
    );

    const [companyRows] = await pool.query(
      'SELECT CompanyID, CompanyName, Address, Phone, Email, LogoURL FROM CompanyDetails ORDER BY CompanyID DESC LIMIT 1'
    );

    res.json({
      template: normalizeRow(templateRows[0] || null),
      company: companyRows[0] || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateAgreementTemplate = async (req, res) => {
  try {
    const { companyNameOverride, logoUrlOverride, agreementBodyHtml } = req.body || {};

    const safeCompanyName =
      companyNameOverride === null || companyNameOverride === undefined || String(companyNameOverride).trim() === ''
        ? null
        : String(companyNameOverride).trim().slice(0, 255);

    const safeLogoUrl =
      logoUrlOverride === null || logoUrlOverride === undefined || String(logoUrlOverride).trim() === ''
        ? null
        : String(logoUrlOverride).trim().slice(0, 500);

    const safeBody =
      agreementBodyHtml === null || agreementBodyHtml === undefined || String(agreementBodyHtml).trim() === ''
        ? null
        : String(agreementBodyHtml);

    await pool.query(
      `INSERT INTO AgreementTemplate (id, companyNameOverride, logoUrlOverride, agreementBodyHtml)
       VALUES (1, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         companyNameOverride = VALUES(companyNameOverride),
         logoUrlOverride = VALUES(logoUrlOverride),
         agreementBodyHtml = VALUES(agreementBodyHtml),
         updatedAt = CURRENT_TIMESTAMP`,
      [safeCompanyName, safeLogoUrl, safeBody]
    );

    const [templateRows] = await pool.query(
      'SELECT id, companyNameOverride, logoUrlOverride, agreementBodyHtml, createdAt, updatedAt FROM AgreementTemplate WHERE id = 1 LIMIT 1'
    );

    res.json({ template: normalizeRow(templateRows[0] || null) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
