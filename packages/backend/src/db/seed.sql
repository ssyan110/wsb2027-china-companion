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
