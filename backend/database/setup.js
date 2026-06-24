const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runSetup() {
  console.log('🔄 Starting Database Setup via Node...');
  
  const connectionConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3310'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Arun@123',
    multipleStatements: true
  };

  let connection;
  try {
    connection = await mysql.createConnection(connectionConfig);
    console.log('🔌 Connected to MySQL server.');

    // 1. Create DB
    await connection.query('CREATE DATABASE IF NOT EXISTS tneb_eems;');
    console.log('✅ Database tneb_eems verified/created.');
    await connection.query('USE tneb_eems;');

    // 2. Read schema.sql
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    // We can run the entire schema file because multipleStatements is true
    await connection.query(schemaSql);
    console.log('✅ Schema tables created successfully.');
  } catch (err) {
    console.error('❌ Error during schema execution:', err);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }

  // 3. Run seeding
  console.log('🌱 Starting database seeding...');
  try {
    // Dynamically run seed.js logic
    require('./seed.js');
  } catch (err) {
    console.error('❌ Error during seeding execution:', err);
    process.exit(1);
  }
}

runSetup();
