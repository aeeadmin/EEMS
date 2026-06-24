const cron = require('node-cron');
const db = require('../config/database');
const notificationService = require('./notificationService');
const auditService = require('./auditService');
const socketService = require('./socketService');

function startCron() {
  console.log('⏰ Starting Daily Retirement, Birthday, Cybersecurity Campaign, and Scheduled Email Cron Jobs (scheduled for 00:00 everyday)...');
  
  // Runs every day at midnight (00:00)
  cron.schedule('0 0 * * *', async () => {
    await runRetirementChecks();
    await runBirthdayChecks();
    await runCybersecurityCampaignChecks();
    await checkScheduledCampaigns();
  });
  
  // Run immediately on start for verification (in dev mode)
  if (process.env.NODE_ENV !== 'production') {
    setTimeout(runRetirementChecks, 3000);
    setTimeout(runBirthdayChecks, 6000);
    setTimeout(runCybersecurityCampaignChecks, 8000);
    setTimeout(checkScheduledCampaigns, 9000);
  }
}

async function runRetirementChecks() {
  console.log('🏃 Running retirement checks...');
  const conn = await db.getConnection();
  try {
    // Get active employees
    const [employees] = await conn.execute(
      `SELECT id, employee_id, name, date_of_birth, name_based_email, phone_number, district, position_id 
       FROM employees WHERE is_active = TRUE`
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const emp of employees) {
      const dob = new Date(emp.date_of_birth);
      const retirementDate = new Date(dob);
      retirementDate.setFullYear(dob.getFullYear() + 58);
      retirementDate.setHours(0, 0, 0, 0);

      const diffTime = retirementDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // 1. Check for actual retirement (today is past or equal to retirement date)
      if (diffDays <= 0) {
        console.log(`👤 Employee ${emp.name} (${emp.employee_id}) has reached retirement age.`);
        
        // Start transaction
        await conn.beginTransaction();

        try {
          // Deactivate employee
          await conn.execute('UPDATE employees SET is_active = FALSE WHERE id = ?', [emp.id]);

          // Archive employee data
          const archivedData = {
            employee: emp,
            archivedAt: new Date().toISOString()
          };

          await conn.execute(
            `INSERT INTO retirement_archive (employee_id, position_id, archived_data, retired_date)
             VALUES (?, ?, ?, ?)`,
            [emp.employee_id, emp.position_id, JSON.stringify(archivedData), retirementDate.toISOString().split('T')[0]]
          );

          // Preserve email_master entry but set employee_id to NULL/retired reference or leave it?
          // Rules: "Preserve Position ID, Designation Email, and Historical Records, Set Employee Active = False"
          // We keep the email_master entry intact but employee is marked inactive.
          await conn.execute('UPDATE email_master SET is_active = FALSE WHERE employee_id = ?', [emp.employee_id]);

          await conn.commit();

          // Create admin notifications
          await notificationService.createNotificationForRole(
            'ADMIN',
            'Employee Retired',
            `Employee ${emp.name} (${emp.employee_id}) has retired and been archived. Position ID ${emp.position_id} preserved.`,
            'SUCCESS'
          );

          // Write audit log
          await auditService.logAction(
            'SYSTEM',
            'SYSTEM',
            'AUTO_RETIREMENT',
            'employees',
            emp.employee_id,
            { is_active: true },
            { is_active: false, archived: true },
            'localhost'
          );
          
          socketService.broadcast('dashboard:updated', {});
        } catch (txErr) {
          await conn.rollback();
          console.error(`Error retiring employee ${emp.employee_id}:`, txErr);
        }
      }
      // 2. Check for alerts (6 months, 3 months, 1 month before retirement)
      // 6 months is ~180 days, 3 months is ~90 days, 1 month is ~30 days
      else if (diffDays === 180 || diffDays === 90 || diffDays === 30) {
        let monthsStr = '';
        if (diffDays === 180) monthsStr = '6 Months';
        else if (diffDays === 90) monthsStr = '3 Months';
        else if (diffDays === 30) monthsStr = '1 Month';

        const msg = `Employee ${emp.name} (${emp.employee_id}) will retire in ${monthsStr} (${retirementDate.toLocaleDateString()})`;
        
        // Notify Admins
        await notificationService.createNotificationForRole(
          'ADMIN',
          `Retirement Alert: ${monthsStr} Remaining`,
          msg,
          'WARNING'
        );

        // Also notify the manager if the employee belongs to their district or if there's a specific manager
        // Find managers in the same district
        const [managers] = await conn.execute('SELECT manager_unique_id FROM managers WHERE district = ?', [emp.district]);
        for (const m of managers) {
          await notificationService.createNotification(
            m.manager_unique_id,
            `District Retirement Alert: ${monthsStr} Remaining`,
            msg,
            'WARNING'
          );
        }
        
        console.log(`Alert sent: ${msg}`);
      }
    }
  } catch (err) {
    console.error('Error running retirement cron job:', err);
  } finally {
    conn.release();
  }
}

