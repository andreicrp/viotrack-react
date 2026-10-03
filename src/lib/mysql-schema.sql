-- ==========================================================
-- VIOTRACK MYSQL DATABASE SCHEMA & STARTER SEED DATA
-- Compatible with MySQL 5.7 / 8.0+ & MariaDB (XAMPP / WAMP / Windows Server)
-- ==========================================================

-- 1. Create Database
CREATE DATABASE IF NOT EXISTS viotrack_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE viotrack_db;

-- 2. Drop existing tables if re-initializing (FK dependency order)
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS sms_logs;
DROP TABLE IF EXISTS meetings;
DROP TABLE IF EXISTS activity_logs;
DROP TABLE IF EXISTS records;
DROP TABLE IF EXISTS student_locations;
DROP TABLE IF EXISTS school_events;
DROP TABLE IF EXISTS advisers;
DROP TABLE IF EXISTS violations;
DROP TABLE IF EXISTS teachers;
DROP TABLE IF EXISTS admins;
DROP TABLE IF EXISTS students;
SET FOREIGN_KEY_CHECKS = 1;

-- ==========================================================
-- 3. CREATE TABLES
-- ==========================================================

-- STUDENTS TABLE
CREATE TABLE students (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    lrn VARCHAR(50) NOT NULL UNIQUE,
    fname VARCHAR(100) NOT NULL,
    mname VARCHAR(100) DEFAULT '',
    lname VARCHAR(100) NOT NULL,
    email VARCHAR(150) DEFAULT '',
    password VARCHAR(255) DEFAULT 'Viotrack@2026!',
    grade VARCHAR(20) NOT NULL,
    section VARCHAR(50) NOT NULL,
    academicyear VARCHAR(20) DEFAULT '2025-2026',
    gender VARCHAR(10) DEFAULT 'Male',
    contact VARCHAR(30) DEFAULT '',
    parent_name VARCHAR(150) DEFAULT '',
    parent_contact VARCHAR(30) DEFAULT '',
    address TEXT,
    image TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ADMINS TABLE
CREATE TABLE admins (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    fname VARCHAR(100) NOT NULL,
    mname VARCHAR(100) DEFAULT '',
    lname VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL DEFAULT 'Viotrack@2026!',
    role VARCHAR(50) DEFAULT 'Head Admin',
    position VARCHAR(100) DEFAULT 'Discipline Staff',
    contact VARCHAR(30) DEFAULT '',
    image TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- TEACHERS TABLE
CREATE TABLE teachers (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    fname VARCHAR(100) NOT NULL,
    mname VARCHAR(100) DEFAULT '',
    lname VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL DEFAULT 'Viotrack@2026!',
    position VARCHAR(100) DEFAULT 'Teacher I',
    department VARCHAR(100) DEFAULT 'Junior High School',
    contact VARCHAR(30) DEFAULT '',
    image TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ADVISERS (Teacher Section Assignments)
CREATE TABLE advisers (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    teacher_id BIGINT NOT NULL,
    grade_level VARCHAR(20) NOT NULL,
    class_section VARCHAR(50) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_section (grade_level, class_section),
    CONSTRAINT fk_advisers_teacher FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- VIOLATION DEFINITIONS & CATEGORIES
CREATE TABLE violations (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    type ENUM('Minor', 'Major') NOT NULL DEFAULT 'Minor',
    default_sanction TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- INCIDENT & DISCIPLINARY RECORDS
CREATE TABLE records (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    student_id BIGINT NOT NULL,
    violation_id BIGINT NULL,
    reported_by_id BIGINT NULL,
    reported_by_type VARCHAR(20) DEFAULT 'admin', -- 'admin' or 'teacher'
    reported_by_name VARCHAR(150),
    date_reported DATETIME DEFAULT CURRENT_TIMESTAMP,
    status ENUM('Pending', 'Investigation', 'Resolved', 'Dismissed', 'Under Approval', 'Rejected') DEFAULT 'Pending',
    approval_status ENUM('Under Approval', 'Approved', 'Rejected') DEFAULT 'Approved',
    approved_by VARCHAR(150) NULL,
    approved_at DATETIME NULL,
    rejected_by VARCHAR(150) NULL,
    rejected_at DATETIME NULL,
    rejection_reason TEXT NULL,
    sanction TEXT,
    remarks TEXT,
    resolution_notes TEXT,
    resolution_date DATETIME NULL,
    sms_notified TINYINT(1) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_records_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    CONSTRAINT fk_records_violation FOREIGN KEY (violation_id) REFERENCES violations(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- LIVE GPS & TELEMETRY LOCATIONS
CREATE TABLE student_locations (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    student_id BIGINT NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy_meters INT DEFAULT 10,
    tracking_status VARCHAR(50) DEFAULT 'Active',
    reported_by VARCHAR(150) DEFAULT 'System',
    recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_locations_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- SCHOOL CALENDAR EVENTS
CREATE TABLE school_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    date DATE NOT NULL,
    time VARCHAR(100) DEFAULT '',
    location VARCHAR(200) DEFAULT '',
    category VARCHAR(50) DEFAULT 'academic',
    categoryLabel VARCHAR(100) DEFAULT 'Academic',
    color VARCHAR(20) DEFAULT '#07345f',
    description TEXT,
    attendees VARCHAR(200) DEFAULT 'All Students',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ACTIVITY & AUDIT LOGS
CREATE TABLE activity_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_name VARCHAR(150) NOT NULL,
    user_role VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    details TEXT,
    ip_address VARCHAR(50) DEFAULT '127.0.0.1',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- PARENT-TEACHER CONFERENCES & MEETINGS
CREATE TABLE meetings (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    record_id BIGINT NOT NULL,
    student_id BIGINT NOT NULL,
    parent_name VARCHAR(150) NOT NULL,
    meeting_date DATE NOT NULL,
    meeting_time TIME NOT NULL,
    status ENUM('Scheduled', 'Completed', 'Cancelled', 'No Show') DEFAULT 'Scheduled',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_meetings_record FOREIGN KEY (record_id) REFERENCES records(id) ON DELETE CASCADE,
    CONSTRAINT fk_meetings_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- SMS NOTIFICATION LOGS
CREATE TABLE sms_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    student_id BIGINT NOT NULL,
    record_id BIGINT NULL,
    recipient_name VARCHAR(150),
    phone_number VARCHAR(30) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'Sent',
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sms_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    CONSTRAINT fk_sms_record FOREIGN KEY (record_id) REFERENCES records(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==========================================================
-- 4. STARTER SEED DATA
-- ==========================================================

-- Default Admins
INSERT INTO admins (fname, lname, email, password, role, position) VALUES
('Sheryl', 'Gamboa', 'admin@viotrack.edu', 'Viotrack@2026!', 'Head Admin', 'Head of Student Affairs'),
('Maria', 'Santos', 'maria.santos@viotrack.edu', 'Viotrack@2026!', 'Discipline Officer', 'Discipline Officer');

-- Default Teachers
INSERT INTO teachers (fname, lname, email, password, position, department, contact) VALUES
('Juan', 'Dela Cruz', 'juan.delacruz@viotrack.edu', 'Viotrack@2026!', 'Master Teacher I', 'Science Department', '09171234567'),
('Elena', 'Reyes', 'elena.reyes@viotrack.edu', 'Viotrack@2026!', 'Teacher III', 'Mathematics Department', '09181234568'),
('Roberto', 'Aquino', 'roberto.aquino@viotrack.edu', 'Viotrack@2026!', 'Teacher II', 'English Department', '09191234569');

-- Default Adviser Assignments
INSERT INTO advisers (teacher_id, grade_level, class_section) VALUES
(1, 'Grade 10', 'Rizal'),
(2, 'Grade 10', 'Bonifacio'),
(3, 'Grade 11', 'STEM A');

-- Default Violation Types
INSERT INTO violations (title, description, type, default_sanction) VALUES
('Improper Uniform / Haircut', 'Failure to wear standard school uniform or comply with grooming policy', 'Minor', 'Verbal Warning / Written Acknowledgment'),
('Tardiness / Class Cutting', 'Unexcused late arrival or skipping class periods without official slip', 'Minor', '1 Hour School Community Service'),
('Use of Mobile Device During Class', 'Unauthorized phone/tablet usage during active instruction hours', 'Minor', 'Device confiscation until dismissal'),
('Bullying / Harassment', 'Physical, verbal, or cyber intimidation towards peers or staff', 'Major', '3-Day Suspension & Parent Conference'),
('Vandalism / Property Damage', 'Defacing school property, chairs, walls, or laboratory equipment', 'Major', 'Restitution Repair Cost & Parent Conference');

-- Default Sample Students
INSERT INTO students (lrn, fname, mname, lname, email, password, grade, section, academicyear, gender, contact, parent_name, parent_contact, address) VALUES
('10101010101', 'Alexander', 'M.', 'Mendoza', 'alexander.mendoza@viotrack.edu', 'Viotrack@2026!', 'Grade 10', 'Rizal', '2025-2026', 'Male', '09171112233', 'Eduardo Mendoza', '09171112234', '124 San Marcelino St, Manila'),
('10101010102', 'Bea', 'S.', 'Alcantara', 'bea.alcantara@viotrack.edu', 'Viotrack@2026!', 'Grade 10', 'Bonifacio', '2025-2026', 'Female', '09182223344', 'Rowena Alcantara', '09182223345', '458 Pedro Gil St, Paco, Manila'),
('10101010103', 'Christian', 'D.', 'Valdez', 'christian.valdez@viotrack.edu', 'Viotrack@2026!', 'Grade 11', 'STEM A', '2025-2026', 'Male', '09193334455', 'Carlos Valdez', '09193334456', '891 Quirino Avenue, Malate, Manila');
