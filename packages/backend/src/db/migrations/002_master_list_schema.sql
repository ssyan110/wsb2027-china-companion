-- 002_master_list_schema.sql
-- Align schema with real WSB Master List / Tracking List structure
-- Reference: WSB 2025 South Korea Master List CSV

-- ============================================================
-- New Enums
-- ============================================================
CREATE TYPE gender_type AS ENUM ('male', 'female', 'other', 'undisclosed');
CREATE TYPE invitee_type AS ENUM ('invitee', 'guest');
CREATE TYPE pax_type AS ENUM ('adult', 'child', 'infant');
CREATE TYPE occupancy_type AS ENUM ('single', 'double', 'twin', 'triple');
CREATE TYPE flight_direction AS ENUM ('arrival', 'departure');
CREATE TYPE checkin_status AS ENUM ('pending', 'checked_in', 'no_show');

-- ============================================================
-- Extend travelers table with master-list fields
-- ============================================================

-- Personal / registration info
ALTER TABLE travelers ADD COLUMN first_name          VARCHAR(128);
ALTER TABLE travelers ADD COLUMN last_name           VARCHAR(128);
ALTER TABLE travelers ADD COLUMN gender              gender_type;
ALTER TABLE travelers ADD COLUMN age                 SMALLINT;
ALTER TABLE travelers ADD COLUMN invitee_type        invitee_type;          -- Invitee vs Guest
ALTER TABLE travelers ADD COLUMN registration_type   VARCHAR(64);           -- 'WSB Members', 'Adult (from 12 years old)', 'Infant (below 02 years old)'
ALTER TABLE travelers ADD COLUMN pax_type            pax_type DEFAULT 'adult';
ALTER TABLE travelers ADD COLUMN vip_tag             VARCHAR(64);           -- 'CEO VIP', 'VIP', NULL
ALTER TABLE travelers ADD COLUMN internal_id         VARCHAR(32);           -- e.g. 'LO-A05' — JBA internal tracking ID
ALTER TABLE travelers ADD COLUMN agent_code          VARCHAR(32);           -- e.g. '22BORC'

-- Party composition
ALTER TABLE travelers ADD COLUMN party_total         SMALLINT;              -- TOTAL# from CSV
ALTER TABLE travelers ADD COLUMN party_adults        SMALLINT;              -- #ADULT
ALTER TABLE travelers ADD COLUMN party_children      SMALLINT;              -- #CHD

-- Dietary & special needs
ALTER TABLE travelers ADD COLUMN dietary_vegan       BOOLEAN DEFAULT false;
ALTER TABLE travelers ADD COLUMN dietary_notes       TEXT;                  -- free-text dietary notes
ALTER TABLE travelers ADD COLUMN remarks             TEXT;                  -- general remarks (e.g. 'Upgrade - Junior Suite')

-- Repeat / loyalty
ALTER TABLE travelers ADD COLUMN repeat_attendee     SMALLINT DEFAULT 0;   -- how many times attended before
ALTER TABLE travelers ADD COLUMN jba_repeat          BOOLEAN DEFAULT false;

-- Onsite tracking
ALTER TABLE travelers ADD COLUMN checkin_status      checkin_status DEFAULT 'pending';
ALTER TABLE travelers ADD COLUMN onsite_flight_change BOOLEAN DEFAULT false;

-- SMD / CEO references (names, not FKs — these are display labels from the CSV)
ALTER TABLE travelers ADD COLUMN smd_name            VARCHAR(255);          -- Sales/Marketing Director name
ALTER TABLE travelers ADD COLUMN ceo_name            VARCHAR(255);          -- CEO name for the group

-- Photo URL
ALTER TABLE travelers ADD COLUMN photo_url           TEXT;

