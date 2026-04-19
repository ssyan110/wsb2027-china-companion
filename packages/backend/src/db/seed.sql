-- WSB 2027 China Digital Companion — Seed Data
-- Modeled after WSB 2025 South Korea Super Trip reference master list

-- ============================================================
-- Hotels (modeled after: LOTTE, FAIRMONT, INTER PARNAS, JW MARRIOTT, THE PLAZA)
-- ============================================================
INSERT INTO hotels (hotel_id, name, short_code, address_en, address_cn) VALUES
  ('a1111111-1111-1111-1111-111111111111', 'The Ritz-Carlton Beijing',       'RITZ',      '83A Jianguo Road, Chaoyang District, Beijing 100025', '北京市朝阳区建国路甲83号'),
  ('a2222222-2222-2222-2222-222222222222', 'Four Seasons Hotel Beijing',     'FOURSEASONS','48 Liangmaqiao Road, Chaoyang District, Beijing 100125', '北京市朝阳区亮马桥路48号'),
  ('a3333333-3333-3333-3333-333333333333', 'Mandarin Oriental Wangfujing',   'MANDARIN',  '269 Wangfujing Street, Dongcheng District, Beijing 100006', '北京市东城区王府井大街269号'),
  ('a4444444-4444-4444-4444-444444444444', 'Grand Hyatt Beijing',            'GRANDHYATT','1 East Chang An Avenue, Dongcheng District, Beijing 100738', '北京市东城区东长安街1号'),
  ('a5555555-5555-5555-5555-555555555555', 'The Peninsula Beijing',          'PENINSULA', '8 Goldfish Lane, Wangfujing, Dongcheng District, Beijing 100006', '北京市东城区王府井金鱼胡同8号');

-- ============================================================
-- Groups (modeled after: A, B, C + sub-groups A1, A2, B1, B2)
-- ============================================================
INSERT INTO groups (group_id, name, group_letter, is_sub_group, description) VALUES
  ('b1111111-1111-1111-1111-111111111111', 'Group A', 'A', false, 'Diamond tier — VIP access, premium hotel, exclusive events'),
  ('b2222222-2222-2222-2222-222222222222', 'Group B', 'B', false, 'Gold tier — premium event access'),
  ('b3333333-3333-3333-3333-333333333333', 'Group C', 'C', false, 'Silver tier — standard event access'),
  ('b4444444-4444-4444-4444-444444444444', 'JBA Staff', NULL, false, 'Journey Beyond Asia operations team');

INSERT INTO groups (group_id, name, group_letter, is_sub_group, parent_group_id, description) VALUES
  ('b1100001-1111-1111-1111-111111111111', 'A1', 'A', true, 'b1111111-1111-1111-1111-111111111111', 'Group A — Sub-group 1 (Ritz-Carlton)'),
  ('b1100002-1111-1111-1111-111111111111', 'A2', 'A', true, 'b1111111-1111-1111-1111-111111111111', 'Group A — Sub-group 2 (Four Seasons)'),
  ('b2200001-2222-2222-2222-222222222222', 'B1', 'B', true, 'b2222222-2222-2222-2222-222222222222', 'Group B — Sub-group 1 (Mandarin Oriental)'),
  ('b2200002-2222-2222-2222-222222222222', 'B2', 'B', true, 'b2222222-2222-2222-2222-222222222222', 'Group B — Sub-group 2 (Grand Hyatt)');


-- ============================================================
-- Itinerary Options (modeled after: K-HERITAGE, K-NATURE, K-FOOD, K-WELLNESS)
-- ============================================================
INSERT INTO itinerary_options (option_id, name, description) VALUES
  ('c1111111-1111-1111-1111-111111111111', 'C-Heritage: Great Wall & Forbidden City', 'Full-day tour: Mutianyu Great Wall + Forbidden City guided tour with lunch'),
  ('c2222222-2222-2222-2222-222222222222', 'C-Nature: Summer Palace & Olympic Park', 'Full-day tour: Summer Palace gardens, Kunming Lake boat ride + Olympic Park'),
  ('c3333333-3333-3333-3333-333333333333', 'C-Food: Hutong Food Tour', 'Half-day walking food tour through traditional Beijing hutongs — 8 tastings'),
  ('c4444444-4444-4444-4444-444444444444', 'C-Wellness: Temple of Heaven & Tea Ceremony', 'Half-day: Temple of Heaven visit + traditional Chinese tea ceremony experience');

-- ============================================================
-- Events (6-day itinerary modeled after WSB 2025 Korea)
-- ============================================================
INSERT INTO events (event_id, name, event_type, date, start_time, end_time, location, description) VALUES
  -- Day 1: June 15 — Arrival
  ('d1000001-0000-0000-0000-000000000001', 'Airport Arrival & Bus Transfer', 'transfer', '2027-06-15', '2027-06-15T08:00:00Z', '2027-06-15T20:00:00Z', 'Beijing Capital International Airport (PEK)', 'Welcome to Beijing! Meet your JBA guide at arrivals and board your assigned bus to the hotel.'),
  ('d1000002-0000-0000-0000-000000000002', 'Hotel Check-In', 'hotel_checkin', '2027-06-15', '2027-06-15T14:00:00Z', '2027-06-15T18:00:00Z', 'Assigned Hotel', 'Check in and freshen up before the welcome dinner.'),
  ('d1000003-0000-0000-0000-000000000003', 'Welcome Dinner & Cultural Show', 'meal', '2027-06-15', '2027-06-15T19:00:00Z', '2027-06-15T22:00:00Z', 'The Ritz-Carlton Grand Ballroom', 'Opening night celebration with traditional Chinese performances and a 10-course banquet.'),
  -- Day 2: June 16 — Free Day / Optional Tours
  ('d2000001-0000-0000-0000-000000000001', 'Breakfast at Hotel', 'meal', '2027-06-16', '2027-06-16T07:00:00Z', '2027-06-16T09:00:00Z', 'Hotel Restaurant', 'Buffet breakfast at your hotel.'),
  ('d2000002-0000-0000-0000-000000000002', 'C-Heritage: Great Wall & Forbidden City', 'activity', '2027-06-16', '2027-06-16T08:30:00Z', '2027-06-16T17:00:00Z', 'Mutianyu Great Wall → Forbidden City', 'Full-day excursion with cable car, guided palace tour, and lunch.'),
  ('d2000003-0000-0000-0000-000000000003', 'C-Nature: Summer Palace & Olympic Park', 'activity', '2027-06-16', '2027-06-16T09:00:00Z', '2027-06-16T17:00:00Z', 'Summer Palace → Olympic Green', 'Imperial gardens, dragon boat ride, Bird Nest & Water Cube.'),
  ('d2000004-0000-0000-0000-000000000004', 'C-Food: Hutong Food Tour', 'activity', '2027-06-16', '2027-06-16T10:00:00Z', '2027-06-16T14:00:00Z', 'Nanluoguxiang Hutong', 'Walking food tour — 8 tastings of authentic Beijing street food.'),
  ('d2000005-0000-0000-0000-000000000005', 'C-Wellness: Temple of Heaven & Tea Ceremony', 'activity', '2027-06-16', '2027-06-16T10:00:00Z', '2027-06-16T14:00:00Z', 'Temple of Heaven → Maliandao Tea Street', 'Ancient temple visit + traditional tea ceremony experience.'),
  -- Day 3: June 17 — City Tour & Soiree
  ('d3000001-0000-0000-0000-000000000001', 'Breakfast at Hotel', 'meal', '2027-06-17', '2027-06-17T07:00:00Z', '2027-06-17T09:00:00Z', 'Hotel Restaurant', 'Buffet breakfast.'),
  ('d3000002-0000-0000-0000-000000000002', 'Beijing City Tour', 'activity', '2027-06-17', '2027-06-17T09:30:00Z', '2027-06-17T16:00:00Z', 'Tiananmen Square → National Museum → Wangfujing', 'Guided city tour with lunch at a local restaurant.'),
  ('d3000003-0000-0000-0000-000000000003', 'WSB Soiree Night', 'ceremony', '2027-06-17', '2027-06-17T19:00:00Z', '2027-06-17T23:00:00Z', 'The Peninsula Beijing Rooftop', 'Elegant cocktail soiree with networking and live jazz.'),
  -- Day 4: June 18 — WSB Gala Dinner
  ('d4000001-0000-0000-0000-000000000001', 'Breakfast at Hotel', 'meal', '2027-06-18', '2027-06-18T07:00:00Z', '2027-06-18T09:00:00Z', 'Hotel Restaurant', 'Buffet breakfast.'),
  ('d4000002-0000-0000-0000-000000000002', 'Free Day at Leisure', 'activity', '2027-06-18', '2027-06-18T09:00:00Z', '2027-06-18T17:00:00Z', 'Beijing City', 'Free day — shopping at Wangfujing or explore the 798 Art District.'),
  ('d4000003-0000-0000-0000-000000000003', 'WSB Grand Gala Dinner', 'ceremony', '2027-06-18', '2027-06-18T18:30:00Z', '2027-06-18T23:59:00Z', 'The Great Hall of the People', 'The spectacular grand gala with awards ceremony, live entertainment, and a 12-course imperial banquet.'),
  -- Day 5: June 19 — C-Day
  ('d5000001-0000-0000-0000-000000000001', 'Breakfast at Hotel', 'meal', '2027-06-19', '2027-06-19T07:00:00Z', '2027-06-19T09:00:00Z', 'Hotel Restaurant', 'Buffet breakfast.'),
  ('d5000002-0000-0000-0000-000000000002', 'WSB C-Day Celebration', 'ceremony', '2027-06-19', '2027-06-19T10:00:00Z', '2027-06-19T17:00:00Z', 'Olympic Forest Park', 'The legendary C-Day outdoor festival — cultural activities, performances, food stalls, and team celebrations!'),
  ('d5000003-0000-0000-0000-000000000003', 'C-Day Light Lunch', 'meal', '2027-06-19', '2027-06-19T12:00:00Z', '2027-06-19T13:30:00Z', 'C-Day Venue', 'Light lunch at the C-Day venue.'),
  -- Day 6: June 20 — Departure
  ('d6000001-0000-0000-0000-000000000001', 'Farewell Breakfast', 'meal', '2027-06-20', '2027-06-20T06:00:00Z', '2027-06-20T09:00:00Z', 'Hotel Restaurant', 'Final breakfast before departure.'),
  ('d6000002-0000-0000-0000-000000000002', 'Hotel Check-Out & Airport Transfer', 'transfer', '2027-06-20', '2027-06-20T09:00:00Z', '2027-06-20T18:00:00Z', 'Hotel → Beijing Capital Airport (PEK)', 'Check out and board your assigned bus to the airport. Safe travels!');

-- Event Eligibility
INSERT INTO event_eligibility (event_id, option_id) VALUES
  ('d2000002-0000-0000-0000-000000000002', 'c1111111-1111-1111-1111-111111111111'),
  ('d2000003-0000-0000-0000-000000000003', 'c2222222-2222-2222-2222-222222222222'),
  ('d2000004-0000-0000-0000-000000000004', 'c3333333-3333-3333-3333-333333333333'),
  ('d2000005-0000-0000-0000-000000000005', 'c4444444-4444-4444-4444-444444444444');

-- ============================================================
-- Buses
-- ============================================================
INSERT INTO buses (bus_id, bus_number, capacity, event_id, terminal) VALUES
  ('e1111111-1111-1111-1111-111111111111', 'BUS-01', 45, 'd1000001-0000-0000-0000-000000000001', 'T3'),
  ('e2222222-2222-2222-2222-222222222222', 'BUS-02', 45, 'd1000001-0000-0000-0000-000000000001', 'T3'),
  ('e3333333-3333-3333-3333-333333333333', 'BUS-03', 45, 'd1000001-0000-0000-0000-000000000001', 'T2'),
  ('e4444444-4444-4444-4444-444444444444', 'BUS-04', 45, 'd6000002-0000-0000-0000-000000000002', 'T3'),
  ('e5555555-5555-5555-5555-555555555555', 'BUS-05', 45, 'd6000002-0000-0000-0000-000000000002', 'T2');


-- ============================================================
-- Travelers — modeled after first 10 rows of WSB 2025 Master List
-- Adapted to WSB 2027 China context with realistic data
-- ============================================================

-- Row 1: Adeolu Durotoye → Wei Zhang (CEO VIP, Invitee, Single room)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, vip_tag, internal_id, agent_code, smd_name, ceo_name,
  party_total, party_adults, party_children, dietary_vegan, remarks,
  repeat_attendee, jba_repeat, role_type, access_status, checkin_status
) VALUES (
  'f0000001-0000-0000-0000-000000000001', 'WSB-2027-001',
  'Wei', 'Zhang', 'Wei Zhang', 'wei zhang',
  'wei.zhang@demo.com', '+86-138-0001-1234', 'ZHANG WEI',
  'male', 52, 'invitee', 'WSB Members',
  'adult', 'CEO VIP', 'RC-A05', '22BORC', 'Wei Zhang', 'Wei Zhang',
  1, 1, 0, false, 'Upgrade - Junior Suite',
  2, false, 'representative', 'activated', 'checked_in'
);

-- Row 2: Olanrewaju Ogunkoya → Jun Li (Invitee, Double room with guest)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, agent_code, smd_name, ceo_name,
  party_total, party_adults, party_children, dietary_vegan,
  repeat_attendee, role_type, access_status, checkin_status
) VALUES (
  'f0000002-0000-0000-0000-000000000002', 'WSB-2027-002',
  'Jun', 'Li', 'Jun Li', 'jun li',
  'jun.li@demo.com', '+86-139-0002-5678', 'LI JUN',
  'male', 48, 'invitee', 'WSB Members',
  'adult', 'RC-A05', '88SXJ', 'Wei Zhang', 'Wei Zhang',
  1, 1, 0, false,
  1, 'traveler', 'activated', 'checked_in'
);

-- Row 3: Bridget Taylor → Mei Chen (Guest of Jun Li, shares Double room)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, agent_code, smd_name, ceo_name,
  party_total, party_adults, party_children, dietary_vegan,
  repeat_attendee, role_type, access_status, checkin_status
) VALUES (
  'f0000003-0000-0000-0000-000000000003', 'WSB-2027-002',
  'Mei', 'Chen', 'Mei Chen', 'mei chen',
  'mei.chen@demo.com', '+86-137-0003-9012', 'CHEN MEI',
  'female', 45, 'guest', 'Adult (from 12 years old)',
  'adult', 'RC-A05', 'C1H3D', 'Jun Li', 'Wei Zhang',
  1, 1, 0, false,
  1, 'traveler', 'activated', 'checked_in'
);

-- Row 4: Abolade Akinropo → Xia Wang (Invitee, Double room with guest)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, agent_code, smd_name, ceo_name,
  party_total, party_adults, party_children, dietary_vegan,
  repeat_attendee, role_type, access_status, checkin_status
) VALUES (
  'f0000004-0000-0000-0000-000000000004', 'WSB-2027-003',
  'Xia', 'Wang', 'Xia Wang', 'xia wang',
  'xia.wang@demo.com', '+86-136-0004-3456', 'WANG XIA',
  'female', 53, 'invitee', 'WSB Members',
  'adult', 'RC-A05', 'C3U1T', 'Jun Li', 'Wei Zhang',
  1, 1, 0, false,
  1, 'traveler', 'activated', 'checked_in'
);

-- Row 5: Shola Olori → Hua Lin (Guest of Xia Wang, shares Double room)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, agent_code, smd_name, ceo_name,
  party_total, party_adults, party_children,
  repeat_attendee, role_type, access_status, checkin_status
) VALUES (
  'f0000005-0000-0000-0000-000000000005', 'WSB-2027-003',
  'Hua', 'Lin', 'Hua Lin', 'hua lin',
  'hua.lin@demo.com', '+86-135-0005-7890', 'LIN HUA',
  'female', 58, 'guest', 'Adult (from 12 years old)',
  'adult', 'RC-A05', '99ELP', 'Jun Li', 'Wei Zhang',
  1, 1, 0,
  1, 'traveler', 'activated', 'pending'
);

-- Row 6: Onuwabhagbe Ogudo → Tao Yang (Invitee, Twin room with guest)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, agent_code, smd_name, ceo_name,
  party_total, party_adults, party_children, dietary_vegan,
  repeat_attendee, role_type, access_status, checkin_status
) VALUES (
  'f0000006-0000-0000-0000-000000000006', 'WSB-2027-004',
  'Tao', 'Yang', 'Tao Yang', 'tao yang',
  'tao.yang@demo.com', '+86-158-0006-1234', 'YANG TAO',
  'male', 46, 'invitee', 'WSB Members',
  'adult', 'RC-A05', '06ARAC', 'Fang Liu', 'Wei Zhang',
  1, 1, 0, false,
  2, 'traveler', 'activated', 'checked_in'
);

-- Row 7: Jeffrey Usman → Jian Wu (Guest of Tao Yang, shares Twin room)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, agent_code, smd_name, ceo_name,
  party_total, party_adults, party_children, dietary_vegan,
  repeat_attendee, role_type, access_status, checkin_status
) VALUES (
  'f0000007-0000-0000-0000-000000000007', 'WSB-2027-004',
  'Jian', 'Wu', 'Jian Wu', 'jian wu',
  'jian.wu@demo.com', '+86-159-0007-5678', 'WU JIAN',
  'male', 44, 'guest', 'Adult (from 12 years old)',
  'adult', 'RC-A05', '072FLC', 'Wei Zhang', 'Wei Zhang',
  1, 1, 0, false,
  3, 'traveler', 'activated', 'checked_in'
);

-- Row 8: Paul Adeyeye → Qiang Zhao (Invitee, Double room with guest)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, agent_code, smd_name, ceo_name,
  party_total, party_adults, party_children, dietary_vegan,
  repeat_attendee, role_type, access_status, checkin_status
) VALUES (
  'f0000008-0000-0000-0000-000000000008', 'WSB-2027-005',
  'Qiang', 'Zhao', 'Qiang Zhao', 'qiang zhao',
  'qiang.zhao@demo.com', '+86-186-0008-9012', 'ZHAO QIANG',
  'male', 39, 'invitee', 'WSB Members',
  'adult', 'RC-A05', '13RTYC', 'Fang Liu', 'Wei Zhang',
  1, 1, 0, false,
  1, 'traveler', 'activated', 'checked_in'
);

-- Row 9: Idowu Nafiu → Lei Sun (Guest of Qiang Zhao, shares Double room)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, smd_name, ceo_name,
  party_total, party_adults, party_children,
  repeat_attendee, role_type, access_status, checkin_status
) VALUES (
  'f0000009-0000-0000-0000-000000000009', 'WSB-2027-005',
  'Lei', 'Sun', 'Lei Sun', 'lei sun',
  'lei.sun@demo.com', '+86-187-0009-3456', 'SUN LEI',
  'male', 46, 'guest', 'Adult (from 12 years old)',
  'adult', 'RC-A05', 'Fang Liu', 'Wei Zhang',
  1, 1, 0,
  1, 'traveler', 'activated', 'pending'
);

-- Row 10: Folashade Awosanmi → Fang Liu (Invitee, SMD, Double room)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, agent_code, smd_name, ceo_name,
  party_total, party_adults, party_children, dietary_vegan,
  repeat_attendee, role_type, access_status, checkin_status
) VALUES (
  'f0000010-0000-0000-0000-000000000010', 'WSB-2027-006',
  'Fang', 'Liu', 'Fang Liu', 'fang liu',
  'fang.liu@demo.com', '+86-188-0010-7890', 'LIU FANG',
  'female', 59, 'invitee', 'WSB Members',
  'adult', 'RC-A05', '79TFEC', 'Fang Liu', 'Wei Zhang',
  1, 1, 0, false,
  2, 'representative', 'activated', 'checked_in'
);

-- Staff & Admin accounts
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, role_type, access_status, checkin_status
) VALUES
  ('f0000011-0000-0000-0000-000000000011', NULL, 'Alex', 'Park', 'Alex Park', 'alex park', 'alex@demo.com', 'staff', 'activated', 'pending'),
  ('f0000012-0000-0000-0000-000000000012', NULL, 'Admin', 'User', 'Admin User', 'admin user', 'admin@demo.com', 'admin', 'activated', 'pending'),
  ('f0000013-0000-0000-0000-000000000013', NULL, 'Super', 'Admin', 'Super Admin', 'super admin', 'superadmin@demo.com', 'super_admin', 'activated', 'pending');


-- ============================================================
-- Families (modeled after primary registrant groupings)
-- ============================================================
-- Wei Zhang is solo (single room)
INSERT INTO families (family_id, representative_id) VALUES
  ('fa000001-0000-0000-0000-000000000001', 'f0000001-0000-0000-0000-000000000001');
UPDATE travelers SET family_id = 'fa000001-0000-0000-0000-000000000001' WHERE traveler_id = 'f0000001-0000-0000-0000-000000000001';

-- Jun Li + Mei Chen (double room pair)
INSERT INTO families (family_id, representative_id) VALUES
  ('fa000002-0000-0000-0000-000000000002', 'f0000002-0000-0000-0000-000000000002');
UPDATE travelers SET family_id = 'fa000002-0000-0000-0000-000000000002', representative_id = 'f0000002-0000-0000-0000-000000000002' WHERE traveler_id IN ('f0000002-0000-0000-0000-000000000002', 'f0000003-0000-0000-0000-000000000003');

-- Xia Wang + Hua Lin (double room pair)
INSERT INTO families (family_id, representative_id) VALUES
  ('fa000003-0000-0000-0000-000000000003', 'f0000004-0000-0000-0000-000000000004');
UPDATE travelers SET family_id = 'fa000003-0000-0000-0000-000000000003', representative_id = 'f0000004-0000-0000-0000-000000000004' WHERE traveler_id IN ('f0000004-0000-0000-0000-000000000004', 'f0000005-0000-0000-0000-000000000005');

-- Tao Yang + Jian Wu (twin room pair)
INSERT INTO families (family_id, representative_id) VALUES
  ('fa000004-0000-0000-0000-000000000004', 'f0000006-0000-0000-0000-000000000006');
UPDATE travelers SET family_id = 'fa000004-0000-0000-0000-000000000004', representative_id = 'f0000006-0000-0000-0000-000000000006' WHERE traveler_id IN ('f0000006-0000-0000-0000-000000000006', 'f0000007-0000-0000-0000-000000000007');

-- Qiang Zhao + Lei Sun (double room pair)
INSERT INTO families (family_id, representative_id) VALUES
  ('fa000005-0000-0000-0000-000000000005', 'f0000008-0000-0000-0000-000000000008');
UPDATE travelers SET family_id = 'fa000005-0000-0000-0000-000000000005', representative_id = 'f0000008-0000-0000-0000-000000000008' WHERE traveler_id IN ('f0000008-0000-0000-0000-000000000008', 'f0000009-0000-0000-0000-000000000009');

-- Fang Liu is solo (double room, waiting for roommate assignment)
INSERT INTO families (family_id, representative_id) VALUES
  ('fa000006-0000-0000-0000-000000000006', 'f0000010-0000-0000-0000-000000000010');
UPDATE travelers SET family_id = 'fa000006-0000-0000-0000-000000000006' WHERE traveler_id = 'f0000010-0000-0000-0000-000000000010';

-- ============================================================
-- QR Tokens
-- ============================================================
INSERT INTO qr_tokens (traveler_id, token_value, token_hash, is_active) VALUES
  ('f0000001-0000-0000-0000-000000000001', 'QR-WEI-ZHANG-2027',    'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2', true),
  ('f0000002-0000-0000-0000-000000000002', 'QR-JUN-LI-2027',       'b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3', true),
  ('f0000003-0000-0000-0000-000000000003', 'QR-MEI-CHEN-2027',     'c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4', true),
  ('f0000004-0000-0000-0000-000000000004', 'QR-XIA-WANG-2027',     'd4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5', true),
  ('f0000005-0000-0000-0000-000000000005', 'QR-HUA-LIN-2027',      'e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6', true),
  ('f0000006-0000-0000-0000-000000000006', 'QR-TAO-YANG-2027',     'f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1', true),
  ('f0000007-0000-0000-0000-000000000007', 'QR-JIAN-WU-2027',      'a1a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1', true),
  ('f0000008-0000-0000-0000-000000000008', 'QR-QIANG-ZHAO-2027',   'b2b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2', true),
  ('f0000009-0000-0000-0000-000000000009', 'QR-LEI-SUN-2027',      'c3c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3', true),
  ('f0000010-0000-0000-0000-000000000010', 'QR-FANG-LIU-2027',     'd4d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4', true),
  ('f0000011-0000-0000-0000-000000000011', 'QR-ALEX-PARK-STAFF',   'e5e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5', true),
  ('f0000012-0000-0000-0000-000000000012', 'QR-ADMIN-USER-2027',   'f6f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6', true),
  ('f0000013-0000-0000-0000-000000000013', 'QR-SUPER-ADMIN-2027',  'a7a7b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a7', true);

