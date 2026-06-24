const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// Create a transporter using Google/Gmail SMTP settings
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'tneb.eems.temp@gmail.com',
    pass: process.env.EMAIL_PASS || 'someapppassword'
  }
});

function writeEmailToLog(mailOptions, error) {
  try {
    const logPath = path.join(process.cwd(), 'emails.log');
    const timestamp = new Date().toISOString();
    const logEntry = `
========================================
TIMESTAMP: ${timestamp}
TO: ${mailOptions.to}
SUBJECT: ${mailOptions.subject}
SMTP_ERROR: ${error ? error.message : 'None'}
BODY:
${mailOptions.html || mailOptions.text}
========================================
\n`;
    fs.appendFileSync(logPath, logEntry, 'utf8');
    console.log(`[EMAIL LOGGED] Email to ${mailOptions.to} saved to ${logPath} (SMTP fallback).`);
    return true;
  } catch (logErr) {
    console.error('Error writing email to log file:', logErr);
    return false;
  }
}

async function sendOtpEmail(toEmail, otp) {
  const mailOptions = {
    from: `"TNEB EEMS Support" <${process.env.EMAIL_USER || 'tneb.eems.temp@gmail.com'}>`,
    to: toEmail,
    subject: 'TNEB EEMS Password Reset OTP',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #0ea5e9; text-align: center;">Tamil Nadu Electricity Board</h2>
        <h3 style="color: #1a2332; text-align: center;">EEMS Password Reset Request</h3>
        <p style="font-size: 16px; color: #4a5568;">Dear User,</p>
        <p style="font-size: 16px; color: #4a5568;">You requested a password reset for your TNEB EEMS account. Use the following One-Time Password (OTP) to verify your request:</p>
        <div style="text-align: center; margin: 30px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #0284c7; background: #e0f2fe; padding: 10px 24px; border-radius: 6px;">${otp}</span>
        </div>
        <p style="font-size: 14px; color: #718096; text-align: center;">This OTP is valid for 10 minutes. If you did not make this request, please ignore this email.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 12px; color: #a0aec0; text-align: center;">Tamil Nadu Electricity Board - Employee Email Management System</p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully to ${toEmail}. Message ID: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('Error sending OTP email:', error);
    return writeEmailToLog(mailOptions, error);
  }
}

async function sendLoginNotificationEmail(toEmail, roleName) {
  const mailOptions = {
    from: `"TNEB EEMS Support" <${process.env.EMAIL_USER || 'tneb.eems.temp@gmail.com'}>`,
    to: toEmail,
    subject: 'TNEB EEMS - Login Notification',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #254DED; text-align: center;">Tamil Nadu Electricity Board</h2>
        <h3 style="color: #1a2332; text-align: center;">Account Login Notification</h3>
        <p style="font-size: 16px; color: #4a5568;">Dear ${roleName},</p>
        <p style="font-size: 16px; color: #4a5568;">You have been logged in successfully to your TNEB EEMS account.</p>
        <p style="font-size: 14px; color: #e53e3e; font-weight: bold;">If you did not log in just now, please contact an administrator immediately to secure your account.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 12px; color: #a0aec0; text-align: center;">Tamil Nadu Electricity Board - Employee Email Management System</p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Login notification email sent to ${toEmail}. Message ID: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('Error sending login notification email:', error);
    return writeEmailToLog(mailOptions, error);
  }
}

const CYBER_SECURITY_TIPS = [
  "Verify sender addresses carefully before clicking links or downloading attachments. Phishing attacks often mimic familiar names to steal credentials.",
  "Never reuse your work passwords for personal accounts. Always use a unique, complex password with a mix of characters.",
  "Enable Two-Factor Authentication (2FA) on all critical accounts. It prevents unauthorized access even if your password is compromised.",
  "Avoid connecting to public Wi-Fi networks when handling TNEB documents. Use a secure VPN or mobile hotspot instead.",
  "Lock your device (Win + L) every time you step away from your workstation, even if only for a brief moment.",
  "Be suspicious of urgent or high-pressure requests to share sensitive employee data or passwords, even if they appear to come from managers.",
  "Keep your web browser and system software updated. Updates contain security patches that shield your system from exploits."
];

