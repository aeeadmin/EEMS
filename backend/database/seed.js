'use strict';
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config();

const SALT_ROUNDS = 10;

const districts = [
  'Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem',
  'Tirunelveli', 'Vellore', 'Erode', 'Tiruppur', 'Thoothukudi',
  'Dindigul', 'Thanjavur', 'Ranipet', 'Krishnagiri', 'Namakkal',
  'Kancheepuram', 'Villupuram', 'Cuddalore', 'Nagapattinam', 'Perambalur',
  'Ariyalur', 'Karur', 'Sivaganga', 'Virudhunagar', 'Ramanathapuram',
  'Theni', 'Nilgiris', 'Tiruvannamalai', 'Pudukkottai', 'Tiruvarur'
];

const designations = ['AE', 'AEE', 'EE', 'SE', 'CE'];

const designationPrefixMap = {
  AE: 'AE',
  AEE: 'AEE',
  EE: 'EE',
  SE: 'SE',
  CE: 'CE'
};

const firstNames = [
  'Arun', 'Kumar', 'Suresh', 'Ravi', 'Mani', 'Vijay', 'Senthil', 'Muthu',
  'Karthik', 'Ganesh', 'Balu', 'Chandru', 'Dinesh', 'Elan', 'Farooq',
  'Gopal', 'Hari', 'Ilango', 'Jagan', 'Kathir', 'Lakshmanan', 'Manoj',
  'Naresh', 'Oviya', 'Prabhu', 'Ramesh', 'Saravanan', 'Tamil', 'Uma', 'Venkat',
  'Anand', 'Balaji', 'Chitra', 'Devi', 'Eswar', 'Geetha', 'Harish', 'Indira',
  'Jayanthi', 'Kavitha', 'Logesh', 'Meena', 'Nirmala', 'Padma', 'Raja',
  'Selvi', 'Tamilarasan', 'Usha', 'Vasanth', 'Yamini'
];

const lastNames = [
  'Murugan', 'Selvam', 'Rajan', 'Krishnan', 'Pandian', 'Sekar', 'Nathan',
  'Arumugam', 'Perumal', 'Subramanian', 'Ramasamy', 'Annamalai', 'Velu',
  'Durai', 'Pillai', 'Nadar', 'Gounder', 'Thevar', 'Iyengar', 'Iyer'
];

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function zeroPad(n, width) {
  return String(n).padStart(width, '0');
}

function randomDate(startYear, endYear) {
  const start = new Date(startYear, 0, 1);
  const end = new Date(endYear, 11, 31);
  const d = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return d.toISOString().split('T')[0];
}

