# Roles, Departments & Work Disciplines

This document describes how JiraVision models organizational structure, identifies gaps between the current implementation and real-world workflows, and recommends how dropdowns and auto-population should behave.

---

## 1. Current Schema Structure

### 1.1 Users Table (`drizzle/schema.ts`)

```typescript
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  role: varchar("role", { length: 50 }).notNull().default("user"),
  jobTitle: varchar("job_title", { length: 255 }),
  department: varchar("department", { length: 255 }),
  // ... other fields
})
```

**Current state**: All three fields (`role`, `jobTitle`, `department`) are free-form `varchar` with no enum constraints or validation beyond length.

### 1.2 Work Disciplines (`lib/roles.ts`)

JiraVision defines **75 distinct work disciplines** organized into **10 categories**:

| Category | Label | Disciplines |
|----------|-------|-------------|
| `delivery` | Management & project delivery | executive, manager, product, program, portfolio, coordinator, team_lead, change_management |
| `technology` | Software, IT & digital | developer, architect, designer, technician, it_operations, devops, networking, security, data_engineering, ai_ml, database, tester |
| `information` | Analysis, research & information | analyst, researcher, data_analyst, data_science, monitoring_evaluation, information_management, content, communications |
| `finance` | Finance, audit & commercial | finance, auditor, tax, treasury, procurement, commercial, cost_control, risk_management |
| `operations` | Operations & supply chain | operations, supply_chain, logistics, inventory, facilities, maintenance, quality_management, production |
| `engineering` | Engineering & built works | civil_engineering, construction, electrical_engineering, mechanical_engineering, surveying, environmental, health_safety |
| `market` | Sales, marketing & customer | sales, marketing, customer_success, customer_support, digital_marketing, partnerships |
| `people` | People, administration & governance | human_resources, learning_development, administration, legal, compliance, ethics |
| `science` | Health, science & specialist services | healthcare, public_health, laboratory, pharmaceutical, agriculture, education |
| `services` | Creative, service & industry work | creative, hospitality, retail, energy, community_development, general |

Each discipline has:
- **Label**: Human-readable name (e.g., "Software Development")
- **Icon**: Lucide icon identifier (e.g., "Code2")
- **Category**: One of the 10 families above
- **Colour**: Derived from category (chart token in `app/globals.css`)
- **Report template**: One of `general`, `engineering`, `technical`, `assurance`, `creative`

### 1.3 Career Ladder (`lib/career/ladder-seed.ts`)

**5 disciplines × 4 levels = 20 career levels**:

**Disciplines**:
- developer
- technician
- designer
- auditor
- coordinator

**Levels**:
1. **Junior** — Works under review
2. **Intermediate** — Works independently
3. **Senior** — Owns a workstream
4. **Lead** — Sets the standard

Each level defines:
- Title (e.g., "Junior Developer")
- Summary (one-line description)
- Expectations (what evidence is required)
- Signals (threshold counts for promotion)
- Checklist items (specific criteria)

### 1.4 Role Packs (`lib/packs/seed.ts`)

Role packs define **what a person is the keeper of** (data, registers, workflows), separate from their discipline (how their work is judged).

**Seeded packs**:

#### IT Technician Pack
- **packKey**: `it-technician`
- **Disciplines**: technician, it_operations, devops, networking, security, database
- **Register kinds**: Infrastructure, Accounts and systems, Equipment, Outstanding work
- **Sections**: today, registers, tasks, worklog, reports
- **Report template**: technical
- **Method**: Identify → Reproduce → Diagnose → Fix → Test → Document
- **Onboarding questions**:
  - Which servers, network devices and cloud services are you responsible for?
  - Where are the consoles for your admin accounts, and who can authorise access?
  - Which ticketing system holds the work that is currently open?
  - Which equipment is out for repair or waiting to be disposed of?

#### General Pack
- **packKey**: `general`
- **Disciplines**: All 69 disciplines not in the IT technician pack
- **Register kinds**: Responsibilities, Records and documents, Assets and equipment, Outstanding work
- **Sections**: today, registers, tasks, worklog, reports, career
- **Report template**: general
- **Method**: Plan → Do → Check → Act
- **Onboarding questions**:
  - What are you the keeper of in your role?
  - Which records must stay current for someone else to take over your work?

---

## 2. Current UI Implementation

### 2.1 Onboarding Wizard (`app/onboarding/onboarding-wizard.tsx`)

**Job title** and **Department** are free-text `<Input>` fields:

