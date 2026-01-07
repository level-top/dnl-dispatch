// src/db.js
// MySQL database connection setup
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST ?? 'localhost',
  user: process.env.DB_USER ?? 'root',
  // XAMPP default: root with blank password.
  // Use nullish coalescing so `DB_PASSWORD=` (empty) is respected.
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_NAME ?? 'dispatch_todo_app',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function checkConnection() {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    return true;
  } catch (err) {
    console.error('MySQL connection failed:', err.message);
    return false;
  }
}

module.exports = { pool, checkConnection };