function getRandomCyberTip() {
  return CYBER_SECURITY_TIPS[Math.floor(Math.random() * CYBER_SECURITY_TIPS.length)];
}

async function sendBirthdayGreetingEmail(toEmail, name, cyberTip) {
  const tip = cyberTip || getRandomCyberTip();
  const mailOptions = {
    from: `"TNEB EEMS Support" <${process.env.EMAIL_USER || 'karatos274@gmail.com'}>`,
    to: toEmail,
    subject: `Happy Birthday, ${name}! 🎉`,
    html: `
      <div style="background: linear-gradient(135deg, #5B6D92 0%, #3f4e6b 100%); padding: 30px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <div style="max-width: 500px; width: 100%; background: #ffffff; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.15); overflow: hidden; border: 1px solid rgba(0,0,0,0.05); margin: 0 auto;">
          <!-- Card Header Banner -->
          <div style="background: linear-gradient(135deg, #7a8fa6 0%, #5B6D92 100%); padding: 40px 20px; text-align: center; color: #ffffff; position: relative;">
            <div style="font-size: 50px; margin-bottom: 10px; line-height: 1;">🎂</div>
            <h1 style="margin: 0; font-size: 26px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase;">Happy Birthday!</h1>
            <div style="font-size: 14px; opacity: 0.85; margin-top: 5px; font-weight: 500; letter-spacing: 1px;">SPECIALLY FOR YOU</div>
          </div>
          
          <!-- Card Content Body -->
          <div style="padding: 35px 30px; text-align: center;">
            <p style="font-size: 14px; text-transform: uppercase; letter-spacing: 2px; color: #5B6D92; font-weight: 700; margin: 0 0 10px 0;">Warmest Wishes</p>
            <h2 style="font-size: 24px; color: #1a2332; margin: 0 0 20px 0; font-weight: 700; font-family: Georgia, serif; font-style: italic;">Dear ${name},</h2>
            <p style="font-size: 15px; color: #4a5568; line-height: 1.6; margin: 0 0 25px 0;">
              On behalf of the Tamil Nadu Electricity Board (TNEB), we wish you a fantastic birthday filled with happiness, good health, and success. Thank you for your continued dedication, service, and valuable contributions to our organization.
            </p>
            
            <!-- Elegant Gold Divider Line -->
            <div style="height: 1px; background: linear-gradient(to right, transparent, #d1dde8, transparent); margin: 25px 0;"></div>
            
            <!-- Cybersecurity Tip Callout Card -->
            <div style="background: #f8fafc; border-left: 4px solid #5B6D92; border-radius: 8px; padding: 20px; text-align: left; margin: 10px 0 10px 0; box-shadow: inset 0 1px 3px rgba(0,0,0,0.02);">
              <h4 style="margin: 0 0 8px 0; color: #1a2332; font-size: 14px; font-weight: 700; display: flex; align-items: center; gap: 6px;">
                <span style="font-size: 16px;">🛡️</span> Cybersecurity Awareness Tip
              </h4>
              <p style="margin: 0; font-size: 13.5px; color: #4a5568; line-height: 1.5; font-style: italic;">
                "${tip}"
              </p>
            </div>
          </div>

          <!-- Card Footer -->
          <div style="background: #f1f5f9; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="margin: 0; font-size: 12px; color: #64748b; font-weight: 600;">
              TNEB Employee Email Management System (EEMS)
            </p>
            <p style="margin: 5px 0 0 0; font-size: 11px; color: #94a3b8;">
              This is an automated birthday greeting sent by the Administrator.
            </p>
          </div>
        </div>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Birthday email sent successfully to ${toEmail}. Message ID: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('Error sending birthday email:', error);
    return writeEmailToLog(mailOptions, error);
  }
}

const CYBER_CAMPAIGN_CONTENT = [
  {
    title: "Password Length Matters",
    content: "Longer is stronger. Passwords with 12 or more characters are exponentially harder for hackers to crack than shorter passwords, even if they contain complex characters."
  },
  {
    title: "Avoid Password Re-use",
    content: "Using the same password across multiple sites means a breach on one site compromises all your accounts. Use unique passwords for every service."
  },
  {
    title: "Activate Multi-Factor Authentication",
    content: "Multi-factor authentication (MFA) blocks over 99.9% of account takeover attacks. Enable it on every portal that supports it."
  },
  {
    title: "Inspect the Sender's Email Address",
    content: "Phishing emails often use display names that mimic your coworkers, but a look at the actual email address reveals a fake external domain."
  },
  {
    title: "Report Suspicious Emails Instantly",
    content: "If an email looks odd, requests urgent actions, or asks for credentials, do not reply. Forward it to the security team or use the official reporting button."
  },
  {
    title: "Verify Unexpected Link Targets",
    content: "Hover your mouse over links in emails to see the actual target URL before clicking. If it doesn't match the company domain, do not click."
  },
  {
    title: "Be Cautious of Email Attachments",
    content: "Malware is frequently disguised as invoices, reports, or resumes. Never open attachments from unknown senders or unexpected sources."
  },
  {
    title: "Never Share Your Work Credentials",
    content: "Official IT support will never ask for your password. Keep your login details confidential and never share them via email, chat, or phone."
  },
  {
    title: "Use a Secure Password Manager",
    content: "A password manager generates, stores, and autofills strong, unique passwords for all your online accounts, keeping them secure and organized."
  },
  {
    title: "Lock Your Screen When Leaving",
    content: "Always press Win + L (or Cmd + Ctrl + Q) before leaving your desk. This prevents unauthorized physical access to your workstation."
  },
  {
    title: "Avoid Unsecured Public Wi-Fi",
    content: "Public Wi-Fi networks are vulnerable to eavesdropping. Use a corporate VPN or turn on your mobile hotspot when working remotely."
  },
  {
    title: "Disable Auto-Connect to Wi-Fi",
    content: "Configure your devices to ask before joining new wireless networks. Hackers create rogue hotspots with names resembling trusted public networks."
  },
  {
    title: "Keep Systems and Software Patched",
    content: "Operating systems, web browsers, and apps must be updated regularly to fix security vulnerabilities that hackers exploit."
  },
  {
    title: "Scan Portable USB Storage Drives",
    content: "USB drives can contain hidden malware. Avoid plugging in unknown drives, and scan all authorized storage devices before opening files."
  },
  {
    title: "Download Apps Only from Trusted Stores",
    content: "Install software exclusively from official repositories like Google Play, Apple App Store, or authorized enterprise portals to avoid malware."
  },
  {
    title: "Routinely Back Up Crucial Data",
    content: "Back up your work files to secure network locations regularly to prevent data loss from hardware failure or ransomware attacks."
  },
  {
    title: "Recognize Urgency in Social Engineering",
    content: "High-pressure requests for transfers, credentials, or urgent files are classic signs of social engineering. Take time to verify the request."
  },
  {
    title: "Double-Check Requests for Account Changes",
    content: "If a coworker or vendor requests changes to banking or profile details, verify the request via a phone call or face-to-face check."
  },
  {
    title: "Beware of Shoulder Surfing",
    content: "When typing passwords in public spaces, ensure no one is watching your screen or keyboard. Consider using a screen privacy filter."
  },
  {
    title: "Do Not Log In on Public Computers",
    content: "Public kiosks or library computers may have keyloggers installed. Avoid entering work credentials or personal logins on untrusted systems."
  },
  {
    title: "Encrypt Sensitive Datasets",
    content: "Ensure that sensitive files are encrypted before sending them over the network or saving them to external drives."
  },
  {
    title: "Verify App Permissions on Mobiles",
    content: "Review mobile app permissions regularly. A simple calculator app does not need access to your contacts, camera, or location."
  },
  {
    title: "Watch Out for Fake System Alerts",
    content: "Pop-ups claiming your computer is infected with viruses are often scareware. Close the browser tab and do not install any software they suggest."
  },
  {
    title: "Check URL Protocol for HTTPS",
    content: "Ensure the website address starts with 'https://' and has a padlock icon. This encrypts the connection between your browser and the server."
  },
  {
    title: "Secure Your Home Network Router",
    content: "Change the default administrator password on your home Wi-Fi router, and enable WPA3 or WPA2 encryption for all connections."
  },
  {
    title: "Limit Personal Activities on Work Devices",
    content: "Avoid using work laptops for personal shopping, gaming, or social media. This reduces the attack surface for enterprise networks."
  },
  {
    title: "Be Smart on Professional Social Networks",
    content: "Avoid sharing technical details about your work environment, software versions, or infrastructure layout on professional sites like LinkedIn."
  },
  {
    title: "Verify Caller Identities in Support Calls",
    content: "If someone calls claiming to be from IT support asking for access, verify their identity through directory lookup before giving info."
  },
  {
    title: "Protect Physical Access to Servers",
    content: "Ensure server rooms and networking closets are locked at all times. Physical security is the foundation of network security."
  },
  {
    title: "Safeguard Printed Documents",
    content: "Do not leave papers containing sensitive employee data, passwords, or network diagrams on printers or desks. Shred them when done."
  },
  {
    title: "Understand Ransomware Risk",
    content: "Ransomware encrypts files and demands payments. It usually enters via phishing. Staying alert to odd emails is the best protection."
  },
  {
    title: "Learn how to Revoke Account Access",
    content: "If you lose a mobile device that has work email configured, report it immediately so IT can revoke active tokens and sessions."
  },
  {
    title: "Review Accounts Privileges Periodically",
    content: "Ensure you only have access to systems you need for your current role. Unused privileges increase overall security risk."
  },
  {
    title: "Use Privacy-First Search Engines",
    content: "Consider using search engines that do not track your history or build advertising profiles on your browsing habits."
  },
  {
    title: "Do Not Store Passwords on Sticky Notes",
    content: "Writing passwords on sticky notes attached to monitors or hidden under keyboards is a major physical security violation."
  },
  {
    title: "Be Cautious with Third-Party Add-Ons",
    content: "Browser extensions and email add-ons can access all your webpage content. Install extensions from verified developers only."
  },
  {
    title: "Recognize Smishing (SMS Phishing)",
    content: "Text messages claiming you have a package, unpaid fine, or security issue are smishing. Do not click links inside text messages."
  },
  {
    title: "Ensure Proper Device Disposal",
    content: "Before discarding or recycling old hard drives, phones, or flash drives, ensure they are securely wiped using sanitization software."
  },
  {
    title: "Verify QR Code Scans Carefully",
    content: "QR codes can point to phishing or malware websites. Scan codes only from trusted, printed sources or verified official cards."
  },
  {
    title: "Report Lost Work Badges Promptly",
    content: "Losing physical security credentials like RFID cards or badges exposes offices to intrusion. Report losses to security teams immediately."
  },
  {
    title: "Beware of Tailgating at Entrances",
    content: "Do not let unknown persons follow you through secure office doors without scanning their badges. Politely direct them to the front desk."
  },
  {
    title: "Be Smart with AI Assistants",
    content: "Avoid pasting proprietary source code, internal spreadsheets, or customer records into public AI tools, as they might store data."
  },
  {
    title: "Keep Your Email Inbox Clean",
    content: "Delete old or stale messages that contain sensitive data. Leaving years of correspondence in your inbox increases the breach impact."
  },
  {
    title: "Watch for Account Sync Warnings",
    content: "If you receive alerts that a new device is syncing to your account, act immediately. Change your credentials and log out other sessions."
  },
  {
    title: "Check for Unusual Login Locations",
    content: "Regularly check your session logs for odd IP locations or devices. Report anything that doesn't match your usage."
  },
  {
    title: "Do Not Click 'Enable Content' in Macros",
    content: "Many document exploits use macros to download malware. Do not enable macros in downloaded spreadsheets or word files."
  },
  {
    title: "Verify Software Download Mirrors",
    content: "Download software only from official vendor portals. Third-party download hubs often bundle adware or security threats."
  },
  {
    title: "Monitor Financial Transaction Alerts",
    content: "Configure notifications for all corporate card or bank transactions. Prompt alerts allow quick intervention in card fraud."
  },
  {
    title: "Protect Smart Home Devices",
    content: "If you work from home, place smart devices (TVs, smart plugs) on a separate guest Wi-Fi network to isolate work computers."
  },
  {
    title: "Avoid Clicking Online Ads",
    content: "Malvertising attacks inject malicious scripts into legitimate ad networks. Use reputable ad blockers to minimize risk."
  },
  {
    title: "Be Mindful of Metadata in Shared Files",
    content: "Uploaded PDFs or images can contain geolocation data or author history. Use strip-metadata tools before public uploads."
  },
  {
    title: "Verify Authenticity of Security Software",
    content: "Only install antivirus tools authorized by TNEB IT. Rogues distribute fake antivirus tools that actually infect systems."
  },
  {
    title: "Understand the Dangers of Vishing",
    content: "Voice phishing (vishing) uses phone calls to extract passwords or information. Do not share credentials over a call."
  },
  {
    title: "Watch for Browser SSL Certificate Errors",
    content: "If your browser warns that a site's security certificate is invalid, do not bypass the warning. It could indicate a spoofing attack."
  },
  {
    title: "Use Safe Password Recovery Options",
    content: "Set up recovery questions with answers that cannot be researched online. Avoid using public details like your birth town."
  },
  {
    title: "Be Alert to Typosquatting Domains",
    content: "Hackers register domains that look like real websites (e.g. tnebnet-org.com instead of tnebnet.org). Double-check spelling."
  },
  {
    title: "Decline Auto-Saving Work Passwords",
    content: "Avoid saving work credentials in public browsers. If the browser is compromised, saved passwords can be extracted."
  },
  {
    title: "Recognize Spear Phishing Attacks",
    content: "Spear phishing is highly targeted, mentioning specific projects or details about you. Treat unexpected emails cautiously."
  },
  {
    title: "Verify Urgent Request Channels",
    content: "If a coworker sends a chat request for immediate funds or account updates, call them on their verified phone number to confirm."
  },
  {
    title: "Review Social Media Account Settings",
    content: "Set your personal accounts to private to prevent social engineers from compiling intelligence about your family or habits."
  },
  {
    title: "Understand Malware in Games",
    content: "Do not install pirated software, game patches, or cracks on work computers, as they frequently contain trojans or spyware."
  },
  {
    title: "Double-check Shared Directory Links",
    content: "Ensure folder links shared internally are restricted to authorized users only, rather than set to public access."
  },
  {
    title: "Be Cautious of Dynamic PDF Portals",
    content: "PDF files that redirect you to external pages to enter credentials are traps. Do not type passwords on such screens."
  },
  {
    title: "Keep Bluetooth Disabled When Unused",
    content: "Vulnerabilities like BlueBorne allow attackers to hijack devices via Bluetooth. Turn Bluetooth off in public spaces."
  },
  {
    title: "Inspect Network Cabling Safety",
    content: "If you spot unauthorized devices plugged into network switches or wall outlets, report it to the network administrator."
  },
  {
    title: "Decline Browser Notification Invites",
    content: "Avoid clicking 'Allow' on websites asking to send notifications, as they are often used to display spam or fake virus alerts."
  },
  {
    title: "Review Workstation Antivirus Logs",
    content: "Antivirus alerts should not be ignored. If your security software flags a threat, run a full system scan or alert IT support."
  },
  {
    title: "Be Smart with Mobile App Updates",
    content: "Update mobile apps routinely. App store reviews patch mobile security loopholes that compromise device files."
  },
  {
    title: "Understand Zero-Day Vulnerabilities",
    content: "A zero-day threat has no immediate patch. Minimize risk by avoiding suspicious downloads and browsing only trusted sites."
  },
  {
    title: "Audit Active Sessions Regularly",
    content: "Inspect active sessions in your profile. Terminate old logins from unused tablets, phones, or old laptops."
  },
  {
    title: "Minimize System Startup Programs",
    content: "Fewer startup programs reduce the background processes running on your computer, making it easier to spot anomalous activities."
  },
  {
    title: "Protect Personal Identifying Data",
    content: "Treat Employee IDs, Aadhaar numbers, and DOBs as highly private records. Never expose them on public forums."
  },
  {
    title: "Avoid Unverified Free Software Tools",
    content: "Do not download free PDF converters, image editors, or file compressors from untrusted portals. Use corporate tools."
  },
  {
    title: "Inspect System Event Logs for Anomalies",
    content: "System event logs contain traces of failed logins or registry changes. Inform IT if your system displays unusual behaviors."
  },
  {
    title: "Keep Backups Isolated Offline",
    content: "Maintain an offline copy of critical backups. Ransomware can target and encrypt online backups connected to the network."
  },
  {
    title: "Understand the Risk of Keyloggers",
    content: "Keyloggers record keystrokes to steal credentials. Avoid typing passwords on untrusted devices or using unverified keyboards."
  },
  {
    title: "Do Not Run Unknown Executable Files",
    content: "Files ending in .exe, .bat, or .msi run code on your system. Never execute them unless downloaded from verified sources."
  },
  {
    title: "Use Strict Document Naming Schemes",
    content: "Avoid naming files 'passwords.txt' or 'credentials.xlsx'. Storing credentials in plain text files violates security rules."
  },
  {
    title: "Keep Workplace Clear of Hardware Keyloggers",
    content: "Check your computer's USB port connections. Hardware keyloggers are small connectors placed between keyboards and ports."
  },
  {
    title: "Recognize Baiting Techniques",
    content: "Baiting uses false promises (like a free movie download) to trick users. Avoid clicking bait links or downloading files."
  },
  {
    title: "Be Careful with File Synchronization Apps",
    content: "Syncing work directories to personal cloud accounts violates organizational data leak prevention rules."
  },
  {
    title: "Verify Third-Party Meeting Invites",
    content: "Treat unexpected links to video calls (Zoom, Teams, etc.) from unknown accounts cautiously. They can be phishing traps."
  },
  {
    title: "Keep Wi-Fi Names Clean of Identifiers",
    content: "Avoid naming your home network 'Arun-TNEB-Workstation'. Use generic names to prevent hackers from targeting your network."
  },
  {
    title: "Disable USB Auto-run Feature",
    content: "Auto-run allows drives to launch malware automatically when plugged in. Ensure auto-run is disabled on your system."
  },
  {
    title: "Protect Access to Code Repositories",
    content: "Keep your GitHub or GitLab credentials secure. Never hardcode passwords or API tokens in public repositories."
  },
  {
    title: "Limit Location Tracking Privileges",
    content: "Turn off location services on your devices when not needed to prevent applications from mapping your coordinates."
  },
  {
    title: "Audit Network Sharing Folders",
    content: "Ensure your computer does not share files with 'Everyone' on public network connections. Turn off network discovery."
  },
  {
    title: "Understand Drive-By Downloads",
    content: "Drive-by downloads install malware silently when you visit compromised sites. Use secure browsers to block these scripts."
  },
  {
    title: "Verify Security Certificates in Apps",
    content: "Ensure corporate apps are signed by verified enterprise publishers before launching installation guides."
  },
  {
    title: "Avoid Saving Corporate Cards Online",
    content: "Opt out of auto-saving credit card details on shopping websites to prevent data loss if the portal suffers a breach."
  },
  {
    title: "Configure Safe Firewall Rules",
    content: "Keep your system firewall enabled. A firewall monitors network traffic and blocks unauthorized access attempts."
  },
  {
    title: "Never Use Outdated Browsers",
    content: "Internet Explorer or older versions of Chrome lack modern exploit protection. Always use updated, secure browsers."
  },
  {
    title: "Verify Emails Requesting Password Resets",
    content: "If you receive a password reset mail you did not request, do not click the link. Log in directly or notify IT."
  },
  {
    title: "Limit Exposure of Workplace IP Addresses",
    content: "Do not share system IP configurations or internal network addresses on messaging boards or public forums."
  },
  {
    title: "Protect Home Router DNS Configurations",
    content: "Secure your home router DNS to prevent attackers from redirecting your browser requests to fraudulent websites."
  },
  {
    title: "Be Wary of Free USB Chargers",
    content: "Rogue USB chargers in airports can steal data ('juice jacking'). Use electrical outlets or data blockers."
  },
  {
    title: "Avoid Downloading Unnecessary Attachments",
    content: "Read documentation or announcements inline if possible. Downloading attachments unnecessarily exposes systems."
  },
  {
    title: "Check App Reviews for Malicious Traces",
    content: "Before installing mobile apps, check review logs. Users flag scam apps or security risks early."
  },
  {
    title: "Report Security Anomalies Instantly",
    content: "If your mouse moves on its own, your screen flashes, or unfamiliar command windows pop up, disconnect the network and alert IT."
  },
  {
    title: "Stay Informed on Latest Cyber Threat Trends",
    content: "Cybersecurity is a continuous process. Keep reading security bulletins to stay ahead of modern social engineering tactics."
  }
];

async function sendCyberCampaignEmail(toEmail, name, dayNumber, title, content, totalDays = 7) {
  const mailOptions = {
    from: `"TNEB EEMS Support" <${process.env.EMAIL_USER || 'karatos274@gmail.com'}>`,
    to: toEmail,
    subject: `[EEMS Security Campaign] Day ${dayNumber}: ${title} 🛡️`,
    html: `
      <div style="background: #f8fafc; padding: 30px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <div style="max-width: 550px; width: 100%; background: #ffffff; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); overflow: hidden; border: 1px solid #e2e8f0; margin: 0 auto;">
          <!-- Header Banner -->
          <div style="background: linear-gradient(135deg, #5B6D92 0%, #3f4e6b 100%); padding: 30px 20px; text-align: center; color: #ffffff;">
            <div style="font-size: 32px; margin-bottom: 8px;">🛡️</div>
            <h2 style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase;">Cybersecurity Awareness Week</h2>
            <div style="font-size: 13px; opacity: 0.85; margin-top: 5px; font-weight: 600; letter-spacing: 1px;">DAY ${dayNumber} OF ${totalDays}</div>
          </div>
          
          <!-- Content Body -->
          <div style="padding: 30px;">
            <h3 style="font-size: 18px; color: #1a2332; margin: 0 0 15px 0; font-weight: 700;">Dear ${name},</h3>
            <p style="font-size: 15px; color: #4a5568; line-height: 1.6; margin: 0 0 20px 0;">
              Welcome to Day ${dayNumber} of our annual Cybersecurity Awareness Campaign. Protecting the security and integrity of TNEB resources starts with simple daily habits. Today, we focus on:
            </p>
            
            <!-- Highlight Box -->
            <div style="background: #f1f5f9; border-left: 4px solid #5B6D92; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
              <h4 style="margin: 0 0 10px 0; color: #1a2332; font-size: 16px; font-weight: 700;">
                Key Point: ${title}
              </h4>
              <p style="margin: 0; font-size: 14px; color: #4a5568; line-height: 1.6; font-weight: 500;">
                ${content}
              </p>
            </div>
            
            <p style="font-size: 14px; color: #64748b; line-height: 1.5; margin: 0;">
              Please take a moment to review this security practice and apply it to both your TNEB EEMS workflow and your daily personal device activities.
            </p>
          </div>

          <!-- Footer -->
          <div style="background: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="margin: 0; font-size: 12px; color: #64748b; font-weight: 600;">
              Tamil Nadu Electricity Board (TNEB)
            </p>
            <p style="margin: 5px 0 0 0; font-size: 11px; color: #94a3b8;">
              You are receiving this email as an active employee of TNEB.
            </p>
          </div>
        </div>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Campaign Day ${dayNumber} email sent successfully to ${toEmail}. Message ID: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`Error sending Campaign Day ${dayNumber} email:`, error);
    return writeEmailToLog(mailOptions, error);
  }
}

