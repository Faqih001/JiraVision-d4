# Comprehensive Seed Data System Design Spec

**Date:** 2026-11-02  
**Status:** Approved for Implementation  
**Author:** AI Assistant (with user approval)

---

## Executive Summary

This design specifies a comprehensive seed data system for JiraVision that populates all 40+ dashboard pages with realistic IT Technician operational data. The system transforms empty dashboard states into a lived-in IT operation showing active support tickets, equipment inventory, completed work logs, maintenance schedules, and team collaboration.

**Key decisions:**
- **Seeding strategy:** One-time comprehensive seed script (Option A)
- **Data scope:** Document-based with realistic extrapolation (Option B)
- **Team size:** 14 total members (4 existing + 10 new) (Option B)
- **Architecture:** Modular seed system with orchestrator (Approach 2)

---

## 1. Architecture Overview

### 1.1 Seed Orchestrator Pattern

```
lib/db-init.ts (existing)
  └─ initializeDatabase()
      ├─ seedDatabase() (existing basic seed)
      ├─ seedTeamMembers() (existing 4 members)
      └─ seedComprehensiveData() (NEW orchestrator)
          ├─ seedUsers() — add 10 more team members
          ├─ seedInfrastructure() — servers, Wi-Fi, backup
          ├─ seedEquipment() — laptops, printers, UPS
          ├─ seedPlaybooks() — 11 IT Technician playbooks
          ├─ seedRegisters() — asset register, software inventory
          ├─ seedTasks() — support tickets, maintenance, checklists
          ├─ seedWorklogs() — completed work entries
          ├─ seedOperations() — ops logs, KPIs, incidents
          ├─ seedCalendar() — maintenance windows, meetings
          └─ seedAnalytics() — gamification, metrics, insights
```

### 1.2 Dependency Chain

The orchestrator calls modules in strict order to respect foreign key constraints:

1. **Users** must exist first (everything references `userId`)
2. **Infrastructure/equipment** before tasks (tasks reference asset IDs)
3. **Playbooks** before tasks (tasks may reference playbook runs)
4. **Tasks** before worklogs (worklogs reference `taskId`)

### 1.3 Idempotency Strategy

Each module uses a "check-then-insert" pattern with unique constraints:

```typescript
async function seedEquipment() {
  const existing = await db.select().from(registerItems)
    .where(eq(registerItems.packKey, "it-technician"))
    .limit(1);
  
  if (existing.length > 0) {
    console.log("Equipment already seeded, skipping");
    return;
  }
  
  await db.insert(registerItems).values([...]);
  console.log("Seeded 25 equipment items");
}
```

**Unique constraints to leverage:**
- `users.email` — prevents duplicate team members
- `registerItems` — check by `packKey + kind + title` combination
- `playbooks` — check by `packKey + title` combination
- `tasks` — check by `title + assigneeId + createdAt` (within 1 hour window)
- `calendarEvents` — check by `title + startTime` combination

### 1.4 Error Recovery

- Each module wrapped in try-catch
- Failed module logs error but doesn't halt orchestrator
- Partial seed is acceptable (better to have some data than none)
- Orchestrator continues to next module on failure

### 1.5 Integration with Existing Seed

```typescript
// lib/db-init.ts
export async function initializeDatabase() {
  // ... existing table creation ...
  
  try {
    await seedDatabase(); // existing basic seed
  } catch (e) {
    console.warn("Basic seed failed:", e);
  }
  
  await seedTeamMembers(); // existing 4 members
  
  try {
    await seedComprehensiveData(); // NEW
  } catch (e) {
    console.warn("Comprehensive seed failed:", e);
  }
}
```

### 1.6 Logging Strategy

Each module logs:
- Start: "Seeding [domain]..."
- Success: "Seeded [count] [items]"
- Skip: "[Domain] already exists, skipping"
- Error: "Failed to seed [domain]: [error]"

Orchestrator logs total time and summary.

---

## 2. Module Breakdown — Data Specification

### 2.1 Module 1: `seedUsers()` — Team Members

**Add 10 new members** (total becomes 14 including existing 4 + admin):

