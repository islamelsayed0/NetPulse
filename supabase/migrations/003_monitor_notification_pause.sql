-- Optional notification target + pause without deleting monitor.
ALTER TABLE monitors ADD COLUMN IF NOT EXISTS notification_email text;
ALTER TABLE monitors ADD COLUMN IF NOT EXISTS paused boolean NOT NULL DEFAULT false;