async function sendCustomAwarenessEmail(toEmail, name, title, description, attachment) {
  const mailOptions = {
    from: `"TNEB EEMS Support" <${process.env.EMAIL_USER || 'karatos274@gmail.com'}>`,
    to: toEmail,
    subject: `[EEMS Security Notice] ${title} 🛡️`,
    html: `
      <div style="background: #f8fafc; padding: 30px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <div style="max-width: 550px; width: 100%; background: #ffffff; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); overflow: hidden; border: 1px solid #e2e8f0; margin: 0 auto;">
          <!-- Header Banner -->
          <div style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 30px 20px; text-align: center; color: #ffffff;">
            <div style="font-size: 32px; margin-bottom: 8px;">🛡️</div>
            <h2 style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase;">Cybersecurity Awareness Bulletin</h2>
            <div style="font-size: 13px; opacity: 0.85; margin-top: 5px; font-weight: 600; letter-spacing: 1px;">IMPORTANT SECURITY NOTICE</div>
          </div>
          
          <!-- Content Body -->
          <div style="padding: 30px;">
            <h3 style="font-size: 18px; color: #1a2332; margin: 0 0 15px 0; font-weight: 700;">Dear ${name},</h3>
            <p style="font-size: 15px; color: #4a5568; line-height: 1.6; margin: 0 0 20px 0;">
              An important security awareness notification has been issued by the TNEB Administration. Please review the details below carefully:
            </p>
            
            <!-- Highlight Box -->
            <div style="background: #f1f5f9; border-left: 4px solid #3b82f6; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
              <h4 style="margin: 0 0 10px 0; color: #1e3a8a; font-size: 16px; font-weight: 700;">
                Topic: ${title}
              </h4>
              <p style="margin: 0; font-size: 14px; color: #334155; line-height: 1.6; white-space: pre-wrap;">${description}</p>
            </div>
            
            <p style="font-size: 14px; color: #64748b; line-height: 1.5; margin: 0;">
              By maintaining high vigilance and following safe practices, you play a key role in safeguarding the Tamil Nadu Electricity Board's digital infrastructure.
            </p>
          </div>

          <!-- Footer -->
          <div style="background: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="margin: 0; font-size: 12px; color: #64748b; font-weight: 600;">
              Tamil Nadu Electricity Board (TNEB)
            </p>
            <p style="margin: 5px 0 0 0; font-size: 11px; color: #94a3b8;">
              This is a official broadcast sent to all active employees.
            </p>
          </div>
        </div>
      </div>
    `,
    attachments: attachment ? [attachment] : []
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Custom awareness email sent successfully to ${toEmail}. Message ID: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`Error sending custom awareness email to ${toEmail}:`, error);
    return writeEmailToLog(mailOptions, error);
  }
}

module.exports = {
  sendOtpEmail,
  sendLoginNotificationEmail,
  sendBirthdayGreetingEmail,
  getRandomCyberTip,
  CYBER_CAMPAIGN_CONTENT,
  sendCyberCampaignEmail,
  sendCustomAwarenessEmail
};