| Name | Department | Role | Notes |
|------|-----------|------|-------|
| Amina Hassan | Finance | user | Recent laptop setup, had printer issue |
| Brian Ochieng | Operations | user | Server access requests, backup monitoring |
| Catherine Wanjiku | HR | user | Onboarded 2 months ago, full equipment setup |
| David Kimani | Sales | user | Remote worker, Wi-Fi connectivity issues |
| Esther Njeri | Management | manager | VIP support, quick response expected |
| Francis Mwangi | Engineering | user | Developer, multiple software installations |
| Grace Akinyi | Marketing | user | Design software licenses, large file storage |
| Henry Kipchoge | Operations | user | Factory floor, rugged equipment needs |
| Irene Chebet | Finance | user | Software renewal tracking |
| James Otieno | IT Support | user | Secondary IT contact, escalation backup |

Each user gets: job title, department, skills, status (online/offline/busy), avatar.

**Implementation notes:**
- Use `onConflictDoNothing({ target: users.email })` for idempotency
- Assign realistic avatars from randomuser.me or similar
- Set skills based on department (e.g., Finance users get "QuickBooks", "Excel")

---

### 2.2 Module 2: `seedInfrastructure()` — Servers & Network

**3 servers** (from IT Technician document):

| Server | Location | Type | Storage | Last Backup | Notes |
|--------|----------|------|---------|-------------|-------|
| AAC Kenya Server | IT Room | File server | 2TB | Yesterday | Primary file storage |
| MCS Server | MCS office | Application server | 1TB | 3 days ago | Had outage on 2026-10-15 |
| Advocates/Insurance Server | Advocates office | Client-confidential data | 5TB | Yesterday | Encrypted, compliance-critical |

**Cloud backup service:**
- Incremental nightly backups (last 30 days of logs)
- Monthly full backups (last 12 months)
- Retention policy: daily 30 days, weekly 3 months, monthly 1 year
- Status: Green/Success (with 2 historical warnings, both resolved)

**Wi-Fi network:**
- Corporate SSID: "AAC-Corporate" (WPA3-Enterprise, 45 connected devices)
- Guest SSID: "AAC-Guest" (captive portal, rate-limited, 12 current guests)
- 8 access points across 3 floors
- Last interference check: 1 week ago (channel 6 adjusted)

**Implementation notes:**
- Store as `registerItems` with `kind: "infrastructure"`
- Include JSONB `fields` for server-specific metadata (storage, backup dates, etc.)
- Link to IT Technician pack: `packKey: "it-technician"`

---

### 2.3 Module 3: `seedEquipment()` — Asset Register

**25 equipment items** across categories:

**Laptops (8):**
- 5 Dell Latitude 5520 (assigned to Francis, Grace, David, Catherine, James)
- 2 HP EliteBook 840 G8 (spare, awaiting assignment)
- 1 Lenovo ThinkPad T14 (in repair — screen replacement, expected back in 3 days)

**Desktops (5):**
- 3 Dell OptiPlex 7090 (Finance dept: Amina, Irene, Brian)
- 2 HP ProDesk 400 G7 (Operations: Henry, spare)

**Printers (4):**
- 2 HP LaserJet Pro M404 (IT Room, Finance office)
- 1 Canon imageCLASS MF269dw (Marketing)
- 1 Brother HL-L2350DW (Operations — needs toner replacement, logged as pending)

**UPS Units (3):**
- APC Smart-UPS 1500VA (Server room — AAC Kenya)
- APC Smart-UPS 3000VA (Server room — MCS)
- Eaton 5PX 3000VA (Server room — Advocates)

**Network Equipment (3):**
- Cisco Catalyst 2960 switch (main)
- Ubiquiti UniFi Controller (Wi-Fi management)
- 8x Ubiquiti UniFi AP AC Pro (access points)

**Other (2):**
- 2x External SSD backups (offline storage)

Each item includes:
- Serial number (realistic format, e.g., "DL5520-2024-001")
- Purchase date (spread across 2023-2025)
- Warranty expiry (2-4 years from purchase)
- Assigned user (if applicable)
- Status: `in_service` / `awaiting_repair` / `awaiting_disposal` / `spare`
- Last verification date (within last 30 days for most items)

