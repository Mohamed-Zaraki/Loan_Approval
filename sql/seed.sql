-- ========================================================================
-- Seed Data for Loan Approval Web App
-- Populates realistic test data: 30 applicants, bank managers,
-- loan applications, and loan decisions.
-- ========================================================================

USE `loan_approval_db`;

-- ------------------------------------------------------------------------
-- 1. Insert Bank Managers
-- ------------------------------------------------------------------------
INSERT INTO `bank_managers` (`manager_id`, `name`) VALUES
(1, 'Sarah Connor'),
(2, 'Alexandre Martin');

-- ------------------------------------------------------------------------
-- 2. Insert 30 Applicants
-- ------------------------------------------------------------------------
INSERT INTO `applicants` (`applicant_id`, `full_name`, `id_card_number`, `age`, `job`, `has_cdi`, `is_married`, `number_of_children`) VALUES
(1,  'John Doe',            'CIN-100234', 32, 'Software Engineer',          TRUE,  TRUE,  2),
(2,  'Jane Martin',         'CIN-100567', 26, 'Graphic Designer',           FALSE, FALSE, 0),
(3,  'Karim Benali',        'CIN-100890', 45, 'Civil Servant',              TRUE,  TRUE,  3),
(4,  'Amina Mansouri',      'CIN-101122', 29, 'Data Analyst',               TRUE,  FALSE, 0),
(5,  'Lucas Dubois',        'CIN-101345', 38, 'Mechanical Engineer',         TRUE,  TRUE,  1),
(6,  'Emma Bernard',        'CIN-101568', 41, 'Pharmacist',                 TRUE,  TRUE,  2),
(7,  'Youssef El Amrani',   'CIN-101789', 52, 'High School Teacher',        TRUE,  TRUE,  4),
(8,  'Sarah Jenkins',       'CIN-102011', 24, 'Marketing Assistant',        FALSE, FALSE, 0),
(9,  'Mohamed Alami',       'CIN-102234', 35, 'Financial Consultant',       TRUE,  TRUE,  1),
(10, 'Chloe Laurent',       'CIN-102456', 30, 'Architect',                  TRUE,  FALSE, 0),
(11, 'Tariq Haddad',        'CIN-102678', 48, 'Logistics Manager',          TRUE,  TRUE,  2),
(12, 'Sophie Moreau',       'CIN-102901', 27, 'Registered Nurse',           TRUE,  FALSE, 0),
(13, 'Omar Zeroual',        'CIN-103123', 33, 'Web Developer',              TRUE,  TRUE,  1),
(14, 'Camille Leroy',       'CIN-103345', 23, 'Barista',                    FALSE, FALSE, 0),
(15, 'Bilal Kabbaj',        'CIN-103567', 50, 'Electrical Contractor',      TRUE,  TRUE,  3),
(16, 'Clara Fontaine',      'CIN-103789', 36, 'Human Resources Specialist', TRUE,  TRUE,  2),
(17, 'Hamza Chraibi',       'CIN-104012', 28, 'Sales Representative',       TRUE,  FALSE, 0),
(18, 'Lea Roussel',         'CIN-104234', 43, 'General Physician',          TRUE,  TRUE,  2),
(19, 'Mehdi Tazi',          'CIN-104456', 31, 'Cyber Security Analyst',     TRUE,  TRUE,  1),
(20, 'Manon Girard',        'CIN-104678', 25, 'Junior Accountant',          TRUE,  FALSE, 0),
(21, 'Rachid Berrada',      'CIN-104901', 58, 'University Professor',       TRUE,  TRUE,  3),
(22, 'Juliette Bonnet',     'CIN-105123', 39, 'Dental Hygienist',           TRUE,  TRUE,  1),
(23, 'Anis Belhaj',         'CIN-105345', 22, 'Retail Cashier',             FALSE, FALSE, 0),
(24, 'Ines Gauthier',       'CIN-105567', 34, 'Project Manager',            TRUE,  FALSE, 0),
(25, 'Reda Naciri',         'CIN-105789', 47, 'Supply Chain Director',      TRUE,  TRUE,  2),
(26, 'Charlotte Perrin',    'CIN-106012', 29, 'Freelance Copywriter',       FALSE, FALSE, 0),
(27, 'Walid Fassi',         'CIN-106234', 37, 'Construction Supervisor',    TRUE,  TRUE,  3),
(28, 'Alice Fournier',      'CIN-106456', 42, 'Real Estate Agent',          FALSE, TRUE,  2),
(29, 'Driss Zouaoui',       'CIN-106678', 54, 'Senior Accountant',          TRUE,  TRUE,  2),
(30, 'Laura Mercier',       'CIN-106901', 31, 'Pediatrician',               TRUE,  TRUE,  1);

