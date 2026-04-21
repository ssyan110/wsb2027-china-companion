# WSB 2027 China Digital Companion

## Business Requirements Document (BRD)

**For JBA Operations Staff**

| | |
|---|---|
| **Version** | 1.1 |
| **Date** | April 2026 |
| **Prepared for** | Journey Beyond Asia (JBA) Operations Team |
| **Event** | WSB 2027 China Super Trip — Beijing & Shanghai |

---

## 1. What Is This App?

The WSB 2027 China Digital Companion is a web-based application that replaces paper-based processes for managing 3,000+ international travelers during the WSB 2027 China incentive event in Beijing.

**There are two sides to this app:**

| Who Uses It | What They See | How They Access It |
|---|---|---|
| **Travelers** (guests, invitees, families) | Mobile app — QR code, itinerary, toolkit | Open the link on their phone |
| **JBA Staff & Admins** | Operations panel — scanner, master table, hotels, flights, events | Open the link on phone or computer |

> **No app store download required.** Travelers open a web link and can add it to their home screen like a regular app.

---

## 2. How Travelers Use the App

### 2.1 Getting Access (Login)

Travelers receive a link via email or from JBA staff (if they haven't logged in upon check-in). They sign in using one of two methods:

- **Find My Booking** — Enter their Booking ID shown in confirmation email (e.g., WSB-2027-001) and last name
- **Email Sign In** — Enter their registered email to receive a sign-in link

After signing in, they can add the app to their phone's home screen for quick access (instructions are shown on the login page).

### 2.2 Home Screen

After login, travelers see their personal home screen with:

- **My QR Code** — Their unique QR code for scanning at events, buses, and hospitality desk check-in
- **My Itinerary** — Personalized schedule showing all events, times, and locations
- **Notifications** — Real-time updates from JBA staff (bus departures, schedule changes, etc.)
- **Family Wallet** — If the traveler has family members linked, they can view and show QR codes for all family members from one phone
- **Destination Toolkit** — Practical tools for Beijing:
  - **Taxi Card** — Hotel address in English and Chinese to show taxi drivers
  - **Phrasebook** — Common phrases with Chinese translation and pronunciation
  - **Currency Converter** — CNY ↔ USD conversion
  - **Emergency Info** — Local emergency numbers, embassy, hospital contacts

### 2.3 QR Code

Each traveler has a unique QR code. They show this QR code to JBA staff at:

- Hotel check-in
- Bus boarding
- Event entry (Welcome Dinner, City Tour, Gala, etc.)
- Optional tours

> The QR code works offline — even without internet, the traveler can show their code.

### 2.4 Family Wallet

For families traveling together:

- One family member can manage QR codes for the entire family
- Swipe through family members' QR codes at scan points
- Useful when children or elderly family members don't have their own phone

> **Any traveler** with linked family members can access the Family Wallet — not just the primary registrant.

### 2.5 Offline Support

The app works without internet for essential features:

- QR code display
- Cached itinerary (shows "last updated" time)
- Taxi card
- Phrasebook
- Emergency info

When internet returns, the app automatically syncs new data.

---

## 3. How JBA Staff Use the App

### 3.1 Accessing the Staff Panel

JBA staff access the operations panel at a separate login page:

1. Go to the app URL and tap **"Staff & Admin Login"** at the bottom
2. Select your staff account to log in / Enter log in credentials to log in
3. You land directly on the **QR Scanner** — the most-used feature

### 3.2 User Roles

| Role | What They Can Do |
|---|---|
| **Staff** | Scanner only by default. Super Admin can grant additional access (master table, hotels, flights, events) per staff member. |
| **Admin** | View all data (master table, hotels, flights, events). Cannot edit or add data. |
| **Super Admin** | Full access — add/edit/delete travelers, upload CSV, manage hotels and flights, view audit log, manage staff accounts and permissions. |

- Admins see a **"View Only"** badge in the header.
- Super Admins see their full toolkit.
- Staff see only the pages they've been authorized to access.

### 3.3 Staff Permissions (Managed by Super Admin)

Super Admins can control exactly what each staff member can see:

| Permission | What It Grants | Default For |
|---|---|---|
| **Scanner** | QR code scanning and scan history | All staff |
| **Master Table** | View the traveler database | Admins only |
| **Hotels** | View hotel assignments and room details | Admins only |
| **Flights** | View flight manifests and passenger lists | Admins only |
| **Events** | View event attendance tracking | Admins only |
| **Audit Log** | View the change history log | Super Admins only |

**How to manage:** Go to Sidebar → Staff → check/uncheck permissions per staff member.

> **Example:** Staff member Alex is stationed at the Ritz-Carlton. Super Admin grants Alex "Hotels" permission so Alex can see the hotel's guest list, but Alex cannot see the master table or flights.

### 3.4 Creating Staff & Admin Accounts

Only Super Admins can create new staff and admin accounts:

1. Go to Sidebar → **Staff** → **"Create Staff Account"**
2. Fill in: First Name, Last Name, Email, Role (Staff / Admin)
3. Save → account is created with default permissions
4. Adjust permissions as needed using the checkboxes

---

## 4. QR Scanner — The Main Tool

The QR Scanner is the first screen staff see after login. This is the primary tool used during operations.

### 4.1 Setup (Before Scanning)

Before scanning, staff must select:

1. **Session** — What are you scanning for?
   - 🏨 Hotel Check-in
   - 📅 Welcome Dinner
   - 📅 City Tour
   - 📅 Gala Dinner
   - 📅 Optional Tour
   - *(any event in the system)*

2. **Fleet** — Which fleet/bus group?
   - Fleet 3, Fleet 7, Fleet 8, etc.
   - Select "All fleets" if not checking fleet assignment

Then tap **"Start Scanning"**.

### 4.2 Scanning a QR Code

1. Point your phone camera at the traveler's QR code
2. The app automatically reads the code (no button press needed)
3. A result card appears immediately:

| Result | Color | What It Means | What To Do |
|---|---|---|---|
| ✅ **Checked In** | Green | Traveler is on the list and in the correct fleet | Let them through |
| ⚠️ **Wrong Fleet** | Yellow | Traveler is assigned to a different fleet | See section 4.3 below |
| ℹ️ **Already Scanned** | Blue | This traveler was already scanned for this session | They may have already checked in |
| ❌ **Not Assigned** | Red | Traveler is not on the list for this event | Direct them to the help desk / Find information directly in master list on the app |
| ❌ **Not Found** | Red | QR code not recognized | Ask for their name, use manual search / Find information directly in master list on the app |
| 🚫 **Token Revoked** | Red | QR code has been deactivated | Direct them to the help desk for a new QR |

> The result card shows the traveler's **name** and **hotel** (no personal information like birthday or ID).
>
> After 4 seconds, the result clears and the camera resumes scanning the next person. Or tap anywhere immediately to continue scanning.

### 4.3 Wrong Fleet Handling

When a traveler scans in at the wrong fleet (e.g., they're assigned to Fleet 7 but scanning at Fleet 8):

The screen shows:
- ⚠️ **Wrong Fleet** — "Assigned to Fleet 7, not Fleet 8"
- Two buttons appear:
  - **❌ Deny** — Do not check them in. They should go to their correct fleet.
  - **✅ Force Check-in** — Check them in anyway (e.g., if their fleet already departed, or manager approved).

> **Why this matters:** If travelers join the wrong fleet, the restaurant may not have enough seats or the correct dietary meals (vegetarian, etc.) for that group.

### 4.4 Manual Search (Backup)

If the camera doesn't work or the QR code is damaged:

1. Tap **"🔍 Search"** in the top right
2. Enter the traveler's **first name** and **last name**
3. Tap **"Go"**
4. Select the correct person from the results
5. The check-in processes normally

> **Privacy:** Search results only show the traveler's name and group — no personal information (no birthday, no ID, no email).
>
> **Duplicate names:** If two travelers have the same name, the app asks for the **birth year only** (e.g., 1985) to identify the correct person.

### 4.5 Scan History

Below the camera, a list shows all recent scans for the current session:

- Time, traveler name, and result (green/yellow/red/blue)
- Useful for checking who has already been scanned

---

## 5. Master Table (Traveler Database)

The Master Table shows all traveler records in a spreadsheet-like view.

### 5.1 What You Can See

- Traveler name, gender, age, group, hotel
- Booking ID, invitee type, pax type, VIP status
- Room assignment, flight details, event attendance
- Check-in status (pending, checked in, no show)

### 5.2 Searching and Filtering

- **Search bar** — Search by name, email, booking ID, phone, or agent code
- **Filters** — Filter by group, hotel, invitee type, pax type, check-in status, VIP tag
- **Sorting** — Click any column header to sort ascending/descending
- **Pagination** — Navigate through pages (25, 50, 100, or 200 per page)

### 5.3 What Super Admins Can Do (Admins Cannot)

| Action | How |
|---|---|
| **Add a traveler** | Click "➕ Add Traveler" → fill in the form → Save |
| **Upload travelers from CSV** (Must use template file) | Click "📤 Upload CSV" → select a .csv file → review results |
| **Edit a traveler field** | Click on any editable cell → change the value → press Enter |
| **Change check-in status** | Click the status badge → select new status from dropdown |
| **Export to CSV** | Click "Export CSV" → downloads a file with all current filters applied |

### 5.4 CSV Upload Format

The CSV file should have these columns (matching the master list template):

```
First Name, Last Name, Email, Booking ID, Role Type, Gender, Age, Pax Type, Phone
```

After upload, the system shows:
- How many travelers were imported
- Any errors (with row numbers and reasons)

---

## 6. Hotels

### 6.1 Hotel Overview (Level 1)

Shows all hotels as cards:

- Hotel name
- Number of travelers and rooms
- Room type breakdown (singles, doubles, twins)
- Check-in progress bar (e.g., "12/20 checked in")

**Filters:** Filter by hotel, group, occupancy type, check-in status, or search by name.

### 6.2 Hotel Detail (Level 2)

Click a hotel card to see:

- Room types available (S1, D1, T1, etc.)
- Full traveler list with: Name, Room #, Occupancy, Room Type, Confirmation #, Roommates, Check-in Status
- Roommates are color-coded (same color = same room)
- Check-in progress bar

> **Use case:** JBA staff stationed at a specific hotel can quickly see all travelers assigned to their hotel, filter by check-in status, and track arrivals.

### 6.3 Super Admin Actions

- **Add Hotel** — Click "+ Add Hotel" → enter name, code, addresses
- **Edit Hotel** — Click "Edit" on any hotel card

---

## 7. Flights

### 7.1 Flight Overview (Level 1)

Two tabs: **Arrivals** and **Departures**

Each flight shows:

- Airline and flight number
- Time, airport, terminal
- Passenger count
- Check-in progress bar

**Filters:** Filter by airline, group, hotel, check-in status, or search by passenger name.

> **Key use case:** JBA staff at different hotels can filter by their hotel to see only their hotel's passengers on each flight. This helps coordinate airport transfers.

### 7.2 Flight Detail (Level 2)

Click a flight card to see passengers organized by:

- **Group** (Group A, Group B, etc.)
  - **Hotel** (within each group)
    - Individual travelers with: Name, Booking ID, Check-in Status, Pax Type

### 7.3 Super Admin Actions

- **Add Flight** — Click "+ Add Flight" → enter airline, number, direction, time, airport, terminal
- **Edit Flight** — Click "Edit" on any flight card

### 7.4 Flight Manifest

- On site staff no longer need to issue flight manifest for each hotel manually, which saves significant work time.
- On site staff can easily export / print out travelers' flight information for his/her own workstation.

---

## 8. Events

Shows all events (Welcome Dinner, City Tour, Gala, etc.) with:

- Event name
- Attendance count (e.g., "45/50 attended")
- Traveler list with fleet numbers and attendance status

> Super Admins can edit event details and mark individual travelers as attended or absent using the toggle button next to each name.

---

## 9. Audit Log (Super Admin Only)

Only Super Admins can access the Audit Log. It shows:

- **Who** made a change (staff name)
- **What** was changed (field name, old value → new value)
- **When** the change was made
- **Which traveler** was affected

This ensures accountability for all data changes.

---

## 10. Typical Workflows

### 10.1 Airport Arrival Day

**Before travelers arrive:**

1. Super Admin uploads the final master list CSV
2. Super Admin verifies hotel assignments and flight data
3. Staff at each hotel review their hotel's traveler list

**At the airport or at the hotel's hospitality desk:**

1. Staff open the Scanner → select "Hotel Check-in" → select their fleet
2. As travelers arrive, scan their QR codes
3. Green = good, Yellow = wrong fleet (deny or force), Red = problem

**On the bus:**

1. Staff scan each traveler boarding the bus
2. System confirms they're on the correct bus/fleet

### 10.2 Event Day (e.g., City Tour)

**Before the event:**

1. Staff open the Scanner → select "City Tour" → select their fleet (e.g., Fleet 8)

**At the meeting point:**

1. Scan each traveler's QR code as they board
2. ✅ Green = correct fleet, let them board
3. ⚠️ Yellow = wrong fleet → Deny (send to correct fleet) or Force (if approved)
4. ❌ Red = not on the list → direct to help desk

**After boarding:**

1. Check scan history to see who hasn't been scanned yet
2. Use the Hotels page filtered by your hotel to call missing travelers

### 10.3 Hotel Check-in

1. Staff at the hotel front desk open Scanner → "Hotel Check-in"
2. Scan each traveler's QR as they arrive
3. Check the Hotels page to see room assignments and roommate pairings

### 10.4 Adding a Last-Minute Traveler

1. Super Admin opens Master Table → "➕ Add Traveler"
2. Fill in: First Name, Last Name, Email, Booking ID, Role Type
3. Save → traveler appears in the system with a QR code
4. Share the login link with the traveler

### 10.5 Handling a Lost/Damaged QR Code

1. Traveler reports to the help desk
2. Staff uses Manual Search (first + last name) to find the traveler
3. Staff can check them in manually
4. Super Admin can reissue/find a QR code and send it to traveler via bluetooth or airdrop etc.

---

## 11. Important Notes

### Privacy

- The scanner only shows traveler **name** and **hotel** — no personal information
- Manual search results show **name** and **group** only
- Personal identity information (PII) (email, phone, passport) is masked for regular admins
- Only Super Admins can unmask PII (toggle in the header)

### Offline

- Traveler QR codes work offline
- Staff scanner needs internet to load the QR database initially, but scan results are instant (local lookup)

### Browser Support

- Works on all phones: iOS, Android, Windows, Google
- Works on desktop: Chrome, Firefox, Edge, Safari
- Camera scanning uses a universal QR decoder (jsQR) — no special browser features required

### Security

- All data changes are logged in the audit trail
- Role-based access: Admins can view, only Super Admins can edit
- Granular permissions: Super Admins control exactly which pages each staff member can access
- Staff accounts can be created and managed without giving full admin access
- Session tokens expire after 24 hours, that is, app will automatically log admins out after 24 inactive hours
- Rate limiting protects against brute-force login attempts
- CSRF protection prevents cross-site attacks on admin actions

---

## 12. Quick Reference Card

### For Travelers

| I want to... | Go to... |
|---|---|
| Show my QR code | Home → My QR Code |
| See my schedule | Home → My Itinerary |
| Show QR for my family | Home → Family Wallet |
| Get hotel address for taxi | Home → Toolkit → Taxi Card |
| Learn Chinese phrases | Home → Toolkit → Phrasebook |
| Convert currency | Home → Toolkit → Currency Converter |
| Find emergency numbers | Home → Toolkit → Emergency Info |

### For JBA Staff

| I want to... | Go to... |
|---|---|
| Scan QR codes | Scanner (first page after login) |
| Search for a traveler | Scanner → 🔍 Search |
| See all travelers | Sidebar → Master Table |
| See my hotel's guests | Sidebar → Hotels → click your hotel |
| See flight passengers | Sidebar → Flights → click a flight |
| See event attendance | Sidebar → Events |
| Add a new traveler | Master Table → ➕ Add Traveler (Super Admin) |
| Upload traveler CSV | Master Table → 📤 Upload CSV (Super Admin) |
| Export data | Master Table → Export CSV (Super Admin) |
| View change history | Sidebar → Audit Log (Super Admin) |
| Create staff/admin account | Sidebar → Staff → Create Staff Account (Super Admin) |
| Change staff permissions | Sidebar → Staff → check/uncheck permission boxes (Super Admin) |

---

## 13. Glossary

| Term | Meaning |
|---|---|
| **Booking ID** | Unique registration reference (e.g., WSB-2027-001) |
| **Fleet** | A bus/group assignment for events (e.g., Fleet 8) |
| **Pax Type** | Passenger type: Adult, Child, or Infant |
| **Invitee Type** | Whether the person is an Invitee (primary) or Guest (accompanying) |
| **Check-in Status** | Pending (not yet arrived), Checked In, or No Show |
| **QR Code** | The unique scannable code each traveler shows on their phone |
| **PII** | Personally Identifiable Information (email, phone, passport name) |
| **Master Table** | The main database of all travelers with all their information |
| **Scan Mode / Session** | The context for scanning (Hotel Check-in, City Tour, Gala, etc.) |
| **Staff Permission** | A specific access right (e.g., scanner, master_table, hotels) that Super Admins can grant or revoke per staff member |
| **Staff Management** | The Super Admin page for creating staff accounts and managing their permissions |
| **Force Check-in** | Override a wrong-fleet warning to check in a traveler anyway (logged for accountability) |
| **Flight Manifest** | The passenger list for a specific flight, organized by group and hotel |

---

*This document covers the WSB 2027 China Digital Companion as of April 2026. Features may be updated as the event approaches.*

**Version History:**
- **v1.0** (April 2026) — Initial BRD
- **v1.1** (April 2026) — Added staff permission system, event attendance tracking, flight manifest export, security enhancements