**Implementation notes:**
- Store as `registerItems` with `kind: "equipment"`
- Use `ownerId` to link to assigned user
- Include JSONB `fields` for equipment-specific metadata (serial, warranty, etc.)

---

### 2.4 Module 4: `seedPlaybooks()` — 11 IT Technician Playbooks

**Exact titles and steps from IT Technician document:**

1. **Troubleshooting** (as needed)
   - 6 steps: Identify → Reproduce → Diagnose → Fix → Test → Document
   - Tags: ["support", "problem-solving"]

2. **In-person support** (as needed)
   - 10 steps: Receive → Record → Identify user/device → Understand symptoms → Check scope → Troubleshoot → Resolve → Test → Document → Close/escalate
   - Tags: ["support", "face-to-face"]

3. **Remote support** (as needed)
   - 9 steps + 7 security rules
   - Tags: ["support", "remote", "security"]

4. **Backup procedure** (weekly/monthly)
   - 3 phases: Before (6 checks) → During (4 monitors) → After (7 verifications)
   - Tags: ["backup", "recurring", "critical"]

5. **Backup test restoration** (monthly)
   - 5 steps
   - Tags: ["backup", "testing", "recurring"]

6. **New computer setup** (as needed)
   - 14 steps
   - Tags: ["equipment", "onboarding"]

7. **Software installation** (as needed)
   - 8 steps + prohibition rule
   - Tags: ["software", "installation"]

8. **User offboarding** (as needed)
   - 7 steps + authorization rule
   - Tags: ["offboarding", "security"]

9. **Preventive maintenance** (weekly)
   - 11 inspection items + 5 precautions
   - Tags: ["maintenance", "recurring", "weekly"]

10. **Incident escalation** (as needed)
    - 9 escalation triggers + 11 required fields
    - Tags: ["incident", "escalation", "critical"]

11. **Role handover** (as needed)
    - 5 transfer items + 10 confirmation checks
    - Tags: ["handover", "documentation"]

Each playbook includes:
- Full method steps (as JSONB array)
- Precautions (as JSONB array)
- Recommendations (as JSONB array)
- Tags (as JSONB array)
- Status: `published`
- Version: 1
- Author: admin user
- Pack: `it-technician`

**Implementation notes:**
- Store as `playbooks` table
- Use exact step names from document (do not paraphrase)
- Set `packKey: "it-technician"` and `discipline: "technician"`

---

### 2.5 Module 5: `seedRegisters()` — Asset & Software Inventory

**Asset register items** (tied to equipment module):
- 25 hardware assets (from Module 3)
- 3 server infrastructure items (from Module 2)
- 8 software licenses tracked

**Software inventory:**

| Software | Licenses | Assigned | Spare | Renewal Date |
|----------|----------|----------|-------|--------------|
| Microsoft 365 Business | 14 | 12 | 2 | 2027-03-15 |
| Adobe Creative Cloud | 3 | 3 | 0 | 2026-12-01 |
| QuickBooks | 2 | 2 | 0 | 2027-01-10 |
| Slack Business | 14 | 14 | 0 | 2027-06-20 |
| Zoom Pro | 1 | shared | 0 | 2026-11-30 |
| Antivirus endpoint protection | 14 | 14 | 0 | 2027-04-05 |
| Backup software | 3 | 3 | 0 | 2027-02-28 |
| Remote support tool | 1 | IT dept | 0 | 2027-05-15 |

Each software item includes:
- License key location (not the key itself — security)
- Purchase date
- Renewal date
- Assigned user(s)
- Status: `active` / `expired` / `renewal_pending`

**Implementation notes:**
- Store software as `registerItems` with `kind: "software"`
- Include JSONB `fields` for license details (location, renewal, etc.)
- Mark items with renewal within 60 days as `renewal_pending`

---

### 2.6 Module 6: `seedTasks()` — Support Tickets & Maintenance

**15 support tickets** at various priorities and statuses:

**Critical (1):**
- MCS Server offline — affected 8 users, escalated to vendor, resolved in 4 hours (2026-10-15)

