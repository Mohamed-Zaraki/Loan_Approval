-- One-time migration for databases created before the LoanFlow API integration.
-- Run this only when these document metadata columns do not exist yet.
USE `loan_approval_db`;

ALTER TABLE `loan_applications`
    ADD COLUMN `income_document_name` VARCHAR(255) NULL,
    ADD COLUMN `income_document_type` VARCHAR(100) NULL,
    ADD COLUMN `income_document_size` INT NULL,
    ADD COLUMN `income_document_uploaded_at` DATETIME NULL,
    ADD COLUMN `income_document_data_url` LONGTEXT NULL;