-- ------------------------------------------------------------------------
-- 3. Insert 30 Loan Applications (1 per applicant)
-- ------------------------------------------------------------------------
INSERT INTO `loan_applications` (`application_id`, `applicant_id`, `monthly_income`, `total_debt`, `savings`, `income_verified`, `loan_amount`, `loan_duration`, `loan_purpose`, `missed_payments`, `reviewed_by_manager_id`) VALUES
(1,  1,  4500.00, 300.00,  15000.00, TRUE,  25000.00, 36, 'Home Renovation',     0, 1),
(2,  2,  1800.00, 500.00,  1000.00,  FALSE, 12000.00, 24, 'Car Purchase',        2, 2),
(3,  3,  3200.00, 200.00,  8000.00,  TRUE,  10000.00, 12, 'Personal Loan',       0, 1),
(4,  4,  3800.00, 150.00,  12000.00, TRUE,  18000.00, 24, 'Home Improvement',    0, 2),
(5,  5,  4200.00, 450.00,  9500.00,  TRUE,  30000.00, 48, 'Vehicle Purchase',    0, 1),
(6,  6,  5100.00, 600.00,  22000.00, TRUE,  40000.00, 60, 'Commercial Space',    0, 2),
(7,  7,  3600.00, 800.00,  7000.00,  TRUE,  15000.00, 36, 'Education Expenses',  1, 1),
(8,  8,  1600.00, 400.00,  500.00,   FALSE,  8000.00, 24, 'Debt Consolidation',  3, 2),
(9,  9,  5500.00, 350.00,  30000.00, TRUE,  50000.00, 48, 'Real Estate Deposit', 0, 1),
(10, 10, 4000.00, 200.00,  14000.00, TRUE,  22000.00, 36, 'Studio Equipment',    0, 2),
(11, 11, 4700.00, 900.00,  11000.00, TRUE,  28000.00, 48, 'Family Car',          0, 1),
(12, 12, 2800.00, 100.00,  6000.00,  TRUE,  12000.00, 24, 'Medical Specialization', 0, 2),
(13, 13, 4100.00, 250.00,  13500.00, TRUE,  20000.00, 36, 'Home Office Setup',   0, 1),
(14, 14, 1400.00, 350.00,  400.00,   FALSE,  6000.00, 18, 'Personal Emergency',  2, 2),
(15, 15, 4900.00, 750.00,  16000.00, TRUE,  35000.00, 48, 'Equipment Upgrade',   0, 1),
(16, 16, 3900.00, 300.00,  10500.00, TRUE,  17000.00, 24, 'Home Renovation',     0, 2),
(17, 17, 3100.00, 400.00,  5500.00,  TRUE,  14000.00, 36, 'Car Purchase',        1, 1),
(18, 18, 6200.00, 500.00,  45000.00, TRUE,  60000.00, 60, 'Clinic Expansion',    0, 2),
(19, 19, 4800.00, 200.00,  20000.00, TRUE,  25000.00, 36, 'Apartment Downpayment', 0, 1),
(20, 20, 2500.00, 150.00,  4500.00,  TRUE,  10000.00, 24, 'Professional Training', 0, 2),
(21, 21, 5800.00, 400.00,  35000.00, TRUE,  30000.00, 36, 'Home Solar Panels',   0, 1),
(22, 22, 3300.00, 250.00,  9000.00,  TRUE,  16000.00, 30, 'Home Furnishing',     0, 2),
(23, 23, 1300.00, 600.00,  300.00,   FALSE,  7000.00, 24, 'Debt Consolidation',  4, 1),
(24, 24, 4400.00, 300.00,  17000.00, TRUE,  26000.00, 36, 'Wedding & Travel',    0, 2),
(25, 25, 6500.00, 800.00,  40000.00, TRUE,  55000.00, 60, 'Luxury Vehicle',      0, 1),
(26, 26, 2200.00, 450.00,  2500.00,  FALSE, 11000.00, 24, 'Laptop & Camera Gear', 1, 2),
(27, 27, 3700.00, 500.00,  8500.00,  TRUE,  19000.00, 36, 'Truck Purchase',      0, 1),
(28, 28, 2900.00, 950.00,  3000.00,  FALSE, 15000.00, 30, 'Business Capital',    2, 2),
(29, 29, 5300.00, 300.00,  28000.00, TRUE,  32000.00, 48, 'Property Renovation', 0, 1),
(30, 30, 5900.00, 400.00,  32000.00, TRUE,  45000.00, 48, 'Practice Setup',      0, 2);

