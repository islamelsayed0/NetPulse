-- Status updates / timeline entries for incidents (Clerk user_id as text).
CREATE TABLE IF NOT EXISTS incident_updates (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id uuid NOT NULL REFERENCES incidents (id) ON DELETE CASCADE,
  user_id text NOT NULL,
  body text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS incident_updates_incident_id_created_at_idx
  ON incident_updates (incident_id, created_at ASC);

ALTER TABLE incident_updates ENABLE ROW LEVEL SECURITY;