-- ============================================================
-- Group Assignments — all 10 travelers in Group A, Sub-group A2
-- ============================================================
INSERT INTO traveler_groups (traveler_id, group_id) VALUES
  ('f0000001-0000-0000-0000-000000000001', 'b1111111-1111-1111-1111-111111111111'),
  ('f0000001-0000-0000-0000-000000000001', 'b1100002-1111-1111-1111-111111111111'),
  ('f0000002-0000-0000-0000-000000000002', 'b1111111-1111-1111-1111-111111111111'),
  ('f0000002-0000-0000-0000-000000000002', 'b1100002-1111-1111-1111-111111111111'),
  ('f0000003-0000-0000-0000-000000000003', 'b1111111-1111-1111-1111-111111111111'),
  ('f0000003-0000-0000-0000-000000000003', 'b1100002-1111-1111-1111-111111111111'),
  ('f0000004-0000-0000-0000-000000000004', 'b1111111-1111-1111-1111-111111111111'),
  ('f0000004-0000-0000-0000-000000000004', 'b1100002-1111-1111-1111-111111111111'),
  ('f0000005-0000-0000-0000-000000000005', 'b1111111-1111-1111-1111-111111111111'),
  ('f0000005-0000-0000-0000-000000000005', 'b1100002-1111-1111-1111-111111111111'),
  ('f0000006-0000-0000-0000-000000000006', 'b1111111-1111-1111-1111-111111111111'),
  ('f0000006-0000-0000-0000-000000000006', 'b1100002-1111-1111-1111-111111111111'),
  ('f0000007-0000-0000-0000-000000000007', 'b1111111-1111-1111-1111-111111111111'),
  ('f0000007-0000-0000-0000-000000000007', 'b1100002-1111-1111-1111-111111111111'),
  ('f0000008-0000-0000-0000-000000000008', 'b1111111-1111-1111-1111-111111111111'),
  ('f0000008-0000-0000-0000-000000000008', 'b1100002-1111-1111-1111-111111111111'),
  ('f0000009-0000-0000-0000-000000000009', 'b1111111-1111-1111-1111-111111111111'),
  ('f0000009-0000-0000-0000-000000000009', 'b1100002-1111-1111-1111-111111111111'),
  ('f0000010-0000-0000-0000-000000000010', 'b1111111-1111-1111-1111-111111111111'),
  ('f0000010-0000-0000-0000-000000000010', 'b1100002-1111-1111-1111-111111111111'),
  ('f0000011-0000-0000-0000-000000000011', 'b4444444-4444-4444-4444-444444444444'),
  ('f0000012-0000-0000-0000-000000000012', 'b4444444-4444-4444-4444-444444444444'),
  ('f0000013-0000-0000-0000-000000000013', 'b4444444-4444-4444-4444-444444444444');

-- ============================================================
-- Room Assignments — modeled after CSV room groupings
-- Room Assignment seq groups roommates (same number = same room)
-- ============================================================
INSERT INTO room_assignments (traveler_id, hotel_id, room_assignment_seq, occupancy, paid_room_type, registered_single, preferred_roommates, is_paid_room, actual_single, hotel_confirmation_no) VALUES
  -- Room 1: Wei Zhang — Single
  ('f0000001-0000-0000-0000-000000000001', 'a1111111-1111-1111-1111-111111111111', 1, 'single', 'S1', true, NULL, true, true, 'RC-CONF-001');

INSERT INTO room_assignments (traveler_id, hotel_id, room_assignment_seq, occupancy, paid_room_type, registered_double, preferred_roommates, is_paid_room, actual_double, hotel_confirmation_no) VALUES
  -- Room 2: Jun Li + Mei Chen — Double
  ('f0000002-0000-0000-0000-000000000002', 'a1111111-1111-1111-1111-111111111111', 2, 'double', 'D1', true, 'D1: Jun Li and Mei Chen', true, true, 'RC-CONF-002'),
  ('f0000003-0000-0000-0000-000000000003', 'a1111111-1111-1111-1111-111111111111', 2, 'double', 'D1', true, NULL, true, false, 'RC-CONF-002');

INSERT INTO room_assignments (traveler_id, hotel_id, room_assignment_seq, occupancy, paid_room_type, registered_double, preferred_roommates, is_paid_room, actual_double, hotel_confirmation_no) VALUES
  -- Room 3: Xia Wang + Hua Lin — Double
  ('f0000004-0000-0000-0000-000000000004', 'a1111111-1111-1111-1111-111111111111', 3, 'double', 'D1', true, 'D1: Xia Wang + Hua Lin', true, true, 'RC-CONF-003'),
  ('f0000005-0000-0000-0000-000000000005', 'a1111111-1111-1111-1111-111111111111', 3, 'double', 'D1', true, NULL, true, false, 'RC-CONF-003');

INSERT INTO room_assignments (traveler_id, hotel_id, room_assignment_seq, occupancy, paid_room_type, registered_twin, is_paid_room, actual_twin, hotel_confirmation_no) VALUES
  -- Room 4: Tao Yang + Jian Wu — Twin
  ('f0000006-0000-0000-0000-000000000006', 'a1111111-1111-1111-1111-111111111111', 4, 'twin', 'T1', true, true, true, 'RC-CONF-004'),
  ('f0000007-0000-0000-0000-000000000007', 'a1111111-1111-1111-1111-111111111111', 4, 'twin', 'T1', true, false, false, 'RC-CONF-004');

INSERT INTO room_assignments (traveler_id, hotel_id, room_assignment_seq, occupancy, paid_room_type, registered_double, is_paid_room, actual_double, hotel_confirmation_no) VALUES
  -- Room 5: Qiang Zhao + Lei Sun — Double
  ('f0000008-0000-0000-0000-000000000008', 'a1111111-1111-1111-1111-111111111111', 5, 'double', 'D1', true, true, true, 'RC-CONF-005'),
  ('f0000009-0000-0000-0000-000000000009', 'a1111111-1111-1111-1111-111111111111', 5, 'double', 'D1', true, false, false, 'RC-CONF-005');

INSERT INTO room_assignments (traveler_id, hotel_id, room_assignment_seq, occupancy, paid_room_type, registered_double, is_paid_room, actual_double, hotel_confirmation_no) VALUES
  -- Room 6: Fang Liu — Double (waiting for roommate)
  ('f0000010-0000-0000-0000-000000000010', 'a1111111-1111-1111-1111-111111111111', 6, 'double', 'D1', true, true, true, 'RC-CONF-006');


-- ============================================================
-- Flights — Arrival and Departure with airline info
-- Modeled after real flight data from the CSV
-- ============================================================

-- Arrival flights
INSERT INTO flights (flight_id, airline, flight_number, direction, arrival_time, airport, terminal) VALUES
  ('f1000001-0000-0000-0000-000000000001', 'Air China',   'CA 988',  'arrival', '2027-06-15T10:30:00Z', 'PEK-T3', 'T3'),
  ('f1000002-0000-0000-0000-000000000002', 'Delta',       'DL 189',  'arrival', '2027-06-15T14:10:00Z', 'PEK-T2', 'T2'),
  ('f1000003-0000-0000-0000-000000000003', 'Air China',   'CA 986',  'arrival', '2027-06-15T17:20:00Z', 'PEK-T3', 'T3'),
  ('f1000004-0000-0000-0000-000000000004', 'United',      'UA 89',   'arrival', '2027-06-15T18:45:00Z', 'PEK-T3', 'T3'),
  ('f1000005-0000-0000-0000-000000000005', 'Air Canada',  'AC 61',   'arrival', '2027-06-14T17:30:00Z', 'PEK-T3', 'T3'),
  ('f1000006-0000-0000-0000-000000000006', 'Air Canada',  'AC 63',   'arrival', '2027-06-15T16:05:00Z', 'PEK-T3', 'T3');

-- Departure flights
INSERT INTO flights (flight_id, airline, flight_number, direction, departure_time, airport, terminal) VALUES
  ('f2100001-0000-0000-0000-000000000001', 'Air China',   'CA 989',  'departure', '2027-06-20T20:45:00Z', 'PEK-T3', 'T3'),
  ('f2100002-0000-0000-0000-000000000002', 'Delta',       'DL 188',  'departure', '2027-06-20T16:25:00Z', 'PEK-T2', 'T2'),
  ('f2100003-0000-0000-0000-000000000003', 'Air China',   'CA 987',  'departure', '2027-06-20T18:45:00Z', 'PEK-T3', 'T3'),
  ('f2100004-0000-0000-0000-000000000004', 'Air Canada',  'AC 64',   'departure', '2027-06-20T17:45:00Z', 'PEK-T3', 'T3'),
  ('f2100005-0000-0000-0000-000000000005', 'Korean Air',  'KE 719',  'departure', '2027-06-20T20:30:00Z', 'PEK-T2', 'T2'),
  ('f2100006-0000-0000-0000-000000000006', 'Air Canada',  'AC 62',   'departure', '2027-06-20T19:05:00Z', 'PEK-T3', 'T3');

-- Traveler-Flight assignments (arrival)
INSERT INTO traveler_flights (traveler_id, flight_id, direction, flight_submitted, submit_option) VALUES
  ('f0000001-0000-0000-0000-000000000001', 'f1000004-0000-0000-0000-000000000004', 'arrival', true, 'Invitee'),
  ('f0000002-0000-0000-0000-000000000002', 'f1000002-0000-0000-0000-000000000002', 'arrival', true, 'Invitee'),
  ('f0000003-0000-0000-0000-000000000003', 'f1000002-0000-0000-0000-000000000002', 'arrival', true, 'Submit now'),
  ('f0000004-0000-0000-0000-000000000004', 'f1000003-0000-0000-0000-000000000003', 'arrival', true, 'Invitee'),
  ('f0000005-0000-0000-0000-000000000005', 'f1000003-0000-0000-0000-000000000003', 'arrival', true, 'Same as Main Passenger'),
  ('f0000006-0000-0000-0000-000000000006', 'f1000004-0000-0000-0000-000000000004', 'arrival', true, 'Invitee'),
  ('f0000007-0000-0000-0000-000000000007', 'f1000005-0000-0000-0000-000000000005', 'arrival', true, 'Submit now'),
  ('f0000008-0000-0000-0000-000000000008', 'f1000004-0000-0000-0000-000000000004', 'arrival', true, 'Invitee'),
  ('f0000009-0000-0000-0000-000000000009', 'f1000004-0000-0000-0000-000000000004', 'arrival', true, 'Submit now'),
  ('f0000010-0000-0000-0000-000000000010', 'f1000006-0000-0000-0000-000000000006', 'arrival', true, 'Invitee');

-- Traveler-Flight assignments (departure)
INSERT INTO traveler_flights (traveler_id, flight_id, direction, flight_submitted, submit_option) VALUES
  ('f0000001-0000-0000-0000-000000000001', 'f2100001-0000-0000-0000-000000000001', 'departure', true, 'Invitee'),
  ('f0000002-0000-0000-0000-000000000002', 'f2100002-0000-0000-0000-000000000002', 'departure', true, 'Invitee'),
  ('f0000003-0000-0000-0000-000000000003', 'f2100002-0000-0000-0000-000000000002', 'departure', true, 'Submit now'),
  ('f0000004-0000-0000-0000-000000000004', 'f2100003-0000-0000-0000-000000000003', 'departure', true, 'Invitee'),
  ('f0000005-0000-0000-0000-000000000005', 'f2100003-0000-0000-0000-000000000003', 'departure', true, 'Same as Main Passenger'),
  ('f0000006-0000-0000-0000-000000000006', 'f2100004-0000-0000-0000-000000000004', 'departure', true, 'Invitee'),
  ('f0000007-0000-0000-0000-000000000007', 'f2100005-0000-0000-0000-000000000005', 'departure', true, 'Submit now'),
  ('f0000008-0000-0000-0000-000000000008', 'f2100004-0000-0000-0000-000000000004', 'departure', true, 'Invitee'),
  ('f0000009-0000-0000-0000-000000000009', 'f2100004-0000-0000-0000-000000000004', 'departure', false, 'Submit now'),
  ('f0000010-0000-0000-0000-000000000010', 'f2100006-0000-0000-0000-000000000006', 'departure', true, 'Invitee');

-- ============================================================
-- Event Attendance — modeled after CSV tour activity columns
-- (W. Dinner, City Tour, Soiree, GALA, K-DAY)
-- ============================================================
-- Welcome Dinner (d1000003) — all 10 travelers assigned to Fleet 8
INSERT INTO event_attendance (traveler_id, event_id, fleet_number, attended) VALUES
  ('f0000001-0000-0000-0000-000000000001', 'd1000003-0000-0000-0000-000000000003', 'Fleet 8', true),
  ('f0000002-0000-0000-0000-000000000002', 'd1000003-0000-0000-0000-000000000003', 'Fleet 8', true),
  ('f0000003-0000-0000-0000-000000000003', 'd1000003-0000-0000-0000-000000000003', 'Fleet 8', true),
  ('f0000004-0000-0000-0000-000000000004', 'd1000003-0000-0000-0000-000000000003', 'Fleet 8', true),
  ('f0000005-0000-0000-0000-000000000005', 'd1000003-0000-0000-0000-000000000003', 'Fleet 8', true),
  ('f0000006-0000-0000-0000-000000000006', 'd1000003-0000-0000-0000-000000000003', 'Fleet 8', true),
  ('f0000007-0000-0000-0000-000000000007', 'd1000003-0000-0000-0000-000000000003', 'Fleet 8', true),
  ('f0000008-0000-0000-0000-000000000008', 'd1000003-0000-0000-0000-000000000003', 'Fleet 8', true),
  ('f0000009-0000-0000-0000-000000000009', 'd1000003-0000-0000-0000-000000000003', 'Fleet 8', true),
  ('f0000010-0000-0000-0000-000000000010', 'd1000003-0000-0000-0000-000000000003', 'Fleet 8', true);

-- City Tour (d3000002) — all 10 travelers assigned to Fleet 8
INSERT INTO event_attendance (traveler_id, event_id, fleet_number, attended) VALUES
  ('f0000001-0000-0000-0000-000000000001', 'd3000002-0000-0000-0000-000000000002', 'Fleet 8', true),
  ('f0000002-0000-0000-0000-000000000002', 'd3000002-0000-0000-0000-000000000002', 'Fleet 8', true),
  ('f0000003-0000-0000-0000-000000000003', 'd3000002-0000-0000-0000-000000000002', 'Fleet 8', true),
  ('f0000004-0000-0000-0000-000000000004', 'd3000002-0000-0000-0000-000000000002', 'Fleet 8', true),
  ('f0000005-0000-0000-0000-000000000005', 'd3000002-0000-0000-0000-000000000002', 'Fleet 8', true),
  ('f0000006-0000-0000-0000-000000000006', 'd3000002-0000-0000-0000-000000000002', 'Fleet 8', true),
  ('f0000007-0000-0000-0000-000000000007', 'd3000002-0000-0000-0000-000000000002', 'Fleet 8', true),
  ('f0000008-0000-0000-0000-000000000008', 'd3000002-0000-0000-0000-000000000002', 'Fleet 8', true),
  ('f0000009-0000-0000-0000-000000000009', 'd3000002-0000-0000-0000-000000000002', 'Fleet 8', true),
  ('f0000010-0000-0000-0000-000000000010', 'd3000002-0000-0000-0000-000000000002', 'Fleet 8', true);

-- Soiree (d3000003) — only Tao Yang and Jian Wu attended (marked 'x. A' in CSV)
INSERT INTO event_attendance (traveler_id, event_id, fleet_number, attended, notes) VALUES
  ('f0000006-0000-0000-0000-000000000006', 'd3000003-0000-0000-0000-000000000003', NULL, true, 'x. A'),
  ('f0000007-0000-0000-0000-000000000007', 'd3000003-0000-0000-0000-000000000003', NULL, true, 'x. A');

-- Gala (d4000003) — all 10 travelers assigned to Fleet 8
INSERT INTO event_attendance (traveler_id, event_id, fleet_number, attended) VALUES
  ('f0000001-0000-0000-0000-000000000001', 'd4000003-0000-0000-0000-000000000003', 'Fleet 8', true),
  ('f0000002-0000-0000-0000-000000000002', 'd4000003-0000-0000-0000-000000000003', 'Fleet 8', true),
  ('f0000003-0000-0000-0000-000000000003', 'd4000003-0000-0000-0000-000000000003', 'Fleet 8', true),
  ('f0000004-0000-0000-0000-000000000004', 'd4000003-0000-0000-0000-000000000003', 'Fleet 8', true),
  ('f0000005-0000-0000-0000-000000000005', 'd4000003-0000-0000-0000-000000000003', 'Fleet 8', true),
  ('f0000006-0000-0000-0000-000000000006', 'd4000003-0000-0000-0000-000000000003', 'Fleet 8', true),
  ('f0000007-0000-0000-0000-000000000007', 'd4000003-0000-0000-0000-000000000003', 'Fleet 8', true),
  ('f0000008-0000-0000-0000-000000000008', 'd4000003-0000-0000-0000-000000000003', 'Fleet 8', true),
  ('f0000009-0000-0000-0000-000000000009', 'd4000003-0000-0000-0000-000000000003', 'Fleet 8', true),
  ('f0000010-0000-0000-0000-000000000010', 'd4000003-0000-0000-0000-000000000003', 'Fleet 8', true);

-- C-Day (d5000002) — all 10 travelers assigned to Fleet 8
INSERT INTO event_attendance (traveler_id, event_id, fleet_number, attended) VALUES
  ('f0000001-0000-0000-0000-000000000001', 'd5000002-0000-0000-0000-000000000002', 'Fleet 8', true),
  ('f0000002-0000-0000-0000-000000000002', 'd5000002-0000-0000-0000-000000000002', 'Fleet 8', true),
  ('f0000003-0000-0000-0000-000000000003', 'd5000002-0000-0000-0000-000000000002', 'Fleet 8', true),
  ('f0000004-0000-0000-0000-000000000004', 'd5000002-0000-0000-0000-000000000002', 'Fleet 8', true),
  ('f0000005-0000-0000-0000-000000000005', 'd5000002-0000-0000-0000-000000000002', 'Fleet 8', true),
  ('f0000006-0000-0000-0000-000000000006', 'd5000002-0000-0000-0000-000000000002', 'Fleet 8', true),
  ('f0000007-0000-0000-0000-000000000007', 'd5000002-0000-0000-0000-000000000002', 'Fleet 8', true),
  ('f0000008-0000-0000-0000-000000000008', 'd5000002-0000-0000-0000-000000000002', 'Fleet 8', true),
  ('f0000009-0000-0000-0000-000000000009', 'd5000002-0000-0000-0000-000000000002', 'Fleet 8', true),
  ('f0000010-0000-0000-0000-000000000010', 'd5000002-0000-0000-0000-000000000002', 'Fleet 8', true);

-- ============================================================
-- Notifications
-- ============================================================
INSERT INTO notifications (notification_id, title, body, target_type, published_at, created_by) VALUES
  ('e0000001-0000-0000-0000-000000000001', 'Welcome to WSB 2027 China! 🇨🇳', 'We are thrilled to have you join us for an unforgettable journey through Beijing. Your digital companion is ready — check your itinerary, QR code, and toolkit!', 'all', '2027-06-14T12:00:00Z', 'f0000012-0000-0000-0000-000000000012'),
  ('e0000002-0000-0000-0000-000000000002', 'Bus Assignment Ready 🚌', 'Your airport transfer bus has been assigned. Check your itinerary for bus number and departure time.', 'all', '2027-06-14T18:00:00Z', 'f0000012-0000-0000-0000-000000000012'),
  ('e0000003-0000-0000-0000-000000000003', 'Welcome Dinner Tonight! 🍽️', 'Reminder: Welcome Dinner & Cultural Show at The Ritz-Carlton Grand Ballroom at 7:00 PM. Dress code: smart casual.', 'all', '2027-06-15T15:00:00Z', 'f0000012-0000-0000-0000-000000000012');

INSERT INTO traveler_notifications (traveler_id, notification_id) VALUES
  ('f0000001-0000-0000-0000-000000000001', 'e0000001-0000-0000-0000-000000000001'),
  ('f0000001-0000-0000-0000-000000000001', 'e0000002-0000-0000-0000-000000000002'),
  ('f0000001-0000-0000-0000-000000000001', 'e0000003-0000-0000-0000-000000000003'),
  ('f0000002-0000-0000-0000-000000000002', 'e0000001-0000-0000-0000-000000000001'),
  ('f0000002-0000-0000-0000-000000000002', 'e0000002-0000-0000-0000-000000000002'),
  ('f0000004-0000-0000-0000-000000000004', 'e0000001-0000-0000-0000-000000000001'),
  ('f0000006-0000-0000-0000-000000000006', 'e0000001-0000-0000-0000-000000000001'),
  ('f0000006-0000-0000-0000-000000000006', 'e0000002-0000-0000-0000-000000000002'),
  ('f0000008-0000-0000-0000-000000000008', 'e0000001-0000-0000-0000-000000000001'),
  ('f0000010-0000-0000-0000-000000000010', 'e0000001-0000-0000-0000-000000000001'),
  ('f0000010-0000-0000-0000-000000000010', 'e0000002-0000-0000-0000-000000000002');

-- Keep old traveler_hotels for backward compat (populated from room_assignments)
INSERT INTO traveler_hotels (traveler_id, hotel_id)
  SELECT traveler_id, hotel_id FROM room_assignments;


-- ============================================================
-- EXPANDED SEED DATA — 87 additional travelers (IDs 014–100)
-- Modeled after WSB 2025 Master List with diverse international names
-- ============================================================

-- ============================================================
-- Additional Hotels
-- ============================================================
INSERT INTO hotels (hotel_id, name, short_code, address_en, address_cn) VALUES
  ('a6666666-6666-6666-6666-666666666666', 'Shangri-La Hotel Beijing', 'SHANGRILA', '29 Zizhuyuan Road, Haidian District, Beijing 100089', '北京市海淀区紫竹院路29号'),
  ('a7777777-7777-7777-7777-777777777777', 'Waldorf Astoria Beijing', 'WALDORF', '5-15 Jinyu Hutong, Dongcheng District, Beijing 100006', '北京市东城区金鱼胡同5-15号'),
  ('a8888888-8888-8888-8888-888888888888', 'Rosewood Beijing', 'ROSEWOOD', 'Jing Guang Centre, Hujialou, Chaoyang District, Beijing 100020', '北京市朝阳区呼家楼京广中心');

-- ============================================================
-- Additional Flights
-- ============================================================

-- More arrival flights
INSERT INTO flights (flight_id, airline, flight_number, direction, arrival_time, airport, terminal) VALUES
  ('f1000007-0000-0000-0000-000000000007', 'WestJet', 'WS 86', 'arrival', '2027-06-15T18:45:00Z', 'PEK-T1', 'T1'),
  ('f1000008-0000-0000-0000-000000000008', 'Korean Air', 'KE 660', 'arrival', '2027-06-15T17:20:00Z', 'PEK-T2', 'T2'),
  ('f1000009-0000-0000-0000-000000000009', 'EVA Air', 'BR 170', 'arrival', '2027-06-15T15:30:00Z', 'PEK-T3', 'T3'),
  ('f1000010-0000-0000-0000-000000000010', 'Singapore Airlines', 'SQ 802', 'arrival', '2027-06-15T08:15:00Z', 'PEK-T3', 'T3'),
  ('f1000011-0000-0000-0000-000000000011', 'Cathay Pacific', 'CX 330', 'arrival', '2027-06-15T11:40:00Z', 'PEK-T3', 'T3'),
  ('f1000012-0000-0000-0000-000000000012', 'Japan Airlines', 'JL 21', 'arrival', '2027-06-15T13:25:00Z', 'PEK-T3', 'T3'),
  ('f1000013-0000-0000-0000-000000000013', 'Emirates', 'EK 306', 'arrival', '2027-06-15T06:50:00Z', 'PEK-T3', 'T3'),
  ('f1000014-0000-0000-0000-000000000014', 'Turkish Airlines', 'TK 20', 'arrival', '2027-06-15T05:30:00Z', 'PEK-T3', 'T3'),
  ('f1000015-0000-0000-0000-000000000015', 'Lufthansa', 'LH 720', 'arrival', '2027-06-15T07:10:00Z', 'PEK-T3', 'T3');