```typescript
<Input id="onb-role" value={profile.jobTitle} onChange={...} autoComplete="organization-title" />
<Input id="onb-department" value={profile.department} onChange={...} />
```

No dropdown, no auto-populate, no validation against known values.

### 2.2 Team Management (`app/dashboard/team/page.tsx`)

**Role** and **Department** are free-text `<Input>` fields with placeholders:

```typescript
<Input id="member-role" value={draft.role} onChange={...} placeholder="Frontend Developer" />
<Input id="member-department" value={draft.department} onChange={...} placeholder="Engineering" />
```

Again, no dropdown or validation.

### 2.3 Demo Seed Data (`drizzle/seed-team.ts`)

Four demo team members with inconsistent patterns:

| Name | Role | Job Title | Department |
|------|------|-----------|------------|
| Herbert Strayhorn | manager | Project Lead | Management |
| Jitu Chauhan | user | Frontend Developer | Engineering |
| Denise Reece | user | UX Designer | Design |
| Kevin White | user | Backend Developer | Engineering |

**Observation**: `role` field contains "manager" or "user" (authorization level), while `jobTitle` contains the actual professional title. `department` is free-form.

---

## 3. Identified Gaps

### 3.1 No Controlled Vocabulary

**Problem**: `jobTitle` and `department` are free-text, leading to:
- Inconsistent data entry ("Engineering" vs "Engineer" vs "IT")
- No validation or auto-complete
- Difficult to aggregate, filter, or report by department
- Cannot enforce organizational structure

**Real-world impact**: A team page with 50 members might show "Engineering", "IT", "Software", "Development" as four separate departments when they should be one.

### 3.2 Disconnect Between Job Titles and Work Disciplines

**Problem**: The system has 75 well-defined work disciplines, but job titles are free-form. There's no mapping between:
- "Frontend Developer" (job title) → `developer` (discipline)
- "IT Technician" (job title) → `technician` (discipline)
- "UX Designer" (job title) → `designer` (discipline)

**Real-world impact**: A person's job title doesn't automatically determine their work discipline, report template, or career ladder path. They must be configured separately, leading to mismatches.

### 3.3 Limited Department Structure

**Problem**: Only 3 departments appear in seed data (Management, Engineering, Design), but the 10 discipline categories suggest a richer organizational model:
- IT / Technology
- Finance
- Operations
- HR / People
- Sales / Marketing
- Engineering
- Research / Information
- Services
- Healthcare / Science

**Real-world impact**: No guidance on how departments map to discipline categories. A hospital might have "Cardiology", "Oncology", "Pediatrics" as departments, each containing multiple disciplines (healthcare, administration, facilities).

### 3.4 No Dropdown or Auto-Populate Components

**Problem**: All role/department inputs are free-text `<Input>` fields. There are no:
- Dropdown selects with known values
- Auto-complete from existing team members' departments
- Cascading selects (department → job titles within that department)
- Validation against a controlled vocabulary

**Real-world impact**: Users type whatever comes to mind, leading to data fragmentation. An admin cannot enforce "we use 'Engineering' not 'Dev'" without manual cleanup.

### 3.5 Role Pack Coverage

**Problem**: Only 2 role packs are seeded (IT technician, General), but the system supports many more. Missing packs for:
- ~~**Developer pack** — disciplines: developer, architect, devops, ai_ml, data_engineering, database, tester~~ ✅ **IMPLEMENTED**
- ~~**Designer pack** — disciplines: designer, creative, content, communications~~ ✅ **IMPLEMENTED**
- ~~**Analyst pack** — disciplines: analyst, data_analyst, data_science, researcher, monitoring_evaluation~~ ✅ **IMPLEMENTED**
- ~~**Finance pack** — disciplines: finance, auditor, tax, treasury, procurement, commercial, cost_control, risk_management~~ ✅ **IMPLEMENTED**
- ~~**Operations pack** — disciplines: operations, supply_chain, logistics, inventory, facilities, maintenance, quality_management, production~~ ✅ **IMPLEMENTED**
- ~~**HR pack** — disciplines: human_resources, learning_development, administration, legal, compliance, ethics~~ ✅ **IMPLEMENTED**
- ~~**Sales/Marketing pack** — disciplines: sales, marketing, customer_success, customer_support, digital_marketing, partnerships~~ ✅ **IMPLEMENTED**
- ~~**Healthcare pack** — disciplines: healthcare, public_health, laboratory, pharmaceutical, agriculture, education~~ ✅ **IMPLEMENTED**
- ~~**Engineering pack** — disciplines: civil_engineering, construction, electrical_engineering, mechanical_engineering, surveying, environmental, health_safety~~ ✅ **IMPLEMENTED**
- ~~**Management pack** — disciplines: executive, manager, product, program, portfolio, coordinator, team_lead, change_management~~ ✅ **IMPLEMENTED**

