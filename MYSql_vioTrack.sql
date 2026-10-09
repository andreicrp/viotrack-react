-- ==============================================================================
-- VIOTRACK STUDENT WELFARE & DISCIPLINARY MANAGEMENT SYSTEM
-- COMPLETE MYSQL / MARIADB DATABASE SCHEMA & PRODUCTION BACKUP
-- File: MYSql_vioTrack.sql
-- Compatible with: MySQL 5.7 / 8.0+ & MariaDB 10.3+ (XAMPP, WAMP, Docker, phpMyAdmin)
-- Character Set: utf8mb4 | Collation: utf8mb4_unicode_ci
-- ==============================================================================

-- 1. DATABASE CREATION & INITIALIZATION
CREATE DATABASE IF NOT EXISTS `viotrack_db` 
    DEFAULT CHARACTER SET utf8mb4 
    DEFAULT COLLATE utf8mb4_unicode_ci;

USE `viotrack_db`;

-- Disable Foreign Key checks for clean table teardown and re-creation
SET FOREIGN_KEY_CHECKS = 0;

-- 2. DROP EXISTING TABLES IF RE-INITIALIZING
DROP TABLE IF EXISTS `sms_logs`;
DROP TABLE IF EXISTS `meetings`;
DROP TABLE IF EXISTS `activity_logs`;
DROP TABLE IF EXISTS `student_locations`;
DROP TABLE IF EXISTS `school_events`;
DROP TABLE IF EXISTS `records`;
DROP TABLE IF EXISTS `advisers`;
DROP TABLE IF EXISTS `violations`;
DROP TABLE IF EXISTS `violation_types`;
DROP TABLE IF EXISTS `teachers`;
DROP TABLE IF EXISTS `admins`;
DROP TABLE IF EXISTS `students`;

SET FOREIGN_KEY_CHECKS = 1;

