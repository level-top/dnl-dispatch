-- Migration to add document file path columns to Loads table
-- Run this SQL in your MySQL database

USE dispatch_todo_app;

-- Add document file path columns
ALTER TABLE `Loads`
ADD COLUMN `bolDocumentPath` VARCHAR(500) DEFAULT NULL COMMENT 'Path to BOL document file' AFTER `bolStatus`,
ADD COLUMN `podDocumentPath` VARCHAR(500) DEFAULT NULL COMMENT 'Path to POD document file' AFTER `podStatus`,
ADD COLUMN `rateConfDocumentPath` VARCHAR(500) DEFAULT NULL COMMENT 'Path to Rate Confirmation document file' AFTER `rateConfStatus`;

-- Verify the changes
DESCRIBE `Loads`;
