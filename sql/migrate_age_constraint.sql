-- Tighten the applicant age check on an existing database.
-- Rejects impossible ages such as 555; allowed range is 18-120.
-- Run once in MySQL: mysql -u root -p < sql/migrate_age_constraint.sql
--
-- Superseded by migrate_date_of_birth.sql, which replaces `age` with
-- `date_of_birth`. Only run this file on a database that still has `age`.

USE loan_approval_db;

ALTER TABLE `applicants`
    DROP CHECK `chk_applicant_age`;

ALTER TABLE `applicants`
    ADD CONSTRAINT `chk_applicant_age` CHECK (`age` BETWEEN 18 AND 120);
