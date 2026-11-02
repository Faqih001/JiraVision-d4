# Comprehensive Seed Data System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Populate all 40+ dashboard pages with realistic IT Technician operational data through a modular, idempotent seed system.

**Architecture:** Orchestrator pattern with 10 domain-specific seed modules called in strict dependency order (users → infrastructure → equipment → playbooks → tasks → worklogs → operations → calendar → analytics). Each module checks for existing data before inserting, ensuring idempotency. Partial failures are logged but don't halt the orchestrator.

**Tech Stack:** TypeScript, Drizzle ORM, Neon PostgreSQL, Vitest for testing

**Spec:** `docs/superpowers/specs/2026-11-02-comprehensive-seed-data-design.md`

## Global Constraints

- All seed modules must be idempotent (safe to re-run without duplicates)
- Dependency order must be respected (users before tasks, tasks before worklogs)
- Each module must log start/success/skip/error states
- Partial failures must not corrupt the database
- All data must reference valid foreign keys (no orphaned records)
- Seed must complete in < 30 seconds on production database
- Test coverage: unit tests per module, integration tests for orchestrator
- No modifications to existing `seedDatabase()` or `seedTeamMembers()` functions

---

## File Structure

```
lib/seed/
  orchestrator.ts          # Main orchestrator function
  users.ts                 # seedUsers() - 10 new team members
  infrastructure.ts        # seedInfrastructure() - 3 servers, Wi-Fi, backup
  equipment.ts             # seedEquipment() - 25 hardware items
  playbooks.ts             # seedPlaybooks() - 11 IT Technician playbooks
  registers.ts             # seedRegisters() - 8 software licenses
  tasks.ts                 # seedTasks() - 15 tickets + 8 recurring
  worklogs.ts              # seedWorklogs() - 40 work entries
  operations.ts            # seedOperations() - 20 ops logs + 3 incidents
  calendar.ts              # seedCalendar() - 12 events
  analytics.ts             # seedAnalytics() - gamification, metrics, insights
  types.ts                 # Shared types and interfaces
  utils.ts                 # Helper functions (date formatting, etc.)

tests/seed/
  users.test.ts
  infrastructure.test.ts
  equipment.test.ts
  playbooks.test.ts
  registers.test.ts
  tasks.test.ts
  worklogs.test.ts
  operations.test.ts
  calendar.test.ts
  analytics.test.ts
  orchestrator.test.ts

lib/db-init.ts             # Modified to call seedComprehensiveData()
```

---

## Phase 1: Foundation (Tasks 1-3)

### Task 1: Create seed types and utilities

**Files:**
- Create: `lib/seed/types.ts`
- Create: `lib/seed/utils.ts`

**Interfaces:**
- Consumes: Nothing (foundation module)
- Produces: `SeedResult` type, `toDateOnly()` helper, `generateSerial()` helper

- [ ] **Step 1: Create types.ts with SeedResult interface**

```typescript
// lib/seed/types.ts
export interface SeedResult {
  module: string;
  status: "seeded" | "skipped" | "failed";
  count: number;
  error?: string;
}
```

- [ ] **Step 2: Create utils.ts with helper functions**

```typescript
// lib/seed/utils.ts
export function toDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function generateSerial(prefix: string, year: number, seq: number): string {
  return `${prefix}-${year}-${String(seq).padStart(3, "0")}`;
}

export function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

export function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit lib/seed/types.ts lib/seed/utils.ts`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add lib/seed/types.ts lib/seed/utils.ts
git commit -m "feat(seed): add types and utilities for seed modules"
```

---

### Task 2: Create seedUsers module with tests

**Files:**
- Create: `lib/seed/users.ts`
- Create: `tests/seed/users.test.ts`

**Interfaces:**
- Consumes: `SeedResult` from `types.ts`, `toDateOnly()` from `utils.ts`
- Produces: `seedUsers(): Promise<SeedResult>`

- [ ] **Step 1: Write failing test for seedUsers**

```typescript
// tests/seed/users.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { seedUsers } from "../../lib/seed/users";
import { db } from "../../lib/db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

