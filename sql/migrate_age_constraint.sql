-- Tighten the applicant age check on an existing database.
-- Rejects impossible ages such as 555; allowed range is 18-120.
-- Run once in MySQL: mysql -u root -p < sql/migrate_age_constraint.sql

USE loan_approval_db;

ALTER TABLE `applicants`
    DROP CHECK `chk_applicant_age`;

ALTER TABLE `applicants`
    ADD CONSTRAINT `chk_applicant_age` CHECK (`age` BETWEEN 18 AND 120);
