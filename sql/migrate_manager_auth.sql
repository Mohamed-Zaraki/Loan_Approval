-- One-time migration for existing databases: add manager login fields.
USE `loan_approval_db`;

ALTER TABLE `bank_managers`
    ADD COLUMN `email` VARCHAR(254) NULL,
    ADD COLUMN `password_hash` VARCHAR(255) NULL,
    ADD UNIQUE INDEX `uq_bank_managers_email` (`email`);
