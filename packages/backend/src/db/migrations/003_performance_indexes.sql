-- 003_performance_indexes.sql
-- Performance indexes for 3000+ traveler queries and audit log cascade fix
-- Idempotent: uses IF NOT EXISTS / DROP CONSTRAINT IF EXISTS

-- ============================================================
-- Performance indexes (Fix #6 / #18)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_traveler_flights_direction ON traveler_flights(direction);
CREATE INDEX IF NOT EXISTS idx_event_attendance_event ON event_attendance(event_id);
CREATE INDEX IF NOT EXISTS idx_room_assignments_seq ON room_assignments(room_assignment_seq);
CREATE INDEX IF NOT EXISTS idx_travelers_checkin ON travelers(checkin_status);
CREATE INDEX IF NOT EXISTS idx_travelers_booking ON travelers(booking_id);
CREATE INDEX IF NOT EXISTS idx_travelers_names ON travelers(first_name, last_name);
CREATE INDEX IF NOT EXISTS idx_qr_tokens_value_active ON qr_tokens(token_value) WHERE is_active = true;

-- ============================================================
-- Fix audit log cascade: preserve audit trail when admin deleted (Fix #11)
-- ============================================================
ALTER TABLE audit_logs ALTER COLUMN actor_id DROP NOT NULL;
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_actor_id_fkey;
-- No foreign key — actor_id is just a reference, not enforced

-- ============================================================
-- Scan logs: add traveler_id column for checkin persistence (Fix #2)
-- ============================================================
ALTER TABLE scan_logs ADD COLUMN IF NOT EXISTS traveler_id UUID REFERENCES travelers(traveler_id);
ALTER TABLE scan_logs ADD COLUMN IF NOT EXISTS session VARCHAR(255);
ALTER TABLE scan_logs ADD COLUMN IF NOT EXISTS fleet VARCHAR(64);
ALTER TABLE scan_logs ALTER COLUMN staff_id DROP NOT NULL;
ALTER TABLE scan_logs ALTER COLUMN qr_token_value DROP NOT NULL;
ALTER TABLE scan_logs ALTER COLUMN scanned_at SET DEFAULT NOW();
