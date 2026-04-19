-- 001_initial_schema.sql
-- WSB 2027 China Digital Companion — Initial Database Schema
-- Requirements: 26.1-26.5, 27.1-27.9, 28.1-28.7

-- ============================================================
-- Extensions
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- Enums
-- ============================================================
CREATE TYPE role_type AS ENUM (
  'traveler', 'minor', 'representative', 'staff', 'staff_desk', 'admin', 'super_admin'
);

CREATE TYPE access_status AS ENUM (
  'invited', 'activated', 'linked', 'rescued'
);

CREATE TYPE event_type AS ENUM (
  'bus', 'meal', 'activity', 'ceremony', 'transfer', 'hotel_checkin'
);

CREATE TYPE scan_result AS ENUM (
  'pass', 'fail', 'wrong_assignment', 'override'
);

CREATE TYPE notification_target AS ENUM (
  'all', 'group', 'hotel', 'bus', 'individual'
);

-- ============================================================
-- Identity & Access Tables
-- ============================================================

-- families: created first with a deferred FK to travelers (circular reference)
CREATE TABLE families (
    family_id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    representative_id UUID NOT NULL,  -- FK added after travelers table
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE travelers (
    traveler_id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id           VARCHAR(64),
    family_id            UUID REFERENCES families(family_id),
    representative_id    UUID REFERENCES travelers(traveler_id),
    guardian_id           UUID REFERENCES travelers(traveler_id),
    full_name_raw        VARCHAR(255) NOT NULL,
    full_name_normalized VARCHAR(255) NOT NULL,
    email_primary         VARCHAR(255) NOT NULL UNIQUE,
    email_aliases         VARCHAR(255)[],
    passport_name         VARCHAR(255),
    phone                 VARCHAR(64),
    role_type             role_type NOT NULL DEFAULT 'traveler',
    access_status         access_status NOT NULL DEFAULT 'invited',
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Deferred FK: families.representative_id -> travelers.traveler_id
ALTER TABLE families
    ADD CONSTRAINT fk_families_representative
    FOREIGN KEY (representative_id) REFERENCES travelers(traveler_id)
    DEFERRABLE INITIALLY DEFERRED;

-- Indexes on travelers
CREATE INDEX idx_travelers_booking ON travelers(booking_id);
CREATE INDEX idx_travelers_family ON travelers(family_id);
CREATE INDEX idx_travelers_email ON travelers(email_primary);
CREATE INDEX idx_travelers_name_normalized ON travelers(full_name_normalized);
CREATE INDEX idx_travelers_name_trgm ON travelers USING gin (full_name_normalized gin_trgm_ops);

-- QR Tokens
CREATE TABLE qr_tokens (
    token_id    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    traveler_id UUID NOT NULL UNIQUE REFERENCES travelers(traveler_id),
    token_value VARCHAR(128) NOT NULL UNIQUE,
    token_hash  VARCHAR(64) NOT NULL,  -- SHA-256 hash for audit
    is_active   BOOLEAN NOT NULL DEFAULT true,
    issued_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at  TIMESTAMPTZ
);

CREATE INDEX idx_qr_tokens_value ON qr_tokens(token_value);
CREATE INDEX idx_qr_tokens_traveler ON qr_tokens(traveler_id);

-- Magic Links
CREATE TABLE magic_links (
    link_id     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    traveler_id UUID NOT NULL REFERENCES travelers(traveler_id),
    token       VARCHAR(128) NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    used_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_magic_links_token ON magic_links(token);

-- ============================================================
-- Operations & Assignments Tables
-- ============================================================

-- Groups
CREATE TABLE groups (
    group_id    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(128) NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Traveler-Group junction
CREATE TABLE traveler_groups (
    traveler_id UUID REFERENCES travelers(traveler_id) ON DELETE CASCADE,
    group_id    UUID REFERENCES groups(group_id) ON DELETE CASCADE,
    PRIMARY KEY (traveler_id, group_id)
);

-- Hotels
CREATE TABLE hotels (
    hotel_id    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(255) NOT NULL,
    address_en  VARCHAR(512),
    address_cn  VARCHAR(512),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Traveler-Hotel junction
CREATE TABLE traveler_hotels (
    traveler_id UUID REFERENCES travelers(traveler_id) ON DELETE CASCADE,
    hotel_id    UUID REFERENCES hotels(hotel_id) ON DELETE CASCADE,
    PRIMARY KEY (traveler_id, hotel_id)
);

-- Events
CREATE TABLE events (
    event_id    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(255) NOT NULL,
    event_type  event_type NOT NULL,
    date        DATE NOT NULL,
    start_time  TIMESTAMPTZ,
    end_time    TIMESTAMPTZ,
    location    VARCHAR(512),
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Event Eligibility
CREATE TABLE event_eligibility (
    event_id    UUID REFERENCES events(event_id) ON DELETE CASCADE,
    group_id    UUID REFERENCES groups(group_id),
    hotel_id    UUID REFERENCES hotels(hotel_id),
    option_id   UUID,  -- FK to itinerary_options added after table creation
    PRIMARY KEY (event_id, option_id)
);

-- Itinerary Options
CREATE TABLE itinerary_options (
    option_id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add FK from event_eligibility.option_id to itinerary_options
ALTER TABLE event_eligibility
    ADD CONSTRAINT fk_event_eligibility_option
    FOREIGN KEY (option_id) REFERENCES itinerary_options(option_id);

-- Traveler-Option junction
CREATE TABLE traveler_options (
    traveler_id UUID REFERENCES travelers(traveler_id) ON DELETE CASCADE,
    option_id   UUID REFERENCES itinerary_options(option_id) ON DELETE CASCADE,
    PRIMARY KEY (traveler_id, option_id)
);

-- Buses
CREATE TABLE buses (
    bus_id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bus_number      VARCHAR(32) NOT NULL UNIQUE,
    capacity        INTEGER NOT NULL,
    event_id        UUID REFERENCES events(event_id),
    departure_time  TIMESTAMPTZ,
    terminal        VARCHAR(64),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Bus Assignments
CREATE TABLE bus_assignments (
    assignment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    traveler_id   UUID NOT NULL REFERENCES travelers(traveler_id),
    bus_id        UUID NOT NULL REFERENCES buses(bus_id),
    event_id      UUID NOT NULL REFERENCES events(event_id),
    assigned_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bus_assignments_traveler ON bus_assignments(traveler_id);

-- Flights
CREATE TABLE flights (
    flight_id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    flight_number   VARCHAR(32) NOT NULL,
    arrival_time    TIMESTAMPTZ NOT NULL,
    terminal        VARCHAR(64),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Traveler-Flight junction
CREATE TABLE traveler_flights (
    traveler_id UUID REFERENCES travelers(traveler_id) ON DELETE CASCADE,
    flight_id   UUID REFERENCES flights(flight_id) ON DELETE CASCADE,
    PRIMARY KEY (traveler_id, flight_id)
);

-- ============================================================
-- Notifications
-- ============================================================

CREATE TABLE notifications (
    notification_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title           VARCHAR(255) NOT NULL,
    body            TEXT NOT NULL,
    target_type     notification_target NOT NULL,
    target_id       UUID,
    published_at    TIMESTAMPTZ,
    created_by      UUID REFERENCES travelers(traveler_id)
);

CREATE TABLE traveler_notifications (
    traveler_id     UUID REFERENCES travelers(traveler_id) ON DELETE CASCADE,
    notification_id UUID REFERENCES notifications(notification_id) ON DELETE CASCADE,
    read_at         TIMESTAMPTZ,
    PRIMARY KEY (traveler_id, notification_id)
);

-- ============================================================
-- Scan Logs
-- ============================================================

CREATE TABLE scan_logs (
    log_id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id        UUID NOT NULL REFERENCES travelers(traveler_id),
    qr_token_value  VARCHAR(128) NOT NULL,
    scan_mode       VARCHAR(128) NOT NULL,
    result          scan_result NOT NULL,
    override_reason VARCHAR(255),
    device_id       VARCHAR(128),
    scanned_at      TIMESTAMPTZ NOT NULL,
    synced_at       TIMESTAMPTZ
);

CREATE INDEX idx_scan_logs_staff ON scan_logs(staff_id);
CREATE INDEX idx_scan_logs_token ON scan_logs(qr_token_value);
CREATE INDEX idx_scan_logs_scanned ON scan_logs(scanned_at);

-- ============================================================
-- Audit Logs
-- ============================================================

CREATE TABLE audit_logs (
    audit_id    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id    UUID NOT NULL REFERENCES travelers(traveler_id),
    actor_role  VARCHAR(32) NOT NULL,
    action_type VARCHAR(64) NOT NULL,
    entity_type VARCHAR(64) NOT NULL,
    entity_id   UUID,
    details     JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_action ON audit_logs(action_type);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id);
