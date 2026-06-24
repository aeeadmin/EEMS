const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3310'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Arun@123',
  database: process.env.DB_NAME || 'tneb_eems',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool;