**High (3):**
- Advocates Server backup failed 2 nights running — under investigation (2026-10-28)
- Wi-Fi down on 2nd floor — access point replaced, monitoring (2026-10-22)
- Francis's laptop hard drive failing — data backed up, replacement ordered (2026-10-28)

**Medium (6):**
- Amina's printer jamming frequently — scheduled for replacement (2026-10-25)
- David can't connect to VPN from home — configuration issue, resolved (2026-10-20)
- Canon printer in Marketing showing error code — toner low, replaced (2026-10-18)
- HR needs 2 new user accounts for upcoming hires — pending manager approval (2026-10-30)
- QuickBooks slow on month-end — database optimization scheduled (2026-10-27)
- Backup storage at 85% capacity — archive old backups, expand storage (2026-10-26)

**Low (5):**
- Grace wants Adobe Illustrator update — scheduled for next maintenance window (2026-10-29)
- Henry needs second monitor for workstation — purchase request submitted (2026-10-24)
- Catherine's mouse scroll wheel sticky — cleaning scheduled (2026-10-23)
- James wants to install VS Code on his machine — approved, pending (2026-10-31)
- Esther needs presentation clicker — ordered, in transit (2026-10-21)

**Recurring tasks (8):**
- Daily: Check backup status (30 instances, last 30 days)
- Weekly: Preventive maintenance inspection (4 instances, last 4 weeks)
- Weekly: Review support tickets (4 instances)
- Monthly: Test backup restoration (2 instances, last 2 months)
- Monthly: Review hardware inventory (2 instances)
- Monthly: Review software licenses (2 instances)

Each task includes:
- Title, description
- Status: `todo` / `in_progress` / `completed`
- Priority: `critical` / `high` / `medium` / `low`
- Assignee: admin or James (IT Support)
- Requester: various users (stored in metadata)
- Due date (spread across past 2 weeks and next 2 weeks)
- Tags: ["support", "maintenance", "backup", etc.]
- Checklist items where applicable (e.g., backup procedure has 17 checklist items)
- Discipline: `technician`
- Cadence: `one-off` for support tickets, `daily`/`weekly`/`monthly` for recurring

**Implementation notes:**
- Store as `tasks` table
- Use `metadata` JSONB to store requester info, escalation details, etc.
- For recurring tasks, create multiple `taskInstances` (one per occurrence)
- Link to playbooks where applicable (e.g., backup tasks link to "Backup procedure" playbook)

---

### 2.7 Module 7: `seedWorklogs()` — Completed Work Entries

**40 work log entries** spanning last 30 days:

**Recent (last 7 days):**
- Replaced Wi-Fi access point on 2nd floor (2 hours, 2026-10-26)
- Diagnosed Francis's hard drive failure (1.5 hours, 2026-10-28)
- Restored MCS Server from backup (4 hours, 2026-10-15)
- Updated antivirus definitions on all machines (1 hour, 2026-10-27)
- Configured VPN for David's home office (45 min, 2026-10-20)
- Installed Adobe updates for Grace (30 min, 2026-10-29)

**Historical (8-30 days ago):**
- Monthly backup test restoration (2 hours, 2026-10-05)
- Quarterly hardware inspection (6 hours, 2026-10-10)
- Onboarded Catherine: laptop setup, accounts, training (3 hours, 2026-09-15)
- Resolved printer jam for Amina (30 min, 2026-10-25)
- Server room UPS battery replacement (2 hours, 2026-10-12)
- Software license audit and reconciliation (4 hours, 2026-10-08)
- Network switch firmware update (1.5 hours, 2026-10-18)
- ... and 25 more entries

Each entry includes:
- `userId`: admin
- `workedOn`: date (spread across last 30 days)
- `taskId`: linked to ticket (if applicable)
- `kind`: `action` / `maintenance` / `support`
- `title`: brief description
- `body`: detailed description (2-3 sentences)
- `minutes`: time spent
- `discipline`: `technician`
- `playbookId`: if work followed a playbook
- `source`: `manual`

**Implementation notes:**
- Store as `workLogEntries` table
- Link to tasks via `taskId` where applicable
- Link to playbooks via `playbookId` where applicable
- Spread entries across 30 days to show activity pattern
- Include variety of `kind` values (action, maintenance, support)

