-- Adds optional document tracking columns for Drivers
-- Documents: driver license front/back, COI, MC authority, W-9

ALTER TABLE Drivers
  ADD COLUMN driverLicenseFrontPath VARCHAR(500) NULL,
  ADD COLUMN driverLicenseBackPath VARCHAR(500) NULL,
  ADD COLUMN coiDocumentPath VARCHAR(500) NULL,
  ADD COLUMN mcAuthorityDocumentPath VARCHAR(500) NULL,
  ADD COLUMN w9DocumentPath VARCHAR(500) NULL;

-- Optional: indexes for quick filtering/reporting
CREATE INDEX idx_drivers_coi_document_path ON Drivers (coiDocumentPath);
CREATE INDEX idx_drivers_mc_authority_document_path ON Drivers (mcAuthorityDocumentPath);
CREATE INDEX idx_drivers_w9_document_path ON Drivers (w9DocumentPath);