**Status**: All 11 specialized packs plus general fallback are now implemented (Phase 3 complete).

### 3.6 Career Ladder Coverage

**Problem**: Only 5 disciplines have career ladders (developer, technician, designer, auditor, coordinator), but the system has 75 disciplines. Missing ladders for:
- ~~All technology disciplines (architect, devops, networking, security, data_engineering, ai_ml, database, tester, it_operations)~~ ✅ **IMPLEMENTED**
- ~~All information disciplines (analyst, researcher, data_analyst, data_science, etc.)~~ ✅ **IMPLEMENTED**
- ~~All finance disciplines (finance, tax, treasury, procurement, etc.)~~ ✅ **IMPLEMENTED**
- ~~All operations disciplines~~ ✅ **IMPLEMENTED**
- ~~All engineering disciplines~~ ✅ **IMPLEMENTED**
- ~~All people/HR disciplines~~ ✅ **IMPLEMENTED**
- ~~All market/sales disciplines~~ ✅ **IMPLEMENTED**
- ~~All science/healthcare disciplines~~ ✅ **IMPLEMENTED**
- ~~All services/creative disciplines~~ ✅ **IMPLEMENTED**

**Status**: All 12 career ladder disciplines are now implemented (Phase 4 complete), covering all 75 work disciplines.

**Real-world impact**: Every work discipline now has a defined career progression path with signal thresholds and checklist items for promotion from Junior to Lead.

### 3.7 No Department-to-Pack Mapping

**Problem**: There's no defined relationship between:
- Department (organizational unit) → Role pack (what they keep)
- Job title (professional role) → Work discipline (how work is judged)
- Work discipline → Career ladder (progression path)

**Real-world impact**: When a new user joins the "IT Department" with job title "Backend Developer", the system doesn't automatically:
1. Assign them the IT technician role pack
2. Map "Backend Developer" to the `developer` discipline
3. Place them on the developer career ladder

An admin must manually configure all three, and there's no UI to do it.

---

## 4. Real-World Workflow Recommendations

### 4.1 Department as Organizational Unit

**Recommendation**: Define departments as a controlled vocabulary with:
- **Department code** (e.g., "IT", "FIN", "OPS")
- **Department name** (e.g., "Information Technology", "Finance", "Operations")
- **Discipline categories** (which of the 10 categories this department contains)
- **Default role pack** (what new members get)

**Example**:
```typescript
const DEPARTMENTS = [
  {
    code: "IT",
    name: "Information Technology",
    categories: ["technology"],
    defaultPack: "it-technician",
  },
  {
    code: "FIN",
    name: "Finance",
    categories: ["finance"],
    defaultPack: "finance",
  },
  {
    code: "OPS",
    name: "Operations",
    categories: ["operations", "supply_chain", "logistics"],
    defaultPack: "operations",
  },
  // ... more departments
]
```

### 4.2 Job Title to Discipline Mapping

**Recommendation**: Create a mapping table that links job titles to work disciplines:

```typescript
const JOB_TITLE_TO_DISCIPLINE: Record<string, WorkDiscipline> = {
  // Technology
  "Software Developer": "developer",
  "Frontend Developer": "developer",
  "Backend Developer": "developer",
  "Full Stack Developer": "developer",
  "Solutions Architect": "architect",
  "Systems Architect": "architect",
  "UX Designer": "designer",
  "UI Designer": "designer",
  "Product Designer": "designer",
  "IT Technician": "technician",
  "Systems Administrator": "it_operations",
  "DevOps Engineer": "devops",
  "Network Engineer": "networking",
  "Security Engineer": "security",
  "Data Engineer": "data_engineering",
  "ML Engineer": "ai_ml",
  "Database Administrator": "database",
  "QA Engineer": "tester",
  "Software Tester": "tester",
  
  // Finance
  "Accountant": "finance",
  "Financial Analyst": "finance",
  "Auditor": "auditor",
  "Tax Specialist": "tax",
  "Procurement Officer": "procurement",
  
  // ... more mappings
}
```

**UI behavior**: When a user selects a job title from a dropdown, the system auto-populates the work discipline field (hidden or read-only). If the job title is not in the mapping, the user must select a discipline manually.