async function runBirthdayChecks() {
  console.log('🏃 Running daily birthday checks...');
  const conn = await db.getConnection();
  try {
    // Select all active employees whose birthday matches today (month and day)
    const query = `
      SELECT employee_id, name, name_based_email, date_of_birth
      FROM employees
      WHERE is_active = TRUE
      AND MONTH(date_of_birth) = MONTH(NOW())
      AND DAY(date_of_birth) = DAY(NOW())
    `;
    const [rows] = await conn.execute(query);
    console.log(`🎂 Found ${rows.length} employees celebrating their birthday today.`);

    const emailService = require('./emailService');
    for (const emp of rows) {
      if (emp.name_based_email) {
        console.log(`✉️ Sending birthday greeting to: ${emp.name} (${emp.name_based_email})`);
        const cyberTip = emailService.getRandomCyberTip();
        const success = await emailService.sendBirthdayGreetingEmail(emp.name_based_email, emp.name, cyberTip);
        
        if (success) {
          await auditService.logAction(
            'SYSTEM',
            'SYSTEM',
            'AUTO_BIRTHDAY_GREETING',
            'employees',
            emp.employee_id,
            null,
            { sent_to: emp.name_based_email },
            '127.0.0.1'
          );
        }
      }
    }
  } catch (err) {
    console.error('Error running birthday checks cron job:', err);
  } finally {
    conn.release();
  }
}

async function runCybersecurityCampaignChecks() {
  console.log('🛡️ Running cybersecurity awareness campaign checks...');
  const now = new Date();
  
  const conn = await db.getConnection();
  try {
    const [startRows] = await conn.execute("SELECT setting_value FROM system_settings WHERE setting_key = 'cyber_campaign_start_date'");
    const [endRows] = await conn.execute("SELECT setting_value FROM system_settings WHERE setting_key = 'cyber_campaign_end_date'");
    
    if (startRows.length === 0 || endRows.length === 0) {
      console.log('🛡️ Cybersecurity Campaign settings not found in system_settings. Skipping.');
      return;
    }
    
    const startDateStr = startRows[0].setting_value;
    const endDateStr = endRows[0].setting_value;
    
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    const today = new Date(now);
    
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    if (today < start || today > end) {
      console.log(`🛡️ Today (${today.toLocaleDateString()}) is outside the Cybersecurity Awareness Campaign range (${startDateStr} to ${endDateStr}). Skipping.`);
      return;
    }
    
        const diffTime = today.getTime() - start.getTime();
    const dayNumber = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
    const year = today.getFullYear();
    const recordId = `CAMPAIGN_${year}_DAY_${dayNumber}`;

    // Check if campaign already sent today for this year
    const [existingLogs] = await conn.execute(
      `SELECT id FROM audit_logs 
       WHERE action = 'CYBER_CAMPAIGN' 
       AND record_id = ?`,
      [recordId]
    );

    if (existingLogs.length > 0) {
      console.log(`🛡️ Today's campaign check for ${recordId} was already sent. Skipping.`);
      return;
    }

    // Calculate total days in campaign
    const totalDaysDiff = end.getTime() - start.getTime();
    const totalDays = Math.floor(totalDaysDiff / (1000 * 60 * 60 * 24)) + 1;

    // Load campaign tip randomly from 100 available awareness contents
    const emailService = require('./emailService');
    const campaignIndex = Math.floor(Math.random() * emailService.CYBER_CAMPAIGN_CONTENT.length);
    const campaign = emailService.CYBER_CAMPAIGN_CONTENT[campaignIndex];
    if (!campaign) {
      console.error(`❌ Campaign content not found for index ${campaignIndex}`);
      return;
    }

    // Query all active employees
    const [employees] = await conn.execute(
      `SELECT employee_id, name, name_based_email 
       FROM employees 
       WHERE is_active = TRUE`
    );

    console.log(`🛡️ Day ${dayNumber} Campaign (Random Tip #${campaignIndex + 1}): "${campaign.title}". Sending emails to ${employees.length} active employees...`);

    let sentCount = 0;
    for (const emp of employees) {
      if (emp.name_based_email) {
        try {
          const success = await emailService.sendCyberCampaignEmail(
            emp.name_based_email,
            emp.name,
            dayNumber,
            campaign.title,
            campaign.content,
            totalDays
          );
          if (success) {
            sentCount++;
          }
        } catch (mailErr) {
          console.error(`❌ Failed to send campaign email to ${emp.name_based_email}:`, mailErr);
        }
      }
    }

    console.log(`🛡️ Day ${dayNumber} Campaign complete. Sent to ${sentCount}/${employees.length} employees.`);

    // Write audit log to record completion
    await auditService.logAction(
      'SYSTEM',
      'SYSTEM',
      'CYBER_CAMPAIGN',
      'employees',
      recordId,
      null,
      { day: dayNumber, year, sent_count: sentCount },
      '127.0.0.1'
    );

  } catch (err) {
    console.error('Error running cybersecurity campaign checks:', err);
  } finally {
    conn.release();
  }
}