-- ==============================================================================
-- 3. CORE DATABASE TABLES
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 3.1 STUDENTS MASTER TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE `students` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `student_id` VARCHAR(50) NOT NULL,
    `lrn` VARCHAR(50) GENERATED ALWAYS AS (`student_id`) VIRTUAL,
    `fname` VARCHAR(100) NOT NULL,
    `mname` VARCHAR(100) DEFAULT '',
    `lname` VARCHAR(100) NOT NULL,
    `email` VARCHAR(150) DEFAULT '',
    `grade` VARCHAR(20) NOT NULL,
    `section` VARCHAR(50) NOT NULL,
    `academicyear` VARCHAR(20) DEFAULT '2025-2026',
    `gender` ENUM('Male', 'Female', 'Other') DEFAULT 'Male',
    `contact` VARCHAR(30) DEFAULT '',
    `parent_name` VARCHAR(150) DEFAULT '',
    `parent_contact` VARCHAR(30) DEFAULT '',
    `address` TEXT,
    `password` VARCHAR(255) DEFAULT 'Viotrack@2026!',
    `image` LONGTEXT,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_students_student_id` (`student_id`),
    KEY `idx_students_grade_section` (`grade`, `section`),
    KEY `idx_students_academic_year` (`academicyear`),
    KEY `idx_students_full_name` (`lname`, `fname`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 3.2 ADMINISTRATORS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE `admins` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `fname` VARCHAR(100) NOT NULL,
    `mname` VARCHAR(100) DEFAULT '',
    `lname` VARCHAR(100) NOT NULL,
    `email` VARCHAR(150) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `role` VARCHAR(50) DEFAULT 'Head Admin',
    `position` VARCHAR(100) DEFAULT 'Discipline Officer',
    `contact` VARCHAR(30) DEFAULT '',
    `image` LONGTEXT,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_admins_email` (`email`),
    KEY `idx_admins_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 3.3 TEACHERS / FACULTY TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE `teachers` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `fname` VARCHAR(100) NOT NULL,
    `mname` VARCHAR(100) DEFAULT '',
    `lname` VARCHAR(100) NOT NULL,
    `email` VARCHAR(150) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `position` VARCHAR(100) DEFAULT 'Master Teacher I',
    `department` VARCHAR(100) DEFAULT 'Junior High School',
    `contact` VARCHAR(30) DEFAULT '',
    `gender` ENUM('Male', 'Female', 'Other') DEFAULT 'Male',
    `image` LONGTEXT,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_teachers_email` (`email`),
    KEY `idx_teachers_department` (`department`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 3.4 ADVISERS (Teacher Section Assignment Matrix)
-- ------------------------------------------------------------------------------
CREATE TABLE `advisers` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `teacher_id` BIGINT UNSIGNED NOT NULL,
    `grade_level` VARCHAR(20) NOT NULL,
    `class_section` VARCHAR(50) NOT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_advisers_section` (`grade_level`, `class_section`),
    KEY `idx_advisers_teacher` (`teacher_id`),
    CONSTRAINT `fk_advisers_teacher` FOREIGN KEY (`teacher_id`) 
        REFERENCES `teachers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 3.5 VIOLATIONS CODEBOOK (Student Code of Conduct Infractions)
-- ------------------------------------------------------------------------------
CREATE TABLE `violations` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(150) NOT NULL,
    `description` TEXT,
    `type` ENUM('Minor', 'Major') NOT NULL DEFAULT 'Minor',
    `severity` VARCHAR(30) DEFAULT 'Minor',
    `default_sanction` TEXT,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_violations_type` (`type`),
    KEY `idx_violations_severity` (`severity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 3.6 VIOLATION INCIDENT RECORDS
-- ------------------------------------------------------------------------------
CREATE TABLE `records` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `student_id` BIGINT UNSIGNED NOT NULL,
    `violation_id` BIGINT UNSIGNED DEFAULT NULL,
    `reported_by_id` BIGINT UNSIGNED DEFAULT NULL,
    `reported_by_type` ENUM('admin', 'teacher') DEFAULT 'admin',
    `reported_by_name` VARCHAR(150) DEFAULT NULL,
    `date_reported` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `status` ENUM('Pending', 'Investigation', 'Resolved', 'Dismissed', 'Under Approval', 'Rejected') DEFAULT 'Pending',
    `approval_status` ENUM('Under Approval', 'Approved', 'Rejected') DEFAULT 'Approved',
    `approved_by` VARCHAR(150) DEFAULT NULL,
    `approved_at` DATETIME DEFAULT NULL,
    `rejected_by` VARCHAR(150) DEFAULT NULL,
    `rejected_at` DATETIME DEFAULT NULL,
    `rejection_reason` TEXT,
    `sanction` TEXT,
    `remarks` TEXT,
    `resolution_notes` TEXT,
    `resolution_date` DATETIME DEFAULT NULL,
    `sms_notified` TINYINT(1) DEFAULT 0,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_records_student` (`student_id`),
    KEY `idx_records_violation` (`violation_id`),
    KEY `idx_records_status` (`status`),
    KEY `idx_records_approval` (`approval_status`),
    KEY `idx_records_date_reported` (`date_reported`),
    CONSTRAINT `fk_records_student` FOREIGN KEY (`student_id`) 
        REFERENCES `students` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_records_violation` FOREIGN KEY (`violation_id`) 
        REFERENCES `violations` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 3.7 REAL-TIME CAMPUS STUDENT GEOLOCATION TRACKING
-- ------------------------------------------------------------------------------
CREATE TABLE `student_locations` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `student_id` BIGINT UNSIGNED NOT NULL,
    `latitude` DECIMAL(10, 7) NOT NULL,
    `longitude` DECIMAL(10, 7) NOT NULL,
    `location_name` VARCHAR(150) NOT NULL,
    `status` VARCHAR(50) DEFAULT 'In Class',
    `timestamp` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_student_locations_student` (`student_id`),
    KEY `idx_student_locations_timestamp` (`timestamp`),
    CONSTRAINT `fk_locations_student` FOREIGN KEY (`student_id`) 
        REFERENCES `students` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 3.8 INSTITUTIONAL & CALENDAR EVENTS
-- ------------------------------------------------------------------------------
CREATE TABLE `school_events` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(150) NOT NULL,
    `description` TEXT,
    `event_date` DATE NOT NULL,
    `event_time` TIME DEFAULT '08:00:00',
    `venue` VARCHAR(150) DEFAULT 'Campus Quadrangle',
    `event_type` VARCHAR(50) DEFAULT 'Academic',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_events_date` (`event_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 3.9 IMMUTABLE AUDIT TRAIL ACTIVITY LOGS
-- ------------------------------------------------------------------------------
CREATE TABLE `activity_logs` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_name` VARCHAR(150) NOT NULL,
    `user_role` VARCHAR(50) NOT NULL,
    `action` VARCHAR(100) NOT NULL,
    `details` TEXT,
    `ip_address` VARCHAR(50) DEFAULT '127.0.0.1',
    `workstation` VARCHAR(100) DEFAULT 'Windows PC / Chrome Browser',
    `audit_hash` VARCHAR(64) DEFAULT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_activity_logs_created` (`created_at`),
    KEY `idx_activity_logs_action` (`action`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 3.10 PARENT-TEACHER & DISCIPLINARY CONFERENCES
-- ------------------------------------------------------------------------------
CREATE TABLE `meetings` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `record_id` BIGINT UNSIGNED DEFAULT NULL,
    `student_id` BIGINT UNSIGNED NOT NULL,
    `parent_name` VARCHAR(150) NOT NULL,
    `meeting_date` DATE NOT NULL,
    `meeting_time` TIME NOT NULL,
    `venue` VARCHAR(150) DEFAULT 'Prefect of Discipline Office',
    `status` ENUM('Scheduled', 'Completed', 'Cancelled', 'No Show') DEFAULT 'Scheduled',
    `notes` TEXT,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_meetings_student` (`student_id`),
    KEY `idx_meetings_record` (`record_id`),
    KEY `idx_meetings_date` (`meeting_date`),
    CONSTRAINT `fk_meetings_record` FOREIGN KEY (`record_id`) 
        REFERENCES `records` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_meetings_student` FOREIGN KEY (`student_id`) 
        REFERENCES `students` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 3.11 SMS NOTIFICATION & DISPATCH LOGS
-- ------------------------------------------------------------------------------
CREATE TABLE `sms_logs` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `student_id` BIGINT UNSIGNED NOT NULL,
    `record_id` BIGINT UNSIGNED DEFAULT NULL,
    `recipient_name` VARCHAR(150) DEFAULT NULL,
    `phone_number` VARCHAR(30) NOT NULL,
    `message` TEXT NOT NULL,
    `status` VARCHAR(20) DEFAULT 'Sent',
    `sent_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_sms_logs_student` (`student_id`),
    KEY `idx_sms_logs_record` (`record_id`),
    CONSTRAINT `fk_sms_student` FOREIGN KEY (`student_id`) 
        REFERENCES `students` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_sms_record` FOREIGN KEY (`record_id`) 
        REFERENCES `records` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- 4. OFFICIAL INSTITUTIONAL SEED DATA
-- ==============================================================================

-- 4.1 Sample Administrators
INSERT INTO `admins` (`id`, `fname`, `mname`, `lname`, `email`, `password`, `role`, `position`) VALUES
(1, 'Sheryl', 'B.', 'Gamboa', 'admin@phcmanila.edu.ph', 'Viotrack@2026!', 'Head Admin', 'Head of Student Affairs'),
(2, 'System', '', 'Administrator', 'admin@viotrack.edu', 'admin123', 'System Admin', 'IT & Systems Security Lead'),
(3, 'Maria', 'L.', 'Santos', 'maria.santos@viotrack.edu', 'admin123', 'Discipline Officer', 'Guidance & Conduct Officer');

-- 4.2 Sample Teachers
INSERT INTO `teachers` (`id`, `fname`, `mname`, `lname`, `email`, `password`, `position`, `department`, `contact`, `gender`) VALUES
(1, 'Juan', 'D.', 'Dela Cruz', 'juan.delacruz@viotrack.edu', 'teacher123', 'Master Teacher I', 'Science Department', '09171234567', 'Male'),
(2, 'Elena', 'M.', 'Reyes', 'elena.reyes@viotrack.edu', 'teacher123', 'Teacher III', 'Mathematics Department', '09181234568', 'Female'),
(3, 'Roberto', 'C.', 'Aquino', 'roberto.aquino@viotrack.edu', 'teacher123', 'Teacher II', 'English Department', '09191234569', 'Male'),
(4, 'Carmela', 'S.', 'Bautista', 'carmela.bautista@viotrack.edu', 'teacher123', 'Teacher I', 'Social Studies Department', '09153334411', 'Female'),
(5, 'Fernando', 'T.', 'Perez', 'fernando.perez@viotrack.edu', 'teacher123', 'Senior High Instructor', 'TVL Track', '09154445522', 'Male');

-- 4.3 Sample Class Advisers
INSERT INTO `advisers` (`id`, `teacher_id`, `grade_level`, `class_section`) VALUES
(1, 1, 'Grade 10', 'Rizal'),
(2, 2, 'Grade 10', 'Bonifacio'),
(3, 3, 'Grade 11', 'STEM A'),
(4, 4, 'Grade 9', 'Diamond'),
(5, 5, 'Grade 12', 'ICT 1');

-- 4.4 Official Violation Codebook
INSERT INTO `violations` (`id`, `title`, `description`, `type`, `severity`, `default_sanction`) VALUES
(1, 'Improper Uniform / Haircut', 'Failure to wear standard school uniform, ID badge, or comply with haircut policy', 'Minor', 'Minor', 'Verbal Warning / Written Promise'),
(2, 'Tardiness / Class Cutting', 'Unexcused late arrival or skipping class periods without official pass', 'Minor', 'Minor', '1 Hour Campus Service'),
(3, 'Use of Mobile Device During Class', 'Unauthorized phone, tablet, or gaming device usage during instruction hours', 'Minor', 'Minor', 'Device confiscation until dismissal'),
(4, 'Littering / Waste Disposal Non-Compliance', 'Improper disposal of trash or food wrappers on campus grounds', 'Minor', 'Minor', 'Campus Beautification Duty'),
(5, 'Bullying / Harassment', 'Physical, verbal, psychological, or cyber bullying towards peers or staff', 'Major', 'Major', '3-Day Suspension & Parent Conference'),
(6, 'Vandalism / Property Damage', 'Defacing school property, armchairs, walls, or science laboratory equipment', 'Major', 'Major', 'Restitution & Disciplinary Probation'),
(7, 'Possession of Prohibited Items', 'Bringing unauthorized harmful items, vape, or contraband to school grounds', 'Major', 'Major', 'Parent Conference & Guidance Referral'),
(8, 'Cheating / Academic Dishonesty', 'Copying during examinations, unauthorized notes, or submitting plagiarized outputs', 'Major', 'Major', 'Zero Score & Formal Reprimand'),
(9, 'Physical Altercation / Fighting', 'Engaging in violent fights, physical assaults, or instigating brawls', 'Major', 'Major', '5-Day Suspension & Corrective Action Plan');

-- 4.5 Sample Enrolled Students
INSERT INTO `students` (`id`, `student_id`, `fname`, `mname`, `lname`, `grade`, `section`, `academicyear`, `gender`, `contact`, `parent_name`, `parent_contact`, `address`, `image`) VALUES
(1, '109283746101', 'Alexander', 'Cruz', 'Mendoza', 'Grade 10', 'Rizal', '2025-2026', 'Male', '09151112233', 'Carlos Mendoza', '09151112234', '124 Rizal St, Sampaloc, Manila', 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80'),
(2, '109283746102', 'Sophia', 'Grace', 'Villanueva', 'Grade 10', 'Rizal', '2025-2026', 'Female', '09152223344', 'Lorena Villanueva', '09152223345', '45 Mabini Ave, Quezon City', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80'),
(3, '109283746103', 'Gabriel', 'Luis', 'Torres', 'Grade 10', 'Bonifacio', '2025-2026', 'Male', '09153334455', 'Ramon Torres', '09153334456', '88 Aurora Blvd, San Juan', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'),
(4, '109283746104', 'Isabella', 'Marie', 'Ramos', 'Grade 11', 'STEM A', '2025-2026', 'Female', '09154445566', 'Patricia Ramos', '09154445567', '73 Commonwealth Ave, QC', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80'),
(5, '109283746105', 'Christian', 'Paul', 'Navarro', 'Grade 11', 'STEM A', '2025-2026', 'Male', '09155556677', 'Dennis Navarro', '09155556678', '19 Espana Blvd, Manila', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80'),
(6, '109283746106', 'Jasmine', 'Rose', 'Castillo', 'Grade 9', 'Diamond', '2025-2026', 'Female', '09156667788', 'Lita Castillo', '09156667789', '210 Taft Avenue, Pasay', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80');

-- 4.6 Sample Disciplinary Incident Records
INSERT INTO `records` (`id`, `student_id`, `violation_id`, `reported_by_type`, `reported_by_name`, `date_reported`, `status`, `approval_status`, `approved_by`, `approved_at`, `sanction`, `remarks`, `resolution_notes`, `sms_notified`) VALUES
(1, 1, 1, 'teacher', 'Juan Dela Cruz', DATE_SUB(NOW(), INTERVAL 2 DAY), 'Resolved', 'Approved', 'System Admin', DATE_SUB(NOW(), INTERVAL 2 DAY), 'Verbal Warning', 'Forgot school necktie and ID badge.', 'Student complied the following day and signed acknowledgment.', 1),
(2, 1, 2, 'admin', 'System Admin', DATE_SUB(NOW(), INTERVAL 5 HOUR), 'Pending', 'Approved', 'System Admin', DATE_SUB(NOW(), INTERVAL 5 HOUR), '1 Hour Campus Service', 'Arrived 40 minutes late without authorized excuse slip.', '', 1),
(3, 3, 5, 'teacher', 'Elena Reyes', DATE_SUB(NOW(), INTERVAL 1 DAY), 'Investigation', 'Approved', 'System Admin', DATE_SUB(NOW(), INTERVAL 1 DAY), 'Parent Conference', 'Involved in a verbal altercation in 2nd floor hallway.', 'Scheduled parent discussion on Friday.', 1),
(4, 4, 3, 'teacher', 'Roberto Aquino', DATE_SUB(NOW(), INTERVAL 3 DAY), 'Resolved', 'Approved', 'System Admin', DATE_SUB(NOW(), INTERVAL 3 DAY), 'Device Confiscation', 'Playing mobile games during Chemistry lab instruction.', 'Device returned to parent upon conference.', 1),
(5, 5, 6, 'admin', 'System Admin', DATE_SUB(NOW(), INTERVAL 4 DAY), 'Pending', 'Approved', 'System Admin', DATE_SUB(NOW(), INTERVAL 4 DAY), 'Desk Restitution', 'Graffiti drawing on classroom desk.', '', 0),
(6, 2, 2, 'teacher', 'Elena Reyes', DATE_SUB(NOW(), INTERVAL 3 HOUR), 'Under Approval', 'Under Approval', NULL, NULL, 'Pending Admin Review', 'Repeated tardiness in morning homeroom period.', '', 0);

-- 4.7 Sample Student Locations (Campus Map)
INSERT INTO `student_locations` (`id`, `student_id`, `latitude`, `longitude`, `location_name`, `status`) VALUES
(1, 1, 14.6042000, 120.9893000, 'Main Building - Room 204', 'In Class'),
(2, 2, 14.6045000, 120.9897000, 'School Library - 3rd Floor', 'Study Period'),
(3, 3, 14.6039000, 120.9889000, 'Discipline Office - Admin Bldg', 'Counseling Session'),
(4, 4, 14.6048000, 120.9902000, 'Science Laboratory 2', 'Lab Activity'),
(5, 5, 14.6035000, 120.9885000, 'Campus Gymnasium', 'PE Class');

-- 4.8 Sample Institutional Activity & Audit Logs
INSERT INTO `activity_logs` (`id`, `user_name`, `user_role`, `action`, `details`, `ip_address`, `workstation`, `audit_hash`) VALUES
(1, 'System Admin', 'Head Admin', 'Login', 'Administrator logged into VioTrack secure portal', '192.168.1.10', 'Windows 11 / Chrome 124', '7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069'),
(2, 'Juan Dela Cruz', 'Faculty Teacher', 'Add Violation', 'Reported Minor infraction for Alexander Mendoza (ID: 109283746101)', '192.168.1.45', 'Staff Workstation #04', 'b2c92e93b1b9e2815ff8e2a39281a65dfc2d4b1fa3d677284addd200126d9101'),
(3, 'System Admin', 'Head Admin', 'Status Update', 'Marked incident record #1 as Resolved following compliance', '192.168.1.10', 'Windows 11 / Chrome 124', 'a89c2e93b1b9e2815ff8e2a39281a65dfc2d4b1fa3d677284addd200126d9202'),
(4, 'Elena Reyes', 'Faculty Teacher', 'SMS Notification', 'Dispatched official summons SMS to parent Carlos Mendoza', '192.168.1.52', 'Staff Workstation #12', 'c91e2e93b1b9e2815ff8e2a39281a65dfc2d4b1fa3d677284addd200126d9303');

-- 4.9 Sample School Calendar Events
INSERT INTO `school_events` (`id`, `title`, `description`, `event_date`, `event_time`, `venue`, `event_type`) VALUES
(1, 'General Faculty & Discipline Assembly', 'Mandatory orientation on DepEd Order 40 & campus welfare protocol', CURDATE() + INTERVAL 2 DAY, '08:30:00', 'University Auditorium', 'Institutional'),
(2, 'Quarterly Parent-Teacher Disciplinary Review', 'Formal conference for students with multiple unresolved infraction points', CURDATE() + INTERVAL 5 DAY, '10:00:00', 'Prefect Conference Room 204', 'Guidance');

-- Enable Foreign Key checks
SET FOREIGN_KEY_CHECKS = 1;
