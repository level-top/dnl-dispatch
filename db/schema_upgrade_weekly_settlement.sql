-- Schema upgrade for weekly driver settlement + better admin reporting
-- Date: 2026-01-07
-- Target DB: dispatch_todo_app
-- Safe approach: additive changes (no breaking drops)

USE `dispatch_todo_app`;

-- ------------------------------------------------------------
-- 1) Loads: add fields needed for weekly settlement + exceptions
-- ------------------------------------------------------------
ALTER TABLE `Loads`
  ADD COLUMN `delivered_at` timestamp NULL DEFAULT NULL AFTER `dropOff_dateTime`,
  ADD COLUMN `canceled_reason` varchar(255) DEFAULT NULL AFTER `loadStatus`,
  ADD COLUMN `status_updated_at` timestamp NULL DEFAULT NULL AFTER `canceled_reason`,
  ADD COLUMN `commission_rate_override` decimal(5,2) DEFAULT NULL AFTER `netAmount`,
  ADD COLUMN `commission_base` enum('gross','net') NOT NULL DEFAULT 'gross' AFTER `commission_rate_override`;

-- Helpful indexes for admin queries
CREATE INDEX `idx_loads_status_datetime` ON `Loads` (`loadStatus`, `dateTime`);
CREATE INDEX `idx_loads_delivered_at` ON `Loads` (`delivered_at`);
CREATE INDEX `idx_loads_invoice_number` ON `Loads` (`invoice_number`);

-- ------------------------------------------------------------
-- 2) Invoices: add settlement period + due date
-- ------------------------------------------------------------
ALTER TABLE `Invoices`
  ADD COLUMN `PeriodStart` date DEFAULT NULL AFTER `InvoiceDate`,
  ADD COLUMN `PeriodEnd` date DEFAULT NULL AFTER `PeriodStart`,
  ADD COLUMN `DueDate` date DEFAULT NULL AFTER `PaymentDate`,
  ADD COLUMN `Notes` varchar(500) DEFAULT NULL AFTER `Commission`;

CREATE INDEX `idx_invoices_driver_period` ON `Invoices` (`DriverID`, `PeriodStart`, `PeriodEnd`);
CREATE INDEX `idx_invoices_status` ON `Invoices` (`InvoiceStatus`);

-- ------------------------------------------------------------
-- 3) InvoiceLoads: proper line items (what loads were billed)
--    This makes weekly invoicing and auditability reliable.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `InvoiceLoads` (
  `InvoiceLoadID` int(11) NOT NULL AUTO_INCREMENT,
  `InvoiceID` int(11) NOT NULL,
  `LoadID` int(11) NOT NULL,
  `LoadAmount` decimal(10,2) DEFAULT NULL,
  `CommissionRate` decimal(5,2) NOT NULL,
  `CommissionBase` enum('gross','net') NOT NULL DEFAULT 'gross',
  `CommissionAmount` decimal(10,2) NOT NULL,
  `CreatedAt` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`InvoiceLoadID`),
  UNIQUE KEY `uq_invoice_load` (`InvoiceID`, `LoadID`),
  KEY `idx_invoiceloads_load` (`LoadID`),
  KEY `idx_invoiceloads_invoice` (`InvoiceID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 4) InvoicePayments: driver payments toward invoices
--    Supports partial payments + payment method/reference.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `InvoicePayments` (
  `PaymentID` int(11) NOT NULL AUTO_INCREMENT,
  `InvoiceID` int(11) NOT NULL,
  `Amount` decimal(10,2) NOT NULL,
  `PaidAt` timestamp NOT NULL DEFAULT current_timestamp(),
  `Method` varchar(50) DEFAULT NULL,
  `Reference` varchar(100) DEFAULT NULL,
  `Notes` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`PaymentID`),
  KEY `idx_invoicepayments_invoice` (`InvoiceID`),
  KEY `idx_invoicepayments_paidat` (`PaidAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 5) DriverAssignmentsHistory: keep assignment history without breaking current table
--    Current table DispatcherDriverAssignments remains the "current" map.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `DriverAssignmentsHistory` (
  `AssignmentID` int(11) NOT NULL AUTO_INCREMENT,
  `DriverID` int(11) NOT NULL,
  `DispatcherID` int(11) NOT NULL,
  `AssignedAt` timestamp NOT NULL DEFAULT current_timestamp(),
  `UnassignedAt` timestamp NULL DEFAULT NULL,
  `AssignedByUserID` int(11) DEFAULT NULL,
  PRIMARY KEY (`AssignmentID`),
  KEY `idx_assign_driver` (`DriverID`),
  KEY `idx_assign_dispatcher` (`DispatcherID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 6) AuditLog: who changed what/when (skip password hashing)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `AuditLog` (
  `AuditID` int(11) NOT NULL AUTO_INCREMENT,
  `EntityType` varchar(50) NOT NULL,
  `EntityID` varchar(50) NOT NULL,
  `Action` varchar(50) NOT NULL,
  `PerformedByUserID` int(11) DEFAULT NULL,
  `PerformedAt` timestamp NOT NULL DEFAULT current_timestamp(),
  `BeforeJSON` longtext DEFAULT NULL,
  `AfterJSON` longtext DEFAULT NULL,
  PRIMARY KEY (`AuditID`),
  KEY `idx_audit_entity` (`EntityType`, `EntityID`),
  KEY `idx_audit_user` (`PerformedByUserID`),
  KEY `idx_audit_time` (`PerformedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
