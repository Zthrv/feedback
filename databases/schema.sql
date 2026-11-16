/* ===========================================================
   SCHEMA — reconstructed from the queries in backend/src/models.
   Run this before seed_feedback.sql.
   =========================================================== */

CREATE DATABASE IF NOT EXISTS feedback_system
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE feedback_system;

CREATE TABLE IF NOT EXISTS users (
  user_id       INT AUTO_INCREMENT PRIMARY KEY,
  employee_id   VARCHAR(20)  NOT NULL UNIQUE,
  full_name     VARCHAR(100) NOT NULL,
  email         VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NULL,
  password_changed_at DATETIME NULL,
  /* Set by POST /api/auth/logout: tokens issued before it are rejected.
     Existing databases: ALTER TABLE users ADD COLUMN logged_out_at DATETIME NULL AFTER password_changed_at; */
  logged_out_at DATETIME NULL,
  department    VARCHAR(100) NULL,
  designation   VARCHAR(100) NULL,
  role          ENUM('Employee','Admin') NOT NULL DEFAULT 'Employee',
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  is_registered BOOLEAN NOT NULL DEFAULT FALSE,
  /* All that is kept about what a person has sent: two counts and how the last one went */
  feedback_sent    INT NOT NULL DEFAULT 0,
  feedback_bounced INT NOT NULL DEFAULT 0,
  last_feedback_status ENUM('sent','bounced') NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS attributes (
  attribute_id   INT AUTO_INCREMENT PRIMARY KEY,
  attribute_name VARCHAR(50)  NOT NULL UNIQUE,
  description    VARCHAR(255) NULL,
  icon_name      VARCHAR(50)  NULL,
  display_order  INT NOT NULL DEFAULT 0
);

/* Feedback is anonymous. sender_id is filled only while the feedback is waiting for its
   language check, so a bounce can be reported back, and is erased as soon as that finishes. */
CREATE TABLE IF NOT EXISTS feedback (
  feedback_id    INT AUTO_INCREMENT PRIMARY KEY,
  receiver_id    INT NOT NULL,
  sender_id      INT NULL,
  feedback_title VARCHAR(150) NOT NULL,
  feedback_text  TEXT NOT NULL,
  classification_status ENUM('pending','done') NOT NULL DEFAULT 'pending',
  classification_source ENUM('bert','llm') NULL,
  review_status ENUM('requested','done') NULL,
  abuse_checked BOOLEAN NOT NULL DEFAULT FALSE,
  abuse_status  ENUM('requested','done') NULL,
  irrelevant_status ENUM('requested','done') NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (receiver_id) REFERENCES users(user_id),
  FOREIGN KEY (sender_id)   REFERENCES users(user_id) ON DELETE SET NULL
);

/* Feedback that was blocked or removed as abusive, shown read-only to admins.
   category: sexual, threat, insult, identity, obscene, toxic or NULL.
   detected_by: wordlist, vectors, bert, llm or report. There is no sender here.
   Existing databases:
     ALTER TABLE abuse_log ADD COLUMN category VARCHAR(20) NULL,
       ADD COLUMN detected_by VARCHAR(20) NOT NULL DEFAULT 'report'; */
CREATE TABLE IF NOT EXISTS abuse_log (
  log_id         INT AUTO_INCREMENT PRIMARY KEY,
  receiver_id    INT NOT NULL,
  feedback_title VARCHAR(150) NOT NULL,
  feedback_text  TEXT NOT NULL,
  category       VARCHAR(20) NULL,
  detected_by    VARCHAR(20) NOT NULL DEFAULT 'report',
  removed_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (receiver_id) REFERENCES users(user_id) ON DELETE CASCADE
);

/* One feedback can cover several attributes, each with its own type. */
CREATE TABLE IF NOT EXISTS feedback_attributes (
  feedback_id   INT NOT NULL,
  attribute_id  INT NOT NULL,
  feedback_type ENUM('Positive','Negative','Neutral') NOT NULL,
  PRIMARY KEY (feedback_id, attribute_id),
  FOREIGN KEY (feedback_id)  REFERENCES feedback(feedback_id) ON DELETE CASCADE,
  FOREIGN KEY (attribute_id) REFERENCES attributes(attribute_id)
);

CREATE TABLE IF NOT EXISTS password_resets (
  user_id    INT PRIMARY KEY,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

/* ===========================================================
   DEMO USERS — all registered with password: Password@123
   =========================================================== */

INSERT IGNORE INTO users
(user_id, employee_id, full_name, email, password_hash, department, designation, role, is_registered)
VALUES
(1, 'EMP001','Admin User',    'admin@cdis.com',  '$2b$10$Jcdnb8mr/CseXPRjeYReZODAgk6pcWxcGqBjsuP2FmdKouTLxDIpm','Management', 'Administrator',    'Admin',   TRUE),
(2, 'EMP002','Aarav Sharma',  'aarav@cdis.com',  '$2b$10$Jcdnb8mr/CseXPRjeYReZODAgk6pcWxcGqBjsuP2FmdKouTLxDIpm','Engineering','Team Lead',        'Employee',TRUE),
(3, 'EMP003','Priya Verma',   'priya@cdis.com',  '$2b$10$Jcdnb8mr/CseXPRjeYReZODAgk6pcWxcGqBjsuP2FmdKouTLxDIpm','Engineering','Software Engineer','Employee',TRUE),
(4, 'EMP004','Rohan Mehta',   'rohan@cdis.com',  '$2b$10$Jcdnb8mr/CseXPRjeYReZODAgk6pcWxcGqBjsuP2FmdKouTLxDIpm','Engineering','Software Engineer','Employee',TRUE),
(5, 'EMP005','Sneha Iyer',    'sneha@cdis.com',  '$2b$10$Jcdnb8mr/CseXPRjeYReZODAgk6pcWxcGqBjsuP2FmdKouTLxDIpm','Design',     'UI Designer',      'Employee',TRUE),
(6, 'EMP006','Vikram Singh',  'vikram@cdis.com', '$2b$10$Jcdnb8mr/CseXPRjeYReZODAgk6pcWxcGqBjsuP2FmdKouTLxDIpm','Product',    'Product Manager',  'Employee',TRUE),
(7, 'EMP007','Ananya Gupta',  'ananya@cdis.com', '$2b$10$Jcdnb8mr/CseXPRjeYReZODAgk6pcWxcGqBjsuP2FmdKouTLxDIpm','QA',         'QA Engineer',      'Employee',TRUE),
(8, 'EMP008','Karan Patel',   'karan@cdis.com',  '$2b$10$Jcdnb8mr/CseXPRjeYReZODAgk6pcWxcGqBjsuP2FmdKouTLxDIpm','Engineering','DevOps Engineer',  'Employee',TRUE),
(9, 'EMP009','Neha Joshi',    'neha@cdis.com',   '$2b$10$Jcdnb8mr/CseXPRjeYReZODAgk6pcWxcGqBjsuP2FmdKouTLxDIpm','HR',         'HR Executive',     'Employee',TRUE),
(10,'EMP010','Arjun Nair',    'arjun@cdis.com',  '$2b$10$Jcdnb8mr/CseXPRjeYReZODAgk6pcWxcGqBjsuP2FmdKouTLxDIpm','Sales',      'Sales Associate',  'Employee',TRUE);

/* ===========================================================
   ATTRIBUTES — IDs match the headings in seed_feedback.sql
   =========================================================== */

INSERT IGNORE INTO attributes
(attribute_id, attribute_name, description, icon_name, display_order)
VALUES
(1, 'Leadership',     'Guides and motivates others toward shared goals.',     'Trophy',         1),
(2, 'Productivity',   'Delivers consistent output and meets targets.',        'TrendingUp',     2),
(3, 'Work Quality',   'Produces accurate, thorough and reliable work.',       'Scale',          3),
(4, 'Teamwork',       'Collaborates well and supports teammates.',            'Handshake',      4),
(5, 'Reliability',    'Can be depended on to follow through.',                'Flag',           5),
(6, 'Communication',  'Shares information clearly and listens actively.',     'MessageCircle',  6),
(7, 'Innovation',     'Brings new ideas and improves how things are done.',   'Lightbulb',      7),
(8, 'Adaptability',   'Adjusts quickly to change and new challenges.',        'Sprout',         8),
(9, 'Accountability', 'Takes ownership of actions and outcomes.',             'ClipboardCheck', 9),
(10,'Time Management','Prioritises well and meets deadlines.',                'Clock3',         10);
