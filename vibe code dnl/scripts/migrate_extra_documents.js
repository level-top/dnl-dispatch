/* eslint-disable no-console */

const { pool } = require("../src/db");

async function main() {
  const statements = [
    `CREATE TABLE IF NOT EXISTS \`LoadExtraDocuments\` (
      \`id\` int(11) NOT NULL AUTO_INCREMENT,
      \`loadId\` int(11) NOT NULL,
      \`originalName\` varchar(255) NOT NULL,
      \`storedName\` varchar(255) NOT NULL,
      \`path\` varchar(500) NOT NULL,
      \`uploadedAt\` timestamp NOT NULL DEFAULT current_timestamp(),
      PRIMARY KEY (\`id\`),
      KEY \`idx_LoadExtraDocuments_loadId\` (\`loadId\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    `CREATE TABLE IF NOT EXISTS \`DriverExtraDocuments\` (
      \`id\` int(11) NOT NULL AUTO_INCREMENT,
      \`driverId\` int(11) NOT NULL,
      \`originalName\` varchar(255) NOT NULL,
      \`storedName\` varchar(255) NOT NULL,
      \`path\` varchar(500) NOT NULL,
      \`uploadedAt\` timestamp NOT NULL DEFAULT current_timestamp(),
      PRIMARY KEY (\`id\`),
      KEY \`idx_DriverExtraDocuments_driverId\` (\`driverId\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,
  ];

  for (const sql of statements) {
    await pool.execute(sql);
  }

  console.log("OK: Extra document tables are present.");
}

main()
  .catch((err) => {
    console.error("Migration failed:", err?.message || err);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await pool.end();
    } catch {
      // ignore
    }
  });
