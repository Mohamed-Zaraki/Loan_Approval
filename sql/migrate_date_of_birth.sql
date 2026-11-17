-- Replace the stored applicant age with a real date of birth.
-- Run once on an existing database. Fresh databases get date_of_birth from
-- sql/schema.sql, so they do not need this file.
--
-- The old schema only stored an age, so the backfill anchors each applicant's
-- birth date to today and keeps the same age. The exact birth day/month was
-- never known and cannot be recovered.

USE `loan_approval_db`;

ALTER TABLE `applicants`
    ADD COLUMN `date_of_birth` DATE NULL AFTER `full_name`;

UPDATE `applicants`
SET `date_of_birth` = DATE_SUB(CURDATE(), INTERVAL `age` YEAR)
WHERE `date_of_birth` IS NULL;

ALTER TABLE `applicants`
    MODIFY COLUMN `date_of_birth` DATE NOT NULL
    COMMENT 'Stored instead of an age so it never drifts';

ALTER TABLE `applicants`
    DROP CHECK `chk_applicant_age`;

ALTER TABLE `applicants`
    ADD CONSTRAINT `chk_applicant_dob` CHECK (`date_of_birth` >= '1900-01-01');

ALTER TABLE `applicants`
    DROP COLUMN `age`;