---

### 2.8 Module 8: `seedOperations()` — Ops Logs, KPIs, Incidents

**Ops log entries (20):**
- 10 backup operations (last 10 nights, all successful)
- 5 maintenance operations (weekly inspections)
- 3 incident responses (MCS outage, Wi-Fi failure, hard drive)
- 2 security operations (antivirus updates, firewall rule changes)

Each ops log entry includes:
- `packKey`: `it-technician`
- `entityKey`: `backup` / `maintenance` / `incident` / `security`
- `ownerId`: admin
- `occurredAt`: timestamp
- `status`: `success` / `completed` / `resolved`
- `fields`: JSONB with operation-specific details
- `source`: `manual` / `automated`

**KPIs (computed from ops logs):**
- Mean time to resolve (MTTR): 2.3 hours
- First contact resolution rate: 68%
- Backup success rate: 98% (29/30 last month)
- Preventive maintenance completion: 100% (4/4 weeks)
- Average response time: 45 minutes
- User satisfaction: 4.2/5 (from 8 feedback entries)

**Incident reports (3):**

1. **MCS Server outage** (2026-10-15)
   - Duration: 4 hours
   - Root cause: Power supply failure
   - Resolution: Vendor replacement
   - Affected users: 8
   - Business impact: High (application server down)

2. **Wi-Fi access point failure** (2026-10-22)
   - Duration: 2 hours
   - Root cause: Hardware fault
   - Resolution: Access point replacement
   - Affected users: 15 (2nd floor)
   - Business impact: Medium (remote workers affected)

3. **Francis's laptop hard drive** (2026-10-28)
   - Duration: 1 hour (data recovery)
   - Root cause: Drive degradation
   - Resolution: Data backed up, replacement ordered
   - Affected users: 1
   - Business impact: Low (data recovered, minimal downtime)

Each incident includes:
- Date/time
- Affected system
- Affected users
- Description
- Troubleshooting performed
- Error messages
- Business impact
- Person/vendor contacted
- Resolution
- Current status: `resolved` / `monitoring`

