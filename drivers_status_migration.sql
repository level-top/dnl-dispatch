-- Adds driver status tracking
-- Default: inactive
-- Becomes active once the driver has at least one booked load

ALTER TABLE Drivers
  ADD COLUMN status ENUM('inactive','active') NOT NULL DEFAULT 'inactive';

-- Backfill: drivers with any booked load become active
UPDATE Drivers d
SET d.status = 'active'
WHERE EXISTS (
  SELECT 1
  FROM Loads l
  WHERE l.driverName = d.id
    AND LOWER(l.loadStatus) = 'booked'
);

CREATE INDEX idx_drivers_status ON Drivers (status);
