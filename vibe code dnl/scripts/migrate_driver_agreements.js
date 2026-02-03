// Creates DriverAgreements table if missing
// Usage: node scripts/migrate_driver_agreements.js
const { pool } = require('../src/db');

async function main() {
  const createSql = `
    CREATE TABLE IF NOT EXISTS DriverAgreements (
      id INT AUTO_INCREMENT PRIMARY KEY,
      driverId INT NOT NULL,
      tokenHash CHAR(64) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      expiresAt TIMESTAMP NULL,
      viewedAt TIMESTAMP NULL,
      signedAt TIMESTAMP NULL,
      signerName VARCHAR(255) NULL,
      signerIp VARCHAR(64) NULL,
      signerUserAgent VARCHAR(512) NULL,
      signatureImagePath VARCHAR(512) NULL,
      signedPdfPath VARCHAR(512) NULL,
      INDEX idx_driver_agreements_driverId (driverId),
      UNIQUE KEY uq_driver_agreements_tokenHash (tokenHash)
    );
  `;

  await pool.execute(createSql);
  console.log('OK: DriverAgreements table is present.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('FAILED:', err);
    process.exit(1);
  });