async function checkScheduledCampaigns() {
  console.log('⏰ Checking for scheduled custom awareness campaigns...');
  const conn = await db.getConnection();
  try {
    // Query scheduled campaigns where scheduled_date <= CURDATE() and is_sent = 0
    const [campaigns] = await conn.execute(
      `SELECT * FROM scheduled_campaigns 
       WHERE scheduled_date <= CURDATE() 
       AND is_sent = 0`
    );

    if (campaigns.length === 0) {
      console.log('⏰ No pending scheduled awareness campaigns found.');
      return;
    }

    const emailService = require('./emailService');
    
    for (const camp of campaigns) {
      let targetList = [];
      if (camp.recipient_type === 'SPECIFIC' && camp.target_emails) {
        try {
          const targetEmails = JSON.parse(camp.target_emails);
          if (Array.isArray(targetEmails) && targetEmails.length > 0) {
            const [allEmployees] = await conn.execute(
              `SELECT e.name, e.name_based_email, em.designation_email 
               FROM employees e 
               LEFT JOIN email_master em ON e.position_id = em.position_id 
               WHERE e.is_active = TRUE`
            );
            
            for (const email of targetEmails) {
              const emp = allEmployees.find(e => 
                (e.name_based_email && e.name_based_email.toLowerCase() === email.toLowerCase()) || 
                (e.designation_email && e.designation_email.toLowerCase() === email.toLowerCase())
              );
              targetList.push({
                email: email,
                name: emp ? emp.name : 'Employee'
              });
            }
          }
        } catch (parseErr) {
          console.error(`Error parsing target_emails for campaign ID ${camp.id}:`, parseErr);
        }
      }
      
      if (targetList.length === 0) {
        const [activeEmps] = await conn.execute(
          'SELECT name, name_based_email FROM employees WHERE is_active = TRUE'
        );
        targetList = activeEmps.map(emp => ({
          email: emp.name_based_email,
          name: emp.name
        }));
      }

      console.log(`📣 Dispatching scheduled campaign ID ${camp.id}: "${camp.title}" to ${targetList.length} recipients...`);

      let sentCount = 0;
      const fileAttachment = camp.attachment_name ? {
        filename: camp.attachment_name,
        content: camp.attachment_data // Buffer from LONGBLOB
      } : null;

      for (const target of targetList) {
        if (target.email) {
          try {
            const success = await emailService.sendCustomAwarenessEmail(
              target.email,
              target.name,
              camp.title,
              camp.description,
              fileAttachment
            );
            if (success) {
              sentCount++;
            }
            await new Promise(resolve => setTimeout(resolve, 100)); // 100ms throttle delay
          } catch (mailErr) {
            console.error(`❌ Failed to send scheduled awareness email to ${target.email}:`, mailErr);
          }
        }
      }

      // Mark as sent
      await conn.execute(
        'UPDATE scheduled_campaigns SET is_sent = 1 WHERE id = ?',
        [camp.id]
      );

      // Log action to audit logs
      await auditService.logAction(
        'SYSTEM',
        'SYSTEM',
        'SEND_SCHEDULED_AWARENESS_EMAIL',
        'scheduled_campaigns',
        camp.id.toString(),
        null,
        { title: camp.title, sent_count: sentCount, has_attachment: !!fileAttachment },
        '127.0.0.1'
      );

      console.log(`📣 Scheduled campaign ID ${camp.id} completed. Dispatched to ${sentCount}/${targetList.length} employees.`);
    }

  } catch (err) {
    console.error('Error running scheduled campaign checks:', err);
  } finally {
    conn.release();
  }
}

module.exports = {
  startCron,
  runRetirementChecks,
  runBirthdayChecks,
  runCybersecurityCampaignChecks,
  checkScheduledCampaigns
};