-- More departure flights
INSERT INTO flights (flight_id, airline, flight_number, direction, departure_time, airport, terminal) VALUES
  ('f2100007-0000-0000-0000-000000000007', 'WestJet', 'WS 87', 'departure', '2027-06-20T20:45:00Z', 'PEK-T1', 'T1'),
  ('f2100008-0000-0000-0000-000000000008', 'Korean Air', 'KE 661', 'departure', '2027-06-20T18:45:00Z', 'PEK-T2', 'T2'),
  ('f2100009-0000-0000-0000-000000000009', 'EVA Air', 'BR 169', 'departure', '2027-06-20T12:00:00Z', 'PEK-T3', 'T3'),
  ('f2100010-0000-0000-0000-000000000010', 'Singapore Airlines', 'SQ 803', 'departure', '2027-06-20T09:30:00Z', 'PEK-T3', 'T3'),
  ('f2100011-0000-0000-0000-000000000011', 'Cathay Pacific', 'CX 331', 'departure', '2027-06-20T14:20:00Z', 'PEK-T3', 'T3'),
  ('f2100012-0000-0000-0000-000000000012', 'Japan Airlines', 'JL 22', 'departure', '2027-06-20T15:50:00Z', 'PEK-T3', 'T3'),
  ('f2100013-0000-0000-0000-000000000013', 'Emirates', 'EK 307', 'departure', '2027-06-20T23:30:00Z', 'PEK-T3', 'T3'),
  ('f2100014-0000-0000-0000-000000000014', 'Turkish Airlines', 'TK 21', 'departure', '2027-06-20T01:15:00Z', 'PEK-T3', 'T3'),
  ('f2100015-0000-0000-0000-000000000015', 'Lufthansa', 'LH 721', 'departure', '2027-06-20T22:00:00Z', 'PEK-T3', 'T3');

-- ============================================================
-- 87 New Travelers (IDs f0000014 through f0000100)
-- Distribution: Group A 40%, B 35%, C 25%
-- Hotels: Ritz 20%, Four Seasons 15%, Mandarin 15%, Grand Hyatt 15%, Peninsula 10%, Shangri-La 10%, Waldorf 10%, Rosewood 5%
-- Room types: 30% single, 50% double, 15% twin, 5% triple
-- Invitee: 60% invitee, 40% guest | Pax: 85% adult, 10% child, 5% infant
-- Gender: 55% male, 45% female | Checkin: 70% pending, 25% checked_in, 5% no_show
-- ============================================================

-- Traveler 14: Adeolu Durotoye (Nigerian, male, adult, invitee, Group A/A1, Ritz, single)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, vip_tag, internal_id, agent_code, party_total, party_adults, party_children,
  dietary_vegan, dietary_notes, remarks, repeat_attendee, jba_repeat,
  role_type, access_status, checkin_status
) VALUES (
  'f0000014-0000-0000-0000-000000000014', 'WSB-2027-014',
  'Adeolu', 'Durotoye', 'Adeolu Durotoye', 'adeolu durotoye',
  'adeolu.durotoye@demo.com', '+234-801-0014-1234', 'DUROTOYE ADEOLU',
  'male', 55, 'invitee', 'WSB Members', 'adult', 'CEO VIP', 'LO-A05', '22BORC',
  1, 1, 0, false, NULL, NULL, 2, false,
  'traveler', 'activated', 'pending'
);

-- Traveler 15: Amara Okafor (Nigerian, female, adult, invitee, Group A/A1, Ritz, double)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, agent_code, party_total, party_adults, party_children,
  dietary_vegan, dietary_notes, remarks, repeat_attendee, jba_repeat,
  role_type, access_status, checkin_status
) VALUES (
  'f0000015-0000-0000-0000-000000000015', 'WSB-2027-015',
  'Amara', 'Okafor', 'Amara Okafor', 'amara okafor',
  'amara.okafor@demo.com', '+234-802-0015-5678', 'OKAFOR AMARA',
  'female', 42, 'invitee', 'WSB Members', 'adult', 'LO-A06', '33CFRD',
  2, 2, 0, false, NULL, NULL, 1, false,
  'traveler', 'activated', 'pending'
);

-- Traveler 16: Chidi Okafor (Nigerian, male, adult, guest of Amara, Group A/A1, Ritz, double)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, agent_code, party_total, party_adults, party_children,
  dietary_vegan, dietary_notes, remarks, repeat_attendee, jba_repeat,
  role_type, access_status, checkin_status
) VALUES (
  'f0000016-0000-0000-0000-000000000016', 'WSB-2027-015',
  'Chidi', 'Okafor', 'Chidi Okafor', 'chidi okafor',
  'chidi.okafor@demo.com', '+234-803-0016-9012', 'OKAFOR CHIDI',
  'male', 44, 'guest', 'Adult (from 12 years old)', 'adult', 'LO-A06', '33CFRD',
  2, 2, 0, false, NULL, NULL, 0, false,
  'traveler', 'activated', 'pending'
);

-- Traveler 17: Kenji Tanaka (Japanese, male, adult, invitee, Group A/A1, Four Seasons, single)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, vip_tag, internal_id, agent_code, party_total, party_adults, party_children,
  dietary_vegan, dietary_notes, remarks, repeat_attendee, jba_repeat,
  role_type, access_status, checkin_status
) VALUES (
  'f0000017-0000-0000-0000-000000000017', 'WSB-2027-017',
  'Kenji', 'Tanaka', 'Kenji Tanaka', 'kenji tanaka',
  'kenji.tanaka@demo.com', '+81-90-0017-3456', 'TANAKA KENJI',
  'male', 61, 'invitee', 'WSB Members', 'adult', 'VIP', 'FS-B01', '44DJPE',
  1, 1, 0, false, NULL, 'Upgrade - Executive Suite', 3, true,
  'representative', 'activated', 'checked_in'
);

-- Traveler 18: Fatima Al-Rashid (Emirati, female, adult, invitee, Group A/A1, Four Seasons, double)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, agent_code, party_total, party_adults, party_children,
  dietary_vegan, dietary_notes, remarks, repeat_attendee, jba_repeat,
  role_type, access_status, checkin_status
) VALUES (
  'f0000018-0000-0000-0000-000000000018', 'WSB-2027-018',
  'Fatima', 'Al-Rashid', 'Fatima Al-Rashid', 'fatima al-rashid',
  'fatima.alrashid@demo.com', '+971-50-0018-7890', 'AL-RASHID FATIMA',
  'female', 38, 'invitee', 'WSB Members', 'adult', 'FS-B02', '55EKQF',
  2, 2, 0, false, 'Halal meals only', NULL, 1, false,
  'traveler', 'activated', 'checked_in'
);

-- Traveler 19: Omar Al-Rashid (Emirati, male, adult, guest of Fatima, Group A/A1, Four Seasons, double)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, agent_code, party_total, party_adults, party_children,
  dietary_vegan, dietary_notes, remarks, repeat_attendee, jba_repeat,
  role_type, access_status, checkin_status
) VALUES (
  'f0000019-0000-0000-0000-000000000019', 'WSB-2027-018',
  'Omar', 'Al-Rashid', 'Omar Al-Rashid', 'omar al-rashid',
  'omar.alrashid@demo.com', '+971-55-0019-1234', 'AL-RASHID OMAR',
  'male', 40, 'guest', 'Adult (from 12 years old)', 'adult', 'FS-B02', '55EKQF',
  2, 2, 0, false, 'Halal meals only', NULL, 0, false,
  'traveler', 'activated', 'checked_in'
);

-- Traveler 20: Sven Lindqvist (Swedish, male, adult, invitee, Group A/A2, Mandarin, single)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, agent_code, party_total, party_adults, party_children,
  dietary_vegan, dietary_notes, remarks, repeat_attendee, jba_repeat,
  role_type, access_status, checkin_status
) VALUES (
  'f0000020-0000-0000-0000-000000000020', 'WSB-2027-020',
  'Sven', 'Lindqvist', 'Sven Lindqvist', 'sven lindqvist',
  'sven.lindqvist@demo.com', '+46-70-0020-5678', 'LINDQVIST SVEN',
  'male', 49, 'invitee', 'WSB Members', 'adult', 'MO-C01', '66FLRG',
  1, 1, 0, true, 'Strict vegan', NULL, 1, false,
  'traveler', 'activated', 'pending'
);

-- Traveler 21: Priya Sharma (Indian, female, adult, invitee, Group A/A2, Mandarin, double)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, agent_code, party_total, party_adults, party_children,
  dietary_vegan, dietary_notes, remarks, repeat_attendee, jba_repeat,
  role_type, access_status, checkin_status
) VALUES (
  'f0000021-0000-0000-0000-000000000021', 'WSB-2027-021',
  'Priya', 'Sharma', 'Priya Sharma', 'priya sharma',
  'priya.sharma@demo.com', '+91-98-0021-9012', 'SHARMA PRIYA',
  'female', 35, 'invitee', 'WSB Members', 'adult', 'MO-C02', '77GMSH',
  2, 1, 1, false, 'Vegetarian', NULL, 0, false,
  'traveler', 'activated', 'pending'
);

-- Traveler 22: Arjun Sharma (Indian, male, child, guest of Priya, Group A/A2, Mandarin, double)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, agent_code, party_total, party_adults, party_children,
  dietary_vegan, dietary_notes, remarks, repeat_attendee, jba_repeat,
  role_type, access_status, checkin_status
) VALUES (
  'f0000022-0000-0000-0000-000000000022', 'WSB-2027-021',
  'Arjun', 'Sharma', 'Arjun Sharma', 'arjun sharma',
  'arjun.sharma@demo.com', '+91-98-0022-3456', 'SHARMA ARJUN',
  'male', 12, 'guest', 'Adult (from 12 years old)', 'child', 'MO-C02', '77GMSH',
  2, 1, 1, false, 'Vegetarian', NULL, 0, false,
  'minor', 'activated', 'pending'
);

-- Traveler 23: Marcus Johnson (American, male, adult, invitee, Group A/A2, Grand Hyatt, single)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, vip_tag, internal_id, agent_code, party_total, party_adults, party_children,
  dietary_vegan, dietary_notes, remarks, repeat_attendee, jba_repeat,
  role_type, access_status, checkin_status
) VALUES (
  'f0000023-0000-0000-0000-000000000023', 'WSB-2027-023',
  'Marcus', 'Johnson', 'Marcus Johnson', 'marcus johnson',
  'marcus.johnson@demo.com', '+1-212-0023-7890', 'JOHNSON MARCUS',
  'male', 47, 'invitee', 'WSB Members', 'adult', 'VIP', 'GH-D01', '88HNTI',
  1, 1, 0, false, NULL, NULL, 2, false,
  'traveler', 'activated', 'checked_in'
);

-- Traveler 24: Yuki Nakamura (Japanese, female, adult, invitee, Group A/A2, Grand Hyatt, double)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, agent_code, party_total, party_adults, party_children,
  dietary_vegan, dietary_notes, remarks, repeat_attendee, jba_repeat,
  role_type, access_status, checkin_status
) VALUES (
  'f0000024-0000-0000-0000-000000000024', 'WSB-2027-024',
  'Yuki', 'Nakamura', 'Yuki Nakamura', 'yuki nakamura',
  'yuki.nakamura@demo.com', '+81-80-0024-1234', 'NAKAMURA YUKI',
  'female', 33, 'invitee', 'WSB Members', 'adult', 'GH-D02', '99IOUJ',
  2, 2, 0, false, NULL, NULL, 0, false,
  'traveler', 'activated', 'pending'
);

-- Traveler 25: Hiroshi Nakamura (Japanese, male, adult, guest of Yuki, Group A/A2, Grand Hyatt, double)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, agent_code, party_total, party_adults, party_children,
  dietary_vegan, dietary_notes, remarks, repeat_attendee, jba_repeat,
  role_type, access_status, checkin_status
) VALUES (
  'f0000025-0000-0000-0000-000000000025', 'WSB-2027-024',
  'Hiroshi', 'Nakamura', 'Hiroshi Nakamura', 'hiroshi nakamura',
  'hiroshi.nakamura@demo.com', '+81-80-0025-5678', 'NAKAMURA HIROSHI',
  'male', 36, 'guest', 'Adult (from 12 years old)', 'adult', 'GH-D02', '99IOUJ',
  2, 2, 0, false, NULL, NULL, 0, false,
  'traveler', 'activated', 'pending'
);

-- Traveler 26: Elena Petrova (Russian, female, adult, invitee, Group A/A1, Peninsula, single)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, agent_code, party_total, party_adults, party_children,
  dietary_vegan, dietary_notes, remarks, repeat_attendee, jba_repeat,
  role_type, access_status, checkin_status
) VALUES (
  'f0000026-0000-0000-0000-000000000026', 'WSB-2027-026',
  'Elena', 'Petrova', 'Elena Petrova', 'elena petrova',
  'elena.petrova@demo.com', '+7-916-0026-9012', 'PETROVA ELENA',
  'female', 51, 'invitee', 'WSB Members', 'adult', 'PN-E01', 'AAJPVK',
  1, 1, 0, false, NULL, NULL, 1, false,
  'traveler', 'activated', 'checked_in'
);

-- Traveler 27: Mohammed Hassan (Egyptian, male, adult, invitee, Group A/A1, Shangri-La, double)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, agent_code, party_total, party_adults, party_children,
  dietary_vegan, dietary_notes, remarks, repeat_attendee, jba_repeat,
  role_type, access_status, checkin_status
) VALUES (
  'f0000027-0000-0000-0000-000000000027', 'WSB-2027-027',
  'Mohammed', 'Hassan', 'Mohammed Hassan', 'mohammed hassan',
  'mohammed.hassan@demo.com', '+20-100-0027-3456', 'HASSAN MOHAMMED',
  'male', 44, 'invitee', 'WSB Members', 'adult', 'SL-F01', 'BBKQWL',
  2, 2, 0, false, 'Halal meals only', NULL, 1, false,
  'traveler', 'activated', 'pending'
);

-- Traveler 28: Aisha Hassan (Egyptian, female, adult, guest of Mohammed, Group A/A1, Shangri-La, double)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, agent_code, party_total, party_adults, party_children,
  dietary_vegan, dietary_notes, remarks, repeat_attendee, jba_repeat,
  role_type, access_status, checkin_status
) VALUES (
  'f0000028-0000-0000-0000-000000000028', 'WSB-2027-027',
  'Aisha', 'Hassan', 'Aisha Hassan', 'aisha hassan',
  'aisha.hassan@demo.com', '+20-100-0028-7890', 'HASSAN AISHA',
  'female', 41, 'guest', 'Adult (from 12 years old)', 'adult', 'SL-F01', 'BBKQWL',
  2, 2, 0, false, 'Halal meals only', NULL, 0, false,
  'traveler', 'activated', 'pending'
);

-- Traveler 29: Carlos Mendoza (Mexican, male, adult, invitee, Group A/A2, Waldorf, single)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, agent_code, party_total, party_adults, party_children,
  dietary_vegan, dietary_notes, remarks, repeat_attendee, jba_repeat,
  role_type, access_status, checkin_status
) VALUES (
  'f0000029-0000-0000-0000-000000000029', 'WSB-2027-029',
  'Carlos', 'Mendoza', 'Carlos Mendoza', 'carlos mendoza',
  'carlos.mendoza@demo.com', '+52-55-0029-1234', 'MENDOZA CARLOS',
  'male', 57, 'invitee', 'WSB Members', 'adult', 'WA-G01', 'CCLRXM',
  1, 1, 0, false, NULL, NULL, 2, true,
  'representative', 'activated', 'checked_in'
);

-- Traveler 30: Sophie Dubois (French, female, adult, invitee, Group A/A2, Waldorf, double)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, agent_code, party_total, party_adults, party_children,
  dietary_vegan, dietary_notes, remarks, repeat_attendee, jba_repeat,
  role_type, access_status, checkin_status
) VALUES (
  'f0000030-0000-0000-0000-000000000030', 'WSB-2027-030',
  'Sophie', 'Dubois', 'Sophie Dubois', 'sophie dubois',
  'sophie.dubois@demo.com', '+33-6-0030-5678', 'DUBOIS SOPHIE',
  'female', 45, 'invitee', 'WSB Members', 'adult', 'WA-G02', 'DDMSYN',
  2, 2, 0, false, 'Gluten-free', NULL, 1, false,
  'traveler', 'activated', 'pending'
);

-- Traveler 31: Jean-Pierre Dubois (French, male, adult, guest of Sophie, Group A/A2, Waldorf, double)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, agent_code, party_total, party_adults, party_children,
  dietary_vegan, dietary_notes, remarks, repeat_attendee, jba_repeat,
  role_type, access_status, checkin_status
) VALUES (
  'f0000031-0000-0000-0000-000000000031', 'WSB-2027-030',
  'Jean-Pierre', 'Dubois', 'Jean-Pierre Dubois', 'jean-pierre dubois',
  'jeanpierre.dubois@demo.com', '+33-6-0031-9012', 'DUBOIS JEAN-PIERRE',
  'male', 48, 'guest', 'Adult (from 12 years old)', 'adult', 'WA-G02', 'DDMSYN',
  2, 2, 0, false, NULL, NULL, 0, false,
  'traveler', 'activated', 'pending'
);

-- Traveler 32: Kwame Asante (Ghanaian, male, adult, invitee, Group B/B1, Rosewood, single)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, agent_code, party_total, party_adults, party_children,
  dietary_vegan, dietary_notes, remarks, repeat_attendee, jba_repeat,
  role_type, access_status, checkin_status
) VALUES (
  'f0000032-0000-0000-0000-000000000032', 'WSB-2027-032',
  'Kwame', 'Asante', 'Kwame Asante', 'kwame asante',
  'kwame.asante@demo.com', '+233-24-0032-3456', 'ASANTE KWAME',
  'male', 50, 'invitee', 'WSB Members', 'adult', 'RW-H01', 'EENTZO',
  1, 1, 0, false, NULL, NULL, 1, false,
  'traveler', 'activated', 'pending'
);

-- Traveler 33: Isabella Rodriguez (Colombian, female, adult, invitee, Group B/B1, Ritz, double)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, agent_code, party_total, party_adults, party_children,
  dietary_vegan, dietary_notes, remarks, repeat_attendee, jba_repeat,
  role_type, access_status, checkin_status
) VALUES (
  'f0000033-0000-0000-0000-000000000033', 'WSB-2027-033',
  'Isabella', 'Rodriguez', 'Isabella Rodriguez', 'isabella rodriguez',
  'isabella.rodriguez@demo.com', '+57-310-0033-7890', 'RODRIGUEZ ISABELLA',
  'female', 37, 'invitee', 'WSB Members', 'adult', 'RC-A07', 'FFOUAP',
  2, 2, 0, false, NULL, NULL, 0, false,
  'traveler', 'activated', 'checked_in'
);

-- Traveler 34: Diego Rodriguez (Colombian, male, adult, guest of Isabella, Group B/B1, Ritz, double)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, agent_code, party_total, party_adults, party_children,
  dietary_vegan, dietary_notes, remarks, repeat_attendee, jba_repeat,
  role_type, access_status, checkin_status
) VALUES (
  'f0000034-0000-0000-0000-000000000034', 'WSB-2027-033',
  'Diego', 'Rodriguez', 'Diego Rodriguez', 'diego rodriguez',
  'diego.rodriguez@demo.com', '+57-310-0034-1234', 'RODRIGUEZ DIEGO',
  'male', 39, 'guest', 'Adult (from 12 years old)', 'adult', 'RC-A07', 'FFOUAP',
  2, 2, 0, false, NULL, NULL, 0, false,
  'traveler', 'activated', 'checked_in'
);

-- Traveler 35: Oluwaseun Adeyemi (Nigerian, male, adult, invitee, Group B/B1, Four Seasons, twin)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, agent_code, party_total, party_adults, party_children,
  dietary_vegan, dietary_notes, remarks, repeat_attendee, jba_repeat,
  role_type, access_status, checkin_status
) VALUES (
  'f0000035-0000-0000-0000-000000000035', 'WSB-2027-035',
  'Oluwaseun', 'Adeyemi', 'Oluwaseun Adeyemi', 'oluwaseun adeyemi',
  'oluwaseun.adeyemi@demo.com', '+234-805-0035-5678', 'ADEYEMI OLUWASEUN',
  'male', 43, 'invitee', 'WSB Members', 'adult', 'FS-B03', 'GGPVBQ',
  2, 2, 0, false, NULL, NULL, 1, false,
  'traveler', 'activated', 'pending'
);

-- Traveler 36: Babatunde Adeyemi (Nigerian, male, adult, guest of Oluwaseun, Group B/B1, Four Seasons, twin)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, agent_code, party_total, party_adults, party_children,
  dietary_vegan, dietary_notes, remarks, repeat_attendee, jba_repeat,
  role_type, access_status, checkin_status
) VALUES (
  'f0000036-0000-0000-0000-000000000036', 'WSB-2027-035',
  'Babatunde', 'Adeyemi', 'Babatunde Adeyemi', 'babatunde adeyemi',
  'babatunde.adeyemi@demo.com', '+234-805-0036-9012', 'ADEYEMI BABATUNDE',
  'male', 40, 'guest', 'Adult (from 12 years old)', 'adult', 'FS-B03', 'GGPVBQ',
  2, 2, 0, false, NULL, NULL, 0, false,
  'traveler', 'activated', 'pending'
);

-- Traveler 37: Min-Ji Park (Korean, female, adult, invitee, Group B/B1, Mandarin, single)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, agent_code, party_total, party_adults, party_children,
  dietary_vegan, dietary_notes, remarks, repeat_attendee, jba_repeat,
  role_type, access_status, checkin_status
) VALUES (
  'f0000037-0000-0000-0000-000000000037', 'WSB-2027-037',
  'Min-Ji', 'Park', 'Min-Ji Park', 'min-ji park',
  'minji.park@demo.com', '+82-10-0037-3456', 'PARK MIN-JI',
  'female', 29, 'invitee', 'WSB Members', 'adult', 'MO-C03', 'HHQWCR',
  1, 1, 0, false, NULL, NULL, 0, false,
  'traveler', 'activated', 'pending'
);

-- Traveler 38: Ahmad Khalil (Lebanese, male, adult, invitee, Group B/B2, Grand Hyatt, double)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, agent_code, party_total, party_adults, party_children,
  dietary_vegan, dietary_notes, remarks, repeat_attendee, jba_repeat,
  role_type, access_status, checkin_status
) VALUES (
  'f0000038-0000-0000-0000-000000000038', 'WSB-2027-038',
  'Ahmad', 'Khalil', 'Ahmad Khalil', 'ahmad khalil',
  'ahmad.khalil@demo.com', '+961-3-0038-7890', 'KHALIL AHMAD',
  'male', 52, 'invitee', 'WSB Members', 'adult', 'GH-D03', 'IIRXDS',
  2, 2, 0, false, NULL, NULL, 2, false,
  'traveler', 'activated', 'checked_in'
);

-- Traveler 39: Layla Khalil (Lebanese, female, adult, guest of Ahmad, Group B/B2, Grand Hyatt, double)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, agent_code, party_total, party_adults, party_children,
  dietary_vegan, dietary_notes, remarks, repeat_attendee, jba_repeat,
  role_type, access_status, checkin_status
) VALUES (
  'f0000039-0000-0000-0000-000000000039', 'WSB-2027-038',
  'Layla', 'Khalil', 'Layla Khalil', 'layla khalil',
  'layla.khalil@demo.com', '+961-3-0039-1234', 'KHALIL LAYLA',
  'female', 49, 'guest', 'Adult (from 12 years old)', 'adult', 'GH-D03', 'IIRXDS',
  2, 2, 0, false, NULL, NULL, 0, false,
  'traveler', 'activated', 'checked_in'
);

-- Traveler 40: Takeshi Yamamoto (Japanese, male, adult, invitee, Group B/B2, Peninsula, single)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, vip_tag, internal_id, agent_code, party_total, party_adults, party_children,
  dietary_vegan, dietary_notes, remarks, repeat_attendee, jba_repeat,
  role_type, access_status, checkin_status
) VALUES (
  'f0000040-0000-0000-0000-000000000040', 'WSB-2027-040',
  'Takeshi', 'Yamamoto', 'Takeshi Yamamoto', 'takeshi yamamoto',
  'takeshi.yamamoto@demo.com', '+81-90-0040-5678', 'YAMAMOTO TAKESHI',
  'male', 63, 'invitee', 'WSB Members', 'adult', 'CEO VIP', 'PN-E02', 'JJSYET',
  1, 1, 0, false, NULL, 'Upgrade - Presidential Suite', 4, true,
  'representative', 'activated', 'checked_in'
);