-- ============================================================
-- Room assignments — new table
-- Replaces the simple traveler_hotels junction with richer data
-- ============================================================
CREATE TABLE room_assignments (
    assignment_id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    traveler_id           UUID NOT NULL REFERENCES travelers(traveler_id) ON DELETE CASCADE,
    hotel_id              UUID NOT NULL REFERENCES hotels(hotel_id) ON DELETE CASCADE,
    room_number           VARCHAR(32),                -- actual room number assigned onsite
    room_assignment_seq   SMALLINT,                   -- the "Room Assignment" number from CSV (groups roommates)
    hotel_confirmation_no VARCHAR(64),                 -- hotel booking confirmation number
    occupancy             occupancy_type,              -- SINGLE / DOUBLE / TWIN / TRIPLE
    paid_room_type        VARCHAR(16),                 -- 'S1', 'D1', 'T1' etc.
    registered_single     BOOLEAN DEFAULT false,
    registered_double     BOOLEAN DEFAULT false,
    registered_twin       BOOLEAN DEFAULT false,
    registered_triple     BOOLEAN DEFAULT false,
    preferred_roommates   TEXT,                        -- free text: 'D1: Olanrewaju Ogunkoya and Bridget Taylor'
    is_paid_room          BOOLEAN DEFAULT false,       -- whether this is a paid room
    actual_single         BOOLEAN DEFAULT false,       -- actual room type assigned
    actual_double         BOOLEAN DEFAULT false,
    actual_twin           BOOLEAN DEFAULT false,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (traveler_id, hotel_id)
);

CREATE INDEX idx_room_assignments_traveler ON room_assignments(traveler_id);
CREATE INDEX idx_room_assignments_hotel ON room_assignments(hotel_id);

-- ============================================================
-- Flights — restructure to support arrival vs departure
-- ============================================================
ALTER TABLE flights ADD COLUMN airline         VARCHAR(64);
ALTER TABLE flights ADD COLUMN departure_time  TIMESTAMPTZ;
ALTER TABLE flights ADD COLUMN direction       flight_direction;
ALTER TABLE flights ADD COLUMN airport         VARCHAR(32);       -- e.g. 'ICN-T1', 'PEK-T3'

-- Traveler-Flight junction — add direction and file URL
ALTER TABLE traveler_flights ADD COLUMN direction       flight_direction;
ALTER TABLE traveler_flights ADD COLUMN ticket_file_url TEXT;           -- uploaded flight ticket PDF/image
ALTER TABLE traveler_flights ADD COLUMN flight_submitted BOOLEAN DEFAULT false;
ALTER TABLE traveler_flights ADD COLUMN submit_option   VARCHAR(64);   -- 'Invitee', 'Submit now', 'Same as Main Passenger'

-- Drop the old composite PK and recreate with direction
ALTER TABLE traveler_flights DROP CONSTRAINT traveler_flights_pkey;
-- direction is NOT NULL for new rows; backfill existing rows as 'arrival'
UPDATE traveler_flights SET direction = 'arrival' WHERE direction IS NULL;
ALTER TABLE traveler_flights ALTER COLUMN direction SET NOT NULL;
ALTER TABLE traveler_flights ADD PRIMARY KEY (traveler_id, flight_id, direction);

-- ============================================================
-- Event attendance tracking — new table
-- Tracks which events each traveler is assigned to / attended
-- ============================================================
CREATE TABLE event_attendance (
    attendance_id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    traveler_id     UUID NOT NULL REFERENCES travelers(traveler_id) ON DELETE CASCADE,
    event_id        UUID NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
    fleet_number    VARCHAR(32),       -- 'Fleet 8', 'Fleet 3' — bus/group assignment for the event
    attended        BOOLEAN,           -- NULL = not yet, true = attended, false = no-show
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (traveler_id, event_id)
);

CREATE INDEX idx_event_attendance_traveler ON event_attendance(traveler_id);
CREATE INDEX idx_event_attendance_event ON event_attendance(event_id);

-- ============================================================
-- Hotels — add sub_group column
-- ============================================================
ALTER TABLE hotels ADD COLUMN short_code VARCHAR(32);  -- 'LOTTE', 'FAIRMONT' etc.

-- ============================================================
-- Groups — add group_letter for the A/B/C top-level grouping
-- ============================================================
ALTER TABLE groups ADD COLUMN group_letter VARCHAR(8);  -- 'A', 'B', 'C'
ALTER TABLE groups ADD COLUMN is_sub_group BOOLEAN DEFAULT false;
ALTER TABLE groups ADD COLUMN parent_group_id UUID REFERENCES groups(group_id);

-- ============================================================
-- Indexes for new columns
-- ============================================================
CREATE INDEX idx_travelers_first_name ON travelers(first_name);
CREATE INDEX idx_travelers_last_name ON travelers(last_name);
CREATE INDEX idx_travelers_checkin ON travelers(checkin_status);
CREATE INDEX idx_travelers_internal_id ON travelers(internal_id);
CREATE INDEX idx_travelers_invitee_type ON travelers(invitee_type);
CREATE INDEX idx_travelers_pax_type ON travelers(pax_type);