async function seed() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3310'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Arun@123',
    database: process.env.DB_NAME || 'tneb_eems',
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0
  });

  const conn = await pool.getConnection();

  try {
    console.log('🌱 Starting seed process...');

    // Clear existing data
    await conn.execute('SET FOREIGN_KEY_CHECKS = 0');
    await conn.execute('DROP TABLE IF EXISTS system_settings');
    await conn.execute('DROP TABLE IF EXISTS scheduled_campaigns');
    
    // Recreate them if not exists (to ensure they are present)
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS scheduled_campaigns (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        attachment_name VARCHAR(255),
        attachment_data LONGBLOB,
        recipient_type VARCHAR(20) DEFAULT 'ALL',
        target_emails LONGTEXT,
        scheduled_date DATE NOT NULL,
        is_sent BOOLEAN DEFAULT FALSE,
        created_by VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS system_settings (
        setting_key VARCHAR(100) PRIMARY KEY,
        setting_value VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await conn.execute('TRUNCATE TABLE retirement_archive');
    await conn.execute('TRUNCATE TABLE audit_logs');
    await conn.execute('TRUNCATE TABLE notifications');
    await conn.execute('TRUNCATE TABLE email_mapping_requests');
    await conn.execute('TRUNCATE TABLE admins');
    await conn.execute('TRUNCATE TABLE managers');
    await conn.execute('TRUNCATE TABLE users');
    await conn.execute('TRUNCATE TABLE email_master');
    await conn.execute('TRUNCATE TABLE employees');
    await conn.execute('SET FOREIGN_KEY_CHECKS = 1');
    console.log('✅ Cleared existing data');

    // ─── Generate 100 employees ───────────────────────────────────────────────
    const employees = [];
    const usedPhones = new Set();
    const usedEmails = new Set();
    const usedEmployeeIds = new Set();
    const usedPositionIds = new Set();

    for (let i = 1; i <= 100; i++) {
      let employeeId;
      do {
        employeeId = 'EMP' + zeroPad(Math.floor(10000 + Math.random() * 89999), 5);
      } while (usedEmployeeIds.has(employeeId));
      usedEmployeeIds.add(employeeId);

      const desig = designations[(i - 1) % designations.length];
      let positionId;
      do {
        positionId = 'MU' + designationPrefixMap[desig] + zeroPad(Math.floor(1000 + Math.random() * 8999), 4);
      } while (usedPositionIds.has(positionId));
      usedPositionIds.add(positionId);

      const firstName = randomItem(firstNames);
      const lastName = randomItem(lastNames);
      const name = `${firstName} ${lastName}`;
      const district = districts[(i - 1) % districts.length];

      let phone;
      do {
        phone = '9' + Math.floor(100000000 + Math.random() * 899999999).toString();
      } while (usedPhones.has(phone));
      usedPhones.add(phone);

      let personalEmail;
      do {
        personalEmail = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@tnebltd.org`;
      } while (usedEmails.has(personalEmail));
      usedEmails.add(personalEmail);

      // DOB: employees aged 25-57 (born 1968-2001)
      const dob = randomDate(1968, 2001);

      employees.push({
        employee_id: employeeId,
        name,
        date_of_birth: dob,
        name_based_email: personalEmail,
        phone_number: phone,
        district,
        position_id: positionId,
        desig
      });
    }

    for (const emp of employees) {
      await conn.execute(
        `INSERT INTO employees (employee_id, name, designation, date_of_birth, name_based_email, phone_number, district, position_id, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [emp.employee_id, emp.name, emp.desig, emp.date_of_birth, emp.name_based_email, emp.phone_number, emp.district, emp.position_id]
      );
    }
    console.log(`✅ Inserted ${employees.length} employees`);

    // ─── Generate email_master ────────────────────────────────────────────────
    const emailPwd = await bcrypt.hash('Tneb@2024', SALT_ROUNDS);
    for (const emp of employees) {
      const designationEmail = `${emp.position_id.toLowerCase()}@tnebnet.org`;
      await conn.execute(
        `INSERT INTO email_master (employee_id, position_id, designation_email, district, password, is_active)
         VALUES (?, ?, ?, ?, ?, 1)`,
        [emp.employee_id, emp.position_id, designationEmail, emp.district, emailPwd]
      );
    }
    console.log(`✅ Inserted ${employees.length} email_master records`);

    // ─── Generate 1 admin (first employee) ────────────────────────────────────
    const adminPwd = await bcrypt.hash('Admin@123', SALT_ROUNDS);
    const adminCredentials = [];

    {
      const emp = employees[0];
      const adminUniqueId = 'ADM001';
      const tokenNumber = emp.position_id;
      const email = `${emp.position_id.toLowerCase()}@tnebnet.org`;

      await conn.execute(
        `INSERT INTO admins (admin_unique_id, employee_id, token_number, email, district, password, is_active)
         VALUES (?, ?, ?, ?, ?, ?, 1)`,
        [adminUniqueId, emp.employee_id, tokenNumber, email, emp.district, adminPwd]
      );

      // Also insert into users table
      await conn.execute(
        `INSERT INTO users (employee_id, name, email, username, password, role, user_id, district)
         VALUES (?, ?, ?, ?, ?, 'ADMIN', ?, ?)`,
        [emp.employee_id, emp.name, email, adminUniqueId, adminPwd, adminUniqueId, emp.district]
      );

      adminCredentials.push({ adminUniqueId, password: 'Admin@123', district: emp.district, email });
    }
    console.log(`✅ Inserted 1 admin`);

    // ─── Generate 100 managers (all employees) ────────────────────────────────
    const managerPwd = await bcrypt.hash('Manager@123', SALT_ROUNDS);
    const managerCredentials = [];

    for (let i = 0; i < 100; i++) {
      const emp = employees[i];
      const managerUniqueId = `MGR${zeroPad(i + 1, 3)}`;
      const tokenNumber = emp.position_id;
      const email = `${emp.position_id.toLowerCase()}@tnebnet.org`;

      await conn.execute(
        `INSERT INTO managers (manager_unique_id, employee_id, token_number, email, district, password, is_active)
         VALUES (?, ?, ?, ?, ?, ?, 1)`,
        [managerUniqueId, emp.employee_id, tokenNumber, email, emp.district, managerPwd]
      );

      // Insert into users table (skip if already inserted as admin)
      const [existingUser] = await conn.execute('SELECT id FROM users WHERE employee_id = ? AND role = ?', [emp.employee_id, 'MANAGER']);
      if (existingUser.length === 0) {
        // Check if user_id already exists
        const [existingUserId] = await conn.execute('SELECT id FROM users WHERE user_id = ?', [managerUniqueId]);
        if (existingUserId.length === 0) {
          const mgrEmail = `mgr_${emp.position_id.toLowerCase()}@tnebnet.org`;
          await conn.execute(
            `INSERT INTO users (employee_id, name, email, username, password, role, user_id, district)
             VALUES (?, ?, ?, ?, ?, 'MANAGER', ?, ?)`,
            [emp.employee_id, emp.name, mgrEmail, managerUniqueId, managerPwd, managerUniqueId, emp.district]
          );
        }
      }

      managerCredentials.push({ managerUniqueId, password: 'Manager@123', district: emp.district, email });
    }
    console.log(`✅ Inserted 100 managers`);

    // ─── Generate 100 email_mapping_requests ─────────────────────────────────
    const statuses = ['PENDING', 'APPROVED', 'REJECTED'];
    const requestTypes = ['EDIT_REQUEST', 'TRANSFER', 'CORRECTION', 'PERMISSION', 'GENERAL'];
    const subjects = [
      'Request to update email mapping',
      'Transfer request for position',
      'Correction in designation email',
      'Permission to access records',
      'General update request'
    ];

    for (let i = 0; i < 100; i++) {
      const emp = employees[i];
      const status = statuses[i % 3];
      const reqType = requestTypes[i % 5];
      const requestedBy = managerCredentials[i].managerUniqueId;
      const approvedBy = status !== 'PENDING' ? adminCredentials[i % adminCredentials.length].adminUniqueId : null;
      const editableColumns = reqType === 'EDIT_REQUEST'
        ? JSON.stringify(['name', 'district', 'phone_number'])
        : null;

      await conn.execute(
        `INSERT INTO email_mapping_requests
         (employee_id, position_id, email_id, district, status, request_type, subject, comments, requested_by, approved_by, editable_columns)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          emp.employee_id,
          emp.position_id,
          `${emp.position_id.toLowerCase()}@tnebnet.org`,
          emp.district,
          status,
          reqType,
          subjects[i % 5],
          `Request #${i + 1} submitted for review`,
          requestedBy,
          approvedBy,
          editableColumns
        ]
      );
    }
    console.log(`✅ Inserted 100 email_mapping_requests`);

    // ─── Sample notifications ─────────────────────────────────────────────────
    const notifTypes = ['INFO', 'WARNING', 'SUCCESS', 'ERROR'];
    for (let i = 0; i < 30; i++) {
      const userId = i < 15 ? adminCredentials[i % adminCredentials.length].adminUniqueId : managerCredentials[i % 100].managerUniqueId;
      await conn.execute(
        `INSERT INTO notifications (user_id, title, message, type, is_read)
         VALUES (?, ?, ?, ?, ?)`,
        [
          userId,
          `Notification #${i + 1}`,
          `System notification message ${i + 1}`,
          notifTypes[i % 4],
          i % 3 === 0 ? 1 : 0
        ]
      );
    }
    console.log(`✅ Inserted 30 sample notifications`);

    // ─── Sample audit_logs ────────────────────────────────────────────────────
    const actions = ['LOGIN', 'CREATE_EMPLOYEE', 'UPDATE_EMPLOYEE', 'APPROVE_REQUEST', 'REJECT_REQUEST', 'LOGOUT'];
    for (let i = 0; i < 30; i++) {
      const userId = adminCredentials[i % adminCredentials.length].adminUniqueId;
      await conn.execute(
        `INSERT INTO audit_logs (user_id, role, action, table_name, record_id, old_value, new_value, ip_address)
         VALUES (?, 'ADMIN', ?, ?, ?, ?, ?, '127.0.0.1')`,
        [
          userId,
          actions[i % 6],
          'employees',
          employees[i % 100].employee_id,
          JSON.stringify({ status: 'before' }),
          JSON.stringify({ status: 'after' })
        ]
      );
    }
    console.log(`✅ Inserted 30 sample audit_logs`);

    // ─── Print credentials ────────────────────────────────────────────────────
    console.log('\n══════════════════════════════════════════');
    console.log('           ADMIN CREDENTIALS              ');
    console.log('══════════════════════════════════════════');
    adminCredentials.forEach(a => {
      console.log(`ID: ${a.adminUniqueId} | Password: ${a.password} | District: ${a.district}`);
    });

    console.log('\n══════════════════════════════════════════');
    console.log('          MANAGER CREDENTIALS             ');
    console.log('══════════════════════════════════════════');
    managerCredentials.slice(0, 5).forEach(m => {
      console.log(`ID: ${m.managerUniqueId} | Password: ${m.password} | District: ${m.district}`);
    });
    console.log(`... and ${managerCredentials.length - 5} more managers`);

    // Seed default campaign dates
    await conn.execute(`
      INSERT INTO system_settings (setting_key, setting_value) VALUES 
      ('cyber_campaign_start_date', '2026-06-16'),
      ('cyber_campaign_end_date', '2026-06-22')
    `);
    console.log('✅ Seeded campaign dates in system_settings');

    console.log('\n✅ Seed completed successfully!');
  } catch (err) {
    console.error('❌ Seed error:', err);
    process.exit(1);
  } finally {
    conn.release();
    await pool.end();
  }
}

seed();