-- Traveler 41: Nadia Benali (Moroccan, female, adult, invitee, Group B/B2, Shangri-La, single)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, agent_code, party_total, party_adults, party_children,
  dietary_vegan, dietary_notes, remarks, repeat_attendee, jba_repeat,
  role_type, access_status, checkin_status
) VALUES (
  'f0000041-0000-0000-0000-000000000041', 'WSB-2027-041',
  'Nadia', 'Benali', 'Nadia Benali', 'nadia benali',
  'nadia.benali@demo.com', '+212-6-0041-9012', 'BENALI NADIA',
  'female', 34, 'invitee', 'WSB Members', 'adult', 'SL-F02', 'KKTZFU',
  1, 1, 0, false, 'Halal meals only', NULL, 0, false,
  'traveler', 'activated', 'pending'
);

-- Traveler 42: David Okonkwo (Nigerian, male, adult, invitee, Group B/B1, Ritz, double)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, agent_code, party_total, party_adults, party_children,
  dietary_vegan, dietary_notes, remarks, repeat_attendee, jba_repeat,
  role_type, access_status, checkin_status
) VALUES (
  'f0000042-0000-0000-0000-000000000042', 'WSB-2027-042',
  'David', 'Okonkwo', 'David Okonkwo', 'david okonkwo',
  'david.okonkwo@demo.com', '+234-806-0042-3456', 'OKONKWO DAVID',
  'male', 46, 'invitee', 'WSB Members', 'adult', 'RC-A08', 'LLUAGV',
  2, 2, 0, false, NULL, NULL, 1, false,
  'traveler', 'activated', 'no_show'
);

-- Traveler 43: Grace Okonkwo (Nigerian, female, adult, guest of David, Group B/B1, Ritz, double)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, agent_code, party_total, party_adults, party_children,
  dietary_vegan, dietary_notes, remarks, repeat_attendee, jba_repeat,
  role_type, access_status, checkin_status
) VALUES (
  'f0000043-0000-0000-0000-000000000043', 'WSB-2027-042',
  'Grace', 'Okonkwo', 'Grace Okonkwo', 'grace okonkwo',
  'grace.okonkwo@demo.com', '+234-806-0043-7890', 'OKONKWO GRACE',
  'female', 43, 'guest', 'Adult (from 12 years old)', 'adult', 'RC-A08', 'LLUAGV',
  2, 2, 0, false, NULL, NULL, 0, false,
  'traveler', 'activated', 'no_show'
);

-- Traveler 44: Hans Mueller (German, male, adult, invitee, Group B/B2, Four Seasons, single)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, agent_code, party_total, party_adults, party_children,
  dietary_vegan, dietary_notes, remarks, repeat_attendee, jba_repeat,
  role_type, access_status, checkin_status
) VALUES (
  'f0000044-0000-0000-0000-000000000044', 'WSB-2027-044',
  'Hans', 'Mueller', 'Hans Mueller', 'hans mueller',
  'hans.mueller@demo.com', '+49-170-0044-1234', 'MUELLER HANS',
  'male', 58, 'invitee', 'WSB Members', 'adult', 'FS-B04', 'MMVBHW',
  1, 1, 0, false, NULL, NULL, 3, true,
  'traveler', 'activated', 'checked_in'
);

-- Traveler 45: Abiodun Fashola (Nigerian, female, adult, invitee, Group B/B2, Mandarin, double)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, agent_code, party_total, party_adults, party_children,
  dietary_vegan, dietary_notes, remarks, repeat_attendee, jba_repeat,
  role_type, access_status, checkin_status
) VALUES (
  'f0000045-0000-0000-0000-000000000045', 'WSB-2027-045',
  'Abiodun', 'Fashola', 'Abiodun Fashola', 'abiodun fashola',
  'abiodun.fashola@demo.com', '+234-807-0045-5678', 'FASHOLA ABIODUN',
  'female', 41, 'invitee', 'WSB Members', 'adult', 'MO-C04', 'NNWCIX',
  2, 2, 0, false, NULL, NULL, 1, false,
  'traveler', 'activated', 'pending'
);

-- Traveler 46: Tunde Fashola (Nigerian, male, adult, guest of Abiodun, Group B/B2, Mandarin, double)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, agent_code, party_total, party_adults, party_children,
  dietary_vegan, dietary_notes, remarks, repeat_attendee, jba_repeat,
  role_type, access_status, checkin_status
) VALUES (
  'f0000046-0000-0000-0000-000000000046', 'WSB-2027-045',
  'Tunde', 'Fashola', 'Tunde Fashola', 'tunde fashola',
  'tunde.fashola@demo.com', '+234-807-0046-9012', 'FASHOLA TUNDE',
  'male', 44, 'guest', 'Adult (from 12 years old)', 'adult', 'MO-C04', 'NNWCIX',
  2, 2, 0, false, NULL, NULL, 0, false,
  'traveler', 'activated', 'pending'
);

-- Traveler 47: Sarah Thompson (British, female, adult, invitee, Group C/B1, Grand Hyatt, single)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, agent_code, party_total, party_adults, party_children,
  dietary_vegan, dietary_notes, remarks, repeat_attendee, jba_repeat,
  role_type, access_status, checkin_status
) VALUES (
  'f0000047-0000-0000-0000-000000000047', 'WSB-2027-047',
  'Sarah', 'Thompson', 'Sarah Thompson', 'sarah thompson',
  'sarah.thompson@demo.com', '+44-7700-0047-3456', 'THOMPSON SARAH',
  'female', 52, 'invitee', 'WSB Members', 'adult', 'GH-D04', 'OOXDJY',
  1, 1, 0, true, 'Strict vegan - no dairy', NULL, 1, false,
  'traveler', 'activated', 'pending'
);

-- Traveler 48: Rajesh Patel (Indian, male, adult, invitee, Group C/B1, Peninsula, double)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, agent_code, party_total, party_adults, party_children,
  dietary_vegan, dietary_notes, remarks, repeat_attendee, jba_repeat,
  role_type, access_status, checkin_status
) VALUES (
  'f0000048-0000-0000-0000-000000000048', 'WSB-2027-048',
  'Rajesh', 'Patel', 'Rajesh Patel', 'rajesh patel',
  'rajesh.patel@demo.com', '+91-99-0048-7890', 'PATEL RAJESH',
  'male', 45, 'invitee', 'WSB Members', 'adult', 'PN-E03', 'PPYEKZ',
  2, 2, 0, false, 'Vegetarian - no eggs', NULL, 1, false,
  'traveler', 'activated', 'pending'
);

-- Traveler 49: Sunita Patel (Indian, female, adult, guest of Rajesh, Group C/B1, Peninsula, double)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, agent_code, party_total, party_adults, party_children,
  dietary_vegan, dietary_notes, remarks, repeat_attendee, jba_repeat,
  role_type, access_status, checkin_status
) VALUES (
  'f0000049-0000-0000-0000-000000000049', 'WSB-2027-048',
  'Sunita', 'Patel', 'Sunita Patel', 'sunita patel',
  'sunita.patel@demo.com', '+91-99-0049-1234', 'PATEL SUNITA',
  'female', 42, 'guest', 'Adult (from 12 years old)', 'adult', 'PN-E03', 'PPYEKZ',
  2, 2, 0, false, 'Vegetarian - no eggs', NULL, 0, false,
  'traveler', 'activated', 'pending'
);

-- Traveler 50: Chen Wei-Lin (Taiwanese, male, adult, invitee, Group C/B2, Shangri-La, twin)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, agent_code, party_total, party_adults, party_children,
  dietary_vegan, dietary_notes, remarks, repeat_attendee, jba_repeat,
  role_type, access_status, checkin_status
) VALUES (
  'f0000050-0000-0000-0000-000000000050', 'WSB-2027-050',
  'Wei-Lin', 'Chen', 'Wei-Lin Chen', 'wei-lin chen',
  'weilin.chen@demo.com', '+886-9-0050-5678', 'CHEN WEI-LIN',
  'male', 38, 'invitee', 'WSB Members', 'adult', 'SL-F03', 'QQZFLA',
  2, 2, 0, false, NULL, NULL, 0, false,
  'traveler', 'activated', 'pending'
);

-- Traveler 51: Hao-Yu Chen (Taiwanese, male, adult, guest of Wei-Lin, Group C/B2, Shangri-La, twin)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, agent_code, party_total, party_adults, party_children,
  dietary_vegan, dietary_notes, remarks, repeat_attendee, jba_repeat,
  role_type, access_status, checkin_status
) VALUES (
  'f0000051-0000-0000-0000-000000000051', 'WSB-2027-050',
  'Hao-Yu', 'Chen', 'Hao-Yu Chen', 'hao-yu chen',
  'haoyu.chen@demo.com', '+886-9-0051-9012', 'CHEN HAO-YU',
  'male', 35, 'guest', 'Adult (from 12 years old)', 'adult', 'SL-F03', 'QQZFLA',
  2, 2, 0, false, NULL, NULL, 0, false,
  'traveler', 'activated', 'pending'
);

-- Traveler 52: Olumide Bakare (Nigerian, male, adult, invitee, Group C/B2, Waldorf, single)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, agent_code, party_total, party_adults, party_children,
  dietary_vegan, dietary_notes, remarks, repeat_attendee, jba_repeat,
  role_type, access_status, checkin_status
) VALUES (
  'f0000052-0000-0000-0000-000000000052', 'WSB-2027-052',
  'Olumide', 'Bakare', 'Olumide Bakare', 'olumide bakare',
  'olumide.bakare@demo.com', '+234-808-0052-3456', 'BAKARE OLUMIDE',
  'male', 48, 'invitee', 'WSB Members', 'adult', 'WA-G03', 'RRAGMB',
  1, 1, 0, false, NULL, NULL, 2, false,
  'traveler', 'activated', 'checked_in'
);

-- Traveler 53: Mei-Ling Wong (Malaysian, female, adult, invitee, Group C/B2, Rosewood, double)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, agent_code, party_total, party_adults, party_children,
  dietary_vegan, dietary_notes, remarks, repeat_attendee, jba_repeat,
  role_type, access_status, checkin_status
) VALUES (
  'f0000053-0000-0000-0000-000000000053', 'WSB-2027-053',
  'Mei-Ling', 'Wong', 'Mei-Ling Wong', 'mei-ling wong',
  'meiling.wong@demo.com', '+60-12-0053-7890', 'WONG MEI-LING',
  'female', 36, 'invitee', 'WSB Members', 'adult', 'RW-H02', 'SSBHNC',
  2, 2, 0, false, NULL, NULL, 0, false,
  'traveler', 'activated', 'pending'
);

-- Traveler 54: James Wong (Malaysian, male, adult, guest of Mei-Ling, Group C/B2, Rosewood, double)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, agent_code, party_total, party_adults, party_children,
  dietary_vegan, dietary_notes, remarks, repeat_attendee, jba_repeat,
  role_type, access_status, checkin_status
) VALUES (
  'f0000054-0000-0000-0000-000000000054', 'WSB-2027-053',
  'James', 'Wong', 'James Wong', 'james wong',
  'james.wong@demo.com', '+60-12-0054-1234', 'WONG JAMES',
  'male', 38, 'guest', 'Adult (from 12 years old)', 'adult', 'RW-H02', 'SSBHNC',
  2, 2, 0, false, NULL, NULL, 0, false,
  'traveler', 'activated', 'pending'
);

-- Traveler 55: Anastasia Volkov (Russian, female, adult, invitee, Group A/A1, Ritz, single)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, agent_code, party_total, party_adults, party_children,
  dietary_vegan, dietary_notes, remarks, repeat_attendee, jba_repeat,
  role_type, access_status, checkin_status
) VALUES (
  'f0000055-0000-0000-0000-000000000055', 'WSB-2027-055',
  'Anastasia', 'Volkov', 'Anastasia Volkov', 'anastasia volkov',
  'anastasia.volkov@demo.com', '+7-926-0055-5678', 'VOLKOV ANASTASIA',
  'female', 47, 'invitee', 'WSB Members', 'adult', 'RC-A09', 'TTCIOD',
  1, 1, 0, false, NULL, NULL, 1, false,
  'traveler', 'activated', 'checked_in'
);

-- Traveler 56: Emeka Nwosu (Nigerian, male, adult, invitee, Group A/A1, Four Seasons, triple)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, agent_code, party_total, party_adults, party_children,
  dietary_vegan, dietary_notes, remarks, repeat_attendee, jba_repeat,
  role_type, access_status, checkin_status
) VALUES (
  'f0000056-0000-0000-0000-000000000056', 'WSB-2027-056',
  'Emeka', 'Nwosu', 'Emeka Nwosu', 'emeka nwosu',
  'emeka.nwosu@demo.com', '+234-809-0056-9012', 'NWOSU EMEKA',
  'male', 42, 'invitee', 'WSB Members', 'adult', 'FS-B05', 'UUDJPE',
  3, 2, 1, false, NULL, NULL, 1, false,
  'traveler', 'activated', 'pending'
);

-- Traveler 57: Chioma Nwosu (Nigerian, female, adult, guest of Emeka, Group A/A1, Four Seasons, triple)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, agent_code, party_total, party_adults, party_children,
  dietary_vegan, dietary_notes, remarks, repeat_attendee, jba_repeat,
  role_type, access_status, checkin_status
) VALUES (
  'f0000057-0000-0000-0000-000000000057', 'WSB-2027-056',
  'Chioma', 'Nwosu', 'Chioma Nwosu', 'chioma nwosu',
  'chioma.nwosu@demo.com', '+234-809-0057-3456', 'NWOSU CHIOMA',
  'female', 39, 'guest', 'Adult (from 12 years old)', 'adult', 'FS-B05', 'UUDJPE',
  3, 2, 1, false, NULL, NULL, 0, false,
  'traveler', 'activated', 'pending'
);

-- Traveler 58: Chukwuemeka Nwosu (Nigerian, male, child, guest of Emeka, Group A/A1, Four Seasons, triple)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, agent_code, party_total, party_adults, party_children,
  dietary_vegan, dietary_notes, remarks, repeat_attendee, jba_repeat,
  role_type, access_status, checkin_status
) VALUES (
  'f0000058-0000-0000-0000-000000000058', 'WSB-2027-056',
  'Chukwuemeka', 'Nwosu', 'Chukwuemeka Nwosu', 'chukwuemeka nwosu',
  'chukwuemeka.nwosu@demo.com', '+234-809-0058-7890', 'NWOSU CHUKWUEMEKA',
  'male', 14, 'guest', 'Adult (from 12 years old)', 'child', 'FS-B05', 'UUDJPE',
  3, 2, 1, false, NULL, NULL, 0, false,
  'minor', 'activated', 'pending'
);

-- Traveler 59: Ingrid Johansson (Swedish, female, adult, invitee, Group A/A2, Mandarin, single)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, agent_code, party_total, party_adults, party_children,
  dietary_vegan, dietary_notes, remarks, repeat_attendee, jba_repeat,
  role_type, access_status, checkin_status
) VALUES (
  'f0000059-0000-0000-0000-000000000059', 'WSB-2027-059',
  'Ingrid', 'Johansson', 'Ingrid Johansson', 'ingrid johansson',
  'ingrid.johansson@demo.com', '+46-73-0059-1234', 'JOHANSSON INGRID',
  'female', 55, 'invitee', 'WSB Members', 'adult', 'MO-C05', 'VVEKQF',
  1, 1, 0, true, 'Vegan - no honey', NULL, 2, false,
  'traveler', 'activated', 'checked_in'
);

-- Traveler 60: Kofi Mensah (Ghanaian, male, adult, invitee, Group A/A2, Grand Hyatt, double)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, agent_code, party_total, party_adults, party_children,
  dietary_vegan, dietary_notes, remarks, repeat_attendee, jba_repeat,
  role_type, access_status, checkin_status
) VALUES (
  'f0000060-0000-0000-0000-000000000060', 'WSB-2027-060',
  'Kofi', 'Mensah', 'Kofi Mensah', 'kofi mensah',
  'kofi.mensah@demo.com', '+233-20-0060-5678', 'MENSAH KOFI',
  'male', 51, 'invitee', 'WSB Members', 'adult', 'GH-D05', 'WWFLRG',
  2, 2, 0, false, NULL, NULL, 1, false,
  'traveler', 'activated', 'pending'
);

-- Traveler 61: Ama Mensah (Ghanaian, female, adult, guest of Kofi, Group A/A2, Grand Hyatt, double)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, agent_code, party_total, party_adults, party_children,
  dietary_vegan, dietary_notes, remarks, repeat_attendee, jba_repeat,
  role_type, access_status, checkin_status
) VALUES (
  'f0000061-0000-0000-0000-000000000061', 'WSB-2027-060',
  'Ama', 'Mensah', 'Ama Mensah', 'ama mensah',
  'ama.mensah@demo.com', '+233-20-0061-9012', 'MENSAH AMA',
  'female', 48, 'guest', 'Adult (from 12 years old)', 'adult', 'GH-D05', 'WWFLRG',
  2, 2, 0, false, NULL, NULL, 0, false,
  'traveler', 'activated', 'pending'
);

-- Traveler 62: Dmitri Ivanov (Russian, male, adult, invitee, Group B/B1, Peninsula, single)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, agent_code, party_total, party_adults, party_children,
  dietary_vegan, dietary_notes, remarks, repeat_attendee, jba_repeat,
  role_type, access_status, checkin_status
) VALUES (
  'f0000062-0000-0000-0000-000000000062', 'WSB-2027-062',
  'Dmitri', 'Ivanov', 'Dmitri Ivanov', 'dmitri ivanov',
  'dmitri.ivanov@demo.com', '+7-903-0062-3456', 'IVANOV DMITRI',
  'male', 60, 'invitee', 'WSB Members', 'adult', 'PN-E04', 'XXGMSH',
  1, 1, 0, false, NULL, NULL, 3, true,
  'representative', 'activated', 'checked_in'
);

-- Traveler 63: Adaeze Ibe (Nigerian, female, adult, invitee, Group B/B1, Shangri-La, double)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, agent_code, party_total, party_adults, party_children,
  dietary_vegan, dietary_notes, remarks, repeat_attendee, jba_repeat,
  role_type, access_status, checkin_status
) VALUES (
  'f0000063-0000-0000-0000-000000000063', 'WSB-2027-063',
  'Adaeze', 'Ibe', 'Adaeze Ibe', 'adaeze ibe',
  'adaeze.ibe@demo.com', '+234-810-0063-7890', 'IBE ADAEZE',
  'female', 33, 'invitee', 'WSB Members', 'adult', 'SL-F04', 'YYHNTI',
  2, 2, 0, false, NULL, NULL, 0, false,
  'traveler', 'activated', 'pending'
);

-- Traveler 64: Chinedu Ibe (Nigerian, male, adult, guest of Adaeze, Group B/B1, Shangri-La, double)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, agent_code, party_total, party_adults, party_children,
  dietary_vegan, dietary_notes, remarks, repeat_attendee, jba_repeat,
  role_type, access_status, checkin_status
) VALUES (
  'f0000064-0000-0000-0000-000000000064', 'WSB-2027-063',
  'Chinedu', 'Ibe', 'Chinedu Ibe', 'chinedu ibe',
  'chinedu.ibe@demo.com', '+234-810-0064-1234', 'IBE CHINEDU',
  'male', 36, 'guest', 'Adult (from 12 years old)', 'adult', 'SL-F04', 'YYHNTI',
  2, 2, 0, false, NULL, NULL, 0, false,
  'traveler', 'activated', 'pending'
);

-- Traveler 65: Maria Santos (Brazilian, female, adult, invitee, Group B/B2, Waldorf, twin)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, agent_code, party_total, party_adults, party_children,
  dietary_vegan, dietary_notes, remarks, repeat_attendee, jba_repeat,
  role_type, access_status, checkin_status
) VALUES (
  'f0000065-0000-0000-0000-000000000065', 'WSB-2027-065',
  'Maria', 'Santos', 'Maria Santos', 'maria santos',
  'maria.santos@demo.com', '+55-11-0065-5678', 'SANTOS MARIA',
  'female', 40, 'invitee', 'WSB Members', 'adult', 'WA-G04', 'ZZIOUJ',
  2, 2, 0, false, NULL, NULL, 1, false,
  'traveler', 'activated', 'pending'
);

-- Traveler 66: Ana Santos (Brazilian, female, adult, guest of Maria, Group B/B2, Waldorf, twin)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, agent_code, party_total, party_adults, party_children,
  dietary_vegan, dietary_notes, remarks, repeat_attendee, jba_repeat,
  role_type, access_status, checkin_status
) VALUES (
  'f0000066-0000-0000-0000-000000000066', 'WSB-2027-065',
  'Ana', 'Santos', 'Ana Santos', 'ana santos',
  'ana.santos@demo.com', '+55-11-0066-9012', 'SANTOS ANA',
  'female', 37, 'guest', 'Adult (from 12 years old)', 'adult', 'WA-G04', 'ZZIOUJ',
  2, 2, 0, false, NULL, NULL, 0, false,
  'traveler', 'activated', 'pending'
);

-- Traveler 67: Abdullahi Bello (Nigerian, male, adult, invitee, Group B/B2, Ritz, single)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, agent_code, party_total, party_adults, party_children,
  dietary_vegan, dietary_notes, remarks, repeat_attendee, jba_repeat,
  role_type, access_status, checkin_status
) VALUES (
  'f0000067-0000-0000-0000-000000000067', 'WSB-2027-067',
  'Abdullahi', 'Bello', 'Abdullahi Bello', 'abdullahi bello',
  'abdullahi.bello@demo.com', '+234-811-0067-3456', 'BELLO ABDULLAHI',
  'male', 54, 'invitee', 'WSB Members', 'adult', 'RC-A10', 'ABJPVK',
  1, 1, 0, false, 'Halal meals only', NULL, 2, false,
  'traveler', 'activated', 'checked_in'
);

-- Traveler 68: Lina Nguyen (Vietnamese, female, adult, invitee, Group C/B1, Four Seasons, double)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, agent_code, party_total, party_adults, party_children,
  dietary_vegan, dietary_notes, remarks, repeat_attendee, jba_repeat,
  role_type, access_status, checkin_status
) VALUES (
  'f0000068-0000-0000-0000-000000000068', 'WSB-2027-068',
  'Lina', 'Nguyen', 'Lina Nguyen', 'lina nguyen',
  'lina.nguyen@demo.com', '+84-90-0068-7890', 'NGUYEN LINA',
  'female', 31, 'invitee', 'WSB Members', 'adult', 'FS-B06', 'BCKQWL',
  2, 2, 0, false, NULL, NULL, 0, false,
  'traveler', 'activated', 'pending'
);

-- Traveler 69: Duc Nguyen (Vietnamese, male, adult, guest of Lina, Group C/B1, Four Seasons, double)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, agent_code, party_total, party_adults, party_children,
  dietary_vegan, dietary_notes, remarks, repeat_attendee, jba_repeat,
  role_type, access_status, checkin_status
) VALUES (
  'f0000069-0000-0000-0000-000000000069', 'WSB-2027-068',
  'Duc', 'Nguyen', 'Duc Nguyen', 'duc nguyen',
  'duc.nguyen@demo.com', '+84-90-0069-1234', 'NGUYEN DUC',
  'male', 33, 'guest', 'Adult (from 12 years old)', 'adult', 'FS-B06', 'BCKQWL',
  2, 2, 0, false, NULL, NULL, 0, false,
  'traveler', 'activated', 'pending'
);

-- Traveler 70: Patrick O'Brien (Irish, male, adult, invitee, Group C/B1, Mandarin, single)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, agent_code, party_total, party_adults, party_children,
  dietary_vegan, dietary_notes, remarks, repeat_attendee, jba_repeat,
  role_type, access_status, checkin_status
) VALUES (
  'f0000070-0000-0000-0000-000000000070', 'WSB-2027-070',
  'Patrick', 'O''Brien', 'Patrick O''Brien', 'patrick o''brien',
  'patrick.obrien@demo.com', '+353-87-0070-5678', 'OBRIEN PATRICK',
  'male', 65, 'invitee', 'WSB Members', 'adult', 'MO-C06', 'CDLRXM',
  1, 1, 0, false, NULL, NULL, 4, true,
  'representative', 'activated', 'checked_in'
);