### 4.3 Dropdown Components

**Recommendation**: Replace free-text inputs with controlled dropdowns:

#### Department Dropdown
```typescript
<Select value={department} onValueChange={setDepartment}>
  <SelectTrigger>
    <SelectValue placeholder="Select department" />
  </SelectTrigger>
  <SelectContent>
    {DEPARTMENTS.map((dept) => (
      <SelectItem key={dept.code} value={dept.code}>
        {dept.name}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

#### Job Title Dropdown (Cascading)
```typescript
<Select value={jobTitle} onValueChange={setJobTitle}>
  <SelectTrigger>
    <SelectValue placeholder="Select job title" />
  </SelectTrigger>
  <SelectContent>
    {JOB_TITLES_BY_DEPARTMENT[department].map((title) => (
      <SelectItem key={title} value={title}>
        {title}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

#### Work Discipline Dropdown (Auto-populated)
```typescript
<Select value={discipline} onValueChange={setDiscipline} disabled={autoPopulated}>
  <SelectTrigger>
    <SelectValue placeholder="Select discipline" />
  </SelectTrigger>
  <SelectContent>
    {WORK_DISCIPLINES.map((d) => (
      <SelectItem key={d} value={d}>
        {DISCIPLINE_LABEL[d]}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

**Behavior**: When a job title is selected, the discipline is auto-populated from the mapping table. The discipline dropdown becomes read-only (disabled) if auto-populated, but the user can override it by clicking an "Edit manually" button.

### 4.4 Auto-Populate Workflow

**Recommendation**: When a new user is added to a team:

1. **Admin selects department** from dropdown
   - System filters job titles to those in that department
   
2. **Admin selects job title** from cascading dropdown
   - System looks up work discipline from mapping table
   - System looks up default role pack from department config
   - System looks up career ladder from discipline
   
3. **System auto-populates**:
   - Work discipline (hidden or read-only)
   - Role pack (assigned automatically)
   - Career ladder (assigned automatically)
   - Report template (derived from discipline)
   
4. **Admin can override**:
   - Click "Edit manually" to unlock fields
   - Change discipline, pack, or ladder if the defaults don't fit
   
5. **User is created** with all fields populated

**Example flow**:
```
Department: Information Technology
  ↓
Job Title: Backend Developer
  ↓
Auto-populated:
  - Work discipline: developer
  - Role pack: it-technician (or developer pack if it exists)
  - Career ladder: developer
  - Report template: engineering
```

### 4.5 Role Pack Expansion

**Recommendation**: Create role packs for each major discipline category:

#### Developer Pack
```typescript
{
  packKey: "developer",
  title: "Software Developer",
  disciplines: ["developer", "architect", "devops", "ai_ml", "data_engineering", "database", "tester"],
  registerKinds: [
    { key: "repositories", label: "Code repositories" },
    { key: "pull_requests", label: "Pull requests" },
    { key: "technical_debt", label: "Technical debt" },
    { key: "sprint_backlog", label: "Sprint backlog" },
  ],
  sections: ["today", "registers", "tasks", "worklog", "reports", "career"],
  reportTemplate: "engineering",
  ladderDiscipline: "developer",
  onboarding: [
    "Which code repositories are you responsible for?",
    "What is your current sprint backlog?",
    "Which technical debt items are you tracking?",
  ],
  method: ["Plan", "Code", "Review", "Test", "Deploy", "Monitor"],
}
```

#### Designer Pack
```typescript
{
  packKey: "designer",
  title: "Designer",
  disciplines: ["designer", "creative", "content", "communications"],
  registerKinds: [
    { key: "design_files", label: "Design files" },
    { key: "brand_assets", label: "Brand assets" },
    { key: "user_research", label: "User research" },
    { key: "design_system", label: "Design system" },
  ],
  sections: ["today", "registers", "tasks", "worklog", "reports", "career"],
  reportTemplate: "creative",
  ladderDiscipline: "designer",
  onboarding: [
    "Which design tools do you use (Figma, Sketch, Adobe XD)?",
    "Where is the brand asset library?",
    "Which user research findings are you tracking?",
  ],
  method: ["Research", "Ideate", "Prototype", "Test", "Iterate", "Document"],
}
```

#### Analyst Pack
```typescript
{
  packKey: "analyst",
  title: "Analyst",
  disciplines: ["analyst", "data_analyst", "data_science", "researcher", "monitoring_evaluation"],
  registerKinds: [
    { key: "data_sources", label: "Data sources" },
    { key: "reports", label: "Analysis reports" },
    { key: "dashboards", label: "Dashboards" },
    { key: "methodology", label: "Methodology" },
  ],
  sections: ["today", "registers", "tasks", "worklog", "reports", "career"],
  reportTemplate: "assurance",
  ladderDiscipline: "analyst", // Would need to create this ladder
  onboarding: [
    "Which data sources do you access?",
    "What dashboards are you responsible for?",
    "Which analysis reports are currently open?",
  ],
  method: ["Define question", "Collect data", "Analyze", "Validate", "Report", "Archive"],
}
```

**Implementation priority**:
1. Developer pack (highest demand, covers most tech roles)
2. Designer pack (creative workflows are distinct)
3. Analyst pack (data work is distinct)
4. Finance pack (audit/compliance workflows)
5. Operations pack (logistics/supply chain)
6. HR pack (people operations)
7. Sales/Marketing pack (customer-facing)
8. Healthcare pack (clinical workflows)
9. Engineering pack (construction/infrastructure)
10. Keep General pack as fallback

### 4.7 Discipline-Specific Methods

**Status**: ✅ **IMPLEMENTED**

Each role pack now supports discipline-specific methods. While a pack groups related disciplines, each discipline within the pack has its own tailored workflow method.

**Example — IT Technician Pack**:
```typescript
{
  packKey: "it-technician",
  method: ["Identify", "Reproduce", "Diagnose", "Fix", "Test", "Document"], // default
  methods: {
    technician: ["Identify", "Reproduce", "Diagnose", "Fix", "Test", "Document"], // STAR method
    it_operations: ["Monitor", "Alert", "Triage", "Resolve", "Document", "Review"],
    devops: ["Plan", "Automate", "Deploy", "Monitor", "Optimize", "Document"],
    networking: ["Design", "Configure", "Test", "Monitor", "Troubleshoot", "Document"],
    security: ["Assess", "Detect", "Contain", "Eradicate", "Recover", "Review"],
    database: ["Backup", "Monitor", "Optimize", "Restore", "Test", "Document"],
  }
}
```

**Example — Developer Pack**:
```typescript
{
  packKey: "developer",
  method: ["Plan", "Code", "Review", "Test", "Deploy", "Monitor"], // default
  methods: {
    developer: ["Plan", "Code", "Review", "Test", "Deploy", "Monitor"],
    architect: ["Design", "Review", "Approve", "Document", "Govern", "Mentor"],
    data_engineering: ["Extract", "Transform", "Load", "Validate", "Optimize", "Monitor"],
    ai_ml: ["Research", "Collect", "Train", "Validate", "Deploy", "Monitor"],
    tester: ["Plan", "Design", "Execute", "Report", "Verify", "Close"],
  }
}
```

**All 12 packs now have discipline-specific methods**:
- **IT Technician** — 6 methods (STAR for technicians, plus it_operations, devops, networking, security, database)
- **Developer** — 5 methods (developer, architect, data_engineering, ai_ml, tester)
- **Designer** — 4 methods (designer, creative, content, communications)
- **Analyst** — 6 methods (analyst, researcher, data_analyst, data_science, monitoring_evaluation, information_management)
- **Finance** — 8 methods (finance, auditor, tax, treasury, procurement, commercial, cost_control, risk_management)
- **Operations** — 8 methods (operations, supply_chain, logistics, inventory, facilities, maintenance, quality_management, production)
- **HR** — 6 methods (human_resources, learning_development, administration, legal, compliance, ethics)
- **Sales & Marketing** — 6 methods (sales, marketing, customer_success, customer_support, digital_marketing, partnerships)
- **Healthcare & Science** — 6 methods (healthcare, public_health, laboratory, pharmaceutical, agriculture, education)
- **Engineering** — 7 methods (civil_engineering, construction, electrical_engineering, mechanical_engineering, surveying, environmental, health_safety)
- **Management** — 8 methods (executive, manager, product, program, portfolio, coordinator, team_lead, change_management)
- **General** — 1 method (fallback for all other disciplines)

**Total**: 71 discipline-specific methods across 12 packs, covering all 75 work disciplines.

The `getMethodForDiscipline(pack, discipline)` helper function returns the discipline-specific method if defined, otherwise falls back to the pack's default method.

### 4.6 Career Ladder Expansion

**Recommendation**: Create career ladders for each discipline category:

**Priority ladders** (based on demand):
1. **Data Analyst ladder** — for analyst, data_analyst, data_science, researcher
2. **Finance ladder** — for finance, tax, treasury, procurement, commercial
3. **Operations ladder** — for operations, supply_chain, logistics, inventory, facilities
4. **HR ladder** — for human_resources, learning_development, administration
5. **Sales/Marketing ladder** — for sales, marketing, customer_success, digital_marketing
6. **Healthcare ladder** — for healthcare, public_health, laboratory, pharmaceutical
7. **Engineering ladder** — for civil_engineering, construction, electrical_engineering, mechanical_engineering

**Structure**: Each ladder follows the same 4-level pattern (Junior, Intermediate, Senior, Lead) with:
- Discipline-specific expectations
- Relevant signals (counts from work logs, reports, deliverables)
- Checklist items tailored to the discipline

**Example**: Data Analyst ladder
```typescript
{
  discipline: "analyst",
  level: 1,
  title: "Junior Analyst",
  summary: "Works under review: collects data, runs queries, and presents findings to a senior analyst.",
  expectations: "Expect a reviewer on most analyses. Evidence is the queries you ran and the reports you drafted.",
  signals: {
    workLogEntries: 20,
    reportsCompleted: 5,
    dashboardsCreated: 2,
    dataSourcesDocumented: 3,
  },
  checklist: [
    { key: "sql_basics", label: "Can write basic SQL queries", hint: "SELECT, JOIN, GROUP BY, WHERE" },
    { key: "data_cleaning", label: "Can clean and validate data", hint: "Handle missing values, outliers, duplicates" },
    { key: "visualization", label: "Can create basic charts", hint: "Bar, line, scatter plots" },
    { key: "documentation", label: "Documents data sources", hint: "Schema, refresh frequency, owner" },
  ],
}
```

---

## 5. Implementation Roadmap

### Phase 1: Controlled Vocabulary (Low effort, high impact)

**Goal**: Replace free-text department/job title inputs with dropdowns.

**Tasks**:
1. Define `DEPARTMENTS` array in `lib/departments.ts`
2. Define `JOB_TITLES_BY_DEPARTMENT` mapping
3. Create `<DepartmentSelect>` component
4. Create `<JobTitleSelect>` component (cascading)
5. Update onboarding wizard to use new components
6. Update team management page to use new components
7. Migrate existing free-text data to controlled values (manual cleanup)

**Files to create**:
- `lib/departments.ts` — department definitions
- `lib/job-titles.ts` — job title to discipline mapping
- `components/ui/department-select.tsx` — dropdown component
- `components/ui/job-title-select.tsx` — cascading dropdown component

**Files to modify**:
- `app/onboarding/onboarding-wizard.tsx` — replace inputs with selects
- `app/dashboard/team/page.tsx` — replace inputs with selects

### Phase 2: Auto-Populate Workflow (Medium effort, high impact)

**Goal**: When a job title is selected, auto-populate discipline, role pack, and career ladder.

**Tasks**:
1. Create `lib/auto-populate.ts` with mapping logic
2. Add `discipline` field to users table (or use existing `preferences.discipline`)
3. Add `rolePack` field to users table (or use existing `preferences.rolePack`)
4. Add `careerLadder` field to users table (or use existing `preferences.careerLadder`)
5. Update onboarding wizard to auto-populate on job title selection
6. Add "Edit manually" override button
7. Update team management page to show auto-populated fields

**Files to create**:
- `lib/auto-populate.ts` — mapping logic

**Files to modify**:
- `drizzle/schema.ts` — add discipline/rolePack/careerLadder fields (or use preferences JSONB)
- `app/onboarding/onboarding-wizard.tsx` — add auto-populate logic
- `app/dashboard/team/page.tsx` — show auto-populated fields

### Phase 3: Role Pack Expansion (High effort, medium impact) — ✅ COMPLETE

**Goal**: Create role packs for each major discipline category.

**Tasks**:
1. ~~Define Developer pack in `lib/packs/seed.ts`~~ ✅
2. ~~Define Designer pack~~ ✅
3. ~~Define Analyst pack~~ ✅
4. ~~Define Finance pack~~ ✅
5. ~~Define Operations pack~~ ✅
6. ~~Define HR pack~~ ✅
7. ~~Define Sales/Marketing pack~~ ✅
8. ~~Define Healthcare pack~~ ✅
9. ~~Define Engineering pack~~ ✅
10. ~~Define Management pack~~ ✅
11. ~~Update `GENERAL_PACK` to exclude all new pack disciplines~~ ✅
12. ~~Update `lib/auto-populate.ts` to map to new packs~~ ✅
13. ~~Update `lib/departments.ts` to map departments to new packs~~ ✅
14. Run seed script to populate database (requires migration)
15. Update admin UI to show all packs (already supports dynamic packs)

**Files modified**:
- `lib/packs/seed.ts` — added 10 new packs (11 total including IT technician)
- `lib/auto-populate.ts` — updated DISCIPLINE_TO_PACK mapping for all 75 disciplines
- `lib/departments.ts` — updated defaultPack for all 11 departments

**Status**: All 11 specialized packs plus general fallback are now defined and mapped. Database seeding requires running the migration script.

### Phase 4: Career Ladder Expansion (High effort, medium impact) — ✅ COMPLETE

**Goal**: Create career ladders for each discipline category.

**Tasks**:
1. ~~Define Analyst ladder in `lib/career/ladder-seed.ts`~~ ✅
2. ~~Define Finance ladder~~ ✅
3. ~~Define Operations ladder~~ ✅
4. ~~Define HR ladder~~ ✅
5. ~~Define Sales/Marketing ladder~~ ✅
6. ~~Define Healthcare ladder~~ ✅
7. ~~Define Engineering ladder~~ ✅
8. ~~Update `lib/auto-populate.ts` to map to new ladders~~ ✅
9. Run seed script to populate database (requires migration)
10. Update career board to show all ladders

**Files modified**:
- `lib/career/ladder-seed.ts` — added 7 new ladders (12 total including original 5)
- `lib/auto-populate.ts` — updated DISCIPLINE_TO_LADDER mapping for all 75 disciplines

**Status**: All 12 career ladder disciplines are now defined and mapped. Database seeding requires running the migration script.

### Phase 5: Department-to-Pack Mapping (Medium effort, high impact) — ✅ COMPLETE

**Goal**: Define relationships between departments, packs, and ladders.

**Tasks**:
1. ~~Add `defaultPack` field to DEPARTMENTS definition~~ ✅
2. ~~Add `disciplineCategories` field to DEPARTMENTS definition~~ ✅
3. ~~Update auto-populate logic to use department config~~ ✅
4. ~~Update onboarding wizard to assign pack based on department~~ ✅
5. ~~Update team management page to show department-pack relationship~~ ✅
6. ~~Run database migration scripts to seed packs and ladders~~ ✅

**Files modified**:
- `lib/departments.ts` — has defaultPack and categories for all 11 departments
- `lib/auto-populate.ts` — uses department config for fallback mapping
- Database seeded with 12 role packs and 48 career levels (2026-10-29)

**Status**: All department-to-pack mappings are defined and seeded to production database.

---

## 6. Real-Life Scenarios

### Scenario 1: New Developer Joins IT Department

**Current workflow**:
1. Admin adds user with job title "Backend Developer" and department "Engineering"
2. User gets General role pack (wrong — should be IT technician or Developer pack)
3. User has no work discipline assigned
4. User has no career ladder path
5. Admin must manually configure all of this in the admin UI

**Recommended workflow**:
1. Admin selects department "Information Technology" from dropdown
2. Admin selects job title "Backend Developer" from cascading dropdown
3. System auto-populates:
   - Work discipline: `developer`
   - Role pack: `developer` (or `it-technician` if developer pack doesn't exist yet)
   - Career ladder: `developer`
   - Report template: `engineering`
4. User sees correct dashboard sections, registers, and career path immediately
5. Admin can override if needed (e.g., if this developer also does DevOps work)

### Scenario 2: Analyst Moves to Data Science Team

**Current workflow**:
1. User's department changes from "Research" to "Data Science"
2. User's job title changes from "Business Analyst" to "Data Scientist"
3. User's work discipline is still `analyst` (not updated)
4. User's role pack is still General (not updated)
5. User's career ladder is still analyst (not updated)
6. Admin must manually update all of this

**Recommended workflow**:
1. Admin changes department to "Data Science"
2. Admin changes job title to "Data Scientist"
3. System auto-updates:
   - Work discipline: `data_science` (from mapping)
   - Role pack: `analyst` (or new data science pack if it exists)
   - Career ladder: `analyst` (data science is a specialization of analyst)
   - Report template: `assurance`
4. System prompts: "This user's discipline changed from analyst to data_science. Update their career ladder placement?"
5. Admin reviews and confirms

### Scenario 3: Hospital Onboards New Nurse

**Current workflow**:
1. Admin adds user with job title "Registered Nurse" and department "Healthcare"
2. User gets General role pack (wrong — should have clinical registers)
3. User has no work discipline (healthcare not in IT technician pack)
4. User has no career ladder (no healthcare ladder exists)
5. User sees generic registers: Responsibilities, Records, Assets, Outstanding work
6. User needs: Patient load, Clinical protocols, Medication tracking, Continuing education

**Recommended workflow**:
1. Admin selects department "Healthcare"
2. Admin selects job title "Registered Nurse"
3. System auto-populates:
   - Work discipline: `healthcare`
   - Role pack: `healthcare` (if it exists) or General
   - Career ladder: `healthcare` (if it exists)
   - Report template: `technical`
4. If healthcare pack exists, user sees:
   - Registers: Patient load, Clinical protocols, Medication tracking, Continuing education
   - Method: Assess → Plan → Implement → Evaluate → Document
   - Onboarding: Which patient populations do you serve? What clinical protocols must you follow?
5. If healthcare pack doesn't exist yet, user gets General pack with a note: "Healthcare-specific pack coming soon"

### Scenario 4: Freelance Designer Joins for a Project

**Current workflow**:
1. Admin adds user with job title "Freelance Designer" and department "Design"
2. User gets General role pack (wrong — should be Designer pack)
3. User has no work discipline assigned
4. User has no career ladder (designer ladder exists but not assigned)
5. User sees generic registers instead of design-specific ones

**Recommended workflow**:
1. Admin selects department "Design"
2. Admin selects job title "Freelance Designer"
3. System auto-populates:
   - Work discipline: `designer`
   - Role pack: `designer`
   - Career ladder: `designer`
   - Report template: `creative`
4. User sees:
   - Registers: Design files, Brand assets, User research, Design system
   - Method: Research → Ideate → Prototype → Test → Iterate → Document
   - Onboarding: Which design tools do you use? Where is the brand asset library?

---

## 7. Summary of Gaps

| Gap | Severity | Effort to Fix | Impact |
|-----|----------|---------------|--------|
| No controlled vocabulary for departments | High | Low | Data fragmentation, no aggregation |
| No controlled vocabulary for job titles | High | Low | Inconsistent data, no auto-populate |
| No dropdown components | High | Medium | Users type anything, no validation |
| No job title → discipline mapping | Medium | Medium | Manual configuration required |
| ~~Only 2 role packs seeded~~ | ~~Medium~~ | ~~High~~ | ~~Everyone gets General pack (wrong)~~ ✅ **FIXED** |
| ~~Only 5 career ladders seeded~~ | ~~Medium~~ | ~~High~~ | ~~Most disciplines have no ladder~~ ✅ **FIXED** |
| No department → pack mapping | Medium | Medium | No auto-assignment on user creation |
| No auto-populate workflow | Medium | High | Admin must configure everything manually |

**Priority order**:
1. Controlled controlled vocabulary (Phase 1) — ✅ **COMPLETE**
2. Dropdown components (Phase 1) — ✅ **COMPLETE**
3. Auto-populate workflow (Phase 2) — ✅ **COMPLETE**
4. Role pack expansion (Phase 3) — ✅ **COMPLETE**
5. Career ladder expansion (Phase 4) — ✅ **COMPLETE**
6. Department-to-pack mapping (Phase 5) — in progress

---

## 8. Next Steps

**Immediate actions**:
1. Review this document and approve the recommended workflow
2. Decide which phases to implement first
3. Create the controlled vocabulary definitions (departments, job titles)
4. Build the dropdown components
5. Update the onboarding wizard and team management page

**Questions to resolve**:
1. Should departments be hardcoded in `lib/departments.ts` or stored in the database?
2. Should job titles be hardcoded or admin-editable?
3. Should the discipline field be visible to users, or hidden and auto-populated?
4. Should role packs be assigned automatically, or should admins choose?
5. Should career ladders be assigned automatically, or should users opt in?

**Dependencies**:
- Phase 1 (controlled vocabulary) can start immediately
- Phase 2 (auto-populate) depends on Phase 1
- Phase 3 (role packs) can start in parallel with Phase 2
- Phase 4 (career ladders) can start in parallel with Phase 3
- Phase 5 (mapping) depends on Phases 1-4

---

**Document version**: 1.0  
**Last updated**: 2026-10-29  
**Author**: JiraVision design team  
**Status**: Draft for review
