// Creates AgreementTemplate table if missing
// Usage: node scripts/migrate_agreement_template.js
const { pool } = require('../src/db');

async function main() {
  const createSql = `
    CREATE TABLE IF NOT EXISTS AgreementTemplate (
      id INT NOT NULL,
      companyNameOverride VARCHAR(255) NULL,
      logoUrlOverride VARCHAR(500) NULL,
      agreementBodyHtml LONGTEXT NULL,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    );
  `;

  await pool.execute(createSql);
  await pool.execute(
    `INSERT IGNORE INTO AgreementTemplate (id, companyNameOverride, logoUrlOverride, agreementBodyHtml)
     VALUES (1, NULL, NULL, NULL);`
  );

  console.log('OK: AgreementTemplate table is present.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('FAILED:', err);
    process.exit(1);
  });