-- Traveler 71: Ayumi Sato (Japanese, female, adult, invitee, Group C/B2, Grand Hyatt, double)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, agent_code, party_total, party_adults, party_children,
  dietary_vegan, dietary_notes, remarks, repeat_attendee, jba_repeat,
  role_type, access_status, checkin_status
) VALUES (
  'f0000071-0000-0000-0000-000000000071', 'WSB-2027-071',
  'Ayumi', 'Sato', 'Ayumi Sato', 'ayumi sato',
  'ayumi.sato@demo.com', '+81-80-0071-9012', 'SATO AYUMI',
  'female', 28, 'invitee', 'WSB Members', 'adult', 'GH-D06', 'DEMSYN',
  2, 2, 0, false, NULL, NULL, 0, false,
  'traveler', 'activated', 'pending'
);

-- Traveler 72: Ryo Sato (Japanese, male, adult, guest of Ayumi, Group C/B2, Grand Hyatt, double)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, agent_code, party_total, party_adults, party_children,
  dietary_vegan, dietary_notes, remarks, repeat_attendee, jba_repeat,
  role_type, access_status, checkin_status
) VALUES (
  'f0000072-0000-0000-0000-000000000072', 'WSB-2027-071',
  'Ryo', 'Sato', 'Ryo Sato', 'ryo sato',
  'ryo.sato@demo.com', '+81-80-0072-3456', 'SATO RYO',
  'male', 30, 'guest', 'Adult (from 12 years old)', 'adult', 'GH-D06', 'DEMSYN',
  2, 2, 0, false, NULL, NULL, 0, false,
  'traveler', 'activated', 'pending'
);

-- Traveler 73: Funke Adebayo (Nigerian, female, adult, invitee, Group C/B2, Ritz, single)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, agent_code, party_total, party_adults, party_children,
  dietary_vegan, dietary_notes, remarks, repeat_attendee, jba_repeat,
  role_type, access_status, checkin_status
) VALUES (
  'f0000073-0000-0000-0000-000000000073', 'WSB-2027-073',
  'Funke', 'Adebayo', 'Funke Adebayo', 'funke adebayo',
  'funke.adebayo@demo.com', '+234-812-0073-7890', 'ADEBAYO FUNKE',
  'female', 46, 'invitee', 'WSB Members', 'adult', 'RC-A11', 'EFNTZO',
  1, 1, 0, false, NULL, NULL, 1, false,
  'traveler', 'activated', 'no_show'
);

-- Traveler 74: Ali Demir (Turkish, male, adult, invitee, Group A/A1, Ritz, double)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, agent_code, party_total, party_adults, party_children,
  dietary_vegan, dietary_notes, remarks, repeat_attendee, jba_repeat,
  role_type, access_status, checkin_status
) VALUES (
  'f0000074-0000-0000-0000-000000000074', 'WSB-2027-074',
  'Ali', 'Demir', 'Ali Demir', 'ali demir',
  'ali.demir@demo.com', '+90-532-0074-1234', 'DEMIR ALI',
  'male', 43, 'invitee', 'WSB Members', 'adult', 'RC-A12', 'FGOUAP',
  2, 2, 0, false, NULL, NULL, 1, false,
  'traveler', 'activated', 'pending'
);

-- Traveler 75: Zeynep Demir (Turkish, female, adult, guest of Ali, Group A/A1, Ritz, double)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, agent_code, party_total, party_adults, party_children,
  dietary_vegan, dietary_notes, remarks, repeat_attendee, jba_repeat,
  role_type, access_status, checkin_status
) VALUES (
  'f0000075-0000-0000-0000-000000000075', 'WSB-2027-074',
  'Zeynep', 'Demir', 'Zeynep Demir', 'zeynep demir',
  'zeynep.demir@demo.com', '+90-532-0075-5678', 'DEMIR ZEYNEP',
  'female', 40, 'guest', 'Adult (from 12 years old)', 'adult', 'RC-A12', 'FGOUAP',
  2, 2, 0, false, NULL, NULL, 0, false,
  'traveler', 'activated', 'pending'
);

-- Traveler 76: Samuel Osei (Ghanaian, male, adult, invitee, Group A/A2, Four Seasons, single)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, agent_code, party_total, party_adults, party_children,
  dietary_vegan, dietary_notes, remarks, repeat_attendee, jba_repeat,
  role_type, access_status, checkin_status
) VALUES (
  'f0000076-0000-0000-0000-000000000076', 'WSB-2027-076',
  'Samuel', 'Osei', 'Samuel Osei', 'samuel osei',
  'samuel.osei@demo.com', '+233-24-0076-9012', 'OSEI SAMUEL',
  'male', 56, 'invitee', 'WSB Members', 'adult', 'FS-B07', 'GHPVBQ',
  1, 1, 0, false, NULL, NULL, 2, false,
  'traveler', 'activated', 'checked_in'
);

-- Traveler 77: Lucia Fernandez (Argentine, female, adult, invitee, Group A/A2, Mandarin, double)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, agent_code, party_total, party_adults, party_children,
  dietary_vegan, dietary_notes, remarks, repeat_attendee, jba_repeat,
  role_type, access_status, checkin_status
) VALUES (
  'f0000077-0000-0000-0000-000000000077', 'WSB-2027-077',
  'Lucia', 'Fernandez', 'Lucia Fernandez', 'lucia fernandez',
  'lucia.fernandez@demo.com', '+54-11-0077-3456', 'FERNANDEZ LUCIA',
  'female', 44, 'invitee', 'WSB Members', 'adult', 'MO-C07', 'HIQWCR',
  2, 2, 0, false, NULL, NULL, 1, false,
  'traveler', 'activated', 'pending'
);

-- Traveler 78: Mateo Fernandez (Argentine, male, adult, guest of Lucia, Group A/A2, Mandarin, double)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, agent_code, party_total, party_adults, party_children,
  dietary_vegan, dietary_notes, remarks, repeat_attendee, jba_repeat,
  role_type, access_status, checkin_status
) VALUES (
  'f0000078-0000-0000-0000-000000000078', 'WSB-2027-077',
  'Mateo', 'Fernandez', 'Mateo Fernandez', 'mateo fernandez',
  'mateo.fernandez@demo.com', '+54-11-0078-7890', 'FERNANDEZ MATEO',
  'male', 46, 'guest', 'Adult (from 12 years old)', 'adult', 'MO-C07', 'HIQWCR',
  2, 2, 0, false, NULL, NULL, 0, false,
  'traveler', 'activated', 'pending'
);

-- Traveler 79: Blessing Eze (Nigerian, female, adult, invitee, Group B/B1, Grand Hyatt, single)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, agent_code, party_total, party_adults, party_children,
  dietary_vegan, dietary_notes, remarks, repeat_attendee, jba_repeat,
  role_type, access_status, checkin_status
) VALUES (
  'f0000079-0000-0000-0000-000000000079', 'WSB-2027-079',
  'Blessing', 'Eze', 'Blessing Eze', 'blessing eze',
  'blessing.eze@demo.com', '+234-813-0079-1234', 'EZE BLESSING',
  'female', 39, 'invitee', 'WSB Members', 'adult', 'GH-D07', 'IJRXDS',
  1, 1, 0, false, NULL, NULL, 0, false,
  'traveler', 'activated', 'pending'
);

-- Traveler 80: Tariq Al-Farsi (Omani, male, adult, invitee, Group B/B1, Peninsula, double)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, agent_code, party_total, party_adults, party_children,
  dietary_vegan, dietary_notes, remarks, repeat_attendee, jba_repeat,
  role_type, access_status, checkin_status
) VALUES (
  'f0000080-0000-0000-0000-000000000080', 'WSB-2027-080',
  'Tariq', 'Al-Farsi', 'Tariq Al-Farsi', 'tariq al-farsi',
  'tariq.alfarsi@demo.com', '+968-9-0080-5678', 'AL-FARSI TARIQ',
  'male', 50, 'invitee', 'WSB Members', 'adult', 'PN-E05', 'JKSYET',
  2, 1, 1, false, 'Halal meals only', NULL, 1, false,
  'traveler', 'activated', 'checked_in'
);

-- Traveler 81: Zara Al-Farsi (Omani, female, child, guest of Tariq, Group B/B1, Peninsula, double)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, agent_code, party_total, party_adults, party_children,
  dietary_vegan, dietary_notes, remarks, repeat_attendee, jba_repeat,
  role_type, access_status, checkin_status
) VALUES (
  'f0000081-0000-0000-0000-000000000081', 'WSB-2027-080',
  'Zara', 'Al-Farsi', 'Zara Al-Farsi', 'zara al-farsi',
  'zara.alfarsi@demo.com', '+968-9-0081-9012', 'AL-FARSI ZARA',
  'female', 10, 'guest', 'Adult (from 12 years old)', 'child', 'PN-E05', 'JKSYET',
  2, 1, 1, false, 'Halal meals only', NULL, 0, false,
  'minor', 'activated', 'checked_in'
);

-- Traveler 82: Yong Kim (Korean, male, adult, invitee, Group B/B2, Shangri-La, single)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, agent_code, party_total, party_adults, party_children,
  dietary_vegan, dietary_notes, remarks, repeat_attendee, jba_repeat,
  role_type, access_status, checkin_status
) VALUES (
  'f0000082-0000-0000-0000-000000000082', 'WSB-2027-082',
  'Yong', 'Kim', 'Yong Kim', 'yong kim',
  'yong.kim@demo.com', '+82-10-0082-3456', 'KIM YONG',
  'male', 47, 'invitee', 'WSB Members', 'adult', 'SL-F05', 'KLTZFU',
  1, 1, 0, false, NULL, NULL, 1, false,
  'traveler', 'activated', 'pending'
);

-- Traveler 83: Chiamaka Obi (Nigerian, female, adult, invitee, Group B/B2, Waldorf, double)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, agent_code, party_total, party_adults, party_children,
  dietary_vegan, dietary_notes, remarks, repeat_attendee, jba_repeat,
  role_type, access_status, checkin_status
) VALUES (
  'f0000083-0000-0000-0000-000000000083', 'WSB-2027-083',
  'Chiamaka', 'Obi', 'Chiamaka Obi', 'chiamaka obi',
  'chiamaka.obi@demo.com', '+234-814-0083-7890', 'OBI CHIAMAKA',
  'female', 35, 'invitee', 'WSB Members', 'adult', 'WA-G05', 'LMUAGV',
  2, 2, 0, false, NULL, NULL, 0, false,
  'traveler', 'activated', 'pending'
);

-- Traveler 84: Obinna Obi (Nigerian, male, adult, guest of Chiamaka, Group B/B2, Waldorf, double)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, agent_code, party_total, party_adults, party_children,
  dietary_vegan, dietary_notes, remarks, repeat_attendee, jba_repeat,
  role_type, access_status, checkin_status
) VALUES (
  'f0000084-0000-0000-0000-000000000084', 'WSB-2027-083',
  'Obinna', 'Obi', 'Obinna Obi', 'obinna obi',
  'obinna.obi@demo.com', '+234-814-0084-1234', 'OBI OBINNA',
  'male', 37, 'guest', 'Adult (from 12 years old)', 'adult', 'WA-G05', 'LMUAGV',
  2, 2, 0, false, NULL, NULL, 0, false,
  'traveler', 'activated', 'pending'
);

-- Traveler 85: Haruki Watanabe (Japanese, male, adult, invitee, Group C/B1, Rosewood, single)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, agent_code, party_total, party_adults, party_children,
  dietary_vegan, dietary_notes, remarks, repeat_attendee, jba_repeat,
  role_type, access_status, checkin_status
) VALUES (
  'f0000085-0000-0000-0000-000000000085', 'WSB-2027-085',
  'Haruki', 'Watanabe', 'Haruki Watanabe', 'haruki watanabe',
  'haruki.watanabe@demo.com', '+81-90-0085-5678', 'WATANABE HARUKI',
  'male', 62, 'invitee', 'WSB Members', 'adult', 'RW-H03', 'MNVBHW',
  1, 1, 0, false, NULL, NULL, 3, true,
  'representative', 'activated', 'checked_in'
);

-- Traveler 86: Ngozi Achebe (Nigerian, female, adult, invitee, Group C/B1, Ritz, twin)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, agent_code, party_total, party_adults, party_children,
  dietary_vegan, dietary_notes, remarks, repeat_attendee, jba_repeat,
  role_type, access_status, checkin_status
) VALUES (
  'f0000086-0000-0000-0000-000000000086', 'WSB-2027-086',
  'Ngozi', 'Achebe', 'Ngozi Achebe', 'ngozi achebe',
  'ngozi.achebe@demo.com', '+234-815-0086-9012', 'ACHEBE NGOZI',
  'female', 41, 'invitee', 'WSB Members', 'adult', 'RC-A13', 'NOWCIX',
  2, 2, 0, false, NULL, NULL, 1, false,
  'traveler', 'activated', 'pending'
);

-- Traveler 87: Nneka Achebe (Nigerian, female, adult, guest of Ngozi, Group C/B1, Ritz, twin)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, agent_code, party_total, party_adults, party_children,
  dietary_vegan, dietary_notes, remarks, repeat_attendee, jba_repeat,
  role_type, access_status, checkin_status
) VALUES (
  'f0000087-0000-0000-0000-000000000087', 'WSB-2027-086',
  'Nneka', 'Achebe', 'Nneka Achebe', 'nneka achebe',
  'nneka.achebe@demo.com', '+234-815-0087-3456', 'ACHEBE NNEKA',
  'female', 38, 'guest', 'Adult (from 12 years old)', 'adult', 'RC-A13', 'NOWCIX',
  2, 2, 0, false, NULL, NULL, 0, false,
  'traveler', 'activated', 'pending'
);

-- Traveler 88: Henrik Larsen (Danish, male, adult, invitee, Group C/B2, Four Seasons, single)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, agent_code, party_total, party_adults, party_children,
  dietary_vegan, dietary_notes, remarks, repeat_attendee, jba_repeat,
  role_type, access_status, checkin_status
) VALUES (
  'f0000088-0000-0000-0000-000000000088', 'WSB-2027-088',
  'Henrik', 'Larsen', 'Henrik Larsen', 'henrik larsen',
  'henrik.larsen@demo.com', '+45-20-0088-7890', 'LARSEN HENRIK',
  'male', 53, 'invitee', 'WSB Members', 'adult', 'FS-B08', 'OPXDJY',
  1, 1, 0, false, NULL, NULL, 2, false,
  'traveler', 'activated', 'checked_in'
);

-- Traveler 89: Amina Diallo (Senegalese, female, adult, invitee, Group C/B2, Mandarin, double)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, agent_code, party_total, party_adults, party_children,
  dietary_vegan, dietary_notes, remarks, repeat_attendee, jba_repeat,
  role_type, access_status, checkin_status
) VALUES (
  'f0000089-0000-0000-0000-000000000089', 'WSB-2027-089',
  'Amina', 'Diallo', 'Amina Diallo', 'amina diallo',
  'amina.diallo@demo.com', '+221-77-0089-1234', 'DIALLO AMINA',
  'female', 36, 'invitee', 'WSB Members', 'adult', 'MO-C08', 'PQYEKZ',
  2, 2, 0, false, NULL, NULL, 0, false,
  'traveler', 'activated', 'pending'
);

-- Traveler 90: Moussa Diallo (Senegalese, male, adult, guest of Amina, Group C/B2, Mandarin, double)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, agent_code, party_total, party_adults, party_children,
  dietary_vegan, dietary_notes, remarks, repeat_attendee, jba_repeat,
  role_type, access_status, checkin_status
) VALUES (
  'f0000090-0000-0000-0000-000000000090', 'WSB-2027-089',
  'Moussa', 'Diallo', 'Moussa Diallo', 'moussa diallo',
  'moussa.diallo@demo.com', '+221-77-0090-5678', 'DIALLO MOUSSA',
  'male', 39, 'guest', 'Adult (from 12 years old)', 'adult', 'MO-C08', 'PQYEKZ',
  2, 2, 0, false, NULL, NULL, 0, false,
  'traveler', 'activated', 'pending'
);

-- Traveler 91: Oladipo Afolabi (Nigerian, male, adult, invitee, Group A/A1, Grand Hyatt, twin)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, agent_code, party_total, party_adults, party_children,
  dietary_vegan, dietary_notes, remarks, repeat_attendee, jba_repeat,
  role_type, access_status, checkin_status
) VALUES (
  'f0000091-0000-0000-0000-000000000091', 'WSB-2027-091',
  'Oladipo', 'Afolabi', 'Oladipo Afolabi', 'oladipo afolabi',
  'oladipo.afolabi@demo.com', '+234-816-0091-9012', 'AFOLABI OLADIPO',
  'male', 45, 'invitee', 'WSB Members', 'adult', 'GH-D08', 'QRZFLA',
  2, 2, 0, false, NULL, NULL, 1, false,
  'traveler', 'activated', 'pending'
);

-- Traveler 92: Tayo Afolabi (Nigerian, male, adult, guest of Oladipo, Group A/A1, Grand Hyatt, twin)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, agent_code, party_total, party_adults, party_children,
  dietary_vegan, dietary_notes, remarks, repeat_attendee, jba_repeat,
  role_type, access_status, checkin_status
) VALUES (
  'f0000092-0000-0000-0000-000000000092', 'WSB-2027-091',
  'Tayo', 'Afolabi', 'Tayo Afolabi', 'tayo afolabi',
  'tayo.afolabi@demo.com', '+234-816-0092-3456', 'AFOLABI TAYO',
  'male', 42, 'guest', 'Adult (from 12 years old)', 'adult', 'GH-D08', 'QRZFLA',
  2, 2, 0, false, NULL, NULL, 0, false,
  'traveler', 'activated', 'pending'
);

-- Traveler 93: Sakura Ito (Japanese, female, adult, invitee, Group A/A2, Peninsula, single)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, agent_code, party_total, party_adults, party_children,
  dietary_vegan, dietary_notes, remarks, repeat_attendee, jba_repeat,
  role_type, access_status, checkin_status
) VALUES (
  'f0000093-0000-0000-0000-000000000093', 'WSB-2027-093',
  'Sakura', 'Ito', 'Sakura Ito', 'sakura ito',
  'sakura.ito@demo.com', '+81-70-0093-7890', 'ITO SAKURA',
  'female', 30, 'invitee', 'WSB Members', 'adult', 'PN-E06', 'RSAGMB',
  1, 1, 0, false, NULL, NULL, 0, false,
  'traveler', 'activated', 'pending'
);

-- Traveler 94: Michael Oduya (Nigerian, male, adult, invitee, Group B/B1, Shangri-La, triple)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, agent_code, party_total, party_adults, party_children,
  dietary_vegan, dietary_notes, remarks, repeat_attendee, jba_repeat,
  role_type, access_status, checkin_status
) VALUES (
  'f0000094-0000-0000-0000-000000000094', 'WSB-2027-094',
  'Michael', 'Oduya', 'Michael Oduya', 'michael oduya',
  'michael.oduya@demo.com', '+234-817-0094-1234', 'ODUYA MICHAEL',
  'male', 40, 'invitee', 'WSB Members', 'adult', 'SL-F06', 'STBHNC',
  3, 2, 1, false, NULL, NULL, 1, false,
  'traveler', 'activated', 'pending'
);

-- Traveler 95: Joy Oduya (Nigerian, female, adult, guest of Michael, Group B/B1, Shangri-La, triple)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, agent_code, party_total, party_adults, party_children,
  dietary_vegan, dietary_notes, remarks, repeat_attendee, jba_repeat,
  role_type, access_status, checkin_status
) VALUES (
  'f0000095-0000-0000-0000-000000000095', 'WSB-2027-094',
  'Joy', 'Oduya', 'Joy Oduya', 'joy oduya',
  'joy.oduya@demo.com', '+234-817-0095-5678', 'ODUYA JOY',
  'female', 37, 'guest', 'Adult (from 12 years old)', 'adult', 'SL-F06', 'STBHNC',
  3, 2, 1, false, NULL, NULL, 0, false,
  'traveler', 'activated', 'pending'
);

-- Traveler 96: Daniel Oduya (Nigerian, male, child, guest of Michael, Group B/B1, Shangri-La, triple)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, agent_code, party_total, party_adults, party_children,
  dietary_vegan, dietary_notes, remarks, repeat_attendee, jba_repeat,
  role_type, access_status, checkin_status
) VALUES (
  'f0000096-0000-0000-0000-000000000096', 'WSB-2027-094',
  'Daniel', 'Oduya', 'Daniel Oduya', 'daniel oduya',
  'daniel.oduya@demo.com', '+234-817-0096-9012', 'ODUYA DANIEL',
  'male', 8, 'guest', 'Adult (from 12 years old)', 'child', 'SL-F06', 'STBHNC',
  3, 2, 1, false, NULL, NULL, 0, false,
  'minor', 'activated', 'pending'
);

-- Traveler 97: Yusuf Ibrahim (Nigerian, male, adult, invitee, Group B/B2, Rosewood, single)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, agent_code, party_total, party_adults, party_children,
  dietary_vegan, dietary_notes, remarks, repeat_attendee, jba_repeat,
  role_type, access_status, checkin_status
) VALUES (
  'f0000097-0000-0000-0000-000000000097', 'WSB-2027-097',
  'Yusuf', 'Ibrahim', 'Yusuf Ibrahim', 'yusuf ibrahim',
  'yusuf.ibrahim@demo.com', '+234-818-0097-3456', 'IBRAHIM YUSUF',
  'male', 52, 'invitee', 'WSB Members', 'adult', 'RW-H04', 'TUCIOD',
  1, 1, 0, false, 'Halal meals only', NULL, 2, false,
  'traveler', 'activated', 'no_show'
);

-- Traveler 98: Soo-Jin Lee (Korean, female, adult, invitee, Group C/B2, Ritz, double)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, agent_code, party_total, party_adults, party_children,
  dietary_vegan, dietary_notes, remarks, repeat_attendee, jba_repeat,
  role_type, access_status, checkin_status
) VALUES (
  'f0000098-0000-0000-0000-000000000098', 'WSB-2027-098',
  'Soo-Jin', 'Lee', 'Soo-Jin Lee', 'soo-jin lee',
  'soojin.lee@demo.com', '+82-10-0098-7890', 'LEE SOO-JIN',
  'female', 32, 'invitee', 'WSB Members', 'adult', 'RC-A14', 'UVDJPE',
  2, 2, 0, false, NULL, NULL, 0, false,
  'traveler', 'activated', 'pending'
);

-- Traveler 99: Jae-Won Lee (Korean, male, adult, guest of Soo-Jin, Group C/B2, Ritz, double)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, agent_code, party_total, party_adults, party_children,
  dietary_vegan, dietary_notes, remarks, repeat_attendee, jba_repeat,
  role_type, access_status, checkin_status
) VALUES (
  'f0000099-0000-0000-0000-000000000099', 'WSB-2027-098',
  'Jae-Won', 'Lee', 'Jae-Won Lee', 'jae-won lee',
  'jaewon.lee@demo.com', '+82-10-0099-1234', 'LEE JAE-WON',
  'male', 34, 'guest', 'Adult (from 12 years old)', 'adult', 'RC-A14', 'UVDJPE',
  2, 2, 0, false, NULL, NULL, 0, false,
  'traveler', 'activated', 'pending'
);

-- Traveler 100: Baby Oduya (Nigerian, male, infant, guest of Michael, Group B/B1, Shangri-La, triple — shares room 94)
INSERT INTO travelers (
  traveler_id, booking_id, first_name, last_name, full_name_raw, full_name_normalized,
  email_primary, phone, passport_name, gender, age, invitee_type, registration_type,
  pax_type, internal_id, agent_code, party_total, party_adults, party_children,
  dietary_vegan, dietary_notes, remarks, repeat_attendee, jba_repeat,
  role_type, access_status, checkin_status
) VALUES (
  'f0000100-0000-0000-0000-000000000100', 'WSB-2027-094',
  'Emmanuel', 'Oduya', 'Emmanuel Oduya', 'emmanuel oduya',
  'emmanuel.oduya@demo.com', '+234-817-0100-5678', 'ODUYA EMMANUEL',
  'male', 1, 'guest', 'Infant (below 02 years old)', 'infant', 'SL-F06', 'STBHNC',
  3, 2, 1, false, NULL, 'Infant - needs crib', 0, false,
  'minor', 'activated', 'pending'
);


