-- Migration to add enhanced load management fields
-- Run this SQL in your MySQL database

USE dispatch_todo_app;

-- Add equipment type, load category, payment terms, and document tracking fields
ALTER TABLE `Loads`
ADD COLUMN `equipmentType` ENUM('Dry Van', 'Refrigerated', 'Flatbed', 'Step Deck', 'Power Only', 'Hazmat', 'Conestoga', 'Box Truck', 'Auto Carrier') DEFAULT NULL AFTER `miles`,
ADD COLUMN `loadCategory` ENUM('Full Truckload', 'Partial Load', 'LTL') DEFAULT NULL AFTER `equipmentType`,
ADD COLUMN `paymentTerms` ENUM('Quick Pay', 'Net 15', 'Net 30', 'Factoring', 'COD') DEFAULT NULL AFTER `loadCategory`,
ADD COLUMN `quickPayFee` DECIMAL(5,2) DEFAULT NULL COMMENT 'Percentage fee for quick pay' AFTER `paymentTerms`,
ADD COLUMN `bolStatus` ENUM('pending', 'received', 'submitted') DEFAULT 'pending' AFTER `quickPayFee`,
ADD COLUMN `podStatus` ENUM('pending', 'received', 'submitted') DEFAULT 'pending' AFTER `bolStatus`,
ADD COLUMN `rateConfStatus` ENUM('pending', 'received', 'submitted') DEFAULT 'pending' AFTER `podStatus`,
ADD COLUMN `expectedPaymentDate` DATE DEFAULT NULL AFTER `rateConfStatus`;

-- Optional: Add indexes for better query performance
CREATE INDEX idx_equipment_type ON `Loads`(`equipmentType`);
CREATE INDEX idx_load_category ON `Loads`(`loadCategory`);
CREATE INDEX idx_payment_terms ON `Loads`(`paymentTerms`);
CREATE INDEX idx_expected_payment ON `Loads`(`expectedPaymentDate`);

-- Verify the changes
DESCRIBE `Loads`;
