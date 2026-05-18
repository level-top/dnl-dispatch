-- phpMyAdmin SQL Dump
-- version 5.1.1
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Generation Time: Nov 26, 2025 at 10:03 PM
-- Server version: 10.4.21-MariaDB
-- PHP Version: 7.3.31

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `dispatch_todo_app`
--

-- --------------------------------------------------------

--
-- Table structure for table `CompanyDetails`
--

CREATE TABLE `CompanyDetails` (
  `CompanyID` int(11) NOT NULL,
  `CompanyName` varchar(255) NOT NULL,
  `Address` varchar(500) DEFAULT NULL,
  `Phone` varchar(50) DEFAULT NULL,
  `Email` varchar(255) DEFAULT NULL,
  `BankName` varchar(255) DEFAULT NULL,
  `IBAN` varchar(34) DEFAULT NULL,
  `AccountHolder` varchar(255) DEFAULT NULL,
  `LogoURL` varchar(500) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `CompanyDetails`
--

INSERT INTO `CompanyDetails` (`CompanyID`, `CompanyName`, `Address`, `Phone`, `Email`, `BankName`, `IBAN`, `AccountHolder`, `LogoURL`) VALUES
(1, 'Drive Now Logistics', 'Hafizabad', '03433637754', 'info@dnl7.com', 'Allied Bank Limited', 'PK66ABPA0010094799130015', 'GM', 'http://localhost:3000/DNL_logo.png');

-- --------------------------------------------------------

--
-- Table structure for table `DispatcherDriverAssignments`
--

CREATE TABLE `DispatcherDriverAssignments` (
  `dispatcherId` int(11) NOT NULL,
  `driverId` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `DispatcherDriverAssignments`
--

INSERT INTO `DispatcherDriverAssignments` (`dispatcherId`, `driverId`) VALUES
(1, 2),
(2, 1),
(3, 1),
(4, 1),
(4, 2);

-- --------------------------------------------------------

--
-- Table structure for table `Drivers`
--

CREATE TABLE `Drivers` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `MC_number` varchar(50) DEFAULT NULL,
  `truckType` varchar(50) DEFAULT NULL,
  `contactNumber` varchar(20) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `joinDate` date DEFAULT NULL,
  `sales_agent_id` int(11) DEFAULT NULL,
  `percentage` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `Drivers`
--

INSERT INTO `Drivers` (`id`, `name`, `MC_number`, `truckType`, `contactNumber`, `email`, `joinDate`, `sales_agent_id`, `percentage`) VALUES
(1, 'Driver One', 'MC-DNL-001', 'hotshot', '+1-555-0201', 'driver.one@dnl7.com', '2025-08-12', 1, 5),
(2, 'Driver Two', 'MC-DNL-002', 'box truck', '+1-555-0202', 'driver.two@dnl7.com', '2025-08-12', 1, 5);

-- --------------------------------------------------------

--
-- Table structure for table `Invoices`
--

CREATE TABLE `Invoices` (
  `InvoiceID` int(11) NOT NULL,
  `DriverID` int(11) NOT NULL,
  `InvoiceNumber` varchar(50) NOT NULL,
  `InvoiceDate` date NOT NULL,
  `PaymentDate` date DEFAULT NULL,
  `TotalAmount` decimal(10,2) NOT NULL,
  `InvoiceStatus` varchar(50) NOT NULL,
  `companyId` int(11) NOT NULL,
  `Commission` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `Invoices`
--

INSERT INTO `Invoices` (`InvoiceID`, `DriverID`, `InvoiceNumber`, `InvoiceDate`, `PaymentDate`, `TotalAmount`, `InvoiceStatus`, `companyId`, `Commission`) VALUES
(28, 1, 'ROZ25112622', '2025-11-26', NULL, '27.50', 'Pending', 1, 5);

-- --------------------------------------------------------

--
-- Table structure for table `Loads`
--

CREATE TABLE `Loads` (
  `id` int(11) NOT NULL,
  `pickedUp_dateTime` timestamp NULL DEFAULT NULL,
  `dropOff_dateTime` timestamp NULL DEFAULT NULL,
  `driverName` int(10) DEFAULT NULL,
  `dispatcherId` int(11) DEFAULT NULL,
  `loadFrom` varchar(100) NOT NULL,
  `loadTo` varchar(100) NOT NULL,
  `brokerCompany` varchar(100) DEFAULT NULL,
  `brokerMC` varchar(50) DEFAULT NULL,
  `brokerName` varchar(100) DEFAULT NULL,
  `loadNumber` varchar(50) DEFAULT NULL,
  `loadAmount` int(11) DEFAULT NULL,
  `miles` int(11) DEFAULT NULL,
  `netAmount` int(11) DEFAULT NULL,
  `loadStatus` enum('booked','canceled','pickedUp','delivered','issue') NOT NULL,
  `dateTime` timestamp NOT NULL DEFAULT current_timestamp(),
  `payment_status` enum('unpaid','invoiced','paid') NOT NULL DEFAULT 'unpaid',
  `invoice_number` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `Loads`
--

INSERT INTO `Loads` (`id`, `pickedUp_dateTime`, `dropOff_dateTime`, `driverName`, `dispatcherId`, `loadFrom`, `loadTo`, `brokerCompany`, `brokerMC`, `brokerName`, `loadNumber`, `loadAmount`, `miles`, `netAmount`, `loadStatus`, `dateTime`, `payment_status`, `invoice_number`) VALUES
(11, '2025-08-12 22:26:00', '2025-08-07 22:26:00', 2, 3, '12', 'dsfs', 'sdf', 'sdf', 'sdf', 'sd', 21, 12, 12, 'booked', '2025-08-12 22:26:32', 'unpaid', NULL),
(12, '2025-08-13 01:45:00', '2025-08-14 01:45:00', 1, 3, 'asd', 'ny', 'ethn', 'df43', 'vc', 'dfg345', 345, 5, 5, 'booked', '2025-08-12 22:46:35', 'invoiced', NULL),
(13, '2025-08-14 17:04:00', '2025-08-15 17:05:00', 1, 4, 'ny', 'nk', 'abcd', 'abcd1234', 'jaqck', 'dsdf234234', 600, 5, 58, 'booked', '2025-08-13 17:08:56', 'paid', NULL),
(14, '2025-10-17 04:21:00', '2025-10-30 04:21:00', 2, 1, 'asc', 'asda', 'asd', 'asd', 'asd', 'asda', 212, 2, 21, 'delivered', '2025-10-04 00:22:16', 'unpaid', NULL),
(15, '2025-10-28 13:58:00', '2025-10-31 13:58:00', 1, 4, 'ut', 'ny', 'as', 'as', 'asdasd', 'asd', 123, 5, 2134, 'booked', '2025-10-06 13:55:01', 'unpaid', NULL),
(16, '2025-10-06 16:12:00', '2025-10-12 07:10:00', 1, 3, 'ut', 'ny', 'tql', '123', 'jak', '123abc', 200, 100, NULL, 'booked', '2025-10-06 16:11:05', 'unpaid', NULL),
(17, '2025-10-06 22:52:00', '2025-10-23 20:52:00', 1, 3, 'ny', 'ut', 'tql', 'hng', 'ghng', '454', 200, 100, NULL, 'delivered', '2025-10-06 20:53:53', 'invoiced', '28'),
(18, '2025-10-06 23:11:00', '2025-10-06 23:11:00', 1, 4, 'paa', 'ono', 'asdas', 'erer', 'erer', '455', 350, 150, NULL, 'delivered', '2025-10-06 22:12:26', 'invoiced', '28');

-- --------------------------------------------------------

--
-- Table structure for table `Users`
--

CREATE TABLE `Users` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `userName` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('admin','dispatcher','sales') NOT NULL,
  `contactNumber` varchar(20) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `Users`
--

INSERT INTO `Users` (`id`, `name`, `userName`, `password`, `role`, `contactNumber`, `email`) VALUES
(1, 'Drive Now Admin', 'admin', '$2b$10$Ye9XR1VhXoz68.EKoUIn6.N5mQpP5WvGLaUmWNQJG1vp.hb7nZepm', 'admin', '+1-555-0301', 'admin@dnl7.com'),
(2, 'Dispatcher One', 'dispatcher1', '$2b$10$zWbVYfrYVsS/86.nCTvKB.1rSQ3cj0mIvxxTuW9C8QMrCPJ0tVzpm', 'dispatcher', '+1-555-0302', 'dispatcher1@dnl7.com'),
(3, 'Dispatcher Two', 'dispatcher2', '$2b$10$bt8iUTC4pSZeqJb6xbg0B.HsFZgDYRvETEsdkdNj3gVj4hWLNK/J6', 'dispatcher', '+1-555-0303', 'dispatcher2@dnl7.com'),
(4, 'Sales One', 'sales1', '$2b$10$G/2oYEQfMFGns0NWiA9Fy.oDsv9P8a7KYzbRx/DjJEg/Ep8DIjrRe', 'sales', '+1-555-0304', 'sales1@dnl7.com');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `CompanyDetails`
--
ALTER TABLE `CompanyDetails`
  ADD PRIMARY KEY (`CompanyID`);

--
-- Indexes for table `DispatcherDriverAssignments`
--
ALTER TABLE `DispatcherDriverAssignments`
  ADD PRIMARY KEY (`dispatcherId`,`driverId`);

--
-- Indexes for table `Drivers`
--
ALTER TABLE `Drivers`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `Invoices`
--
ALTER TABLE `Invoices`
  ADD PRIMARY KEY (`InvoiceID`);

--
-- Indexes for table `Loads`
--
ALTER TABLE `Loads`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `Users`
--
ALTER TABLE `Users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `userName` (`userName`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `CompanyDetails`
--
ALTER TABLE `CompanyDetails`
  MODIFY `CompanyID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `Drivers`
--
ALTER TABLE `Drivers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `Invoices`
--
ALTER TABLE `Invoices`
  MODIFY `InvoiceID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=29;

--
-- AUTO_INCREMENT for table `Loads`
--
ALTER TABLE `Loads`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT for table `Users`
--
ALTER TABLE `Users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

-- --------------------------------------------------------
--
-- Table structure for table `LoadExtraDocuments`
--

CREATE TABLE IF NOT EXISTS `LoadExtraDocuments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `loadId` int(11) NOT NULL,
  `originalName` varchar(255) NOT NULL,
  `storedName` varchar(255) NOT NULL,
  `path` varchar(500) NOT NULL,
  `uploadedAt` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_LoadExtraDocuments_loadId` (`loadId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
--
-- Table structure for table `DriverExtraDocuments`
--

CREATE TABLE IF NOT EXISTS `DriverExtraDocuments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `driverId` int(11) NOT NULL,
  `originalName` varchar(255) NOT NULL,
  `storedName` varchar(255) NOT NULL,
  `path` varchar(500) NOT NULL,
  `uploadedAt` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_DriverExtraDocuments_driverId` (`driverId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
--
-- Table structure for table `DriverAgreements`
--

CREATE TABLE IF NOT EXISTS `DriverAgreements` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `driverId` int(11) NOT NULL,
  `tokenHash` char(64) NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'pending',
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  `expiresAt` timestamp NULL DEFAULT NULL,
  `viewedAt` timestamp NULL DEFAULT NULL,
  `signedAt` timestamp NULL DEFAULT NULL,
  `signerName` varchar(255) DEFAULT NULL,
  `signerIp` varchar(64) DEFAULT NULL,
  `signerUserAgent` varchar(512) DEFAULT NULL,
  `signatureImagePath` varchar(512) DEFAULT NULL,
  `signedPdfPath` varchar(512) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_driver_agreements_tokenHash` (`tokenHash`),
  KEY `idx_driver_agreements_driverId` (`driverId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
--
-- Table structure for table `AgreementTemplate`
--

CREATE TABLE IF NOT EXISTS `AgreementTemplate` (
  `id` int(11) NOT NULL,
  `companyNameOverride` varchar(255) DEFAULT NULL,
  `logoUrlOverride` varchar(500) DEFAULT NULL,
  `agreementBodyHtml` longtext DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  `updatedAt` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO `AgreementTemplate` (`id`, `companyNameOverride`, `logoUrlOverride`, `agreementBodyHtml`) VALUES
(1, NULL, NULL, NULL);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
