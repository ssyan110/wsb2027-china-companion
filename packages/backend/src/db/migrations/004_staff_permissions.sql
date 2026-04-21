-- 004_staff_permissions.sql
-- Granular permission system for staff accounts

CREATE TABLE IF NOT EXISTS staff_permissions (
    permission_id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    traveler_id     UUID NOT NULL REFERENCES travelers(traveler_id) ON DELETE CASCADE,
    permission      VARCHAR(64) NOT NULL,
    granted_by      UUID REFERENCES travelers(traveler_id),
    granted_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (traveler_id, permission)
);

CREATE INDEX IF NOT EXISTS idx_staff_permissions_traveler ON staff_permissions(traveler_id);

-- Default permissions: all existing admin/super_admin/staff get scanner access
INSERT INTO staff_permissions (traveler_id, permission)
SELECT traveler_id, 'scanner'
FROM travelers
WHERE role_type IN ('admin', 'super_admin', 'staff', 'staff_desk')
ON CONFLICT (traveler_id, permission) DO NOTHING;

-- Admins get all view permissions by default
INSERT INTO staff_permissions (traveler_id, permission)
SELECT t.traveler_id, p.perm
FROM travelers t
CROSS JOIN (VALUES ('scanner'), ('master_table'), ('hotels'), ('flights'), ('events')) AS p(perm)
WHERE t.role_type IN ('admin', 'super_admin')
ON CONFLICT (traveler_id, permission) DO NOTHING;

-- Super admins get audit_log too
INSERT INTO staff_permissions (traveler_id, permission)
SELECT traveler_id, 'audit_log'
FROM travelers
WHERE role_type = 'super_admin'
ON CONFLICT (traveler_id, permission) DO NOTHING;