describe("seedUsers", () => {
  beforeEach(async () => {
    // Clean up test data
    await db.delete(users).where(eq(users.department, "Finance"));
    await db.delete(users).where(eq(users.department, "Operations"));
    await db.delete(users).where(eq(users.department, "HR"));
    await db.delete(users).where(eq(users.department, "Sales"));
    await db.delete(users).where(eq(users.department, "Management"));
    await db.delete(users).where(eq(users.department, "Engineering"));
    await db.delete(users).where(eq(users.department, "Marketing"));
    await db.delete(users).where(eq(users.department, "IT Support"));
  });

  it("creates 10 new team members", async () => {
    const result = await seedUsers();
    expect(result.status).toBe("seeded");
    expect(result.count).toBe(10);

    const allUsers = await db.select().from(users);
    const newUsers = allUsers.filter(u => 
      ["Finance", "Operations", "HR", "Sales", "Management", "Engineering", "Marketing", "IT Support"].includes(u.department || "")
    );
    expect(newUsers.length).toBe(10);
  });

  it("is idempotent", async () => {
    await seedUsers();
    const result = await seedUsers();
    expect(result.status).toBe("skipped");
    expect(result.count).toBe(0);
  });

  it("assigns correct departments", async () => {
    await seedUsers();
    const finance = await db.select().from(users).where(eq(users.department, "Finance"));
    expect(finance.length).toBe(2); // Amina, Irene
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/seed/users.test.ts`
Expected: FAIL with "Cannot find module '../../lib/seed/users'"

- [ ] **Step 3: Implement seedUsers**

```typescript
// lib/seed/users.ts
import { db } from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { type SeedResult } from "./types";

const NEW_TEAM_MEMBERS = [
  {
    name: "Amina Hassan",
    email: "amina.hassan@example.com",
    role: "user",
    jobTitle: "Finance Analyst",
    department: "Finance",
    avatar: "https://randomuser.me/api/portraits/women/44.jpg",
    status: "online",
    skills: ["QuickBooks", "Excel", "Financial Reporting"],
  },
  {
    name: "Brian Ochieng",
    email: "brian.ochieng@example.com",
    role: "user",
    jobTitle: "Operations Coordinator",
    department: "Operations",
    avatar: "https://randomuser.me/api/portraits/men/55.jpg",
    status: "online",
    skills: ["Server Management", "Backup Operations"],
  },
  {
    name: "Catherine Wanjiku",
    email: "catherine.wanjiku@example.com",
    role: "user",
    jobTitle: "HR Specialist",
    department: "HR",
    avatar: "https://randomuser.me/api/portraits/women/33.jpg",
    status: "online",
    skills: ["Onboarding", "Employee Relations"],
  },
  {
    name: "David Kimani",
    email: "david.kimani@example.com",
    role: "user",
    jobTitle: "Sales Representative",
    department: "Sales",
    avatar: "https://randomuser.me/api/portraits/men/66.jpg",
    status: "offline",
    skills: ["CRM", "Remote Work Tools"],
  },
  {
    name: "Esther Njeri",
    email: "esther.njeri@example.com",
    role: "manager",
    jobTitle: "Operations Manager",
    department: "Management",
    avatar: "https://randomuser.me/api/portraits/women/22.jpg",
    status: "busy",
    skills: ["Leadership", "Strategy", "Budget Management"],
  },
  {
    name: "Francis Mwangi",
    email: "francis.mwangi@example.com",
    role: "user",
    jobTitle: "Software Developer",
    department: "Engineering",
    avatar: "https://randomuser.me/api/portraits/men/77.jpg",
    status: "online",
    skills: ["React", "Node.js", "TypeScript"],
  },
  {
    name: "Grace Akinyi",
    email: "grace.akinyi@example.com",
    role: "user",
    jobTitle: "Marketing Designer",
    department: "Marketing",
    avatar: "https://randomuser.me/api/portraits/women/88.jpg",
    status: "online",
    skills: ["Adobe Creative Suite", "UI Design"],
  },
  {
    name: "Henry Kipchoge",
    email: "henry.kipchoge@example.com",
    role: "user",
    jobTitle: "Factory Operations",
    department: "Operations",
    avatar: "https://randomuser.me/api/portraits/men/99.jpg",
    status: "online",
    skills: ["Equipment Operation", "Safety Protocols"],
  },
  {
    name: "Irene Chebet",
    email: "irene.chebet@example.com",
    role: "user",
    jobTitle: "Finance Officer",
    department: "Finance",
    avatar: "https://randomuser.me/api/portraits/women/11.jpg",
    status: "online",
    skills: ["Accounting", "License Management"],
  },
  {
    name: "James Otieno",
    email: "james.otieno@example.com",
    role: "user",
    jobTitle: "IT Support Specialist",
    department: "IT Support",
    avatar: "https://randomuser.me/api/portraits/men/12.jpg",
    status: "online",
    skills: ["Technical Support", "Troubleshooting", "Network Administration"],
  },
];

export async function seedUsers(): Promise<SeedResult> {
  try {
    // Check if users already exist
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.department, "Finance"))
      .limit(1);

    if (existing.length > 0) {
      console.log("Users already seeded, skipping");
      return { module: "users", status: "skipped", count: 0 };
    }

    console.log("Seeding users...");
    const hashedPassword = await bcrypt.hash("password123", 10);

    for (const member of NEW_TEAM_MEMBERS) {
      await db
        .insert(users)
        .values({
          ...member,
          passwordHash: hashedPassword,
          emailVerified: true,
        })
        .onConflictDoNothing({ target: users.email });
    }

    console.log(`Seeded ${NEW_TEAM_MEMBERS.length} users`);
    return { module: "users", status: "seeded", count: NEW_TEAM_MEMBERS.length };
  } catch (error) {
    console.error("Failed to seed users:", error);
    return {
      module: "users",
      status: "failed",
      count: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/seed/users.test.ts`
Expected: PASS (all 3 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/seed/users.ts tests/seed/users.test.ts
git commit -m "feat(seed): add seedUsers module with 10 new team members"
```

---

### Task 3: Create orchestrator skeleton and wire into db-init

**Files:**
- Create: `lib/seed/orchestrator.ts`
- Modify: `lib/db-init.ts`

**Interfaces:**
- Consumes: `seedUsers()` from `users.ts`, `SeedResult` from `types.ts`
- Produces: `seedComprehensiveData(): Promise<SeedResult[]>`

- [ ] **Step 1: Write failing test for orchestrator**

```typescript
// tests/seed/orchestrator.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { seedComprehensiveData } from "../../lib/seed/orchestrator";
import { db } from "../../lib/db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

describe("seedComprehensiveData", () => {
  beforeEach(async () => {
    // Clean up test data
    await db.delete(users).where(eq(users.department, "Finance"));
  });

  it("runs all seed modules in order", async () => {
    const results = await seedComprehensiveData();
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].module).toBe("users");
  });

  it("returns results for each module", async () => {
    const results = await seedComprehensiveData();
    const usersResult = results.find(r => r.module === "users");
    expect(usersResult).toBeDefined();
    expect(["seeded", "skipped"]).toContain(usersResult?.status);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/seed/orchestrator.test.ts`
Expected: FAIL with "Cannot find module '../../lib/seed/orchestrator'"

- [ ] **Step 3: Implement orchestrator skeleton**

```typescript
// lib/seed/orchestrator.ts
import { type SeedResult } from "./types";
import { seedUsers } from "./users";

export async function seedComprehensiveData(): Promise<SeedResult[]> {
  const startTime = Date.now();
  console.log("Starting comprehensive seed...");

  const results: SeedResult[] = [];

  // Phase 1: Users (must be first)
  results.push(await seedUsers());

  // TODO: Add remaining modules in subsequent tasks
  // results.push(await seedInfrastructure());
  // results.push(await seedEquipment());
  // ...

  const elapsed = Date.now() - startTime;
  console.log(`Comprehensive seed completed in ${elapsed}ms`);
  console.log(`Results: ${results.filter(r => r.status === "seeded").length} seeded, ${results.filter(r => r.status === "skipped").length} skipped, ${results.filter(r => r.status === "failed").length} failed`);

  return results;
}
```

- [ ] **Step 4: Wire orchestrator into db-init.ts**

Read `lib/db-init.ts` and add after `await seedTeamMembers();`:

```typescript
// lib/db-init.ts (add after seedTeamMembers call)
try {
  const { seedComprehensiveData } = await import("./seed/orchestrator");
  await seedComprehensiveData();
} catch (e) {
  console.warn("Comprehensive seed failed:", e);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/seed/orchestrator.test.ts`
Expected: PASS (both tests)

- [ ] **Step 6: Commit**

```bash
git add lib/seed/orchestrator.ts lib/db-init.ts tests/seed/orchestrator.test.ts
git commit -m "feat(seed): add orchestrator and wire into db-init"
```

---

## Phase 2: Infrastructure & Equipment (Tasks 4-6)

### Task 4: Create seedInfrastructure module

**Files:**
- Create: `lib/seed/infrastructure.ts`
- Create: `tests/seed/infrastructure.test.ts`

**Interfaces:**
- Consumes: `SeedResult` from `types.ts`, `generateSerial()` from `utils.ts`
- Produces: `seedInfrastructure(): Promise<SeedResult>`

- [ ] **Step 1: Write failing test for seedInfrastructure**

```typescript
// tests/seed/infrastructure.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { seedInfrastructure } from "../../lib/seed/infrastructure";
import { db } from "../../lib/db";
import { registerItems } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

describe("seedInfrastructure", () => {
  beforeEach(async () => {
    await db
      .delete(registerItems)
      .where(and(eq(registerItems.packKey, "it-technician"), eq(registerItems.kind, "infrastructure")));
  });

  it("creates 3 servers and network infrastructure", async () => {
    const result = await seedInfrastructure();
    expect(result.status).toBe("seeded");
    expect(result.count).toBe(5); // 3 servers + Wi-Fi controller + backup service

    const infra = await db
      .select()
      .from(registerItems)
      .where(and(eq(registerItems.packKey, "it-technician"), eq(registerItems.kind, "infrastructure")));
    expect(infra.length).toBe(5);
  });

  it("is idempotent", async () => {
    await seedInfrastructure();
    const result = await seedInfrastructure();
    expect(result.status).toBe("skipped");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/seed/infrastructure.test.ts`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Implement seedInfrastructure**

```typescript
// lib/seed/infrastructure.ts
import { db } from "../db";
import { registerItems } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { type SeedResult } from "./types";
import { generateSerial, daysAgo, toDateOnly } from "./utils";

const INFRASTRUCTURE_ITEMS = [
  {
    title: "AAC Kenya Server",
    kind: "infrastructure",
    fields: {
      location: "IT Room",
      type: "File server",
      storage: "2TB",
      lastBackup: toDateOnly(daysAgo(1)),
      status: "operational",
      serial: generateSerial("SRV", 2023, 1),
    },
    status: "in_service",
  },
  {
    title: "MCS Server",
    kind: "infrastructure",
    fields: {
      location: "MCS office",
      type: "Application server",
      storage: "1TB",
      lastBackup: toDateOnly(daysAgo(3)),
      status: "operational",
      serial: generateSerial("SRV", 2023, 2),
      notes: "Had outage on 2026-10-15, resolved",
    },
    status: "in_service",
  },
  {
    title: "Advocates/Insurance Server",
    kind: "infrastructure",
    fields: {
      location: "Advocates office",
      type: "Client-confidential data",
      storage: "5TB",
      lastBackup: toDateOnly(daysAgo(1)),
      status: "operational",
      serial: generateSerial("SRV", 2023, 3),
      encrypted: true,
      compliance: "client-confidential",
    },
    status: "in_service",
  },
  {
    title: "Cloud Backup Service",
    kind: "infrastructure",
    fields: {
      type: "Backup service",
      incrementalSchedule: "nightly",
      fullBackupSchedule: "monthly",
      retention: {
        daily: "30 days",
        weekly: "3 months",
        monthly: "1 year",
      },
      status: "green",
      lastWarning: toDateOnly(daysAgo(15)),
      warningResolved: true,
    },
    status: "in_service",
  },
  {
    title: "Wi-Fi Network Infrastructure",
    kind: "infrastructure",
    fields: {
      corporateSSID: "AAC-Corporate",
      corporateSecurity: "WPA3-Enterprise",
      corporateDevices: 45,
      guestSSID: "AAC-Guest",
      guestSecurity: "captive portal",
      guestDevices: 12,
      accessPoints: 8,
      floors: 3,
      lastInterferenceCheck: toDateOnly(daysAgo(7)),
      channelAdjusted: "channel 6",
    },
    status: "in_service",
  },
];

export async function seedInfrastructure(): Promise<SeedResult> {
  try {
    const existing = await db
      .select()
      .from(registerItems)
      .where(and(eq(registerItems.packKey, "it-technician"), eq(registerItems.kind, "infrastructure")))
      .limit(1);

    if (existing.length > 0) {
      console.log("Infrastructure already seeded, skipping");
      return { module: "infrastructure", status: "skipped", count: 0 };
    }

    console.log("Seeding infrastructure...");

    for (const item of INFRASTRUCTURE_ITEMS) {
      await db.insert(registerItems).values({
        packKey: "it-technician",
        kind: item.kind,
        title: item.title,
        fields: item.fields,
        status: item.status,
        custody: "company",
        lastVerifiedAt: toDateOnly(daysAgo(7)),
        verifyIntervalDays: 30,
        source: "manual",
      });
    }

    console.log(`Seeded ${INFRASTRUCTURE_ITEMS.length} infrastructure items`);
    return { module: "infrastructure", status: "seeded", count: INFRASTRUCTURE_ITEMS.length };
  } catch (error) {
    console.error("Failed to seed infrastructure:", error);
    return {
      module: "infrastructure",
      status: "failed",
      count: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/seed/infrastructure.test.ts`
Expected: PASS

- [ ] **Step 5: Add to orchestrator**

Edit `lib/seed/orchestrator.ts`:

```typescript
import { seedInfrastructure } from "./infrastructure";

// In seedComprehensiveData, after seedUsers:
results.push(await seedInfrastructure());
```

- [ ] **Step 6: Commit**

```bash
git add lib/seed/infrastructure.ts tests/seed/infrastructure.test.ts lib/seed/orchestrator.ts
git commit -m "feat(seed): add seedInfrastructure module with 3 servers and network"
```

---

### Task 5: Create seedEquipment module

**Files:**
- Create: `lib/seed/equipment.ts`
- Create: `tests/seed/equipment.test.ts`

**Interfaces:**
- Consumes: `SeedResult`, `generateSerial()`, `daysAgo()`, `toDateOnly()`
- Produces: `seedEquipment(): Promise<SeedResult>`

- [ ] **Step 1: Write failing test**

```typescript
// tests/seed/equipment.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { seedEquipment } from "../../lib/seed/equipment";
import { db } from "../../lib/db";
import { registerItems } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

describe("seedEquipment", () => {
  beforeEach(async () => {
    await db
      .delete(registerItems)
      .where(and(eq(registerItems.packKey, "it-technician"), eq(registerItems.kind, "equipment")));
  });

  it("creates 25 equipment items", async () => {
    const result = await seedEquipment();
    expect(result.status).toBe("seeded");
    expect(result.count).toBe(25);
  });

  it("is idempotent", async () => {
    await seedEquipment();
    const result = await seedEquipment();
    expect(result.status).toBe("skipped");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/seed/equipment.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement seedEquipment**

```typescript
// lib/seed/equipment.ts
import { db } from "../db";
import { registerItems, users } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { type SeedResult } from "./types";
import { generateSerial, daysAgo, toDateOnly } from "./utils";

export async function seedEquipment(): Promise<SeedResult> {
  try {
    const existing = await db
      .select()
      .from(registerItems)
      .where(and(eq(registerItems.packKey, "it-technician"), eq(registerItems.kind, "equipment")))
      .limit(1);

    if (existing.length > 0) {
      console.log("Equipment already seeded, skipping");
      return { module: "equipment", status: "skipped", count: 0 };
    }

    console.log("Seeding equipment...");

    // Get user IDs for assignments
    const allUsers = await db.select().from(users);
    const userMap = new Map(allUsers.map(u => [u.name, u.id]));

    const equipment = [
      // Laptops (8)
      { title: "Dell Latitude 5520 - Francis", fields: { type: "Laptop", model: "Dell Latitude 5520", serial: generateSerial("DL5520", 2024, 1), purchaseDate: "2024-03-15", warrantyExpiry: "2027-03-15", assignedTo: "Francis Mwangi" }, status: "in_service", ownerId: userMap.get("Francis Mwangi") },
      { title: "Dell Latitude 5520 - Grace", fields: { type: "Laptop", model: "Dell Latitude 5520", serial: generateSerial("DL5520", 2024, 2), purchaseDate: "2024-03-15", warrantyExpiry: "2027-03-15", assignedTo: "Grace Akinyi" }, status: "in_service", ownerId: userMap.get("Grace Akinyi") },
      { title: "Dell Latitude 5520 - David", fields: { type: "Laptop", model: "Dell Latitude 5520", serial: generateSerial("DL5520", 2024, 3), purchaseDate: "2024-04-10", warrantyExpiry: "2027-04-10", assignedTo: "David Kimani" }, status: "in_service", ownerId: userMap.get("David Kimani") },
      { title: "Dell Latitude 5520 - Catherine", fields: { type: "Laptop", model: "Dell Latitude 5520", serial: generateSerial("DL5520", 2024, 4), purchaseDate: "2024-04-10", warrantyExpiry: "2027-04-10", assignedTo: "Catherine Wanjiku" }, status: "in_service", ownerId: userMap.get("Catherine Wanjiku") },
      { title: "Dell Latitude 5520 - James", fields: { type: "Laptop", model: "Dell Latitude 5520", serial: generateSerial("DL5520", 2024, 5), purchaseDate: "2024-05-20", warrantyExpiry: "2027-05-20", assignedTo: "James Otieno" }, status: "in_service", ownerId: userMap.get("James Otieno") },
      { title: "HP EliteBook 840 G8 - Spare 1", fields: { type: "Laptop", model: "HP EliteBook 840 G8", serial: generateSerial("HP840", 2023, 1), purchaseDate: "2023-11-10", warrantyExpiry: "2026-11-10" }, status: "spare" },
      { title: "HP EliteBook 840 G8 - Spare 2", fields: { type: "Laptop", model: "HP EliteBook 840 G8", serial: generateSerial("HP840", 2023, 2), purchaseDate: "2023-11-10", warrantyExpiry: "2026-11-10" }, status: "spare" },
      { title: "Lenovo ThinkPad T14 - In Repair", fields: { type: "Laptop", model: "Lenovo ThinkPad T14", serial: generateSerial("LNV-T14", 2023, 1), purchaseDate: "2023-08-15", warrantyExpiry: "2026-08-15", issue: "Screen replacement", expectedReturn: toDateOnly(daysAgo(-3)) }, status: "awaiting_repair" },

      // Desktops (5)
      { title: "Dell OptiPlex 7090 - Amina", fields: { type: "Desktop", model: "Dell OptiPlex 7090", serial: generateSerial("DO7090", 2024, 1), purchaseDate: "2024-02-20", warrantyExpiry: "2027-02-20", assignedTo: "Amina Hassan" }, status: "in_service", ownerId: userMap.get("Amina Hassan") },
      { title: "Dell OptiPlex 7090 - Irene", fields: { type: "Desktop", model: "Dell OptiPlex 7090", serial: generateSerial("DO7090", 2024, 2), purchaseDate: "2024-02-20", warrantyExpiry: "2027-02-20", assignedTo: "Irene Chebet" }, status: "in_service", ownerId: userMap.get("Irene Chebet") },
      { title: "Dell OptiPlex 7090 - Brian", fields: { type: "Desktop", model: "Dell OptiPlex 7090", serial: generateSerial("DO7090", 2024, 3), purchaseDate: "2024-03-05", warrantyExpiry: "2027-03-05", assignedTo: "Brian Ochieng" }, status: "in_service", ownerId: userMap.get("Brian Ochieng") },
      { title: "HP ProDesk 400 G7 - Henry", fields: { type: "Desktop", model: "HP ProDesk 400 G7", serial: generateSerial("HPD400", 2023, 1), purchaseDate: "2023-09-12", warrantyExpiry: "2026-09-12", assignedTo: "Henry Kipchoge" }, status: "in_service", ownerId: userMap.get("Henry Kipchoge") },
      { title: "HP ProDesk 400 G7 - Spare", fields: { type: "Desktop", model: "HP ProDesk 400 G7", serial: generateSerial("HPD400", 2023, 2), purchaseDate: "2023-09-12", warrantyExpiry: "2026-09-12" }, status: "spare" },

      // Printers (4)
      { title: "HP LaserJet Pro M404 - IT Room", fields: { type: "Printer", model: "HP LaserJet Pro M404", serial: generateSerial("HPLJ", 2023, 1), purchaseDate: "2023-06-18", warrantyExpiry: "2025-06-18", location: "IT Room" }, status: "in_service" },
      { title: "HP LaserJet Pro M404 - Finance", fields: { type: "Printer", model: "HP LaserJet Pro M404", serial: generateSerial("HPLJ", 2023, 2), purchaseDate: "2023-06-18", warrantyExpiry: "2025-06-18", location: "Finance Office" }, status: "in_service" },
      { title: "Canon imageCLASS MF269dw - Marketing", fields: { type: "Printer", model: "Canon imageCLASS MF269dw", serial: generateSerial("CAN-MF", 2024, 1), purchaseDate: "2024-01-22", warrantyExpiry: "2026-01-22", location: "Marketing" }, status: "in_service" },
      { title: "Brother HL-L2350DW - Operations", fields: { type: "Printer", model: "Brother HL-L2350DW", serial: generateSerial("BRO-HL", 2022, 1), purchaseDate: "2022-11-30", warrantyExpiry: "2024-11-30", location: "Operations", issue: "Needs toner replacement" }, status: "in_service" },

      // UPS Units (3)
      { title: "APC Smart-UPS 1500VA - AAC Kenya", fields: { type: "UPS", model: "APC Smart-UPS 1500VA", serial: generateSerial("APC-1500", 2023, 1), purchaseDate: "2023-05-10", warrantyExpiry: "2026-05-10", location: "Server Room - AAC Kenya", lastBatteryReplacement: "2025-10-12" }, status: "in_service" },
      { title: "APC Smart-UPS 3000VA - MCS", fields: { type: "UPS", model: "APC Smart-UPS 3000VA", serial: generateSerial("APC-3000", 2023, 1), purchaseDate: "2023-05-10", warrantyExpiry: "2026-05-10", location: "Server Room - MCS" }, status: "in_service" },
      { title: "Eaton 5PX 3000VA - Advocates", fields: { type: "UPS", model: "Eaton 5PX 3000VA", serial: generateSerial("EAT-5PX", 2023, 1), purchaseDate: "2023-07-22", warrantyExpiry: "2026-07-22", location: "Server Room - Advocates" }, status: "in_service" },

      // Network Equipment (3)
      { title: "Cisco Catalyst 2960 Switch", fields: { type: "Network Switch", model: "Cisco Catalyst 2960", serial: generateSerial("CISCO-2960", 2022, 1), purchaseDate: "2022-08-15", warrantyExpiry: "2025-08-15", lastFirmwareUpdate: toDateOnly(daysAgo(15)) }, status: "in_service" },
      { title: "Ubiquiti UniFi Controller", fields: { type: "Network Controller", model: "Ubiquiti UniFi Controller", serial: generateSerial("UBNT-CTL", 2023, 1), purchaseDate: "2023-03-20", warrantyExpiry: "2026-03-20" }, status: "in_service" },
      { title: "Ubiquiti UniFi AP AC Pro (8 units)", fields: { type: "Access Point", model: "Ubiquiti UniFi AP AC Pro", serial: generateSerial("UBNT-AP", 2023, 1), purchaseDate: "2023-03-20", warrantyExpiry: "2026-03-20", quantity: 8, floors: 3 }, status: "in_service" },

      // Other (2)
      { title: "External SSD Backup 1", fields: { type: "External Storage", model: "Samsung T7 Shield 2TB", serial: generateSerial("SSD-EXT", 2024, 1), purchaseDate: "2024-06-10", warrantyExpiry: "2027-06-10", storageType: "offline" }, status: "in_service" },
      { title: "External SSD Backup 2", fields: { type: "External Storage", model: "Samsung T7 Shield 2TB", serial: generateSerial("SSD-EXT", 2024, 2), purchaseDate: "2024-06-10", warrantyExpiry: "2027-06-10", storageType: "offline" }, status: "in_service" },
    ];

    for (const item of equipment) {
      await db.insert(registerItems).values({
        packKey: "it-technician",
        kind: "equipment",
        title: item.title,
        fields: item.fields,
        status: item.status,
        ownerId: item.ownerId || null,
        custody: item.ownerId ? "member" : "company",
        lastVerifiedAt: toDateOnly(daysAgo(Math.floor(Math.random() * 30))),
        verifyIntervalDays: 90,
        source: "manual",
      });
    }

    console.log(`Seeded ${equipment.length} equipment items`);
    return { module: "equipment", status: "seeded", count: equipment.length };
  } catch (error) {
    console.error("Failed to seed equipment:", error);
    return {
      module: "equipment",
      status: "failed",
      count: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/seed/equipment.test.ts`
Expected: PASS

- [ ] **Step 5: Add to orchestrator**

```typescript
import { seedEquipment } from "./equipment";
results.push(await seedEquipment());
```

- [ ] **Step 6: Commit**

```bash
git add lib/seed/equipment.ts tests/seed/equipment.test.ts lib/seed/orchestrator.ts
git commit -m "feat(seed): add seedEquipment module with 25 hardware items"
```

---

### Task 6: Create seedRegisters module

**Files:**
- Create: `lib/seed/registers.ts`
- Create: `tests/seed/registers.test.ts`

**Interfaces:**
- Consumes: `SeedResult`
- Produces: `seedRegisters(): Promise<SeedResult>`

- [ ] **Step 1: Write failing test**

```typescript
// tests/seed/registers.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { seedRegisters } from "../../lib/seed/registers";
import { db } from "../../lib/db";
import { registerItems } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

describe("seedRegisters", () => {
  beforeEach(async () => {
    await db
      .delete(registerItems)
      .where(and(eq(registerItems.packKey, "it-technician"), eq(registerItems.kind, "software")));
  });

  it("creates 8 software license records", async () => {
    const result = await seedRegisters();
    expect(result.status).toBe("seeded");
    expect(result.count).toBe(8);
  });

  it("is idempotent", async () => {
    await seedRegisters();
    const result = await seedRegisters();
    expect(result.status).toBe("skipped");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/seed/registers.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement seedRegisters**

```typescript
// lib/seed/registers.ts
import { db } from "../db";
import { registerItems } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { type SeedResult } from "./types";
import { daysFromNow, toDateOnly } from "./utils";

const SOFTWARE_LICENSES = [
  {
    title: "Microsoft 365 Business",
    fields: {
      totalLicenses: 14,
      assignedLicenses: 12,
      spareLicenses: 2,
      renewalDate: "2027-03-15",
      licenseKeyLocation: "IT admin portal → Licenses",
      purchaseDate: "2025-03-15",
    },
    status: "in_service",
  },
  {
    title: "Adobe Creative Cloud",
    fields: {
      totalLicenses: 3,
      assignedLicenses: 3,
      spareLicenses: 0,
      renewalDate: "2026-12-01",
      licenseKeyLocation: "Adobe admin console",
      purchaseDate: "2025-12-01",
      assignedTo: ["Grace Akinyi", "Denise Reece", "Francis Mwangi"],
    },
    status: "in_service",
  },
  {
    title: "QuickBooks",
    fields: {
      totalLicenses: 2,
      assignedLicenses: 2,
      spareLicenses: 0,
      renewalDate: "2027-01-10",
      licenseKeyLocation: "Intuit account → Products",
      purchaseDate: "2026-01-10",
      assignedTo: ["Amina Hassan", "Irene Chebet"],
    },
    status: "in_service",
  },
  {
    title: "Slack Business",
    fields: {
      totalLicenses: 14,
      assignedLicenses: 14,
      spareLicenses: 0,
      renewalDate: "2027-06-20",
      licenseKeyLocation: "Slack admin → Billing",
      purchaseDate: "2026-06-20",
    },
    status: "in_service",
  },
  {
    title: "Zoom Pro",
    fields: {
      totalLicenses: 1,
      assignedLicenses: 1,
      spareLicenses: 0,
      renewalDate: "2026-11-30",
      licenseKeyLocation: "Zoom admin → Account Management",
      purchaseDate: "2025-11-30",
      shared: true,
    },
    status: "in_service",
  },
  {
    title: "Antivirus Endpoint Protection",
    fields: {
      totalLicenses: 14,
      assignedLicenses: 14,
      spareLicenses: 0,
      renewalDate: "2027-04-05",
      licenseKeyLocation: "Security console → Licenses",
      purchaseDate: "2026-04-05",
    },
    status: "in_service",
  },
  {
    title: "Backup Software",
    fields: {
      totalLicenses: 3,
      assignedLicenses: 3,
      spareLicenses: 0,
      renewalDate: "2027-02-28",
      licenseKeyLocation: "Backup console → Settings",
      purchaseDate: "2026-02-28",
      assignedTo: ["AAC Kenya Server", "MCS Server", "Advocates Server"],
    },
    status: "in_service",
  },
  {
    title: "Remote Support Tool",
    fields: {
      totalLicenses: 1,
      assignedLicenses: 1,
      spareLicenses: 0,
      renewalDate: "2027-05-15",
      licenseKeyLocation: "Vendor portal → Licenses",
      purchaseDate: "2026-05-15",
      assignedTo: "IT Department",
    },
    status: "in_service",
  },
];

export async function seedRegisters(): Promise<SeedResult> {
  try {
    const existing = await db
      .select()
      .from(registerItems)
      .where(and(eq(registerItems.packKey, "it-technician"), eq(registerItems.kind, "software")))
      .limit(1);

    if (existing.length > 0) {
      console.log("Software registers already seeded, skipping");
      return { module: "registers", status: "skipped", count: 0 };
    }

    console.log("Seeding software registers...");

    for (const item of SOFTWARE_LICENSES) {
      const renewalDate = new Date(item.fields.renewalDate);
      const daysUntilRenewal = Math.ceil((renewalDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      const status = daysUntilRenewal <= 60 ? "renewal_pending" : "in_service";

      await db.insert(registerItems).values({
        packKey: "it-technician",
        kind: "software",
        title: item.title,
        fields: item.fields,
        status: item.status,
        custody: "company",
        lastVerifiedAt: toDateOnly(new Date()),
        verifyIntervalDays: 90,
        source: "manual",
      });
    }

    console.log(`Seeded ${SOFTWARE_LICENSES.length} software licenses`);
    return { module: "registers", status: "seeded", count: SOFTWARE_LICENSES.length };
  } catch (error) {
    console.error("Failed to seed registers:", error);
    return {
      module: "registers",
      status: "failed",
      count: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/seed/registers.test.ts`
Expected: PASS

- [ ] **Step 5: Add to orchestrator**

```typescript
import { seedRegisters } from "./registers";
results.push(await seedRegisters());
```

- [ ] **Step 6: Commit**

```bash
git add lib/seed/registers.ts tests/seed/registers.test.ts lib/seed/orchestrator.ts
git commit -m "feat(seed): add seedRegisters module with 8 software licenses"
```

---

## Phase 3: Playbooks & Tasks (Tasks 7-9)

### Task 7: Create seedPlaybooks module

**Files:**
- Create: `lib/seed/playbooks.ts`
- Create: `tests/seed/playbooks.test.ts`

**Interfaces:**
- Consumes: `SeedResult`, admin user ID
- Produces: `seedPlaybooks(): Promise<SeedResult>`

- [ ] **Step 1: Write failing test**

```typescript
// tests/seed/playbooks.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { seedPlaybooks } from "../../lib/seed/playbooks";
import { db } from "../../lib/db";
import { playbooks } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

describe("seedPlaybooks", () => {
  beforeEach(async () => {
    await db
      .delete(playbooks)
      .where(and(eq(playbooks.packKey, "it-technician"), eq(playbooks.discipline, "technician")));
  });

  it("creates 11 IT Technician playbooks", async () => {
    const result = await seedPlaybooks();
    expect(result.status).toBe("seeded");
    expect(result.count).toBe(11);
  });

  it("is idempotent", async () => {
    await seedPlaybooks();
    const result = await seedPlaybooks();
    expect(result.status).toBe("skipped");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/seed/playbooks.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement seedPlaybooks**

```typescript
// lib/seed/playbooks.ts
import { db } from "../db";
import { playbooks, users } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { type SeedResult } from "./types";

export async function seedPlaybooks(): Promise<SeedResult> {
  try {
    const existing = await db
      .select()
      .from(playbooks)
      .where(and(eq(playbooks.packKey, "it-technician"), eq(playbooks.discipline, "technician")))
      .limit(1);

    if (existing.length > 0) {
      console.log("Playbooks already seeded, skipping");
      return { module: "playbooks", status: "skipped", count: 0 };
    }

    console.log("Seeding playbooks...");

    // Get admin user ID
    const admin = await db.select().from(users).where(eq(users.email, "admin@jiravision.com")).limit(1);
    const authorId = admin[0]?.id;

    const playbookData = [
      {
        title: "Troubleshooting",
        summary: "Systematic approach to identifying and resolving technical issues",
        scopeKind: "support",
        method: [
          { phase: "Identify", description: "Understand exactly what is wrong", timeEstimate: 10 },
          { phase: "Reproduce", description: "Check whether it can be reproduced", timeEstimate: 15 },
          { phase: "Diagnose", description: "Identify the likely cause", timeEstimate: 20 },
          { phase: "Fix", description: "Apply the least disruptive appropriate solution", timeEstimate: 30 },
          { phase: "Test", description: "Confirm it works", timeEstimate: 10 },
          { phase: "Document", description: "Record problem, cause, solution and follow-up", timeEstimate: 15 },
        ],
        precautions: ["Document all steps taken", "Test in non-production environment first"],
        recommendations: ["Keep a knowledge base of common issues"],
        tags: ["support", "problem-solving"],
      },
      {
        title: "In-person support",
        summary: "Procedure for providing face-to-face technical assistance",
        scopeKind: "support",
        method: [
          { phase: "Receive", description: "Receive the request", timeEstimate: 5 },
          { phase: "Record", description: "Record it in the ticketing system where available", timeEstimate: 5 },
          { phase: "Identify", description: "Identify the affected user and device", timeEstimate: 5 },
          { phase: "Understand", description: "Understand symptoms and when it started", timeEstimate: 10 },
          { phase: "Check scope", description: "Check whether one user or several are affected", timeEstimate: 5 },
          { phase: "Troubleshoot", description: "Do basic troubleshooting", timeEstimate: 20 },
          { phase: "Resolve", description: "Resolve where possible", timeEstimate: 30 },
          { phase: "Test", description: "Test the solution with the user", timeEstimate: 10 },
          { phase: "Document", description: "Document the action", timeEstimate: 10 },
          { phase: "Close", description: "Close or escalate", timeEstimate: 5 },
        ],
        precautions: ["Be respectful of user's time", "Explain what you're doing"],
        recommendations: ["Follow up within 24 hours to ensure issue remains resolved"],
        tags: ["support", "face-to-face"],
      },
      {
        title: "Remote support",
        summary: "Procedure for providing technical assistance remotely",
        scopeKind: "support",
        method: [
          { phase: "Confirm identity", description: "Confirm the user's identity", timeEstimate: 5 },
          { phase: "Confirm device", description: "Confirm the device", timeEstimate: 5 },
          { phase: "Get description", description: "Get the description", timeEstimate: 10 },
          { phase: "Start session", description: "Start a session with an approved tool", timeEstimate: 5 },
          { phase: "Explain", description: "Explain what you will do before significant changes", timeEstimate: 5 },
          { phase: "Diagnose", description: "Diagnose", timeEstimate: 20 },
          { phase: "Fix", description: "Apply the fix", timeEstimate: 30 },
          { phase: "Test", description: "Test", timeEstimate: 10 },
          { phase: "Confirm", description: "Ask the user to confirm", timeEstimate: 5 },
        ],
        precautions: [
          "Never request a password unnecessarily",
          "Never save passwords in notes or tickets",
          "Do not install unauthorised software",
          "Do not disable security software without documented authorisation",
          "Do not access personal files unless needed",
          "End sessions when finished",
          "Never leave remote sessions unattended",
        ],
        recommendations: ["Record the session if possible for training purposes"],
        tags: ["support", "remote", "security"],
      },
      {
        title: "Backup procedure",
        summary: "Weekly and monthly backup verification and execution",
        scopeKind: "backup",
        method: [
          { phase: "Before: Confirm operational", description: "Confirm the backup system is operational", timeEstimate: 5 },
          { phase: "Before: Check storage", description: "Check available storage", timeEstimate: 5 },
          { phase: "Before: Review previous", description: "Review the previous backup status", timeEstimate: 5 },
          { phase: "Before: Check warnings", description: "Check unresolved warnings", timeEstimate: 5 },
          { phase: "Before: Confirm servers", description: "Confirm critical servers and services are available", timeEstimate: 5 },
          { phase: "Before: Confirm job", description: "Confirm the correct job is scheduled", timeEstimate: 5 },
          { phase: "During: Monitor progress", description: "Monitor progress", timeEstimate: 30 },
          { phase: "During: Monitor errors", description: "Monitor error messages", timeEstimate: 30 },
          { phase: "During: Monitor storage", description: "Monitor storage use", timeEstimate: 30 },
          { phase: "During: Monitor network", description: "Monitor network connectivity", timeEstimate: 30 },
          { phase: "After: Verify completion", description: "Verify it completed", timeEstimate: 5 },
          { phase: "After: Confirm no errors", description: "Confirm no critical errors", timeEstimate: 5 },
          { phase: "After: Confirm accessible", description: "Confirm files are accessible", timeEstimate: 10 },
          { phase: "After: Compare size", description: "Compare size with previous backups", timeEstimate: 5 },
          { phase: "After: Confirm destination", description: "Confirm the destination is available", timeEstimate: 5 },
          { phase: "After: Confirm retention", description: "Confirm retention is followed", timeEstimate: 5 },
          { phase: "After: Record result", description: "Record the result in the backup log", timeEstimate: 10 },
        ],
        precautions: ["Avoid unnecessary server changes during a critical backup"],
        recommendations: ["Test restore monthly"],
        tags: ["backup", "recurring", "critical"],
      },
      {
        title: "Backup test restoration",
        summary: "Monthly verification that backups can be restored",
        scopeKind: "backup",
        method: [
          { phase: "Select file", description: "Select a non-critical test file or approved dataset", timeEstimate: 10 },
          { phase: "Restore", description: "Restore it to a test location", timeEstimate: 30 },
          { phase: "Confirm opens", description: "Confirm it opens", timeEstimate: 10 },
          { phase: "Compare", description: "Compare with the original where appropriate", timeEstimate: 15 },
          { phase: "Record", description: "Record the result", timeEstimate: 10 },
        ],
        precautions: ["Report any failure immediately"],
        recommendations: ["Use different test files each month"],
        tags: ["backup", "testing", "recurring"],
      },
      {
        title: "New computer setup",
        summary: "Complete procedure for setting up a new workstation",
        scopeKind: "equipment",
        method: [
          { phase: "Record asset", description: "Record asset information", timeEstimate: 5 },
          { phase: "Install OS", description: "Install the approved OS if necessary", timeEstimate: 30 },
          { phase: "Apply updates", description: "Apply OS updates", timeEstimate: 30 },
          { phase: "Install drivers", description: "Install drivers", timeEstimate: 15 },
          { phase: "Install applications", description: "Install approved applications", timeEstimate: 30 },
          { phase: "Configure security", description: "Configure security/endpoint protection", timeEstimate: 15 },
          { phase: "Configure network", description: "Configure network access", timeEstimate: 10 },
          { phase: "Configure email", description: "Configure email/productivity apps", timeEstimate: 15 },
          { phase: "Apply settings", description: "Apply organisational settings", timeEstimate: 10 },
          { phase: "Test internet", description: "Test internet/network", timeEstimate: 5 },
          { phase: "Test applications", description: "Test required applications", timeEstimate: 15 },
          { phase: "Test printing", description: "Test printing where applicable", timeEstimate: 10 },
          { phase: "Assign device", description: "Assign the device in the asset register", timeEstimate: 5 },
          { phase: "Record handover", description: "Record the handover", timeEstimate: 10 },
        ],
        precautions: ["Verify all software licenses are valid"],
        recommendations: ["Create a checklist for consistent setup"],
        tags: ["equipment", "onboarding"],
      },
      {
        title: "Software installation",
        summary: "Procedure for installing approved software",
        scopeKind: "software",
        method: [
          { phase: "Confirm requirement", description: "Confirm the business requirement", timeEstimate: 5 },
          { phase: "Confirm approved", description: "Confirm the software is approved", timeEstimate: 5 },
          { phase: "Verify licensing", description: "Verify licensing", timeEstimate: 10 },
          { phase: "Obtain source", description: "Obtain it from a trusted source", timeEstimate: 15 },
          { phase: "Check requirements", description: "Check system requirements", timeEstimate: 5 },
          { phase: "Install", description: "Install", timeEstimate: 20 },
          { phase: "Apply updates", description: "Apply updates", timeEstimate: 10 },
          { phase: "Test", description: "Test", timeEstimate: 15 },
        ],
        precautions: ["Never install unapproved or pirated software"],
        recommendations: ["Document all installations in the software register"],
        tags: ["software", "installation"],
      },
      {
        title: "User offboarding",
        summary: "Procedure for securing assets when a user leaves",
        scopeKind: "offboarding",
        method: [
          { phase: "Collect equipment", description: "Collect company IT equipment", timeEstimate: 15 },
          { phase: "Record assets", description: "Record returned assets", timeEstimate: 10 },
          { phase: "Secure computer", description: "Secure the computer", timeEstimate: 10 },
          { phase: "Deactivate accounts", description: "Coordinate account deactivation with the appropriate administrator", timeEstimate: 15 },
          { phase: "Preserve data", description: "Preserve required business data per policy", timeEstimate: 20 },
          { phase: "Remove assignment", description: "Remove the device from the user's assignment", timeEstimate: 5 },
          { phase: "Prepare for reassignment", description: "Prepare it for reassignment or secure disposal", timeEstimate: 15 },
        ],
        precautions: ["Do not delete organisational data or disable accounts without authorisation"],
        recommendations: ["Follow HR offboarding checklist"],
        tags: ["offboarding", "security"],
      },
      {
        title: "Preventive maintenance",
        summary: "Weekly inspection and cleaning of IT equipment",
        scopeKind: "maintenance",
        method: [
          { phase: "Inspect cases", description: "Inspect and clean cases", timeEstimate: 10 },
          { phase: "Inspect vents", description: "Inspect vents and fans", timeEstimate: 10 },
          { phase: "Inspect peripherals", description: "Inspect keyboards, mice, monitors", timeEstimate: 10 },
          { phase: "Inspect printers", description: "Inspect printers", timeEstimate: 10 },
          { phase: "Inspect UPS", description: "Inspect UPS units", timeEstimate: 10 },
          { phase: "Check disk space", description: "Check disk space", timeEstimate: 5 },
          { phase: "Check CPU/RAM", description: "Check CPU, RAM usage", timeEstimate: 5 },
          { phase: "Check startup", description: "Check startup applications", timeEstimate: 5 },
          { phase: "Check processes", description: "Check background processes", timeEstimate: 5 },
          { phase: "Check updates", description: "Check OS updates", timeEstimate: 10 },
          { phase: "Check malware", description: "Check malware alerts", timeEstimate: 5 },
        ],
        precautions: [
          "Shut down equipment before cleaning where appropriate",
          "Disconnect power before opening equipment",
          "Avoid moisture",
          "Do not open equipment under warranty unless authorised",
          "Follow manufacturer instructions",
        ],
        recommendations: ["Keep a maintenance record per device"],
        tags: ["maintenance", "recurring", "weekly"],
      },
      {
        title: "Incident escalation",
        summary: "Procedure for escalating critical incidents",
        scopeKind: "incident",
        method: [
          { phase: "Assess severity", description: "Determine if incident meets escalation criteria", timeEstimate: 5 },
          { phase: "Document incident", description: "Record all required fields", timeEstimate: 15 },
          { phase: "Notify stakeholders", description: "Inform affected users and management", timeEstimate: 10 },
          { phase: "Contact vendor", description: "Engage vendor support if needed", timeEstimate: 15 },
          { phase: "Monitor resolution", description: "Track progress until resolved", timeEstimate: 60 },
          { phase: "Post-incident review", description: "Document lessons learned", timeEstimate: 30 },
        ],
        precautions: [
          "Escalate when: server unavailable, multiple departments affected, data may be lost, backup failed repeatedly, cybersecurity incident suspected, hardware needs specialist repair, network/core infrastructure problem, vendor intervention required, issue exceeds authorisation",
        ],
        recommendations: ["Every major escalation records: date/time, affected system, affected users, description, troubleshooting performed, error messages, screenshots/logs, business impact, person/vendor contacted, current status"],
        tags: ["incident", "escalation", "critical"],
      },
      {
        title: "Role handover",
        summary: "Procedure for transferring IT responsibilities",
        scopeKind: "handover",
        method: [
          { phase: "Transfer documentation", description: "Transfer access to infrastructure documentation", timeEstimate: 30 },
          { phase: "Transfer accounts", description: "Transfer accounts and systems through approved secure process", timeEstimate: 60 },
          { phase: "Transfer inventories", description: "Transfer equipment inventories", timeEstimate: 30 },
          { phase: "Review outstanding work", description: "Review outstanding work list", timeEstimate: 30 },
          { phase: "Demonstrate procedures", description: "Demonstrate critical procedures", timeEstimate: 60 },
        ],
        precautions: ["Never include credentials in documents"],
        recommendations: [
          "Confirm: responsibilities explained, server infrastructure documented, backup procedures/schedules/logs handed over, restore demonstrated, inventories/maintenance records current, open tickets reviewed, vendor contacts/maintenance schedules provided, critical procedures demonstrated, all equipment accounted for, escalation process understood",
        ],
        tags: ["handover", "documentation"],
      },
    ];

    for (const playbook of playbookData) {
      await db.insert(playbooks).values({
        packKey: "it-technician",
        discipline: "technician",
        title: playbook.title,
        summary: playbook.summary,
        scopeKind: playbook.scopeKind,
        method: playbook.method,
        steps: playbook.method,
        precautions: playbook.precautions,
        recommendations: playbook.recommendations,
        tags: playbook.tags,
        status: "published",
        version: 1,
        authorId: authorId,
        source: "manual",
        aiMarked: false,
        lastVerifiedAt: toDateOnly(new Date()),
        verifyIntervalDays: 180,
      });
    }

    console.log(`Seeded ${playbookData.length} playbooks`);
    return { module: "playbooks", status: "seeded", count: playbookData.length };
  } catch (error) {
    console.error("Failed to seed playbooks:", error);
    return {
      module: "playbooks",
      status: "failed",
      count: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/seed/playbooks.test.ts`
Expected: PASS

- [ ] **Step 5: Add to orchestrator**

```typescript
import { seedPlaybooks } from "./playbooks";
results.push(await seedPlaybooks());
```

- [ ] **Step 6: Commit**

```bash
git add lib/seed/playbooks.ts tests/seed/playbooks.test.ts lib/seed/orchestrator.ts
git commit -m "feat(seed): add seedPlaybooks module with 11 IT Technician playbooks"
```

---

### Task 8: Create seedTasks module

**Files:**
- Create: `lib/seed/tasks.ts`
- Create: `tests/seed/tasks.test.ts`

**Interfaces:**
- Consumes: `SeedResult`, user IDs, playbook IDs
- Produces: `seedTasks(): Promise<SeedResult>`

- [ ] **Step 1: Write failing test**

```typescript
// tests/seed/tasks.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { seedTasks } from "../../lib/seed/tasks";
import { db } from "../../lib/db";
import { tasks } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

describe("seedTasks", () => {
  beforeEach(async () => {
    await db
      .delete(tasks)
      .where(and(eq(tasks.discipline, "technician"), eq(tasks.priority, "critical")));
  });

  it("creates 15 support tickets and 8 recurring tasks", async () => {
    const result = await seedTasks();
    expect(result.status).toBe("seeded");
    expect(result.count).toBe(23); // 15 tickets + 8 recurring
  });

  it("is idempotent", async () => {
    await seedTasks();
    const result = await seedTasks();
    expect(result.status).toBe("skipped");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/seed/tasks.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement seedTasks**

```typescript
// lib/seed/tasks.ts
import { db } from "../db";
import { tasks, users, playbooks } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { type SeedResult } from "./types";
import { daysAgo, daysFromNow, toDateOnly } from "./utils";

export async function seedTasks(): Promise<SeedResult> {
  try {
    const existing = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.discipline, "technician"), eq(tasks.priority, "critical")))
      .limit(1);

    if (existing.length > 0) {
      console.log("Tasks already seeded, skipping");
      return { module: "tasks", status: "skipped", count: 0 };
    }

    console.log("Seeding tasks...");

    const allUsers = await db.select().from(users);
    const userMap = new Map(allUsers.map(u => [u.name, u.id]));
    const adminId = userMap.get("Admin User");
    const jamesId = userMap.get("James Otieno");

    const allPlaybooks = await db.select().from(playbooks).where(eq(playbooks.packKey, "it-technician"));
    const backupPlaybook = allPlaybooks.find(p => p.title === "Backup procedure");

    const taskData = [
      // Critical (1)
      { title: "MCS Server offline", description: "MCS Server went offline affecting 8 users. Escalated to vendor. Power supply failure identified. Replacement ordered and installed. Server restored after 4-hour downtime.", status: "completed", priority: "critical", assigneeId: adminId, dueDate: toDateOnly(daysAgo(18)), tags: ["incident", "server", "critical"], metadata: { requester: "Brian Ochieng", affectedUsers: 8, downtime: "4 hours", rootCause: "Power supply failure", resolution: "Vendor replacement", businessImpact: "High" } },
      
      // High (3)
      { title: "Advocates Server backup failed 2 nights running", description: "Backup jobs for Advocates/Insurance Server failed on 2026-10-27 and 2026-10-28. Investigating root cause. Storage capacity check scheduled.", status: "in_progress", priority: "high", assigneeId: adminId, dueDate: toDateOnly(daysAgo(3)), tags: ["backup", "server", "investigation"], metadata: { requester: "System alert", server: "Advocates/Insurance", failedDates: ["2026-10-27", "2026-10-28"] } },
      { title: "Wi-Fi down on 2nd floor", description: "Access point on 2nd floor failed. Replaced with spare unit. Monitoring for stability. 15 users affected during 2-hour outage.", status: "completed", priority: "high", assigneeId: adminId, dueDate: toDateOnly(daysAgo(11)), tags: ["network", "wifi", "incident"], metadata: { requester: "Multiple users", affectedUsers: 15, downtime: "2 hours", resolution: "Access point replaced" } },
      { title: "Francis's laptop hard drive failing", description: "Francis reported slow performance and clicking sounds. Diagnosed as hard drive degradation. Data backed up immediately. Replacement drive ordered. Expected delivery in 3 days.", status: "in_progress", priority: "high", assigneeId: adminId, dueDate: toDateOnly(daysAgo(5)), tags: ["equipment", "laptop", "hardware"], metadata: { requester: "Francis Mwangi", device: "Dell Latitude 5520", issue: "Hard drive degradation", action: "Data backed up, replacement ordered" } },

      // Medium (6)
      { title: "Amina's printer jamming frequently", description: "HP LaserJet in Finance office jamming 3-4 times daily. Cleaned and serviced twice. Scheduled for replacement next week.", status: "todo", priority: "medium", assigneeId: jamesId, dueDate: toDateOnly(daysFromNow(3)), tags: ["equipment", "printer"], metadata: { requester: "Amina Hassan", device: "HP LaserJet Pro M404 - Finance", issue: "Frequent paper jams" } },
      { title: "David can't connect to VPN from home", description: "David reported VPN connection failures. Diagnosed as configuration issue. Reconfigured VPN client. Tested successfully.", status: "completed", priority: "medium", assigneeId: adminId, dueDate: toDateOnly(daysAgo(13)), tags: ["network", "vpn", "remote"], metadata: { requester: "David Kimani", issue: "VPN configuration", resolution: "Reconfigured client" } },
      { title: "Canon printer in Marketing showing error code", description: "Canon imageCLASS showing error code 005. Diagnosed as low toner. Replaced toner cartridge. Printer operational.", status: "completed", priority: "medium", assigneeId: jamesId, dueDate: toDateOnly(daysAgo(15)), tags: ["equipment", "printer"], metadata: { requester: "Grace Akinyi", device: "Canon imageCLASS MF269dw", errorCode: "005", resolution: "Toner replaced" } },
      { title: "HR needs 2 new user accounts for upcoming hires", description: "HR requested 2 new user accounts for employees starting 2026-11-10. Pending manager approval. Accounts will be created once approved.", status: "todo", priority: "medium", assigneeId: adminId, dueDate: toDateOnly(daysFromNow(8)), tags: ["accounts", "onboarding"], metadata: { requester: "Catherine Wanjiku", department: "HR", startDate: "2026-11-10", count: 2, status: "Pending approval" } },
      { title: "QuickBooks slow on month-end", description: "Amina reported QuickBooks performance degradation during month-end processing. Database optimization scheduled for next maintenance window.", status: "todo", priority: "medium", assigneeId: adminId, dueDate: toDateOnly(daysAgo(6)), tags: ["software", "performance"], metadata: { requester: "Amina Hassan", software: "QuickBooks", issue: "Slow performance during month-end" } },
      { title: "Backup storage at 85% capacity", description: "Cloud backup storage reached 85% capacity. Need to archive old backups and expand storage. Quote requested from vendor.", status: "in_progress", priority: "medium", assigneeId: adminId, dueDate: toDateOnly(daysAgo(7)), tags: ["backup", "storage"], metadata: { currentCapacity: "85%", action: "Archive old backups, expand storage" } },

      // Low (5)
      { title: "Grace wants Adobe Illustrator update", description: "Grace requested update to latest Adobe Illustrator version. Scheduled for next maintenance window to avoid disruption.", status: "todo", priority: "low", assigneeId: jamesId, dueDate: toDateOnly(daysAgo(4)), tags: ["software", "update"], metadata: { requester: "Grace Akinyi", software: "Adobe Illustrator", action: "Update scheduled" } },
      { title: "Henry needs second monitor for workstation", description: "Henry requested second monitor for improved productivity. Purchase request submitted. Awaiting budget approval.", status: "todo", priority: "low", assigneeId: adminId, dueDate: toDateOnly(daysAgo(9)), tags: ["equipment", "purchase"], metadata: { requester: "Henry Kipchoge", item: "Second monitor", status: "Purchase request submitted" } },
      { title: "Catherine's mouse scroll wheel sticky", description: "Catherine reported mouse scroll wheel becoming sticky. Cleaning scheduled during next preventive maintenance round.", status: "todo", priority: "low", assigneeId: jamesId, dueDate: toDateOnly(daysAgo(10)), tags: ["equipment", "peripheral"], metadata: { requester: "Catherine Wanjiku", device: "Mouse", issue: "Sticky scroll wheel" } },
      { title: "James wants to install VS Code on his machine", description: "James requested VS Code installation for development work. Approved by manager. Pending installation during next available window.", status: "todo", priority: "low", assigneeId: adminId, dueDate: toDateOnly(daysAgo(2)), tags: ["software", "installation"], metadata: { requester: "James Otieno", software: "VS Code", status: "Approved, pending installation" } },
      { title: "Esther needs presentation clicker", description: "Esther requested wireless presentation clicker for client meetings. Ordered from vendor. Expected delivery in 5 business days.", status: "in_progress", priority: "low", assigneeId: jamesId, dueDate: toDateOnly(daysAgo(12)), tags: ["equipment", "purchase"], metadata: { requester: "Esther Njeri", item: "Presentation clicker", status: "Ordered, in transit" } },
    ];

    // Insert support tickets
    for (const task of taskData) {
      await db.insert(tasks).values({
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        assigneeId: task.assigneeId,
        dueDate: task.dueDate,
        tags: task.tags,
        discipline: "technician",
        cadence: "one-off",
        metadata: task.metadata,
      });
    }

    // Create recurring task templates
    const recurringTemplates = [
      { title: "Daily: Check backup status", cadence: "daily", description: "Verify all backup jobs completed successfully. Check backup console for Green/Success status. Review any warnings or errors." },
      { title: "Weekly: Preventive maintenance inspection", cadence: "weekly", description: "Inspect and clean equipment. Check disk space, CPU, RAM. Review OS updates. Check malware alerts." },
      { title: "Weekly: Review support tickets", cadence: "weekly", description: "Review all open support tickets. Follow up on pending items. Update ticket status." },
      { title: "Monthly: Test backup restoration", cadence: "monthly", description: "Select test file. Restore to test location. Verify integrity. Document results." },
      { title: "Monthly: Review hardware inventory", cadence: "monthly", description: "Update asset register. Verify equipment locations. Check warranty status." },
      { title: "Monthly: Review software licenses", cadence: "monthly", description: "Check license counts. Verify renewals. Update software inventory." },
      { title: "Quarterly: Review backup procedures", cadence: "quarterly", description: "Test full restore. Review retention policy. Update documentation." },
      { title: "Quarterly: Review IT security controls", cadence: "quarterly", description: "Review access logs. Check firewall rules. Update security policies." },
    ];

    for (const template of recurringTemplates) {
      await db.insert(tasks).values({
        title: template.title,
        description: template.description,
        status: "todo",
        priority: "medium",
        assigneeId: adminId,
        discipline: "technician",
        cadence: template.cadence,
        isTemplate: true,
        tags: ["recurring", template.cadence],
      });
    }

    const totalCount = taskData.length + recurringTemplates.length;
    console.log(`Seeded ${totalCount} tasks (${taskData.length} tickets + ${recurringTemplates.length} recurring)`);
    return { module: "tasks", status: "seeded", count: totalCount };
  } catch (error) {
    console.error("Failed to seed tasks:", error);
    return {
      module: "tasks",
      status: "failed",
      count: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/seed/tasks.test.ts`
Expected: PASS

- [ ] **Step 5: Add to orchestrator**

```typescript
import { seedTasks } from "./tasks";
results.push(await seedTasks());
```

- [ ] **Step 6: Commit**

```bash
git add lib/seed/tasks.ts tests/seed/tasks.test.ts lib/seed/orchestrator.ts
git commit -m "feat(seed): add seedTasks module with 15 tickets and 8 recurring tasks"
```

---

### Task 9: Create seedWorklogs module

**Files:**
- Create: `lib/seed/worklogs.ts`
- Create: `tests/seed/worklogs.test.ts`

**Interfaces:**
- Consumes: `SeedResult`, user IDs, task IDs
- Produces: `seedWorklogs(): Promise<SeedResult>`

- [ ] **Step 1: Write failing test**

```typescript
// tests/seed/worklogs.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { seedWorklogs } from "../../lib/seed/worklogs";
import { db } from "../../lib/db";
import { workLogEntries } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

describe("seedWorklogs", () => {
  beforeEach(async () => {
    await db.delete(workLogEntries).where(eq(workLogEntries.discipline, "technician"));
  });

  it("creates 40 work log entries", async () => {
    const result = await seedWorklogs();
    expect(result.status).toBe("seeded");
    expect(result.count).toBe(40);
  });

  it("is idempotent", async () => {
    await seedWorklogs();
    const result = await seedWorklogs();
    expect(result.status).toBe("skipped");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/seed/worklogs.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement seedWorklogs**

```typescript
// lib/seed/worklogs.ts
import { db } from "../db";
import { workLogEntries, users, tasks } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { type SeedResult } from "./types";
import { daysAgo, toDateOnly } from "./utils";

export async function seedWorklogs(): Promise<SeedResult> {
  try {
    const existing = await db
      .select()
      .from(workLogEntries)
      .where(eq(workLogEntries.discipline, "technician"))
      .limit(1);

    if (existing.length > 0) {
      console.log("Worklogs already seeded, skipping");
      return { module: "worklogs", status: "skipped", count: 0 };
    }

    console.log("Seeding worklogs...");

    const allUsers = await db.select().from(users);
    const adminId = allUsers.find(u => u.email === "admin@jiravision.com")?.id;

    const allTasks = await db.select().from(tasks).where(eq(tasks.discipline, "technician"));
    const mcsTask = allTasks.find(t => t.title.includes("MCS Server"));
    const wifiTask = allTasks.find(t => t.title.includes("Wi-Fi down"));
    const francisTask = allTasks.find(t => t.title.includes("Francis"));

    const worklogData = [
      // Recent (last 7 days)
      { workedOn: daysAgo(1), kind: "maintenance", title: "Replaced Wi-Fi access point on 2nd floor", body: "Removed faulty access point. Installed spare Ubiquiti UniFi AP. Configured with corporate SSID. Tested connectivity with 5 devices. All working normally.", minutes: 120, taskId: wifiTask?.id },
      { workedOn: daysAgo(2), kind: "support", title: "Diagnosed Francis's hard drive failure", body: "Francis reported slow performance and clicking sounds. Ran diagnostic tools. Confirmed hard drive degradation. Backed up all data to external drive. Ordered replacement SSD.", minutes: 90, taskId: francisTask?.id },
      { workedOn: daysAgo(3), kind: "action", title: "Restored MCS Server from backup", body: "MCS Server went offline due to power supply failure. Restored from cloud backup. Verified all data integrity. Tested applications. Server operational after 4-hour downtime.", minutes: 240, taskId: mcsTask?.id },
      { workedOn: daysAgo(4), kind: "maintenance", title: "Updated antivirus definitions on all machines", body: "Pushed latest antivirus updates to all 14 workstations and 3 servers. Verified all systems protected. No threats detected.", minutes: 60 },
      { workedOn: daysAgo(5), kind: "support", title: "Configured VPN for David's home office", body: "David reported VPN connection failures. Remote session to diagnose. Found configuration mismatch. Reconfigured VPN client. Tested connection successfully.", minutes: 45 },
      { workedOn: daysAgo(6), kind: "support", title: "Installed Adobe updates for Grace", body: "Grace requested Adobe Illustrator update. Downloaded latest version from official source. Installed on her machine. Tested functionality. All features working.", minutes: 30 },
      { workedOn: daysAgo(7), kind: "maintenance", title: "Weekly preventive maintenance inspection", body: "Inspected all servers. Checked disk space (all under 80%). Reviewed CPU/RAM usage (normal). Checked for OS updates (2 pending). No malware alerts.", minutes: 180 },

      // Historical (8-30 days ago)
      { workedOn: daysAgo(8), kind: "maintenance", title: "Monthly backup test restoration", body: "Selected test file from AAC Kenya Server backup. Restored to test location. Verified file integrity. Compared with original. Restoration successful.", minutes: 120 },
      { workedOn: daysAgo(10), kind: "maintenance", title: "Quarterly hardware inspection", body: "Inspected all 25 equipment items. Checked physical condition. Verified serial numbers match register. Tested UPS battery levels. All within acceptable range.", minutes: 360 },
      { workedOn: daysAgo(12), kind: "support", title: "Resolved printer jam for Amina", body: "Amina reported frequent paper jams. Inspected HP LaserJet in Finance. Found paper debris in feed path. Cleaned thoroughly. Tested with 20 pages. No further jams.", minutes: 30 },
      { workedOn: daysAgo(15), kind: "maintenance", title: "Server room UPS battery replacement", body: "APC Smart-UPS 1500VA showing battery warning. Replaced battery pack. Tested UPS under load. Battery status normal. Runtime extended to rated capacity.", minutes: 120 },
      { workedOn: daysAgo(18), kind: "maintenance", title: "Software license audit and reconciliation", body: "Reviewed all 8 software licenses. Verified license counts match usage. Checked renewal dates. Adobe Creative Cloud renewal due in 30 days. Microsoft 365 has 2 spare licenses.", minutes: 240 },
      { workedOn: daysAgo(20), kind: "maintenance", title: "Network switch firmware update", body: "Updated Cisco Catalyst 2960 to latest firmware. Scheduled during maintenance window. Switch rebooted successfully. All ports operational. No connectivity issues reported.", minutes: 90 },
      { workedOn: daysAgo(22), kind: "support", title: "Onboarded Catherine: laptop setup and training", body: "Set up new Dell Latitude for Catherine. Installed Windows 11. Applied all updates. Installed Office 365, Slack, Zoom. Configured email. Trained on company tools. Handed over with documentation.", minutes: 180 },
      { workedOn: daysAgo(25), kind: "action", title: "Responded to security alert: unusual login attempt", body: "Received alert for failed login attempts on admin account. Investigated logs. Found brute force attempt from foreign IP. Blocked IP range. Verified no compromise. Enhanced monitoring.", minutes: 60 },
      { workedOn: daysAgo(28), kind: "maintenance", title: "Monthly inventory review", body: "Updated asset register with recent changes. Verified equipment locations. Checked warranty status for upcoming expirations. Reviewed disposal queue.", minutes: 120 },
      { workedOn: daysAgo(30), kind: "support", title: "Assisted Brian with server access request", body: "Brian requested access to MCS Server for backup monitoring. Verified authorization. Created user account with appropriate permissions. Tested access. Provided documentation.", minutes: 45 },
    ];

    // Generate additional entries to reach 40 total
    const additionalEntries = [];
    for (let i = 32; i <= 40; i++) {
      additionalEntries.push({
        workedOn: daysAgo(i),
        kind: i % 3 === 0 ? "maintenance" : i % 3 === 1 ? "support" : "action",
        title: `Routine IT support task ${i - 31}`,
        body: `Completed standard IT support activity. Documented actions taken. Updated relevant records. No issues encountered.`,
        minutes: 30 + Math.floor(Math.random() * 90),
      });
    }

    const allEntries = [...worklogData, ...additionalEntries];

    for (const entry of allEntries) {
      await db.insert(workLogEntries).values({
        userId: adminId!,
        workedOn: toDateOnly(entry.workedOn),
        taskId: entry.taskId || null,
        kind: entry.kind,
        title: entry.title,
        body: entry.body,
        minutes: entry.minutes,
        discipline: "technician",
        source: "manual",
      });
    }

    console.log(`Seeded ${allEntries.length} work log entries`);
    return { module: "worklogs", status: "seeded", count: allEntries.length };
  } catch (error) {
    console.error("Failed to seed worklogs:", error);
    return {
      module: "worklogs",
      status: "failed",
      count: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/seed/worklogs.test.ts`
Expected: PASS

- [ ] **Step 5: Add to orchestrator**

```typescript
import { seedWorklogs } from "./worklogs";
results.push(await seedWorklogs());
```

- [ ] **Step 6: Commit**

```bash
git add lib/seed/worklogs.ts tests/seed/worklogs.test.ts lib/seed/orchestrator.ts
git commit -m "feat(seed): add seedWorklogs module with 40 work entries"
```

---

## Phase 4: Operations & Calendar (Tasks 10-12)

### Task 10: Create seedOperations module

**Files:**
- Create: `lib/seed/operations.ts`
- Create: `tests/seed/operations.test.ts`

**Interfaces:**
- Consumes: `SeedResult`, user IDs
- Produces: `seedOperations(): Promise<SeedResult>`

- [ ] **Step 1: Write failing test**

```typescript
// tests/seed/operations.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { seedOperations } from "../../lib/seed/operations";
import { db } from "../../lib/db";
import { opsLogEntries } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

describe("seedOperations", () => {
  beforeEach(async () => {
    await db.delete(opsLogEntries).where(eq(opsLogEntries.packKey, "it-technician"));
  });

  it("creates 20 ops log entries and 3 incident reports", async () => {
    const result = await seedOperations();
    expect(result.status).toBe("seeded");
    expect(result.count).toBe(23); // 20 ops + 3 incidents
  });

  it("is idempotent", async () => {
    await seedOperations();
    const result = await seedOperations();
    expect(result.status).toBe("skipped");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/seed/operations.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement seedOperations**

```typescript
// lib/seed/operations.ts
import { db } from "../db";
import { opsLogEntries, users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { type SeedResult } from "./types";
import { daysAgo, toDateOnly } from "./utils";

export async function seedOperations(): Promise<SeedResult> {
  try {
    const existing = await db
      .select()
      .from(opsLogEntries)
      .where(eq(opsLogEntries.packKey, "it-technician"))
      .limit(1);

    if (existing.length > 0) {
      console.log("Operations already seeded, skipping");
      return { module: "operations", status: "skipped", count: 0 };
    }

    console.log("Seeding operations...");

    const allUsers = await db.select().from(users);
    const adminId = allUsers.find(u => u.email === "admin@jiravision.com")?.id;

    const opsData = [
      // 10 backup operations (last 10 nights)
      ...Array.from({ length: 10 }, (_, i) => ({
        entityKey: "backup",
        occurredAt: daysAgo(i + 1),
        status: i === 2 || i === 5 ? "warning" : "success",
        fields: {
          server: ["AAC Kenya", "MCS", "Advocates"][i % 3],
          type: i % 7 === 0 ? "full" : "incremental",
          size: `${Math.floor(Math.random() * 500) + 100}GB`,
          duration: `${Math.floor(Math.random() * 120) + 30} minutes`,
          warnings: i === 2 ? "Storage at 85% capacity" : i === 5 ? "Slow network transfer" : null,
        },
      })),

      // 5 maintenance operations
      { entityKey: "maintenance", occurredAt: daysAgo(7), status: "completed", fields: { type: "weekly_inspection", items: 25, issues: 0 } },
      { entityKey: "maintenance", occurredAt: daysAgo(14), status: "completed", fields: { type: "weekly_inspection", items: 25, issues: 1, issueDetails: "Printer toner low" } },
      { entityKey: "maintenance", occurredAt: daysAgo(21), status: "completed", fields: { type: "weekly_inspection", items: 25, issues: 0 } },
      { entityKey: "maintenance", occurredAt: daysAgo(28), status: "completed", fields: { type: "weekly_inspection", items: 25, issues: 2, issueDetails: "UPS battery warning, disk space low" } },
      { entityKey: "maintenance", occurredAt: daysAgo(10), status: "completed", fields: { type: "quarterly_hardware_inspection", items: 25, duration: "6 hours" } },

      // 3 incident responses
      { entityKey: "incident", occurredAt: daysAgo(18), status: "resolved", fields: { type: "server_outage", server: "MCS Server", duration: "4 hours", affectedUsers: 8, rootCause: "Power supply failure", resolution: "Vendor replacement", businessImpact: "High" } },
      { entityKey: "incident", occurredAt: daysAgo(11), status: "resolved", fields: { type: "network_failure", component: "Wi-Fi access point", location: "2nd floor", duration: "2 hours", affectedUsers: 15, rootCause: "Hardware fault", resolution: "Access point replaced", businessImpact: "Medium" } },
      { entityKey: "incident", occurredAt: daysAgo(5), status: "resolved", fields: { type: "hardware_failure", device: "Laptop hard drive", user: "Francis Mwangi", duration: "1 hour", affectedUsers: 1, rootCause: "Drive degradation", resolution: "Data backed up, replacement ordered", businessImpact: "Low" } },

      // 2 security operations
      { entityKey: "security", occurredAt: daysAgo(4), status: "completed", fields: { type: "antivirus_update", machines: 17, threats: 0 } },
      { entityKey: "security", occurredAt: daysAgo(25), status: "completed", fields: { type: "firewall_rule_change", rules: 3, description: "Blocked foreign IP range after brute force attempt" } },
    ];

    for (const op of opsData) {
      await db.insert(opsLogEntries).values({
        packKey: "it-technician",
        entityKey: op.entityKey,
        ownerId: adminId!,
        occurredAt: op.occurredAt,
        status: op.status,
        fields: op.fields,
        source: op.entityKey === "backup" && op.occurredAt < daysAgo(2) ? "automated" : "manual",
      });
    }

    const totalCount = opsData.length;
    console.log(`Seeded ${totalCount} operations log entries`);
    return { module: "operations", status: "seeded", count: totalCount };
  } catch (error) {
    console.error("Failed to seed operations:", error);
    return {
      module: "operations",
      status: "failed",
      count: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/seed/operations.test.ts`
Expected: PASS

- [ ] **Step 5: Add to orchestrator**

```typescript
import { seedOperations } from "./operations";
results.push(await seedOperations());
```

- [ ] **Step 6: Commit**

```bash
git add lib/seed/operations.ts tests/seed/operations.test.ts lib/seed/orchestrator.ts
git commit -m "feat(seed): add seedOperations module with 20 ops logs and 3 incidents"
```

---

### Task 11: Create seedCalendar module

**Files:**
- Create: `lib/seed/calendar.ts`
- Create: `tests/seed/calendar.test.ts`

**Interfaces:**
- Consumes: `SeedResult`, user IDs
- Produces: `seedCalendar(): Promise<SeedResult>`

- [ ] **Step 1: Write failing test**

```typescript
// tests/seed/calendar.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { seedCalendar } from "../../lib/seed/calendar";
import { db } from "../../lib/db";
import { calendarEvents } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

describe("seedCalendar", () => {
  beforeEach(async () => {
    await db.delete(calendarEvents).where(eq(calendarEvents.eventType, "maintenance"));
  });

  it("creates 12 calendar events", async () => {
    const result = await seedCalendar();
    expect(result.status).toBe("seeded");
    expect(result.count).toBe(12);
  });

  it("is idempotent", async () => {
    await seedCalendar();
    const result = await seedCalendar();
    expect(result.status).toBe("skipped");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/seed/calendar.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement seedCalendar**

Creates 12 calendar events (5 upcoming, 3 past, 3 recurring with multiple instances). Each event includes title, description, startTime, endTime, eventType (maintenance/meeting/reminder), organizerId (admin), attendees (JSONB array), location, color, isRecurring, recurringPattern.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/seed/calendar.test.ts`
Expected: PASS

- [ ] **Step 5: Add to orchestrator**

```typescript
import { seedCalendar } from "./calendar";
results.push(await seedCalendar());
```

- [ ] **Step 6: Commit**

```bash
git add lib/seed/calendar.ts tests/seed/calendar.test.ts lib/seed/orchestrator.ts
git commit -m "feat(seed): add seedCalendar module with 12 events"
```

---

### Task 12: Create seedAnalytics module

**Files:**
- Create: `lib/seed/analytics.ts`
- Create: `tests/seed/analytics.test.ts`

**Interfaces:**
- Consumes: `SeedResult`, user IDs
- Produces: `seedAnalytics(): Promise<SeedResult>`

- [ ] **Step 1: Write failing test**

```typescript
// tests/seed/analytics.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { seedAnalytics } from "../../lib/seed/analytics";
import { db } from "../../lib/db";
import { gamification, wellbeingMetrics, ethicalMetrics, aiInsights } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

describe("seedAnalytics", () => {
  beforeEach(async () => {
    await db.delete(gamification).where(eq(gamification.level, 5));
    await db.delete(wellbeingMetrics).where(eq(wellbeingMetrics.mood, "energized"));
    await db.delete(ethicalMetrics).where(eq(ethicalMetrics.payEquityScore, 88));
    await db.delete(aiInsights).where(eq(aiInsights.type, "recommendation"));
  });

  it("creates gamification, wellbeing, ethical metrics, and AI insights", async () => {
    const result = await seedAnalytics();
    expect(result.status).toBe("seeded");
    expect(result.count).toBeGreaterThan(0);
  });

  it("is idempotent", async () => {
    await seedAnalytics();
    const result = await seedAnalytics();
    expect(result.status).toBe("skipped");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/seed/analytics.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement seedAnalytics**

Creates:
- Gamification for admin (level 5, XP 2450, 4 achievements, 3 skill trees, 3 rewards)
- Wellbeing metrics for last 14 days (wellbeing score, mood, workload, stress level, overtime hours)
- Ethical metrics for last 30 days (pay equity, workload balance, DEI, overtime compliance)
- 3 AI insights (recommendations and patterns)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/seed/analytics.test.ts`
Expected: PASS

- [ ] **Step 5: Add to orchestrator**

```typescript
import { seedAnalytics } from "./analytics";
results.push(await seedAnalytics());
```

- [ ] **Step 6: Commit**

```bash
git add lib/seed/analytics.ts tests/seed/analytics.test.ts lib/seed/orchestrator.ts
git commit -m "feat(seed): add seedAnalytics module with gamification, metrics, insights"
```

---

## Phase 5: Integration & Testing (Tasks 13-16)

### Task 13: Create full integration test

**Files:**
- Modify: `tests/seed/orchestrator.test.ts`

**Interfaces:**
- Consumes: All seed modules
- Produces: Integration test verifying full seed

- [ ] **Step 1: Expand orchestrator test**

Add to `tests/seed/orchestrator.test.ts`:

```typescript
it("seeds all domains with correct counts", async () => {
  const results = await seedComprehensiveData();
  
  // Verify all modules ran
  expect(results.length).toBe(10);
  
  // Verify counts
  const usersResult = results.find(r => r.module === "users");
  expect(usersResult?.count).toBe(10);
  
  const infraResult = results.find(r => r.module === "infrastructure");
  expect(infraResult?.count).toBe(5);
  
  const equipResult = results.find(r => r.module === "equipment");
  expect(equipResult?.count).toBe(25);
  
  const playbooksResult = results.find(r => r.module === "playbooks");
  expect(playbooksResult?.count).toBe(11);
  
  const registersResult = results.find(r => r.module === "registers");
  expect(registersResult?.count).toBe(8);
  
  const tasksResult = results.find(r => r.module === "tasks");
  expect(tasksResult?.count).toBe(23);
  
  const worklogsResult = results.find(r => r.module === "worklogs");
  expect(worklogsResult?.count).toBe(40);
  
  const opsResult = results.find(r => r.module === "operations");
  expect(opsResult?.count).toBe(23);
  
  const calendarResult = results.find(r => r.module === "calendar");
  expect(calendarResult?.count).toBe(12);
  
  const analyticsResult = results.find(r => r.module === "analytics");
  expect(analyticsResult?.count).toBeGreaterThan(0);
});

it("maintains referential integrity", async () => {
  await seedComprehensiveData();
  
  // Verify equipment references valid users
  const equipment = await db
    .select()
    .from(registerItems)
    .where(eq(registerItems.kind, "equipment"));
  
  for (const item of equipment) {
    if (item.ownerId) {
      const user = await db.select().from(users).where(eq(users.id, item.ownerId));
      expect(user.length).toBe(1);
    }
  }
  
  // Verify tasks reference valid users
  const tasks = await db.select().from(tasksTable).where(eq(tasksTable.discipline, "technician"));
  for (const task of tasks) {
    if (task.assigneeId) {
      const user = await db.select().from(users).where(eq(users.id, task.assigneeId));
      expect(user.length).toBe(1);
    }
  }
});
```

- [ ] **Step 2: Run integration test**

Run: `npx vitest run tests/seed/orchestrator.test.ts`
Expected: PASS (all tests)

- [ ] **Step 3: Commit**

```bash
git add tests/seed/orchestrator.test.ts
git commit -m "test(seed): add full integration test for orchestrator"
```

---

### Task 14: Create validation queries

**Files:**
- Create: `lib/seed/validate.ts`
- Create: `scripts/validate-seed.mjs`

**Interfaces:**
- Consumes: Database connection
- Produces: Validation report

- [ ] **Step 1: Create validate.ts**

```typescript
// lib/seed/validate.ts
import { db } from "../db";
import { sql } from "drizzle-orm";

export async function validateSeedData(): Promise<void> {
  const checks = [
    { name: "Users", query: "SELECT COUNT(*) as count FROM users WHERE department IN ('Finance', 'Operations', 'HR', 'Sales', 'Management', 'Engineering', 'Marketing', 'IT Support')" },
    { name: "Equipment", query: "SELECT COUNT(*) as count FROM register_items WHERE pack_key = 'it-technician' AND kind = 'equipment'" },
    { name: "Infrastructure", query: "SELECT COUNT(*) as count FROM register_items WHERE pack_key = 'it-technician' AND kind = 'infrastructure'" },
    { name: "Software Licenses", query: "SELECT COUNT(*) as count FROM register_items WHERE pack_key = 'it-technician' AND kind = 'software'" },
    { name: "Playbooks", query: "SELECT COUNT(*) as count FROM playbooks WHERE pack_key = 'it-technician' AND discipline = 'technician'" },
    { name: "Tasks", query: "SELECT COUNT(*) as count FROM tasks WHERE discipline = 'technician'" },
    { name: "Worklogs", query: "SELECT COUNT(*) as count FROM work_log_entries WHERE discipline = 'technician'" },
    { name: "Ops Logs", query: "SELECT COUNT(*) as count FROM ops_log_entries WHERE pack_key = 'it-technician'" },
    { name: "Calendar Events", query: "SELECT COUNT(*) as count FROM calendar_events WHERE organizer_id IN (SELECT id FROM users WHERE department = 'IT Support')" },
    { name: "Gamification", query: "SELECT COUNT(*) as count FROM gamification WHERE level = 5" },
    { name: "Wellbeing Metrics", query: "SELECT COUNT(*) as count FROM wellbeing_metrics WHERE mood = 'energized'" },
    { name: "Ethical Metrics", query: "SELECT COUNT(*) as count FROM ethical_metrics WHERE pay_equity_score = 88" },
    { name: "AI Insights", query: "SELECT COUNT(*) as count FROM ai_insights WHERE type = 'recommendation'" },
  ];

  console.log("Validating seed data...\n");

  for (const check of checks) {
    const result = await db.execute(sql.raw(check.query));
    const count = result[0]?.count || 0;
    console.log(`${check.name}: ${count} records`);
  }

  console.log("\nValidation complete.");
}
```

- [ ] **Step 2: Create validation script**

```javascript
// scripts/validate-seed.mjs
import { validateSeedData } from "../lib/seed/validate.ts";

validateSeedData().catch(console.error);
```

- [ ] **Step 3: Test validation script**

Run: `node scripts/validate-seed.mjs`
Expected: Prints counts for all 13 checks

- [ ] **Step 4: Commit**

```bash
git add lib/seed/validate.ts scripts/validate-seed.mjs
git commit -m "feat(seed): add validation queries and script"
```

---

### Task 15: Manual testing on fresh database

**Files:**
- None (manual testing)

**Interfaces:**
- Consumes: Fresh database
- Produces: Verification that all pages show data

- [ ] **Step 1: Reset database**

Run: `npm run db:reset` (or equivalent to drop and recreate tables)

- [ ] **Step 2: Run seed**

Run: `node scripts/validate-seed.mjs`
Expected: All counts > 0

- [ ] **Step 3: Start dev server**

Run: `npm run dev`

- [ ] **Step 4: Check each dashboard page visually**

Navigate to each page and verify data is displayed:
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

- [ ] **Step 5: Verify idempotency**

Run seed again: `node scripts/validate-seed.mjs`
Expected: All counts unchanged (no duplicates)

- [ ] **Step 6: Document results**

Create `docs/seed-testing-results.md` with:
- Date tested
- Database state (fresh/reset)
- Page-by-page verification results
- Any issues found
- Screenshots (optional)

- [ ] **Step 7: Commit**

```bash
git add docs/seed-testing-results.md
git commit -m "docs(seed): add manual testing results"
```

---

### Task 16: Performance optimization

**Files:**
- Modify: `lib/seed/orchestrator.ts`
- Modify: Individual seed modules as needed

**Interfaces:**
- Consumes: Seed modules
- Produces: Optimized seed (< 30 seconds)

- [ ] **Step 1: Measure current performance**

Add timing to orchestrator:

```typescript
const startTime = Date.now();
// ... run all seeds ...
const elapsed = Date.now() - startTime;
console.log(`Total seed time: ${elapsed}ms`);
```

Run: `node scripts/validate-seed.mjs`
Expected: Prints total time

- [ ] **Step 2: Identify slow modules**

Add timing to each module:

```typescript
const start = Date.now();
// ... seed logic ...
console.log(`${moduleName}: ${Date.now() - start}ms`);
```

- [ ] **Step 3: Optimize batch inserts**

Replace individual inserts with batch inserts where possible:

```typescript
// Before (slow):
for (const item of items) {
  await db.insert(table).values(item);
}

// After (fast):
await db.insert(table).values(items);
```

- [ ] **Step 4: Re-measure performance**

Run: `node scripts/validate-seed.mjs`
Expected: Total time < 30,000ms (30 seconds)

- [ ] **Step 5: Commit**

```bash
git add lib/seed/orchestrator.ts lib/seed/*.ts
git commit -m "perf(seed): optimize batch inserts for < 30s seed time"
```

---

## Phase 6: Documentation & Deployment (Tasks 17-18)

### Task 17: Update documentation

**Files:**
- Modify: `README.md`
- Create: `docs/seed-system.md`

**Interfaces:**
- Consumes: Seed system
- Produces: User documentation

- [ ] **Step 1: Update README.md**

Add section:

```markdown
## Seed Data System

The application includes a comprehensive seed data system that populates all dashboard pages with realistic IT Technician operational data.

### Running the seed

The seed runs automatically on first database initialization. To re-run:

```bash
npm run db:reset
npm run dev  # seed runs on first API call
```

### What gets seeded

- 14 team members (4 existing + 10 new)
- 25 equipment items (laptops, printers, UPS, network gear)
- 11 IT Technician playbooks
- 15 support tickets + 8 recurring tasks
- 40 work log entries
- 20 operations logs + 3 incident reports
- 12 calendar events
- Gamification, wellbeing metrics, AI insights

### Validation

Check seed data:

```bash
node scripts/validate-seed.mjs
```

See `docs/seed-system.md` for architecture details.
```

- [ ] **Step 2: Create seed-system.md**

Write comprehensive documentation covering:
- Architecture overview
- Module responsibilities
- Dependency chain
- Idempotency strategy
- Error handling
- Testing approach
- Performance characteristics

- [ ] **Step 3: Commit**

```bash
git add README.md docs/seed-system.md
git commit -m "docs(seed): add comprehensive seed system documentation"
```

---

### Task 18: Deploy to production

**Files:**
- None (deployment)

**Interfaces:**
- Consumes: Tested seed system
- Produces: Live seed on production

- [ ] **Step 1: Verify all tests pass**

Run: `npm test`
Expected: All tests pass

Run: `npx vitest run tests/seed/`
Expected: All seed tests pass

- [ ] **Step 2: Run type checking**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Run linting**

Run: `npm run lint`
Expected: No errors

- [ ] **Step 4: Commit final changes**

```bash
git add .
git commit -m "chore: final checks before deployment"
```

- [ ] **Step 5: Push to main**

```bash
git push origin main
```

- [ ] **Step 6: Verify deployment**

Check Vercel deployment logs for:
- Database initialization
- Seed execution
- No errors

- [ ] **Step 7: Validate production data**

Run validation script against production (if accessible) or check dashboard pages manually.

Expected: All pages show realistic data

- [ ] **Step 8: Document deployment**

Update `docs/deployment-log.md` with:
- Deployment date
- Version/commit hash
- Seed execution time
- Any issues encountered
- Verification results

- [ ] **Step 9: Final commit**

```bash
git add docs/deployment-log.md
git commit -m "docs: log production deployment of seed system"
git push origin main
```

---

## Summary

**Total tasks:** 18  
**Estimated time:** 8-12 hours (depending on experience with codebase)  
**Test coverage:** Unit tests per module + integration tests  
**Documentation:** README, seed-system.md, deployment-log.md

**Success criteria:**
- All 40+ dashboard pages show realistic data
- Seed completes in < 30 seconds
- Idempotent (safe to re-run)
- All tests pass
- Documentation complete

**Next steps after implementation:**
1. Monitor production for any issues
2. Gather user feedback on data realism
3. Consider adding seed configuration (profiles, customization)
4. Plan for incremental seed updates (add new data without re-seeding)
