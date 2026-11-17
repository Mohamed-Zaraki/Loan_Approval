-- ========================================================================
-- Database Schema for Loan Approval Web App
-- Generated from UML Class Diagram (UML_Model_Loan_Approval.drawio)
-- Target Database: MySQL 8.0+
-- ========================================================================

CREATE DATABASE IF NOT EXISTS `loan_approval_db`
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE `loan_approval_db`;

-- Temporarily disable foreign key checks during schema creation/refresh
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `loan_decisions`;
DROP TABLE IF EXISTS `loan_applications`;
DROP TABLE IF EXISTS `applicants`;
DROP TABLE IF EXISTS `bank_managers`;

SET FOREIGN_KEY_CHECKS = 1;

-- ------------------------------------------------------------------------
-- Table: bank_managers
-- Represents: BankManager UML entity
-- Attributes: managerId (int), name (string)
-- ------------------------------------------------------------------------
CREATE TABLE `bank_managers` (
    `manager_id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(150) NOT NULL,
    `email` VARCHAR(254) NULL UNIQUE,
    `password_hash` VARCHAR(255) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------
-- Table: applicants
-- Represents: Applicant UML entity
-- Attributes:
--   applicantId (int), fullName (string), idCardNumber (string),
--   dateOfBirth (date), job (string), hasCDI (bool), isMarried (bool),
--   numberOfChildren (int)
-- ------------------------------------------------------------------------
CREATE TABLE `applicants` (
    `applicant_id` INT AUTO_INCREMENT PRIMARY KEY,
    `full_name` VARCHAR(150) NOT NULL,
    `id_card_number` VARCHAR(50) NOT NULL UNIQUE,
    `date_of_birth` DATE NOT NULL COMMENT 'Stored instead of an age so it never drifts',
    `job` VARCHAR(100) NULL,
    `has_cdi` BOOLEAN NOT NULL DEFAULT FALSE,
    `is_married` BOOLEAN NOT NULL DEFAULT FALSE,
    `number_of_children` INT NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    CONSTRAINT `chk_applicant_dob` CHECK (`date_of_birth` >= '1900-01-01'),
    CONSTRAINT `chk_applicant_children` CHECK (`number_of_children` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------
-- Table: loan_applications
-- Represents: LoanApplication UML entity
-- Attributes:
--   applicationId (int), monthlyIncome (float), totalDebt (float),
--   savings (float), incomeVerified (bool), loanAmount (float),
--   loanDuration (int), loanPurpose (string), missedPayments (int),
--   createdAt (datetime)
-- Relationships:
--   - Applicant "1" --> "0..*" LoanApplication : submits (Foreign Key: applicant_id)
--   - BankManager ..> LoanApplication : reviews (Foreign Key: reviewed_by_manager_id)
-- ------------------------------------------------------------------------
CREATE TABLE `loan_applications` (
    `application_id` INT AUTO_INCREMENT PRIMARY KEY,
    `applicant_id` INT NOT NULL,
    `monthly_income` DECIMAL(12, 2) NOT NULL,
    `total_debt` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `savings` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `income_verified` BOOLEAN NOT NULL DEFAULT FALSE,
    `income_document_name` VARCHAR(255) NULL,
    `income_document_type` VARCHAR(100) NULL,
    `income_document_size` INT NULL,
    `income_document_uploaded_at` DATETIME NULL,
    `income_document_data_url` LONGTEXT NULL,
    `loan_amount` DECIMAL(12, 2) NOT NULL,
    `loan_duration` INT NOT NULL COMMENT 'Duration in months',
    `loan_purpose` VARCHAR(255) NULL,
    `missed_payments` INT NOT NULL DEFAULT 0,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `reviewed_by_manager_id` INT NULL COMMENT 'BankManager who reviews the application',

    CONSTRAINT `fk_loan_app_applicant`
        FOREIGN KEY (`applicant_id`)
        REFERENCES `applicants` (`applicant_id`)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT `fk_loan_app_manager`
        FOREIGN KEY (`reviewed_by_manager_id`)
        REFERENCES `bank_managers` (`manager_id`)
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    CONSTRAINT `chk_monthly_income` CHECK (`monthly_income` >= 0),
    CONSTRAINT `chk_total_debt` CHECK (`total_debt` >= 0),
    CONSTRAINT `chk_savings` CHECK (`savings` >= 0),
    CONSTRAINT `chk_loan_amount` CHECK (`loan_amount` > 0),
    CONSTRAINT `chk_loan_duration` CHECK (`loan_duration` > 0),
    CONSTRAINT `chk_missed_payments` CHECK (`missed_payments` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------
-- Table: loan_decisions
-- Represents: LoanDecision UML entity
-- Attributes:
--   decisionId (int), status (string), reason (string), decisionDate (datetime)
-- Relationships:
--   - LoanApplication "1" --> "0..1" LoanDecision : receives (Foreign Key: application_id, UNIQUE)
--   - BankManager ..> LoanDecision : views / generates (Foreign Key: decided_by_manager_id)
-- ------------------------------------------------------------------------
CREATE TABLE `loan_decisions` (
    `decision_id` INT AUTO_INCREMENT PRIMARY KEY,
    `application_id` INT NOT NULL UNIQUE COMMENT '1:0..1 relationship with LoanApplication',
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `reason` TEXT NULL,
    `decision_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `decided_by_manager_id` INT NULL COMMENT 'BankManager who reviewed/approved the decision',

    CONSTRAINT `fk_loan_decision_app`
        FOREIGN KEY (`application_id`)
        REFERENCES `loan_applications` (`application_id`)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT `fk_loan_decision_manager`
        FOREIGN KEY (`decided_by_manager_id`)
        REFERENCES `bank_managers` (`manager_id`)
        ON DELETE SET NULL
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------
-- Indexes for Query Performance & Foreign Key Lookups
-- ------------------------------------------------------------------------
CREATE INDEX `idx_loan_apps_applicant` ON `loan_applications` (`applicant_id`);
CREATE INDEX `idx_loan_apps_created_at` ON `loan_applications` (`created_at`);
CREATE INDEX `idx_loan_decisions_status` ON `loan_decisions` (`status`);