-- ============================================================
-- Group Assignments for new travelers (parent group + sub-group)
-- A=40%, B=35%, C=25%
-- ============================================================
INSERT INTO traveler_groups (traveler_id, group_id) VALUES
  -- Group A / A1
  ('f0000014-0000-0000-0000-000000000014', 'b1111111-1111-1111-1111-111111111111'),
  ('f0000014-0000-0000-0000-000000000014', 'b1100001-1111-1111-1111-111111111111'),
  ('f0000015-0000-0000-0000-000000000015', 'b1111111-1111-1111-1111-111111111111'),
  ('f0000015-0000-0000-0000-000000000015', 'b1100001-1111-1111-1111-111111111111'),
  ('f0000016-0000-0000-0000-000000000016', 'b1111111-1111-1111-1111-111111111111'),
  ('f0000016-0000-0000-0000-000000000016', 'b1100001-1111-1111-1111-111111111111'),
  ('f0000017-0000-0000-0000-000000000017', 'b1111111-1111-1111-1111-111111111111'),
  ('f0000017-0000-0000-0000-000000000017', 'b1100001-1111-1111-1111-111111111111'),
  ('f0000018-0000-0000-0000-000000000018', 'b1111111-1111-1111-1111-111111111111'),
  ('f0000018-0000-0000-0000-000000000018', 'b1100001-1111-1111-1111-111111111111'),
  ('f0000019-0000-0000-0000-000000000019', 'b1111111-1111-1111-1111-111111111111'),
  ('f0000019-0000-0000-0000-000000000019', 'b1100001-1111-1111-1111-111111111111'),
  ('f0000026-0000-0000-0000-000000000026', 'b1111111-1111-1111-1111-111111111111'),
  ('f0000026-0000-0000-0000-000000000026', 'b1100001-1111-1111-1111-111111111111'),
  ('f0000027-0000-0000-0000-000000000027', 'b1111111-1111-1111-1111-111111111111'),
  ('f0000027-0000-0000-0000-000000000027', 'b1100001-1111-1111-1111-111111111111'),
  ('f0000028-0000-0000-0000-000000000028', 'b1111111-1111-1111-1111-111111111111'),
  ('f0000028-0000-0000-0000-000000000028', 'b1100001-1111-1111-1111-111111111111'),
  ('f0000055-0000-0000-0000-000000000055', 'b1111111-1111-1111-1111-111111111111'),
  ('f0000055-0000-0000-0000-000000000055', 'b1100001-1111-1111-1111-111111111111'),
  ('f0000056-0000-0000-0000-000000000056', 'b1111111-1111-1111-1111-111111111111'),
  ('f0000056-0000-0000-0000-000000000056', 'b1100001-1111-1111-1111-111111111111'),
  ('f0000057-0000-0000-0000-000000000057', 'b1111111-1111-1111-1111-111111111111'),
  ('f0000057-0000-0000-0000-000000000057', 'b1100001-1111-1111-1111-111111111111'),
  ('f0000058-0000-0000-0000-000000000058', 'b1111111-1111-1111-1111-111111111111'),
  ('f0000058-0000-0000-0000-000000000058', 'b1100001-1111-1111-1111-111111111111'),
  ('f0000074-0000-0000-0000-000000000074', 'b1111111-1111-1111-1111-111111111111'),
  ('f0000074-0000-0000-0000-000000000074', 'b1100001-1111-1111-1111-111111111111'),
  ('f0000075-0000-0000-0000-000000000075', 'b1111111-1111-1111-1111-111111111111'),
  ('f0000075-0000-0000-0000-000000000075', 'b1100001-1111-1111-1111-111111111111'),
  ('f0000091-0000-0000-0000-000000000091', 'b1111111-1111-1111-1111-111111111111'),
  ('f0000091-0000-0000-0000-000000000091', 'b1100001-1111-1111-1111-111111111111'),
  ('f0000092-0000-0000-0000-000000000092', 'b1111111-1111-1111-1111-111111111111'),
  ('f0000092-0000-0000-0000-000000000092', 'b1100001-1111-1111-1111-111111111111'),
  -- Group A / A2
  ('f0000020-0000-0000-0000-000000000020', 'b1111111-1111-1111-1111-111111111111'),
  ('f0000020-0000-0000-0000-000000000020', 'b1100002-1111-1111-1111-111111111111'),
  ('f0000021-0000-0000-0000-000000000021', 'b1111111-1111-1111-1111-111111111111'),
  ('f0000021-0000-0000-0000-000000000021', 'b1100002-1111-1111-1111-111111111111'),
  ('f0000022-0000-0000-0000-000000000022', 'b1111111-1111-1111-1111-111111111111'),
  ('f0000022-0000-0000-0000-000000000022', 'b1100002-1111-1111-1111-111111111111'),
  ('f0000023-0000-0000-0000-000000000023', 'b1111111-1111-1111-1111-111111111111'),
  ('f0000023-0000-0000-0000-000000000023', 'b1100002-1111-1111-1111-111111111111'),
  ('f0000024-0000-0000-0000-000000000024', 'b1111111-1111-1111-1111-111111111111'),
  ('f0000024-0000-0000-0000-000000000024', 'b1100002-1111-1111-1111-111111111111'),
  ('f0000025-0000-0000-0000-000000000025', 'b1111111-1111-1111-1111-111111111111'),
  ('f0000025-0000-0000-0000-000000000025', 'b1100002-1111-1111-1111-111111111111'),
  ('f0000029-0000-0000-0000-000000000029', 'b1111111-1111-1111-1111-111111111111'),
  ('f0000029-0000-0000-0000-000000000029', 'b1100002-1111-1111-1111-111111111111'),
  ('f0000030-0000-0000-0000-000000000030', 'b1111111-1111-1111-1111-111111111111'),
  ('f0000030-0000-0000-0000-000000000030', 'b1100002-1111-1111-1111-111111111111'),
  ('f0000031-0000-0000-0000-000000000031', 'b1111111-1111-1111-1111-111111111111'),
  ('f0000031-0000-0000-0000-000000000031', 'b1100002-1111-1111-1111-111111111111'),
  ('f0000059-0000-0000-0000-000000000059', 'b1111111-1111-1111-1111-111111111111'),
  ('f0000059-0000-0000-0000-000000000059', 'b1100002-1111-1111-1111-111111111111'),
  ('f0000060-0000-0000-0000-000000000060', 'b1111111-1111-1111-1111-111111111111'),
  ('f0000060-0000-0000-0000-000000000060', 'b1100002-1111-1111-1111-111111111111'),
  ('f0000061-0000-0000-0000-000000000061', 'b1111111-1111-1111-1111-111111111111'),
  ('f0000061-0000-0000-0000-000000000061', 'b1100002-1111-1111-1111-111111111111'),
  ('f0000076-0000-0000-0000-000000000076', 'b1111111-1111-1111-1111-111111111111'),
  ('f0000076-0000-0000-0000-000000000076', 'b1100002-1111-1111-1111-111111111111'),
  ('f0000077-0000-0000-0000-000000000077', 'b1111111-1111-1111-1111-111111111111'),
  ('f0000077-0000-0000-0000-000000000077', 'b1100002-1111-1111-1111-111111111111'),
  ('f0000078-0000-0000-0000-000000000078', 'b1111111-1111-1111-1111-111111111111'),
  ('f0000078-0000-0000-0000-000000000078', 'b1100002-1111-1111-1111-111111111111'),
  ('f0000093-0000-0000-0000-000000000093', 'b1111111-1111-1111-1111-111111111111'),
  ('f0000093-0000-0000-0000-000000000093', 'b1100002-1111-1111-1111-111111111111'),
  -- Group B / B1
  ('f0000033-0000-0000-0000-000000000033', 'b2222222-2222-2222-2222-222222222222'),
  ('f0000033-0000-0000-0000-000000000033', 'b2200001-2222-2222-2222-222222222222'),
  ('f0000034-0000-0000-0000-000000000034', 'b2222222-2222-2222-2222-222222222222'),
  ('f0000034-0000-0000-0000-000000000034', 'b2200001-2222-2222-2222-222222222222'),
  ('f0000035-0000-0000-0000-000000000035', 'b2222222-2222-2222-2222-222222222222'),
  ('f0000035-0000-0000-0000-000000000035', 'b2200001-2222-2222-2222-222222222222'),
  ('f0000036-0000-0000-0000-000000000036', 'b2222222-2222-2222-2222-222222222222'),
  ('f0000036-0000-0000-0000-000000000036', 'b2200001-2222-2222-2222-222222222222'),
  ('f0000037-0000-0000-0000-000000000037', 'b2222222-2222-2222-2222-222222222222'),
  ('f0000037-0000-0000-0000-000000000037', 'b2200001-2222-2222-2222-222222222222'),
  ('f0000042-0000-0000-0000-000000000042', 'b2222222-2222-2222-2222-222222222222'),
  ('f0000042-0000-0000-0000-000000000042', 'b2200001-2222-2222-2222-222222222222'),
  ('f0000043-0000-0000-0000-000000000043', 'b2222222-2222-2222-2222-222222222222'),
  ('f0000043-0000-0000-0000-000000000043', 'b2200001-2222-2222-2222-222222222222'),
  ('f0000062-0000-0000-0000-000000000062', 'b2222222-2222-2222-2222-222222222222'),
  ('f0000062-0000-0000-0000-000000000062', 'b2200001-2222-2222-2222-222222222222'),
  ('f0000063-0000-0000-0000-000000000063', 'b2222222-2222-2222-2222-222222222222'),
  ('f0000063-0000-0000-0000-000000000063', 'b2200001-2222-2222-2222-222222222222'),
  ('f0000064-0000-0000-0000-000000000064', 'b2222222-2222-2222-2222-222222222222'),
  ('f0000064-0000-0000-0000-000000000064', 'b2200001-2222-2222-2222-222222222222'),
  ('f0000079-0000-0000-0000-000000000079', 'b2222222-2222-2222-2222-222222222222'),
  ('f0000079-0000-0000-0000-000000000079', 'b2200001-2222-2222-2222-222222222222'),
  ('f0000080-0000-0000-0000-000000000080', 'b2222222-2222-2222-2222-222222222222'),
  ('f0000080-0000-0000-0000-000000000080', 'b2200001-2222-2222-2222-222222222222'),
  ('f0000081-0000-0000-0000-000000000081', 'b2222222-2222-2222-2222-222222222222'),
  ('f0000081-0000-0000-0000-000000000081', 'b2200001-2222-2222-2222-222222222222'),
  ('f0000094-0000-0000-0000-000000000094', 'b2222222-2222-2222-2222-222222222222'),
  ('f0000094-0000-0000-0000-000000000094', 'b2200001-2222-2222-2222-222222222222'),
  ('f0000095-0000-0000-0000-000000000095', 'b2222222-2222-2222-2222-222222222222'),
  ('f0000095-0000-0000-0000-000000000095', 'b2200001-2222-2222-2222-222222222222'),
  ('f0000096-0000-0000-0000-000000000096', 'b2222222-2222-2222-2222-222222222222'),
  ('f0000096-0000-0000-0000-000000000096', 'b2200001-2222-2222-2222-222222222222'),
  ('f0000100-0000-0000-0000-000000000100', 'b2222222-2222-2222-2222-222222222222'),
  ('f0000100-0000-0000-0000-000000000100', 'b2200001-2222-2222-2222-222222222222'),
  -- Group B / B2
  ('f0000032-0000-0000-0000-000000000032', 'b2222222-2222-2222-2222-222222222222'),
  ('f0000032-0000-0000-0000-000000000032', 'b2200002-2222-2222-2222-222222222222'),
  ('f0000038-0000-0000-0000-000000000038', 'b2222222-2222-2222-2222-222222222222'),
  ('f0000038-0000-0000-0000-000000000038', 'b2200002-2222-2222-2222-222222222222'),
  ('f0000039-0000-0000-0000-000000000039', 'b2222222-2222-2222-2222-222222222222'),
  ('f0000039-0000-0000-0000-000000000039', 'b2200002-2222-2222-2222-222222222222'),
  ('f0000040-0000-0000-0000-000000000040', 'b2222222-2222-2222-2222-222222222222'),
  ('f0000040-0000-0000-0000-000000000040', 'b2200002-2222-2222-2222-222222222222'),
  ('f0000041-0000-0000-0000-000000000041', 'b2222222-2222-2222-2222-222222222222'),
  ('f0000041-0000-0000-0000-000000000041', 'b2200002-2222-2222-2222-222222222222'),
  ('f0000044-0000-0000-0000-000000000044', 'b2222222-2222-2222-2222-222222222222'),
  ('f0000044-0000-0000-0000-000000000044', 'b2200002-2222-2222-2222-222222222222'),
  ('f0000045-0000-0000-0000-000000000045', 'b2222222-2222-2222-2222-222222222222'),
  ('f0000045-0000-0000-0000-000000000045', 'b2200002-2222-2222-2222-222222222222'),
  ('f0000046-0000-0000-0000-000000000046', 'b2222222-2222-2222-2222-222222222222'),
  ('f0000046-0000-0000-0000-000000000046', 'b2200002-2222-2222-2222-222222222222'),
  ('f0000065-0000-0000-0000-000000000065', 'b2222222-2222-2222-2222-222222222222'),
  ('f0000065-0000-0000-0000-000000000065', 'b2200002-2222-2222-2222-222222222222'),
  ('f0000066-0000-0000-0000-000000000066', 'b2222222-2222-2222-2222-222222222222'),
  ('f0000066-0000-0000-0000-000000000066', 'b2200002-2222-2222-2222-222222222222'),
  ('f0000067-0000-0000-0000-000000000067', 'b2222222-2222-2222-2222-222222222222'),
  ('f0000067-0000-0000-0000-000000000067', 'b2200002-2222-2222-2222-222222222222'),
  ('f0000082-0000-0000-0000-000000000082', 'b2222222-2222-2222-2222-222222222222'),
  ('f0000082-0000-0000-0000-000000000082', 'b2200002-2222-2222-2222-222222222222'),
  ('f0000083-0000-0000-0000-000000000083', 'b2222222-2222-2222-2222-222222222222'),
  ('f0000083-0000-0000-0000-000000000083', 'b2200002-2222-2222-2222-222222222222'),
  ('f0000084-0000-0000-0000-000000000084', 'b2222222-2222-2222-2222-222222222222'),
  ('f0000084-0000-0000-0000-000000000084', 'b2200002-2222-2222-2222-222222222222'),
  ('f0000097-0000-0000-0000-000000000097', 'b2222222-2222-2222-2222-222222222222'),
  ('f0000097-0000-0000-0000-000000000097', 'b2200002-2222-2222-2222-222222222222'),
  -- Group C (using B1 and B2 sub-groups as the schema doesn't have C sub-groups)
  ('f0000047-0000-0000-0000-000000000047', 'b3333333-3333-3333-3333-333333333333'),
  ('f0000048-0000-0000-0000-000000000048', 'b3333333-3333-3333-3333-333333333333'),
  ('f0000049-0000-0000-0000-000000000049', 'b3333333-3333-3333-3333-333333333333'),
  ('f0000050-0000-0000-0000-000000000050', 'b3333333-3333-3333-3333-333333333333'),
  ('f0000051-0000-0000-0000-000000000051', 'b3333333-3333-3333-3333-333333333333'),
  ('f0000052-0000-0000-0000-000000000052', 'b3333333-3333-3333-3333-333333333333'),
  ('f0000053-0000-0000-0000-000000000053', 'b3333333-3333-3333-3333-333333333333'),
  ('f0000054-0000-0000-0000-000000000054', 'b3333333-3333-3333-3333-333333333333'),
  ('f0000068-0000-0000-0000-000000000068', 'b3333333-3333-3333-3333-333333333333'),
  ('f0000069-0000-0000-0000-000000000069', 'b3333333-3333-3333-3333-333333333333'),
  ('f0000070-0000-0000-0000-000000000070', 'b3333333-3333-3333-3333-333333333333'),
  ('f0000071-0000-0000-0000-000000000071', 'b3333333-3333-3333-3333-333333333333'),
  ('f0000072-0000-0000-0000-000000000072', 'b3333333-3333-3333-3333-333333333333'),
  ('f0000073-0000-0000-0000-000000000073', 'b3333333-3333-3333-3333-333333333333'),
  ('f0000085-0000-0000-0000-000000000085', 'b3333333-3333-3333-3333-333333333333'),
  ('f0000086-0000-0000-0000-000000000086', 'b3333333-3333-3333-3333-333333333333'),
  ('f0000087-0000-0000-0000-000000000087', 'b3333333-3333-3333-3333-333333333333'),
  ('f0000088-0000-0000-0000-000000000088', 'b3333333-3333-3333-3333-333333333333'),
  ('f0000089-0000-0000-0000-000000000089', 'b3333333-3333-3333-3333-333333333333'),
  ('f0000090-0000-0000-0000-000000000090', 'b3333333-3333-3333-3333-333333333333'),
  ('f0000098-0000-0000-0000-000000000098', 'b3333333-3333-3333-3333-333333333333'),
  ('f0000099-0000-0000-0000-000000000099', 'b3333333-3333-3333-3333-333333333333');


-- ============================================================
-- Room Assignments for new travelers
-- room_assignment_seq groups roommates (same number = same room)
-- Seq starts at 7 (existing seed uses 1-6)
-- ============================================================
INSERT INTO room_assignments (traveler_id, hotel_id, room_assignment_seq, occupancy, paid_room_type, registered_single, registered_double, registered_twin, registered_triple, is_paid_room, hotel_confirmation_no) VALUES
  -- Seq 7: Adeolu Durotoye — Single @ Ritz
  ('f0000014-0000-0000-0000-000000000014', 'a1111111-1111-1111-1111-111111111111', 7, 'single', 'S1', true, false, false, false, true, 'RC-CONF-007'),
  -- Seq 8: Amara + Chidi Okafor — Double @ Ritz
  ('f0000015-0000-0000-0000-000000000015', 'a1111111-1111-1111-1111-111111111111', 8, 'double', 'D1', false, true, false, false, true, 'RC-CONF-008'),
  ('f0000016-0000-0000-0000-000000000016', 'a1111111-1111-1111-1111-111111111111', 8, 'double', 'D1', false, true, false, false, true, 'RC-CONF-008'),
  -- Seq 9: Kenji Tanaka — Single @ Four Seasons
  ('f0000017-0000-0000-0000-000000000017', 'a2222222-2222-2222-2222-222222222222', 9, 'single', 'S1', true, false, false, false, true, 'FS-CONF-001'),
  -- Seq 10: Fatima + Omar Al-Rashid — Double @ Four Seasons
  ('f0000018-0000-0000-0000-000000000018', 'a2222222-2222-2222-2222-222222222222', 10, 'double', 'D1', false, true, false, false, true, 'FS-CONF-002'),
  ('f0000019-0000-0000-0000-000000000019', 'a2222222-2222-2222-2222-222222222222', 10, 'double', 'D1', false, true, false, false, true, 'FS-CONF-002'),
  -- Seq 11: Sven Lindqvist — Single @ Mandarin
  ('f0000020-0000-0000-0000-000000000020', 'a3333333-3333-3333-3333-333333333333', 11, 'single', 'S1', true, false, false, false, true, 'MO-CONF-001'),
  -- Seq 12: Priya + Arjun Sharma — Double @ Mandarin
  ('f0000021-0000-0000-0000-000000000021', 'a3333333-3333-3333-3333-333333333333', 12, 'double', 'D1', false, true, false, false, true, 'MO-CONF-002'),
  ('f0000022-0000-0000-0000-000000000022', 'a3333333-3333-3333-3333-333333333333', 12, 'double', 'D1', false, true, false, false, true, 'MO-CONF-002'),
  -- Seq 13: Marcus Johnson — Single @ Grand Hyatt
  ('f0000023-0000-0000-0000-000000000023', 'a4444444-4444-4444-4444-444444444444', 13, 'single', 'S1', true, false, false, false, true, 'GH-CONF-001'),
  -- Seq 14: Yuki + Hiroshi Nakamura — Double @ Grand Hyatt
  ('f0000024-0000-0000-0000-000000000024', 'a4444444-4444-4444-4444-444444444444', 14, 'double', 'D1', false, true, false, false, true, 'GH-CONF-002'),
  ('f0000025-0000-0000-0000-000000000025', 'a4444444-4444-4444-4444-444444444444', 14, 'double', 'D1', false, true, false, false, true, 'GH-CONF-002'),
  -- Seq 15: Elena Petrova — Single @ Peninsula
  ('f0000026-0000-0000-0000-000000000026', 'a5555555-5555-5555-5555-555555555555', 15, 'single', 'S1', true, false, false, false, true, 'PN-CONF-001'),
  -- Seq 16: Mohammed + Aisha Hassan — Double @ Shangri-La
  ('f0000027-0000-0000-0000-000000000027', 'a6666666-6666-6666-6666-666666666666', 16, 'double', 'D1', false, true, false, false, true, 'SL-CONF-001'),
  ('f0000028-0000-0000-0000-000000000028', 'a6666666-6666-6666-6666-666666666666', 16, 'double', 'D1', false, true, false, false, true, 'SL-CONF-001'),
  -- Seq 17: Carlos Mendoza — Single @ Waldorf
  ('f0000029-0000-0000-0000-000000000029', 'a7777777-7777-7777-7777-777777777777', 17, 'single', 'S1', true, false, false, false, true, 'WA-CONF-001'),
  -- Seq 18: Sophie + Jean-Pierre Dubois — Double @ Waldorf
  ('f0000030-0000-0000-0000-000000000030', 'a7777777-7777-7777-7777-777777777777', 18, 'double', 'D1', false, true, false, false, true, 'WA-CONF-002'),
  ('f0000031-0000-0000-0000-000000000031', 'a7777777-7777-7777-7777-777777777777', 18, 'double', 'D1', false, true, false, false, true, 'WA-CONF-002'),
  -- Seq 19: Kwame Asante — Single @ Rosewood
  ('f0000032-0000-0000-0000-000000000032', 'a8888888-8888-8888-8888-888888888888', 19, 'single', 'S1', true, false, false, false, true, 'RW-CONF-001'),
  -- Seq 20: Isabella + Diego Rodriguez — Double @ Ritz
  ('f0000033-0000-0000-0000-000000000033', 'a1111111-1111-1111-1111-111111111111', 20, 'double', 'D1', false, true, false, false, true, 'RC-CONF-009'),
  ('f0000034-0000-0000-0000-000000000034', 'a1111111-1111-1111-1111-111111111111', 20, 'double', 'D1', false, true, false, false, true, 'RC-CONF-009'),
  -- Seq 21: Oluwaseun + Babatunde Adeyemi — Twin @ Four Seasons
  ('f0000035-0000-0000-0000-000000000035', 'a2222222-2222-2222-2222-222222222222', 21, 'twin', 'T1', false, false, true, false, true, 'FS-CONF-003'),
  ('f0000036-0000-0000-0000-000000000036', 'a2222222-2222-2222-2222-222222222222', 21, 'twin', 'T1', false, false, true, false, true, 'FS-CONF-003'),
  -- Seq 22: Min-Ji Park — Single @ Mandarin
  ('f0000037-0000-0000-0000-000000000037', 'a3333333-3333-3333-3333-333333333333', 22, 'single', 'S1', true, false, false, false, true, 'MO-CONF-003'),
  -- Seq 23: Ahmad + Layla Khalil — Double @ Grand Hyatt
  ('f0000038-0000-0000-0000-000000000038', 'a4444444-4444-4444-4444-444444444444', 23, 'double', 'D1', false, true, false, false, true, 'GH-CONF-003'),
  ('f0000039-0000-0000-0000-000000000039', 'a4444444-4444-4444-4444-444444444444', 23, 'double', 'D1', false, true, false, false, true, 'GH-CONF-003'),
  -- Seq 24: Takeshi Yamamoto — Single @ Peninsula
  ('f0000040-0000-0000-0000-000000000040', 'a5555555-5555-5555-5555-555555555555', 24, 'single', 'S1', true, false, false, false, true, 'PN-CONF-002'),
  -- Seq 25: Nadia Benali — Single @ Shangri-La
  ('f0000041-0000-0000-0000-000000000041', 'a6666666-6666-6666-6666-666666666666', 25, 'single', 'S1', true, false, false, false, true, 'SL-CONF-002'),
  -- Seq 26: David + Grace Okonkwo — Double @ Ritz
  ('f0000042-0000-0000-0000-000000000042', 'a1111111-1111-1111-1111-111111111111', 26, 'double', 'D1', false, true, false, false, true, 'RC-CONF-010'),
  ('f0000043-0000-0000-0000-000000000043', 'a1111111-1111-1111-1111-111111111111', 26, 'double', 'D1', false, true, false, false, true, 'RC-CONF-010'),
  -- Seq 27: Hans Mueller — Single @ Four Seasons
  ('f0000044-0000-0000-0000-000000000044', 'a2222222-2222-2222-2222-222222222222', 27, 'single', 'S1', true, false, false, false, true, 'FS-CONF-004'),
  -- Seq 28: Abiodun + Tunde Fashola — Double @ Mandarin
  ('f0000045-0000-0000-0000-000000000045', 'a3333333-3333-3333-3333-333333333333', 28, 'double', 'D1', false, true, false, false, true, 'MO-CONF-004'),
  ('f0000046-0000-0000-0000-000000000046', 'a3333333-3333-3333-3333-333333333333', 28, 'double', 'D1', false, true, false, false, true, 'MO-CONF-004'),
  -- Seq 29: Sarah Thompson — Single @ Grand Hyatt
  ('f0000047-0000-0000-0000-000000000047', 'a4444444-4444-4444-4444-444444444444', 29, 'single', 'S1', true, false, false, false, true, 'GH-CONF-004'),
  -- Seq 30: Rajesh + Sunita Patel — Double @ Peninsula
  ('f0000048-0000-0000-0000-000000000048', 'a5555555-5555-5555-5555-555555555555', 30, 'double', 'D1', false, true, false, false, true, 'PN-CONF-003'),
  ('f0000049-0000-0000-0000-000000000049', 'a5555555-5555-5555-5555-555555555555', 30, 'double', 'D1', false, true, false, false, true, 'PN-CONF-003'),
  -- Seq 31: Wei-Lin + Hao-Yu Chen — Twin @ Shangri-La
  ('f0000050-0000-0000-0000-000000000050', 'a6666666-6666-6666-6666-666666666666', 31, 'twin', 'T1', false, false, true, false, true, 'SL-CONF-003'),
  ('f0000051-0000-0000-0000-000000000051', 'a6666666-6666-6666-6666-666666666666', 31, 'twin', 'T1', false, false, true, false, true, 'SL-CONF-003'),
  -- Seq 32: Olumide Bakare — Single @ Waldorf
  ('f0000052-0000-0000-0000-000000000052', 'a7777777-7777-7777-7777-777777777777', 32, 'single', 'S1', true, false, false, false, true, 'WA-CONF-003'),
  -- Seq 33: Mei-Ling + James Wong — Double @ Rosewood
  ('f0000053-0000-0000-0000-000000000053', 'a8888888-8888-8888-8888-888888888888', 33, 'double', 'D1', false, true, false, false, true, 'RW-CONF-002'),
  ('f0000054-0000-0000-0000-000000000054', 'a8888888-8888-8888-8888-888888888888', 33, 'double', 'D1', false, true, false, false, true, 'RW-CONF-002'),
  -- Seq 34: Anastasia Volkov — Single @ Ritz
  ('f0000055-0000-0000-0000-000000000055', 'a1111111-1111-1111-1111-111111111111', 34, 'single', 'S1', true, false, false, false, true, 'RC-CONF-011'),
  -- Seq 35: Emeka + Chioma + Chukwuemeka Nwosu — Triple @ Four Seasons
  ('f0000056-0000-0000-0000-000000000056', 'a2222222-2222-2222-2222-222222222222', 35, 'triple', 'TR1', false, false, false, true, true, 'FS-CONF-005'),
  ('f0000057-0000-0000-0000-000000000057', 'a2222222-2222-2222-2222-222222222222', 35, 'triple', 'TR1', false, false, false, true, true, 'FS-CONF-005'),
  ('f0000058-0000-0000-0000-000000000058', 'a2222222-2222-2222-2222-222222222222', 35, 'triple', 'TR1', false, false, false, true, true, 'FS-CONF-005'),
  -- Seq 36: Ingrid Johansson — Single @ Mandarin
  ('f0000059-0000-0000-0000-000000000059', 'a3333333-3333-3333-3333-333333333333', 36, 'single', 'S1', true, false, false, false, true, 'MO-CONF-005'),
  -- Seq 37: Kofi + Ama Mensah — Double @ Grand Hyatt
  ('f0000060-0000-0000-0000-000000000060', 'a4444444-4444-4444-4444-444444444444', 37, 'double', 'D1', false, true, false, false, true, 'GH-CONF-005'),
  ('f0000061-0000-0000-0000-000000000061', 'a4444444-4444-4444-4444-444444444444', 37, 'double', 'D1', false, true, false, false, true, 'GH-CONF-005'),
  -- Seq 38: Dmitri Ivanov — Single @ Peninsula
  ('f0000062-0000-0000-0000-000000000062', 'a5555555-5555-5555-5555-555555555555', 38, 'single', 'S1', true, false, false, false, true, 'PN-CONF-004'),
  -- Seq 39: Adaeze + Chinedu Ibe — Double @ Shangri-La
  ('f0000063-0000-0000-0000-000000000063', 'a6666666-6666-6666-6666-666666666666', 39, 'double', 'D1', false, true, false, false, true, 'SL-CONF-004'),
  ('f0000064-0000-0000-0000-000000000064', 'a6666666-6666-6666-6666-666666666666', 39, 'double', 'D1', false, true, false, false, true, 'SL-CONF-004'),
  -- Seq 40: Maria + Ana Santos — Twin @ Waldorf
  ('f0000065-0000-0000-0000-000000000065', 'a7777777-7777-7777-7777-777777777777', 40, 'twin', 'T1', false, false, true, false, true, 'WA-CONF-004'),
  ('f0000066-0000-0000-0000-000000000066', 'a7777777-7777-7777-7777-777777777777', 40, 'twin', 'T1', false, false, true, false, true, 'WA-CONF-004'),
  -- Seq 41: Abdullahi Bello — Single @ Ritz
  ('f0000067-0000-0000-0000-000000000067', 'a1111111-1111-1111-1111-111111111111', 41, 'single', 'S1', true, false, false, false, true, 'RC-CONF-012'),
  -- Seq 42: Lina + Duc Nguyen — Double @ Four Seasons
  ('f0000068-0000-0000-0000-000000000068', 'a2222222-2222-2222-2222-222222222222', 42, 'double', 'D1', false, true, false, false, true, 'FS-CONF-006'),
  ('f0000069-0000-0000-0000-000000000069', 'a2222222-2222-2222-2222-222222222222', 42, 'double', 'D1', false, true, false, false, true, 'FS-CONF-006'),
  -- Seq 43: Patrick O'Brien — Single @ Mandarin
  ('f0000070-0000-0000-0000-000000000070', 'a3333333-3333-3333-3333-333333333333', 43, 'single', 'S1', true, false, false, false, true, 'MO-CONF-006'),
  -- Seq 44: Ayumi + Ryo Sato — Double @ Grand Hyatt
  ('f0000071-0000-0000-0000-000000000071', 'a4444444-4444-4444-4444-444444444444', 44, 'double', 'D1', false, true, false, false, true, 'GH-CONF-006'),
  ('f0000072-0000-0000-0000-000000000072', 'a4444444-4444-4444-4444-444444444444', 44, 'double', 'D1', false, true, false, false, true, 'GH-CONF-006'),
  -- Seq 45: Funke Adebayo — Single @ Ritz
  ('f0000073-0000-0000-0000-000000000073', 'a1111111-1111-1111-1111-111111111111', 45, 'single', 'S1', true, false, false, false, true, 'RC-CONF-013'),
  -- Seq 46: Ali + Zeynep Demir — Double @ Ritz
  ('f0000074-0000-0000-0000-000000000074', 'a1111111-1111-1111-1111-111111111111', 46, 'double', 'D1', false, true, false, false, true, 'RC-CONF-014'),
  ('f0000075-0000-0000-0000-000000000075', 'a1111111-1111-1111-1111-111111111111', 46, 'double', 'D1', false, true, false, false, true, 'RC-CONF-014'),
  -- Seq 47: Samuel Osei — Single @ Four Seasons
  ('f0000076-0000-0000-0000-000000000076', 'a2222222-2222-2222-2222-222222222222', 47, 'single', 'S1', true, false, false, false, true, 'FS-CONF-007'),
  -- Seq 48: Lucia + Mateo Fernandez — Double @ Mandarin
  ('f0000077-0000-0000-0000-000000000077', 'a3333333-3333-3333-3333-333333333333', 48, 'double', 'D1', false, true, false, false, true, 'MO-CONF-007'),
  ('f0000078-0000-0000-0000-000000000078', 'a3333333-3333-3333-3333-333333333333', 48, 'double', 'D1', false, true, false, false, true, 'MO-CONF-007'),
  -- Seq 49: Blessing Eze — Single @ Grand Hyatt
  ('f0000079-0000-0000-0000-000000000079', 'a4444444-4444-4444-4444-444444444444', 49, 'single', 'S1', true, false, false, false, true, 'GH-CONF-007'),
  -- Seq 50: Tariq + Zara Al-Farsi — Double @ Peninsula
  ('f0000080-0000-0000-0000-000000000080', 'a5555555-5555-5555-5555-555555555555', 50, 'double', 'D1', false, true, false, false, true, 'PN-CONF-005'),
  ('f0000081-0000-0000-0000-000000000081', 'a5555555-5555-5555-5555-555555555555', 50, 'double', 'D1', false, true, false, false, true, 'PN-CONF-005'),
  -- Seq 51: Yong Kim — Single @ Shangri-La
  ('f0000082-0000-0000-0000-000000000082', 'a6666666-6666-6666-6666-666666666666', 51, 'single', 'S1', true, false, false, false, true, 'SL-CONF-005'),
  -- Seq 52: Chiamaka + Obinna Obi — Double @ Waldorf
  ('f0000083-0000-0000-0000-000000000083', 'a7777777-7777-7777-7777-777777777777', 52, 'double', 'D1', false, true, false, false, true, 'WA-CONF-005'),
  ('f0000084-0000-0000-0000-000000000084', 'a7777777-7777-7777-7777-777777777777', 52, 'double', 'D1', false, true, false, false, true, 'WA-CONF-005'),
  -- Seq 53: Haruki Watanabe — Single @ Rosewood
  ('f0000085-0000-0000-0000-000000000085', 'a8888888-8888-8888-8888-888888888888', 53, 'single', 'S1', true, false, false, false, true, 'RW-CONF-003'),
  -- Seq 54: Ngozi + Nneka Achebe — Twin @ Ritz
  ('f0000086-0000-0000-0000-000000000086', 'a1111111-1111-1111-1111-111111111111', 54, 'twin', 'T1', false, false, true, false, true, 'RC-CONF-015'),
  ('f0000087-0000-0000-0000-000000000087', 'a1111111-1111-1111-1111-111111111111', 54, 'twin', 'T1', false, false, true, false, true, 'RC-CONF-015'),
  -- Seq 55: Henrik Larsen — Single @ Four Seasons
  ('f0000088-0000-0000-0000-000000000088', 'a2222222-2222-2222-2222-222222222222', 55, 'single', 'S1', true, false, false, false, true, 'FS-CONF-008'),
  -- Seq 56: Amina + Moussa Diallo — Double @ Mandarin
  ('f0000089-0000-0000-0000-000000000089', 'a3333333-3333-3333-3333-333333333333', 56, 'double', 'D1', false, true, false, false, true, 'MO-CONF-008'),
  ('f0000090-0000-0000-0000-000000000090', 'a3333333-3333-3333-3333-333333333333', 56, 'double', 'D1', false, true, false, false, true, 'MO-CONF-008'),
  -- Seq 57: Oladipo + Tayo Afolabi — Twin @ Grand Hyatt
  ('f0000091-0000-0000-0000-000000000091', 'a4444444-4444-4444-4444-444444444444', 57, 'twin', 'T1', false, false, true, false, true, 'GH-CONF-008'),
  ('f0000092-0000-0000-0000-000000000092', 'a4444444-4444-4444-4444-444444444444', 57, 'twin', 'T1', false, false, true, false, true, 'GH-CONF-008'),
  -- Seq 58: Sakura Ito — Single @ Peninsula
  ('f0000093-0000-0000-0000-000000000093', 'a5555555-5555-5555-5555-555555555555', 58, 'single', 'S1', true, false, false, false, true, 'PN-CONF-006'),
  -- Seq 59: Michael + Joy + Daniel + Emmanuel Oduya — Triple @ Shangri-La
  ('f0000094-0000-0000-0000-000000000094', 'a6666666-6666-6666-6666-666666666666', 59, 'triple', 'TR1', false, false, false, true, true, 'SL-CONF-006'),
  ('f0000095-0000-0000-0000-000000000095', 'a6666666-6666-6666-6666-666666666666', 59, 'triple', 'TR1', false, false, false, true, true, 'SL-CONF-006'),
  ('f0000096-0000-0000-0000-000000000096', 'a6666666-6666-6666-6666-666666666666', 59, 'triple', 'TR1', false, false, false, true, true, 'SL-CONF-006'),
  ('f0000100-0000-0000-0000-000000000100', 'a6666666-6666-6666-6666-666666666666', 59, 'triple', 'TR1', false, false, false, true, true, 'SL-CONF-006'),
  -- Seq 60: Yusuf Ibrahim — Single @ Rosewood
  ('f0000097-0000-0000-0000-000000000097', 'a8888888-8888-8888-8888-888888888888', 60, 'single', 'S1', true, false, false, false, true, 'RW-CONF-004'),
  -- Seq 61: Soo-Jin + Jae-Won Lee — Double @ Ritz
  ('f0000098-0000-0000-0000-000000000098', 'a1111111-1111-1111-1111-111111111111', 61, 'double', 'D1', false, true, false, false, true, 'RC-CONF-016'),
  ('f0000099-0000-0000-0000-000000000099', 'a1111111-1111-1111-1111-111111111111', 61, 'double', 'D1', false, true, false, false, true, 'RC-CONF-016');


-- ============================================================
-- Traveler-Flight assignments for new travelers (arrival)
-- Distributed across all 15 arrival flights
-- ============================================================
INSERT INTO traveler_flights (traveler_id, flight_id, direction, flight_submitted, submit_option) VALUES
  ('f0000014-0000-0000-0000-000000000014', 'f1000001-0000-0000-0000-000000000001', 'arrival', true, 'Invitee'),
  ('f0000015-0000-0000-0000-000000000015', 'f1000001-0000-0000-0000-000000000001', 'arrival', true, 'Invitee'),
  ('f0000016-0000-0000-0000-000000000016', 'f1000001-0000-0000-0000-000000000001', 'arrival', true, 'Same as Main Passenger'),
  ('f0000017-0000-0000-0000-000000000017', 'f1000012-0000-0000-0000-000000000012', 'arrival', true, 'Invitee'),
  ('f0000018-0000-0000-0000-000000000018', 'f1000013-0000-0000-0000-000000000013', 'arrival', true, 'Invitee'),
  ('f0000019-0000-0000-0000-000000000019', 'f1000013-0000-0000-0000-000000000013', 'arrival', true, 'Same as Main Passenger'),
  ('f0000020-0000-0000-0000-000000000020', 'f1000015-0000-0000-0000-000000000015', 'arrival', true, 'Invitee'),
  ('f0000021-0000-0000-0000-000000000021', 'f1000010-0000-0000-0000-000000000010', 'arrival', true, 'Invitee'),
  ('f0000022-0000-0000-0000-000000000022', 'f1000010-0000-0000-0000-000000000010', 'arrival', true, 'Same as Main Passenger'),
  ('f0000023-0000-0000-0000-000000000023', 'f1000002-0000-0000-0000-000000000002', 'arrival', true, 'Invitee'),
  ('f0000024-0000-0000-0000-000000000024', 'f1000012-0000-0000-0000-000000000012', 'arrival', true, 'Invitee'),
  ('f0000025-0000-0000-0000-000000000025', 'f1000012-0000-0000-0000-000000000012', 'arrival', true, 'Same as Main Passenger'),
  ('f0000026-0000-0000-0000-000000000026', 'f1000014-0000-0000-0000-000000000014', 'arrival', true, 'Invitee'),
  ('f0000027-0000-0000-0000-000000000027', 'f1000013-0000-0000-0000-000000000013', 'arrival', true, 'Invitee'),
  ('f0000028-0000-0000-0000-000000000028', 'f1000013-0000-0000-0000-000000000013', 'arrival', true, 'Same as Main Passenger'),
  ('f0000029-0000-0000-0000-000000000029', 'f1000004-0000-0000-0000-000000000004', 'arrival', true, 'Invitee'),
  ('f0000030-0000-0000-0000-000000000030', 'f1000003-0000-0000-0000-000000000003', 'arrival', true, 'Invitee'),
  ('f0000031-0000-0000-0000-000000000031', 'f1000003-0000-0000-0000-000000000003', 'arrival', true, 'Same as Main Passenger'),
  ('f0000032-0000-0000-0000-000000000032', 'f1000001-0000-0000-0000-000000000001', 'arrival', true, 'Invitee'),
  ('f0000033-0000-0000-0000-000000000033', 'f1000005-0000-0000-0000-000000000005', 'arrival', true, 'Invitee'),
  ('f0000034-0000-0000-0000-000000000034', 'f1000005-0000-0000-0000-000000000005', 'arrival', true, 'Same as Main Passenger'),
  ('f0000035-0000-0000-0000-000000000035', 'f1000001-0000-0000-0000-000000000001', 'arrival', true, 'Invitee'),
  ('f0000036-0000-0000-0000-000000000036', 'f1000001-0000-0000-0000-000000000001', 'arrival', true, 'Same as Main Passenger'),
  ('f0000037-0000-0000-0000-000000000037', 'f1000008-0000-0000-0000-000000000008', 'arrival', true, 'Invitee'),
  ('f0000038-0000-0000-0000-000000000038', 'f1000011-0000-0000-0000-000000000011', 'arrival', true, 'Invitee'),
  ('f0000039-0000-0000-0000-000000000039', 'f1000011-0000-0000-0000-000000000011', 'arrival', true, 'Same as Main Passenger'),
  ('f0000040-0000-0000-0000-000000000040', 'f1000012-0000-0000-0000-000000000012', 'arrival', true, 'Invitee'),
  ('f0000041-0000-0000-0000-000000000041', 'f1000003-0000-0000-0000-000000000003', 'arrival', true, 'Invitee'),
  ('f0000042-0000-0000-0000-000000000042', 'f1000001-0000-0000-0000-000000000001', 'arrival', true, 'Invitee'),
  ('f0000043-0000-0000-0000-000000000043', 'f1000001-0000-0000-0000-000000000001', 'arrival', true, 'Same as Main Passenger'),
  ('f0000044-0000-0000-0000-000000000044', 'f1000015-0000-0000-0000-000000000015', 'arrival', true, 'Invitee'),
  ('f0000045-0000-0000-0000-000000000045', 'f1000001-0000-0000-0000-000000000001', 'arrival', true, 'Invitee'),
  ('f0000046-0000-0000-0000-000000000046', 'f1000001-0000-0000-0000-000000000001', 'arrival', true, 'Same as Main Passenger'),
  ('f0000047-0000-0000-0000-000000000047', 'f1000007-0000-0000-0000-000000000007', 'arrival', true, 'Invitee'),
  ('f0000048-0000-0000-0000-000000000048', 'f1000010-0000-0000-0000-000000000010', 'arrival', true, 'Invitee'),
  ('f0000049-0000-0000-0000-000000000049', 'f1000010-0000-0000-0000-000000000010', 'arrival', true, 'Same as Main Passenger'),
  ('f0000050-0000-0000-0000-000000000050', 'f1000009-0000-0000-0000-000000000009', 'arrival', true, 'Invitee'),
  ('f0000051-0000-0000-0000-000000000051', 'f1000009-0000-0000-0000-000000000009', 'arrival', true, 'Same as Main Passenger'),
  ('f0000052-0000-0000-0000-000000000052', 'f1000001-0000-0000-0000-000000000001', 'arrival', true, 'Invitee'),
  ('f0000053-0000-0000-0000-000000000053', 'f1000010-0000-0000-0000-000000000010', 'arrival', true, 'Invitee'),
  ('f0000054-0000-0000-0000-000000000054', 'f1000010-0000-0000-0000-000000000010', 'arrival', true, 'Same as Main Passenger'),
  ('f0000055-0000-0000-0000-000000000055', 'f1000014-0000-0000-0000-000000000014', 'arrival', true, 'Invitee'),
  ('f0000056-0000-0000-0000-000000000056', 'f1000001-0000-0000-0000-000000000001', 'arrival', true, 'Invitee'),
  ('f0000057-0000-0000-0000-000000000057', 'f1000001-0000-0000-0000-000000000001', 'arrival', true, 'Same as Main Passenger'),
  ('f0000058-0000-0000-0000-000000000058', 'f1000001-0000-0000-0000-000000000001', 'arrival', true, 'Same as Main Passenger'),
  ('f0000059-0000-0000-0000-000000000059', 'f1000015-0000-0000-0000-000000000015', 'arrival', true, 'Invitee'),
  ('f0000060-0000-0000-0000-000000000060', 'f1000001-0000-0000-0000-000000000001', 'arrival', true, 'Invitee'),
  ('f0000061-0000-0000-0000-000000000061', 'f1000001-0000-0000-0000-000000000001', 'arrival', true, 'Same as Main Passenger'),
  ('f0000062-0000-0000-0000-000000000062', 'f1000014-0000-0000-0000-000000000014', 'arrival', true, 'Invitee'),
  ('f0000063-0000-0000-0000-000000000063', 'f1000001-0000-0000-0000-000000000001', 'arrival', true, 'Invitee'),
  ('f0000064-0000-0000-0000-000000000064', 'f1000001-0000-0000-0000-000000000001', 'arrival', true, 'Same as Main Passenger'),
  ('f0000065-0000-0000-0000-000000000065', 'f1000006-0000-0000-0000-000000000006', 'arrival', true, 'Invitee'),
  ('f0000066-0000-0000-0000-000000000066', 'f1000006-0000-0000-0000-000000000006', 'arrival', true, 'Same as Main Passenger'),
  ('f0000067-0000-0000-0000-000000000067', 'f1000001-0000-0000-0000-000000000001', 'arrival', true, 'Invitee'),
  ('f0000068-0000-0000-0000-000000000068', 'f1000011-0000-0000-0000-000000000011', 'arrival', true, 'Invitee'),
  ('f0000069-0000-0000-0000-000000000069', 'f1000011-0000-0000-0000-000000000011', 'arrival', true, 'Same as Main Passenger'),
  ('f0000070-0000-0000-0000-000000000070', 'f1000007-0000-0000-0000-000000000007', 'arrival', true, 'Invitee'),
  ('f0000071-0000-0000-0000-000000000071', 'f1000012-0000-0000-0000-000000000012', 'arrival', true, 'Invitee'),
  ('f0000072-0000-0000-0000-000000000072', 'f1000012-0000-0000-0000-000000000012', 'arrival', true, 'Same as Main Passenger'),
  ('f0000073-0000-0000-0000-000000000073', 'f1000001-0000-0000-0000-000000000001', 'arrival', true, 'Invitee'),
  ('f0000074-0000-0000-0000-000000000074', 'f1000014-0000-0000-0000-000000000014', 'arrival', true, 'Invitee'),
  ('f0000075-0000-0000-0000-000000000075', 'f1000014-0000-0000-0000-000000000014', 'arrival', true, 'Same as Main Passenger'),
  ('f0000076-0000-0000-0000-000000000076', 'f1000001-0000-0000-0000-000000000001', 'arrival', true, 'Invitee'),
  ('f0000077-0000-0000-0000-000000000077', 'f1000006-0000-0000-0000-000000000006', 'arrival', true, 'Invitee'),
  ('f0000078-0000-0000-0000-000000000078', 'f1000006-0000-0000-0000-000000000006', 'arrival', true, 'Same as Main Passenger'),
  ('f0000079-0000-0000-0000-000000000079', 'f1000001-0000-0000-0000-000000000001', 'arrival', true, 'Invitee'),
  ('f0000080-0000-0000-0000-000000000080', 'f1000013-0000-0000-0000-000000000013', 'arrival', true, 'Invitee'),
  ('f0000081-0000-0000-0000-000000000081', 'f1000013-0000-0000-0000-000000000013', 'arrival', true, 'Same as Main Passenger'),
  ('f0000082-0000-0000-0000-000000000082', 'f1000008-0000-0000-0000-000000000008', 'arrival', true, 'Invitee'),
  ('f0000083-0000-0000-0000-000000000083', 'f1000001-0000-0000-0000-000000000001', 'arrival', true, 'Invitee'),
  ('f0000084-0000-0000-0000-000000000084', 'f1000001-0000-0000-0000-000000000001', 'arrival', true, 'Same as Main Passenger'),
  ('f0000085-0000-0000-0000-000000000085', 'f1000012-0000-0000-0000-000000000012', 'arrival', true, 'Invitee'),
  ('f0000086-0000-0000-0000-000000000086', 'f1000001-0000-0000-0000-000000000001', 'arrival', true, 'Invitee'),
  ('f0000087-0000-0000-0000-000000000087', 'f1000001-0000-0000-0000-000000000001', 'arrival', true, 'Same as Main Passenger'),
  ('f0000088-0000-0000-0000-000000000088', 'f1000015-0000-0000-0000-000000000015', 'arrival', true, 'Invitee'),
  ('f0000089-0000-0000-0000-000000000089', 'f1000003-0000-0000-0000-000000000003', 'arrival', true, 'Invitee'),
  ('f0000090-0000-0000-0000-000000000090', 'f1000003-0000-0000-0000-000000000003', 'arrival', true, 'Same as Main Passenger'),
  ('f0000091-0000-0000-0000-000000000091', 'f1000001-0000-0000-0000-000000000001', 'arrival', true, 'Invitee'),
  ('f0000092-0000-0000-0000-000000000092', 'f1000001-0000-0000-0000-000000000001', 'arrival', true, 'Same as Main Passenger'),
  ('f0000093-0000-0000-0000-000000000093', 'f1000012-0000-0000-0000-000000000012', 'arrival', true, 'Invitee'),
  ('f0000094-0000-0000-0000-000000000094', 'f1000001-0000-0000-0000-000000000001', 'arrival', true, 'Invitee'),
  ('f0000095-0000-0000-0000-000000000095', 'f1000001-0000-0000-0000-000000000001', 'arrival', true, 'Same as Main Passenger'),
  ('f0000096-0000-0000-0000-000000000096', 'f1000001-0000-0000-0000-000000000001', 'arrival', true, 'Same as Main Passenger'),
  ('f0000097-0000-0000-0000-000000000097', 'f1000001-0000-0000-0000-000000000001', 'arrival', true, 'Invitee'),
  ('f0000098-0000-0000-0000-000000000098', 'f1000008-0000-0000-0000-000000000008', 'arrival', true, 'Invitee'),
  ('f0000099-0000-0000-0000-000000000099', 'f1000008-0000-0000-0000-000000000008', 'arrival', true, 'Same as Main Passenger'),
  ('f0000100-0000-0000-0000-000000000100', 'f1000001-0000-0000-0000-000000000001', 'arrival', true, 'Same as Main Passenger');


-- Traveler-Flight assignments for new travelers (departure)
INSERT INTO traveler_flights (traveler_id, flight_id, direction, flight_submitted, submit_option) VALUES
  ('f0000014-0000-0000-0000-000000000014', 'f2100001-0000-0000-0000-000000000001', 'departure', true, 'Invitee'),
  ('f0000015-0000-0000-0000-000000000015', 'f2100001-0000-0000-0000-000000000001', 'departure', true, 'Invitee'),
  ('f0000016-0000-0000-0000-000000000016', 'f2100001-0000-0000-0000-000000000001', 'departure', true, 'Same as Main Passenger'),
  ('f0000017-0000-0000-0000-000000000017', 'f2100012-0000-0000-0000-000000000012', 'departure', true, 'Invitee'),
  ('f0000018-0000-0000-0000-000000000018', 'f2100013-0000-0000-0000-000000000013', 'departure', true, 'Invitee'),
  ('f0000019-0000-0000-0000-000000000019', 'f2100013-0000-0000-0000-000000000013', 'departure', true, 'Same as Main Passenger'),
  ('f0000020-0000-0000-0000-000000000020', 'f2100015-0000-0000-0000-000000000015', 'departure', true, 'Invitee'),
  ('f0000021-0000-0000-0000-000000000021', 'f2100010-0000-0000-0000-000000000010', 'departure', true, 'Invitee'),
  ('f0000022-0000-0000-0000-000000000022', 'f2100010-0000-0000-0000-000000000010', 'departure', true, 'Same as Main Passenger'),
  ('f0000023-0000-0000-0000-000000000023', 'f2100002-0000-0000-0000-000000000002', 'departure', true, 'Invitee'),
  ('f0000024-0000-0000-0000-000000000024', 'f2100012-0000-0000-0000-000000000012', 'departure', true, 'Invitee'),
  ('f0000025-0000-0000-0000-000000000025', 'f2100012-0000-0000-0000-000000000012', 'departure', true, 'Same as Main Passenger'),
  ('f0000026-0000-0000-0000-000000000026', 'f2100014-0000-0000-0000-000000000014', 'departure', true, 'Invitee'),
  ('f0000027-0000-0000-0000-000000000027', 'f2100013-0000-0000-0000-000000000013', 'departure', true, 'Invitee'),
  ('f0000028-0000-0000-0000-000000000028', 'f2100013-0000-0000-0000-000000000013', 'departure', true, 'Same as Main Passenger'),
  ('f0000029-0000-0000-0000-000000000029', 'f2100004-0000-0000-0000-000000000004', 'departure', true, 'Invitee'),
  ('f0000030-0000-0000-0000-000000000030', 'f2100003-0000-0000-0000-000000000003', 'departure', true, 'Invitee'),
  ('f0000031-0000-0000-0000-000000000031', 'f2100003-0000-0000-0000-000000000003', 'departure', true, 'Same as Main Passenger'),
  ('f0000032-0000-0000-0000-000000000032', 'f2100001-0000-0000-0000-000000000001', 'departure', true, 'Invitee'),
  ('f0000033-0000-0000-0000-000000000033', 'f2100006-0000-0000-0000-000000000006', 'departure', true, 'Invitee'),
  ('f0000034-0000-0000-0000-000000000034', 'f2100006-0000-0000-0000-000000000006', 'departure', true, 'Same as Main Passenger'),
  ('f0000035-0000-0000-0000-000000000035', 'f2100001-0000-0000-0000-000000000001', 'departure', true, 'Invitee'),
  ('f0000036-0000-0000-0000-000000000036', 'f2100001-0000-0000-0000-000000000001', 'departure', true, 'Same as Main Passenger'),
  ('f0000037-0000-0000-0000-000000000037', 'f2100008-0000-0000-0000-000000000008', 'departure', true, 'Invitee'),
  ('f0000038-0000-0000-0000-000000000038', 'f2100011-0000-0000-0000-000000000011', 'departure', true, 'Invitee'),
  ('f0000039-0000-0000-0000-000000000039', 'f2100011-0000-0000-0000-000000000011', 'departure', true, 'Same as Main Passenger'),
  ('f0000040-0000-0000-0000-000000000040', 'f2100012-0000-0000-0000-000000000012', 'departure', true, 'Invitee'),
  ('f0000041-0000-0000-0000-000000000041', 'f2100003-0000-0000-0000-000000000003', 'departure', true, 'Invitee'),
  ('f0000042-0000-0000-0000-000000000042', 'f2100001-0000-0000-0000-000000000001', 'departure', true, 'Invitee'),
  ('f0000043-0000-0000-0000-000000000043', 'f2100001-0000-0000-0000-000000000001', 'departure', true, 'Same as Main Passenger'),
  ('f0000044-0000-0000-0000-000000000044', 'f2100015-0000-0000-0000-000000000015', 'departure', true, 'Invitee'),
  ('f0000045-0000-0000-0000-000000000045', 'f2100001-0000-0000-0000-000000000001', 'departure', true, 'Invitee'),
  ('f0000046-0000-0000-0000-000000000046', 'f2100001-0000-0000-0000-000000000001', 'departure', true, 'Same as Main Passenger'),
  ('f0000047-0000-0000-0000-000000000047', 'f2100007-0000-0000-0000-000000000007', 'departure', true, 'Invitee'),
  ('f0000048-0000-0000-0000-000000000048', 'f2100010-0000-0000-0000-000000000010', 'departure', true, 'Invitee'),
  ('f0000049-0000-0000-0000-000000000049', 'f2100010-0000-0000-0000-000000000010', 'departure', true, 'Same as Main Passenger'),
  ('f0000050-0000-0000-0000-000000000050', 'f2100009-0000-0000-0000-000000000009', 'departure', true, 'Invitee'),
  ('f0000051-0000-0000-0000-000000000051', 'f2100009-0000-0000-0000-000000000009', 'departure', true, 'Same as Main Passenger'),
  ('f0000052-0000-0000-0000-000000000052', 'f2100001-0000-0000-0000-000000000001', 'departure', true, 'Invitee'),
  ('f0000053-0000-0000-0000-000000000053', 'f2100010-0000-0000-0000-000000000010', 'departure', true, 'Invitee'),
  ('f0000054-0000-0000-0000-000000000054', 'f2100010-0000-0000-0000-000000000010', 'departure', true, 'Same as Main Passenger'),
  ('f0000055-0000-0000-0000-000000000055', 'f2100014-0000-0000-0000-000000000014', 'departure', true, 'Invitee'),
  ('f0000056-0000-0000-0000-000000000056', 'f2100001-0000-0000-0000-000000000001', 'departure', true, 'Invitee'),
  ('f0000057-0000-0000-0000-000000000057', 'f2100001-0000-0000-0000-000000000001', 'departure', true, 'Same as Main Passenger'),
  ('f0000058-0000-0000-0000-000000000058', 'f2100001-0000-0000-0000-000000000001', 'departure', true, 'Same as Main Passenger'),
  ('f0000059-0000-0000-0000-000000000059', 'f2100015-0000-0000-0000-000000000015', 'departure', true, 'Invitee'),
  ('f0000060-0000-0000-0000-000000000060', 'f2100001-0000-0000-0000-000000000001', 'departure', true, 'Invitee'),
  ('f0000061-0000-0000-0000-000000000061', 'f2100001-0000-0000-0000-000000000001', 'departure', true, 'Same as Main Passenger'),
  ('f0000062-0000-0000-0000-000000000062', 'f2100014-0000-0000-0000-000000000014', 'departure', true, 'Invitee'),
  ('f0000063-0000-0000-0000-000000000063', 'f2100001-0000-0000-0000-000000000001', 'departure', true, 'Invitee'),
  ('f0000064-0000-0000-0000-000000000064', 'f2100001-0000-0000-0000-000000000001', 'departure', true, 'Same as Main Passenger'),
  ('f0000065-0000-0000-0000-000000000065', 'f2100006-0000-0000-0000-000000000006', 'departure', true, 'Invitee'),
  ('f0000066-0000-0000-0000-000000000066', 'f2100006-0000-0000-0000-000000000006', 'departure', true, 'Same as Main Passenger'),
  ('f0000067-0000-0000-0000-000000000067', 'f2100001-0000-0000-0000-000000000001', 'departure', true, 'Invitee'),
  ('f0000068-0000-0000-0000-000000000068', 'f2100011-0000-0000-0000-000000000011', 'departure', true, 'Invitee'),
  ('f0000069-0000-0000-0000-000000000069', 'f2100011-0000-0000-0000-000000000011', 'departure', true, 'Same as Main Passenger'),
  ('f0000070-0000-0000-0000-000000000070', 'f2100007-0000-0000-0000-000000000007', 'departure', true, 'Invitee'),
  ('f0000071-0000-0000-0000-000000000071', 'f2100012-0000-0000-0000-000000000012', 'departure', true, 'Invitee'),
  ('f0000072-0000-0000-0000-000000000072', 'f2100012-0000-0000-0000-000000000012', 'departure', true, 'Same as Main Passenger'),
  ('f0000073-0000-0000-0000-000000000073', 'f2100001-0000-0000-0000-000000000001', 'departure', true, 'Invitee'),
  ('f0000074-0000-0000-0000-000000000074', 'f2100014-0000-0000-0000-000000000014', 'departure', true, 'Invitee'),
  ('f0000075-0000-0000-0000-000000000075', 'f2100014-0000-0000-0000-000000000014', 'departure', true, 'Same as Main Passenger'),
  ('f0000076-0000-0000-0000-000000000076', 'f2100001-0000-0000-0000-000000000001', 'departure', true, 'Invitee'),
  ('f0000077-0000-0000-0000-000000000077', 'f2100006-0000-0000-0000-000000000006', 'departure', true, 'Invitee'),
  ('f0000078-0000-0000-0000-000000000078', 'f2100006-0000-0000-0000-000000000006', 'departure', true, 'Same as Main Passenger'),
  ('f0000079-0000-0000-0000-000000000079', 'f2100001-0000-0000-0000-000000000001', 'departure', true, 'Invitee'),
  ('f0000080-0000-0000-0000-000000000080', 'f2100013-0000-0000-0000-000000000013', 'departure', true, 'Invitee'),
  ('f0000081-0000-0000-0000-000000000081', 'f2100013-0000-0000-0000-000000000013', 'departure', true, 'Same as Main Passenger'),
  ('f0000082-0000-0000-0000-000000000082', 'f2100008-0000-0000-0000-000000000008', 'departure', true, 'Invitee'),
  ('f0000083-0000-0000-0000-000000000083', 'f2100001-0000-0000-0000-000000000001', 'departure', true, 'Invitee'),
  ('f0000084-0000-0000-0000-000000000084', 'f2100001-0000-0000-0000-000000000001', 'departure', true, 'Same as Main Passenger'),
  ('f0000085-0000-0000-0000-000000000085', 'f2100012-0000-0000-0000-000000000012', 'departure', true, 'Invitee'),
  ('f0000086-0000-0000-0000-000000000086', 'f2100001-0000-0000-0000-000000000001', 'departure', true, 'Invitee'),
  ('f0000087-0000-0000-0000-000000000087', 'f2100001-0000-0000-0000-000000000001', 'departure', true, 'Same as Main Passenger'),
  ('f0000088-0000-0000-0000-000000000088', 'f2100015-0000-0000-0000-000000000015', 'departure', true, 'Invitee'),
  ('f0000089-0000-0000-0000-000000000089', 'f2100003-0000-0000-0000-000000000003', 'departure', true, 'Invitee'),
  ('f0000090-0000-0000-0000-000000000090', 'f2100003-0000-0000-0000-000000000003', 'departure', true, 'Same as Main Passenger'),
  ('f0000091-0000-0000-0000-000000000091', 'f2100001-0000-0000-0000-000000000001', 'departure', true, 'Invitee'),
  ('f0000092-0000-0000-0000-000000000092', 'f2100001-0000-0000-0000-000000000001', 'departure', true, 'Same as Main Passenger'),
  ('f0000093-0000-0000-0000-000000000093', 'f2100012-0000-0000-0000-000000000012', 'departure', true, 'Invitee'),
  ('f0000094-0000-0000-0000-000000000094', 'f2100001-0000-0000-0000-000000000001', 'departure', true, 'Invitee'),
  ('f0000095-0000-0000-0000-000000000095', 'f2100001-0000-0000-0000-000000000001', 'departure', true, 'Same as Main Passenger'),
  ('f0000096-0000-0000-0000-000000000096', 'f2100001-0000-0000-0000-000000000001', 'departure', true, 'Same as Main Passenger'),
  ('f0000097-0000-0000-0000-000000000097', 'f2100001-0000-0000-0000-000000000001', 'departure', true, 'Invitee'),
  ('f0000098-0000-0000-0000-000000000098', 'f2100008-0000-0000-0000-000000000008', 'departure', true, 'Invitee'),
  ('f0000099-0000-0000-0000-000000000099', 'f2100008-0000-0000-0000-000000000008', 'departure', true, 'Same as Main Passenger'),
  ('f0000100-0000-0000-0000-000000000100', 'f2100001-0000-0000-0000-000000000001', 'departure', true, 'Same as Main Passenger');

-- QR tokens for expanded travelers (014-100)
INSERT INTO qr_tokens (traveler_id, token_value, token_hash, is_active) VALUES
  ('f0000014-0000-0000-0000-0000000000014', 'QR-TRAVELER-014', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa14', true),
  ('f0000015-0000-0000-0000-0000000000015', 'QR-TRAVELER-015', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa15', true),
  ('f0000016-0000-0000-0000-0000000000016', 'QR-TRAVELER-016', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa16', true),
  ('f0000017-0000-0000-0000-0000000000017', 'QR-TRAVELER-017', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa17', true),
  ('f0000018-0000-0000-0000-0000000000018', 'QR-TRAVELER-018', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa18', true),
  ('f0000019-0000-0000-0000-0000000000019', 'QR-TRAVELER-019', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa19', true),
  ('f0000020-0000-0000-0000-0000000000020', 'QR-TRAVELER-020', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa2a', true),
  ('f0000021-0000-0000-0000-0000000000021', 'QR-TRAVELER-021', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa21', true),
  ('f0000022-0000-0000-0000-0000000000022', 'QR-TRAVELER-022', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa22', true),
  ('f0000023-0000-0000-0000-0000000000023', 'QR-TRAVELER-023', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa23', true),
  ('f0000024-0000-0000-0000-0000000000024', 'QR-TRAVELER-024', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa24', true),
  ('f0000025-0000-0000-0000-0000000000025', 'QR-TRAVELER-025', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa25', true),
  ('f0000026-0000-0000-0000-0000000000026', 'QR-TRAVELER-026', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa26', true),
  ('f0000027-0000-0000-0000-0000000000027', 'QR-TRAVELER-027', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa27', true),
  ('f0000028-0000-0000-0000-0000000000028', 'QR-TRAVELER-028', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa28', true),
  ('f0000029-0000-0000-0000-0000000000029', 'QR-TRAVELER-029', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa29', true),
  ('f0000030-0000-0000-0000-0000000000030', 'QR-TRAVELER-030', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa3a', true),
  ('f0000031-0000-0000-0000-0000000000031', 'QR-TRAVELER-031', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa31', true),
  ('f0000032-0000-0000-0000-0000000000032', 'QR-TRAVELER-032', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa32', true),
  ('f0000033-0000-0000-0000-0000000000033', 'QR-TRAVELER-033', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa33', true),
  ('f0000034-0000-0000-0000-0000000000034', 'QR-TRAVELER-034', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa34', true),
  ('f0000035-0000-0000-0000-0000000000035', 'QR-TRAVELER-035', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa35', true),
  ('f0000036-0000-0000-0000-0000000000036', 'QR-TRAVELER-036', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa36', true),
  ('f0000037-0000-0000-0000-0000000000037', 'QR-TRAVELER-037', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa37', true),
  ('f0000038-0000-0000-0000-0000000000038', 'QR-TRAVELER-038', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa38', true),
  ('f0000039-0000-0000-0000-0000000000039', 'QR-TRAVELER-039', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa39', true),
  ('f0000040-0000-0000-0000-0000000000040', 'QR-TRAVELER-040', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa4a', true),
  ('f0000041-0000-0000-0000-0000000000041', 'QR-TRAVELER-041', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa41', true),
  ('f0000042-0000-0000-0000-0000000000042', 'QR-TRAVELER-042', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa42', true),
  ('f0000043-0000-0000-0000-0000000000043', 'QR-TRAVELER-043', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa43', true),
  ('f0000044-0000-0000-0000-0000000000044', 'QR-TRAVELER-044', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa44', true),
  ('f0000045-0000-0000-0000-0000000000045', 'QR-TRAVELER-045', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa45', true),
  ('f0000046-0000-0000-0000-0000000000046', 'QR-TRAVELER-046', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa46', true),
  ('f0000047-0000-0000-0000-0000000000047', 'QR-TRAVELER-047', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa47', true),
  ('f0000048-0000-0000-0000-0000000000048', 'QR-TRAVELER-048', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa48', true),
  ('f0000049-0000-0000-0000-0000000000049', 'QR-TRAVELER-049', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa49', true),
  ('f0000050-0000-0000-0000-0000000000050', 'QR-TRAVELER-050', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa5a', true),
  ('f0000051-0000-0000-0000-0000000000051', 'QR-TRAVELER-051', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa51', true),
  ('f0000052-0000-0000-0000-0000000000052', 'QR-TRAVELER-052', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa52', true),
  ('f0000053-0000-0000-0000-0000000000053', 'QR-TRAVELER-053', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa53', true),
  ('f0000054-0000-0000-0000-0000000000054', 'QR-TRAVELER-054', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa54', true),
  ('f0000055-0000-0000-0000-0000000000055', 'QR-TRAVELER-055', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa55', true),
  ('f0000056-0000-0000-0000-0000000000056', 'QR-TRAVELER-056', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa56', true),
  ('f0000057-0000-0000-0000-0000000000057', 'QR-TRAVELER-057', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa57', true),
  ('f0000058-0000-0000-0000-0000000000058', 'QR-TRAVELER-058', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa58', true),
  ('f0000059-0000-0000-0000-0000000000059', 'QR-TRAVELER-059', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa59', true),
  ('f0000060-0000-0000-0000-0000000000060', 'QR-TRAVELER-060', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa6a', true),
  ('f0000061-0000-0000-0000-0000000000061', 'QR-TRAVELER-061', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa61', true),
  ('f0000062-0000-0000-0000-0000000000062', 'QR-TRAVELER-062', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa62', true),
  ('f0000063-0000-0000-0000-0000000000063', 'QR-TRAVELER-063', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa63', true),
  ('f0000064-0000-0000-0000-0000000000064', 'QR-TRAVELER-064', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa64', true),
  ('f0000065-0000-0000-0000-0000000000065', 'QR-TRAVELER-065', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa65', true),
  ('f0000066-0000-0000-0000-0000000000066', 'QR-TRAVELER-066', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa66', true),
  ('f0000067-0000-0000-0000-0000000000067', 'QR-TRAVELER-067', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa67', true),
  ('f0000068-0000-0000-0000-0000000000068', 'QR-TRAVELER-068', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa68', true),
  ('f0000069-0000-0000-0000-0000000000069', 'QR-TRAVELER-069', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa69', true),
  ('f0000070-0000-0000-0000-0000000000070', 'QR-TRAVELER-070', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa7a', true),
  ('f0000071-0000-0000-0000-0000000000071', 'QR-TRAVELER-071', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa71', true),
  ('f0000072-0000-0000-0000-0000000000072', 'QR-TRAVELER-072', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa72', true),
  ('f0000073-0000-0000-0000-0000000000073', 'QR-TRAVELER-073', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa73', true),
  ('f0000074-0000-0000-0000-0000000000074', 'QR-TRAVELER-074', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa74', true),
  ('f0000075-0000-0000-0000-0000000000075', 'QR-TRAVELER-075', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa75', true),
  ('f0000076-0000-0000-0000-0000000000076', 'QR-TRAVELER-076', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa76', true),
  ('f0000077-0000-0000-0000-0000000000077', 'QR-TRAVELER-077', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa77', true),
  ('f0000078-0000-0000-0000-0000000000078', 'QR-TRAVELER-078', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa78', true),
  ('f0000079-0000-0000-0000-0000000000079', 'QR-TRAVELER-079', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa79', true),
  ('f0000080-0000-0000-0000-0000000000080', 'QR-TRAVELER-080', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa8a', true),
  ('f0000081-0000-0000-0000-0000000000081', 'QR-TRAVELER-081', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa81', true),
  ('f0000082-0000-0000-0000-0000000000082', 'QR-TRAVELER-082', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa82', true),
  ('f0000083-0000-0000-0000-0000000000083', 'QR-TRAVELER-083', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa83', true),
  ('f0000084-0000-0000-0000-0000000000084', 'QR-TRAVELER-084', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa84', true),
  ('f0000085-0000-0000-0000-0000000000085', 'QR-TRAVELER-085', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa85', true),
  ('f0000086-0000-0000-0000-0000000000086', 'QR-TRAVELER-086', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa86', true),
  ('f0000087-0000-0000-0000-0000000000087', 'QR-TRAVELER-087', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa87', true),
  ('f0000088-0000-0000-0000-0000000000088', 'QR-TRAVELER-088', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa88', true),
  ('f0000089-0000-0000-0000-0000000000089', 'QR-TRAVELER-089', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa89', true),
  ('f0000090-0000-0000-0000-0000000000090', 'QR-TRAVELER-090', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa9a', true),
  ('f0000091-0000-0000-0000-0000000000091', 'QR-TRAVELER-091', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa91', true),
  ('f0000092-0000-0000-0000-0000000000092', 'QR-TRAVELER-092', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa92', true),
  ('f0000093-0000-0000-0000-0000000000093', 'QR-TRAVELER-093', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa93', true),
  ('f0000094-0000-0000-0000-0000000000094', 'QR-TRAVELER-094', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa94', true),
  ('f0000095-0000-0000-0000-0000000000095', 'QR-TRAVELER-095', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa95', true),
  ('f0000096-0000-0000-0000-0000000000096', 'QR-TRAVELER-096', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa96', true),
  ('f0000097-0000-0000-0000-0000000000097', 'QR-TRAVELER-097', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa97', true),
  ('f0000098-0000-0000-0000-0000000000098', 'QR-TRAVELER-098', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa98', true),
  ('f0000099-0000-0000-0000-0000000000099', 'QR-TRAVELER-099', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa99', true),
  ('f0000100-0000-0000-0000-0000000000100', 'QR-TRAVELER-100', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1aa', true);