-- ------------------------------------------------------------------------
-- 4. Insert 30 Corresponding Loan Decisions
-- ------------------------------------------------------------------------
INSERT INTO `loan_decisions` (`decision_id`, `application_id`, `status`, `reason`, `decided_by_manager_id`) VALUES
(1,  1,  'APPROVED', 'Applicant has stable CDI, healthy debt ratio, and sufficient savings.', 1),
(2,  2,  'REJECTED', 'High debt ratio, history of 2 missed payments, non-permanent contract.', 2),
(3,  3,  'APPROVED', 'Permanent civil servant status with low debt and reliable income.', 1),
(4,  4,  'APPROVED', 'Stable CDI with high savings-to-loan ratio and no missed payments.', 2),
(5,  5,  'APPROVED', 'Good debt-to-income ratio and sufficient monthly cash flow.', 1),
(6,  6,  'APPROVED', 'High medical income, large savings reserve, verified employment.', 2),
(7,  7,  'APPROVED', 'Stable education career, acceptable debt profile despite single past delay.', 1),
(8,  8,  'REJECTED', 'Insufficient income, no permanent contract, multiple missed payments.', 2),
(9,  9,  'APPROVED', 'Excellent creditworthiness, substantial savings, verified high income.', 1),
(10, 10, 'APPROVED', 'Strong professional profile, excellent savings reserve.', 2),
(11, 11, 'APPROVED', 'Good monthly disposable income, manageable debt load.', 1),
(12, 12, 'APPROVED', 'Public healthcare permanent employee, minimal debt.', 2),
(13, 13, 'APPROVED', 'Strong tech salary, verified income, low debt ratio.', 1),
(14, 14, 'REJECTED', 'Income below threshold, temporary job contract, low savings balance.', 2),
(15, 15, 'APPROVED', 'Established contractor with steady revenue and solid collateral savings.', 1),
(16, 16, 'APPROVED', 'Stable HR position, sound financial discipline and savings.', 2),
(17, 17, 'PENDING',  'Under secondary assessment for income-to-installment ratio.', NULL),
(18, 18, 'APPROVED', 'Exceptional financial standing, verified medical practice income.', 2),
(19, 19, 'APPROVED', 'High tech sector compensation, substantial downpayment savings.', 1),
(20, 20, 'APPROVED', 'Entry-level professional with verified employment and zero debt history.', 2),
(21, 21, 'APPROVED', 'Tenured university professor with excellent credit history and assets.', 1),
(22, 22, 'APPROVED', 'Healthcare worker with permanent contract and consistent savings.', 2),
(23, 23, 'REJECTED', 'Excessive debt ratio (>45%), 4 missed payments, no stable contract.', 1),
(24, 24, 'APPROVED', 'Solid corporate position, high disposable income, clean payment history.', 2),
(25, 25, 'APPROVED', 'Executive level income, very high net liquid savings.', 1),
(26, 26, 'REJECTED', 'Irregular freelance revenue, unverified income documents.', 2),
(27, 27, 'APPROVED', 'Long-term construction supervisor with solid track record.', 1),
(28, 28, 'REJECTED', 'Commission-based irregular income with 2 missed past credit payments.', 2),
(29, 29, 'APPROVED', 'Senior professional with exemplary financial standing and low debt.', 1),
(30, 30, 'APPROVED', 'Established pediatrician with premium credit profile and high liquidity.', 2);
