CREATE DATABASE IF NOT EXISTS tneb_eems;
USE tneb_eems;

-- Drop tables if exist (in reverse FK order)
DROP TABLE IF EXISTS system_settings;
DROP TABLE IF EXISTS scheduled_campaigns;
DROP TABLE IF EXISTS retirement_archive;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS email_mapping_requests;
DROP TABLE IF EXISTS admins;
DROP TABLE IF EXISTS managers;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS email_master;
DROP TABLE IF EXISTS employees;

CREATE TABLE employees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id VARCHAR(8) UNIQUE NOT NULL,
  name VARCHAR(150),
  designation VARCHAR(50) DEFAULT NULL,
  date_of_birth DATE,
  name_based_email VARCHAR(255) UNIQUE,
  phone_number VARCHAR(15) UNIQUE,
  district VARCHAR(100),
  position_id VARCHAR(9) UNIQUE,
  is_active BOOLEAN DEFAULT TRUE,
  login INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE email_master (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id VARCHAR(8),
  position_id VARCHAR(9) UNIQUE,
  designation_email VARCHAR(255) UNIQUE,
  district VARCHAR(100),
  password VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  session_token VARCHAR(1000) DEFAULT NULL,
  session_expires_at TIMESTAMP NULL DEFAULT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON UPDATE CASCADE
);

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id VARCHAR(8),
  name VARCHAR(150),
  email VARCHAR(255) UNIQUE,
  username VARCHAR(100) UNIQUE,
  password VARCHAR(255),
  role ENUM('ADMIN','MANAGER'),
  user_id VARCHAR(50) UNIQUE,
  district VARCHAR(100),
  is_view_admin BOOLEAN DEFAULT FALSE,
  session_token VARCHAR(1000) DEFAULT NULL,
  session_expires_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON UPDATE CASCADE
);

CREATE TABLE managers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  manager_unique_id VARCHAR(50) UNIQUE,
  employee_id VARCHAR(8),
  token_number VARCHAR(9),
  email VARCHAR(255),
  district VARCHAR(100),
  password VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  failed_login_attempts INT DEFAULT 0,
  freeze_until TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON UPDATE CASCADE
);

CREATE TABLE admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  admin_unique_id VARCHAR(50) UNIQUE,
  employee_id VARCHAR(8),
  token_number VARCHAR(9),
  email VARCHAR(255),
  district VARCHAR(100),
  password VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  is_view_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON UPDATE CASCADE
);

CREATE TABLE email_mapping_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id VARCHAR(8),
  position_id VARCHAR(9),
  email_id VARCHAR(255),
  district VARCHAR(100),
  password VARCHAR(255),
  is_approved BOOLEAN DEFAULT 0,
  status ENUM('PENDING','APPROVED','REJECTED') DEFAULT 'PENDING',
  request_type ENUM('EDIT_REQUEST','TRANSFER','CORRECTION','PERMISSION','GENERAL') DEFAULT 'EDIT_REQUEST',
  subject VARCHAR(255),
  comments TEXT,
  requested_by VARCHAR(50),
  approved_by VARCHAR(50),
  editable_columns JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(50),
  title VARCHAR(255),
  message TEXT,
  type VARCHAR(50) DEFAULT 'INFO',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(50),
  role VARCHAR(50),
  action VARCHAR(255),
  login INT DEFAULT 0,
  table_name VARCHAR(100),
  record_id VARCHAR(100),
  old_value JSON,
  new_value JSON,
  ip_address VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE retirement_archive (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id VARCHAR(8),
  position_id VARCHAR(9),
  archived_data JSON,
  retired_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE scheduled_campaigns (
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
);

CREATE TABLE system_settings (
  setting_key VARCHAR(100) PRIMARY KEY,
  setting_value VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO system_settings (setting_key, setting_value) VALUES 
('cyber_campaign_start_date', '2026-06-16'),
('cyber_campaign_end_date', '2026-06-22')
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);