**Implementation notes:**
- Store ops logs as `opsLogEntries` table
- Compute KPIs from ops logs (don't store separately)
- Store incidents as tasks with `priority: "critical"` or `"high"` and detailed metadata
- Use `metadata` JSONB for incident-specific fields

---

### 2.9 Module 9: `seedCalendar()` — Events & Maintenance Windows

**12 calendar events:**

**Upcoming (next 14 days):**
- Monthly backup test restoration (2026-11-05, 9:00-11:00)
- Quarterly hardware inspection (2026-11-10, all day)
- Software license renewal: Adobe Creative Cloud (2026-11-12)
- Preventive maintenance: Server room cleaning (2026-11-15, 6:00-8:00)
- IT budget review meeting with Esther (2026-11-08, 14:00-15:00)

**Past (last 7 days):**
- Weekly backup review (2026-10-26, 10:00-10:30)
- Network switch firmware update window (2026-10-24, 18:00-19:30)
- Vendor call: UPS battery supplier (2026-10-23, 11:00-11:30)

**Recurring:**
- Daily backup status check (every weekday, 8:00-8:15)
- Weekly preventive maintenance (every Monday, 14:00-16:00)
- Monthly inventory review (first Friday of month, 10:00-12:00)

Each event includes:
- Title, description
- `startTime`, `endTime`
- `eventType`: `maintenance` / `meeting` / `reminder`
- `organizerId`: admin
- `attendees`: relevant users (as JSONB array of user IDs)
- `location`: server room / office / virtual
- `color`: blue (maintenance) / green (completed) / orange (upcoming)
- `isRecurring`: true for daily/weekly/monthly
- `recurringPattern`: JSONB with frequency details

**Implementation notes:**
- Store as `calendarEvents` table
- For recurring events, create multiple instances (one per occurrence in the past 30 days and future 30 days)
- Use `isRecurring: true` and `recurringPattern` to indicate recurrence
- Set `color` based on event type and status

---

### 2.10 Module 10: `seedAnalytics()` — Gamification, Metrics, Insights

**Gamification (for admin user):**
- Level: 5
- XP: 2,450
- Tasks completed: 142
- Achievements:
  - "First 100 tickets resolved" (unlocked 2026-09-15)
  - "Backup champion (30-day streak)" (unlocked 2026-10-01)
  - "Zero downtime month" (unlocked 2026-09-30)
  - "Rapid responder (< 1 hour avg)" (unlocked 2026-10-20)
- Skill trees:
  - Technical: level 5, 240 points
  - Communication: level 3, 120 points
  - Leadership: level 2, 80 points
- Rewards:
  - "Coffee voucher" (redeemed 2026-09-10)
  - "Extra break" (redeemed 2026-10-05)
  - "Early leave pass" (available, not redeemed)

**Wellbeing metrics (last 14 days for admin):**
- Wellbeing score: 78-92 (varies by day)
- Mood: energized / focused / balanced
- Workload: balanced / high (high on incident days)
- Stress level: 25-45 (spikes during critical incidents)
- Overtime hours: 0-3 (higher during server outage)

**Ethical metrics (last 30 days):**
- Pay equity score: 88
- Workload balance score: 82
- DEI task distribution score: 85
- Overtime compliance: 96%

**Sprint analytics (if sprints exist):**
- Velocity: 42 points/sprint average
- Completion rate: 88%
- Quality score: 91%
- Team sentiment: positive

**AI insights (3 active):**
1. "Backup pattern suggests storage expansion needed in 2 months"
   - Type: `recommendation`
   - Status: `active`
   - Expires: 2027-01-02

2. "Printer maintenance requests correlate with usage spikes after month-end"
   - Type: `pattern`
   - Status: `active`
   - Expires: 2026-12-02

3. "Remote support sessions increasing — consider additional VPN licenses"
   - Type: `recommendation`
   - Status: `active`
   - Expires: 2027-02-01

**Implementation notes:**
- Store gamification in `gamification` table
- Store wellbeing metrics in `wellbeingMetrics` table (one row per day per user)
- Store ethical metrics in `ethicalMetrics` table (one row per day)
- Store sprint analytics in `sprintAnalytics` table (one row per sprint)
- Store AI insights in `aiInsights` table

---

## 3. Error Handling & Integration Strategy

### 3.1 Idempotency Implementation

Each module uses a "check-then-insert" pattern with unique constraints (see Section 1.3).

### 3.2 Dependency Management

- Orchestrator calls modules in strict order (see Section 1.2)
- Each module is async/await (no parallel execution)
- If a critical dependency fails (e.g., users), subsequent modules check and skip gracefully
- Example: if `seedUsers()` fails, `seedTasks()` checks for users before creating tickets

### 3.3 Error Recovery

- Each module wrapped in try-catch
- Failed module logs error but doesn't halt orchestrator
- Partial seed is acceptable (better to have some data than none)
- Orchestrator continues to next module on failure

### 3.4 Logging Strategy

- Each module logs: "Seeding [domain]..." at start
- Success: "Seeded [count] [items]"
- Skip: "[Domain] already exists, skipping"
- Error: "Failed to seed [domain]: [error]"
- Orchestrator logs total time and summary

---

## 4. Testing & Validation Strategy

### 4.1 Unit Tests for Each Module

```typescript
// tests/seed/users.test.ts
describe("seedUsers", () => {
  it("creates 10 new team members", async () => {
    await seedUsers();
    const users = await db.select().from(usersTable);
    expect(users.length).toBe(14); // 4 existing + 10 new
  });
  
  it("is idempotent", async () => {
    await seedUsers();
    await seedUsers(); // second call
    const users = await db.select().from(usersTable);
    expect(users.length).toBe(14); // no duplicates
  });
  
  it("assigns correct departments", async () => {
    await seedUsers();
    const finance = await db.select().from(usersTable)
      .where(eq(usersTable.department, "Finance"));
    expect(finance.length).toBe(2); // Amina, Irene
  });
});
```

### 4.2 Integration Tests

```typescript
// tests/seed/orchestrator.test.ts
describe("seedComprehensiveData", () => {
  it("seeds all domains in correct order", async () => {
    await seedComprehensiveData();
    
    // Verify users exist
    const users = await db.select().from(usersTable);
    expect(users.length).toBeGreaterThan(10);
    
    // Verify equipment references valid users
    const equipment = await db.select().from(registerItems)
      .where(eq(registerItems.kind, "equipment"));
    for (const item of equipment) {
      if (item.ownerId) {
        const user = await db.select().from(usersTable)
          .where(eq(usersTable.id, item.ownerId));
        expect(user.length).toBe(1);
      }
    }
    
    // Verify tasks reference valid users and equipment
    const tasks = await db.select().from(tasksTable);
    expect(tasks.length).toBeGreaterThan(10);
  });
  
  it("handles partial failures gracefully", async () => {
    // Mock seedEquipment to fail
    vi.mock("./equipment", () => ({
      seedEquipment: () => { throw new Error("DB connection lost"); }
    }));
    
    await seedComprehensiveData();
    
    // Other modules should still succeed
    const users = await db.select().from(usersTable);
    expect(users.length).toBeGreaterThan(0);
  });
});
```

### 4.3 Validation Checks

After seeding, run validation queries:

```typescript
async function validateSeedData() {
  const checks = [
    { name: "Users", query: "SELECT COUNT(*) FROM users WHERE role = 'user'" },
    { name: "Equipment", query: "SELECT COUNT(*) FROM register_items WHERE kind = 'equipment'" },
    { name: "Playbooks", query: "SELECT COUNT(*) FROM playbooks WHERE pack_key = 'it-technician'" },
    { name: "Tasks", query: "SELECT COUNT(*) FROM tasks WHERE discipline = 'technician'" },
    { name: "Worklogs", query: "SELECT COUNT(*) FROM work_log_entries WHERE discipline = 'technician'" },
  ];
  
  for (const check of checks) {
    const result = await db.execute(sql.raw(check.query));
    console.log(`${check.name}: ${result[0].count} records`);
  }
}
```

### 4.4 Manual Testing Checklist

- [ ] Run seed on fresh database, verify all pages show data
- [ ] Run seed twice, verify no duplicates
- [ ] Delete users table, run seed, verify graceful failure
- [ ] Check each dashboard page visually:
  - `/dashboard/tasks` — 15 tickets + 8 recurring visible
  - `/dashboard/registers` — 25 equipment + 8 software licenses
  - `/dashboard/playbooks` — 11 IT Technician playbooks
  - `/dashboard/worklog` — 40 work entries
  - `/dashboard/calendar` — 12 events
  - `/dashboard/ops/logs` — 20 ops entries
  - `/dashboard/ops/kpis` — KPIs computed correctly
  - `/dashboard/team` — 14 members visible
  - `/dashboard/gamification` — admin has level 5, achievements
  - `/dashboard/analytics` — charts populated with 30-day data

---

## 5. File Structure

```
lib/seed/
  orchestrator.ts          # Main orchestrator function
  users.ts                 # seedUsers()
  infrastructure.ts        # seedInfrastructure()
  equipment.ts             # seedEquipment()
  playbooks.ts             # seedPlaybooks()
  registers.ts             # seedRegisters()
  tasks.ts                 # seedTasks()
  worklogs.ts              # seedWorklogs()
  operations.ts            # seedOperations()
  calendar.ts              # seedCalendar()
  analytics.ts             # seedAnalytics()
  types.ts                 # Shared types and interfaces
  utils.ts                 # Helper functions (date formatting, etc.)

tests/seed/
  users.test.ts
  equipment.test.ts
  playbooks.test.ts
  tasks.test.ts
  orchestrator.test.ts

lib/db-init.ts             # Modified to call seedComprehensiveData()
```

---

## 6. Implementation Sequence

### Phase 1: Foundation (Tasks 1-3)
1. Create `lib/seed/types.ts` and `lib/seed/utils.ts`
2. Create `lib/seed/users.ts` with `seedUsers()`
3. Create `lib/seed/orchestrator.ts` skeleton

### Phase 2: Infrastructure & Equipment (Tasks 4-6)
4. Create `lib/seed/infrastructure.ts`
5. Create `lib/seed/equipment.ts`
6. Create `lib/seed/registers.ts`

### Phase 3: Playbooks & Tasks (Tasks 7-9)
7. Create `lib/seed/playbooks.ts`
8. Create `lib/seed/tasks.ts`
9. Create `lib/seed/worklogs.ts`

### Phase 4: Operations & Calendar (Tasks 10-12)
10. Create `lib/seed/operations.ts`
11. Create `lib/seed/calendar.ts`
12. Create `lib/seed/analytics.ts`

### Phase 5: Integration & Testing (Tasks 13-16)
13. Wire orchestrator into `lib/db-init.ts`
14. Write unit tests for each module
15. Write integration tests for orchestrator
16. Manual testing on fresh database

### Phase 6: Documentation & Deployment (Tasks 17-18)
17. Update documentation (README, CHANGELOG)
18. Deploy to production

---

## 7. Success Criteria

The seed system is successful when:

1. **All 40+ dashboard pages show realistic data** — no empty states on first visit
2. **Data is consistent** — foreign key relationships are valid, no orphaned records
3. **Seed is idempotent** — running twice produces same result as running once
4. **Seed is resilient** — partial failures don't corrupt the database
5. **Seed is fast** — completes in < 30 seconds on production database
6. **Data is realistic** — reflects an active IT operation with history and trends
7. **Tests pass** — unit tests for each module, integration tests for orchestrator
8. **Documentation complete** — README updated, module responsibilities documented

---

## 8. Risks & Mitigations

### Risk 1: Seed takes too long
**Mitigation:** 
- Use batch inserts where possible
- Skip modules if data already exists
- Log progress to identify slow modules

### Risk 2: Foreign key violations
**Mitigation:**
- Strict dependency ordering in orchestrator
- Check for existence before creating references
- Graceful failure with clear error messages

### Risk 3: Data inconsistency
**Mitigation:**
- Validation queries after seeding
- Integration tests verify relationships
- Manual testing checklist

### Risk 4: Breaking existing seed
**Mitigation:**
- New orchestrator runs after existing seed functions
- No modifications to `seedDatabase()` or `seedTeamMembers()`
- Backward compatible with existing data

---

## 9. Future Enhancements

After initial implementation, consider:

1. **Seed configuration file** — allow customization of data volume, date ranges, etc.
2. **Seed profiles** — "demo" (minimal data), "full" (comprehensive data), "test" (deterministic data)
3. **Seed CLI tool** — `npm run seed -- --profile=demo --reset`
4. **Incremental seed** — add new data without re-seeding everything
5. **Data anonymization** — replace real names with fake data for production demos

---

## 10. Conclusion

This design specifies a comprehensive, modular, idempotent seed system that populates all 40+ dashboard pages with realistic IT Technician operational data. The system is resilient to partial failures, maintains data consistency through strict dependency ordering, and includes thorough testing and validation.

**Next steps:**
1. User reviews this spec
2. Transition to implementation planning (writing-plans skill)
3. Implement in 6 phases (18 tasks total)
4. Deploy to production

---

**Appendix A: IT Technician Document Reference**

The seed data is based on the IT Technician role document provided by the user, which specifies:
- 3 servers (AAC Kenya, MCS, Advocates/Insurance)
- 11 playbooks with exact step names
- Daily/weekly/monthly/quarterly checklists
- Support priorities (Critical, High, Medium, Low)
- Equipment categories and tracking requirements
- Records to maintain (asset register, backup logs, incident reports, etc.)

**Appendix B: Database Schema Reference**

The seed system populates the following tables (from `drizzle/schema.ts`):
- `users` — team members
- `registerItems` — equipment, infrastructure, software
- `playbooks` — IT Technician procedures
- `tasks` — support tickets, maintenance tasks
- `taskInstances` — recurring task occurrences
- `workLogEntries` — completed work
- `opsLogEntries` — operations logs
- `calendarEvents` — maintenance windows, meetings
- `gamification` — achievements, XP, levels
- `wellbeingMetrics` — daily wellbeing scores
- `ethicalMetrics` — pay equity, workload balance
- `sprintAnalytics` — velocity, completion rate
- `aiInsights` — recommendations, patterns
