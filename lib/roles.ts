// Role policy, kept free of cookies and database imports so it can be unit
// tested in isolation (lib/session.ts pulls in lib/db, which needs DATABASE_URL
// at import time).

const ADMIN_ROLES = ["admin", "superadmin"]

/** Env bootstrap list: comma-separated emails treated as super-admins. */
export function parseAdminEmails(raw: string | undefined): string[] {
  if (!raw) return []
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

/**
 * Role stamped on a brand-new account. An ADMIN_EMAILS address gets a real
 * superadmin row instead of being left as role='user' while isSuperAdmin()
 * silently grants it from the environment — the grant has to be visible in the
 * data, since the unique email column means only one account can ever hold it.
 */
export function roleForSignup(
  email: string,
  adminEmailsRaw?: string,
): "superadmin" | "user" {
  return parseAdminEmails(adminEmailsRaw ?? process.env.ADMIN_EMAILS).includes(
    email.trim().toLowerCase(),
  )
    ? "superadmin"
    : "user"
}

export function isSuperAdmin(
  user: { email: string; role?: string | null } | null | undefined,
  adminEmailsRaw?: string,
): user is { email: string; role?: string | null } {
  if (!user) return false
  if (ADMIN_ROLES.includes((user.role ?? "").toLowerCase())) return true
  return parseAdminEmails(adminEmailsRaw ?? process.env.ADMIN_EMAILS).includes(
    user.email.toLowerCase(),
  )
}

// ---- Work disciplines -------------------------------------------------------------
// The one vocabulary for "what kind of work is this". A person may hold several; the
// viewer filter is a preference, not a fork of the app (design §2, §6) and never an
// authorization boundary — every read is scoped by user id in SQL regardless of it.
// Values are the strings stored in tasks.discipline, work_log_entries.discipline and
// deliverables.discipline, so renaming one is a migration, not an edit.
//
// Job titles, departments and project roles are different dimensions and do not live
// here: a "Senior Accountant" (title) in "Finance" (department) who is "Project Lead"
// (project role) still logs work classified `finance`, `auditor` or `analyst`.
export const DISCIPLINE_CATEGORIES = [
  "delivery",
  "technology",
  "information",
  "finance",
  "operations",
  "engineering",
  "market",
  "people",
  "science",
  "services",
] as const
export type DisciplineCategory = (typeof DISCIPLINE_CATEGORIES)[number]

export const DISCIPLINE_CATEGORY_LABEL: Record<DisciplineCategory, string> = {
  delivery: "Management & project delivery",
  technology: "Software, IT & digital",
  information: "Analysis, research & information",
  finance: "Finance, audit & commercial",
  operations: "Operations & supply chain",
  engineering: "Engineering & built works",
  market: "Sales, marketing & customer",
  people: "People, administration & governance",
  science: "Health, science & specialist services",
  services: "Creative, service & industry work",
}

// A category owns the colour, not each discipline: ten families stay legible in a chart,
// seventy-five hues do not. Every token is declared in light and dark in app/globals.css.
export const DISCIPLINE_CATEGORY_COLOUR: Record<DisciplineCategory, string> = {
  delivery: "hsl(var(--chart-pine))",
  technology: "hsl(var(--chart-slate))",
  information: "hsl(var(--chart-teal))",
  finance: "hsl(var(--chart-moss))",
  operations: "hsl(var(--chart-stone))",
  engineering: "hsl(var(--chart-bark))",
  market: "hsl(var(--chart-clay))",
  people: "hsl(var(--chart-plum))",
  science: "hsl(var(--chart-sage))",
  services: "hsl(var(--chart-ochre))",
}

// Report template per category — read by lib/reports/templates.ts in phase 3.
const CATEGORY_TEMPLATE: Record<DisciplineCategory, string> = {
  delivery: "general",
  technology: "engineering",
  information: "assurance",
  finance: "assurance",
  operations: "technical",
  engineering: "engineering",
  market: "creative",
  people: "general",
  science: "technical",
  services: "creative",
}

// §6 names five report shapes, but a category is a coarse bucket: a technician files under
// "Software, IT & digital" beside a developer, and would open their report with story points.
// These disciplines keep their own shape; every other discipline uses its category default.
// Values must be keys of CATEGORY_TEMPLATE — report-templates.test.ts checks the set matches.
const DISCIPLINE_TEMPLATE_OVERRIDES: Partial<Record<WorkDiscipline, string>> = {
  technician: "technical",
  designer: "creative",
}

export const WORK_DISCIPLINES = [
  // Management, leadership & project delivery
  "executive",
  "manager",
  "product",
  "program",
  "portfolio",
  "coordinator",
  "team_lead",
  "change_management",
  // Software, IT & digital technology
  "developer",
  "architect",
  "designer",
  "technician",
  "it_operations",
  "devops",
  "networking",
  "security",
  "data_engineering",
  "ai_ml",
  "database",
  "tester",
  // Business analysis, research & information
  "analyst",
  "researcher",
  "data_analyst",
  "data_science",
  "monitoring_evaluation",
  "information_management",
  "content",
  "communications",
  // Finance, accounting, audit & commercial management
  "finance",
  "auditor",
  "tax",
  "treasury",
  "procurement",
  "commercial",
  "cost_control",
  "risk_management",
  // Operations, supply chain & logistics
  "operations",
  "supply_chain",
  "logistics",
  "inventory",
  "facilities",
  "maintenance",
  "quality_management",
  "production",
  // Engineering, construction & physical infrastructure
  "civil_engineering",
  "construction",
  "electrical_engineering",
  "mechanical_engineering",
  "surveying",
  "environmental",
  "health_safety",
  // Sales, marketing, customer service & growth
  "sales",
  "marketing",
  "customer_success",
  "customer_support",
  "digital_marketing",
  "partnerships",
  // Human resources, administration & legal
  "human_resources",
  "learning_development",
  "administration",
  "legal",
  "compliance",
  "ethics",
  // Healthcare, science & specialist services
  "healthcare",
  "public_health",
  "laboratory",
  "pharmaceutical",
  "agriculture",
  "education",
  // Creative, service & industry-specific work
  "creative",
  "hospitality",
  "retail",
  "energy",
  "community_development",
  "general",
] as const
export type WorkDiscipline = (typeof WORK_DISCIPLINES)[number]

type DisciplineMeta = { label: string; icon: string; category: DisciplineCategory }

// Record<WorkDiscipline, …> is the validation: add an id without its metadata and this
// object no longer typechecks, so a missing label can never reach a member's screen.
// Every icon name below was checked against the installed lucide-react exports (75 unique,
// 0 missing) because this module must not import the package itself.
const DISCIPLINE_META: Record<WorkDiscipline, DisciplineMeta> = {
  executive: { label: "Executive Leadership", icon: "Crown", category: "delivery" },
  manager: { label: "Project Management", icon: "ClipboardList", category: "delivery" },
  product: { label: "Product Management", icon: "Compass", category: "delivery" },
  program: { label: "Program Management", icon: "Layers", category: "delivery" },
  portfolio: { label: "Portfolio Management", icon: "Briefcase", category: "delivery" },
  coordinator: { label: "Coordination", icon: "Users", category: "delivery" },
  team_lead: { label: "Team Leadership", icon: "UserCheck", category: "delivery" },
  change_management: { label: "Change Management", icon: "Shuffle", category: "delivery" },
  developer: { label: "Software Development", icon: "Code2", category: "technology" },
  architect: { label: "Solutions & Systems Architecture", icon: "DraftingCompass", category: "technology" },
  designer: { label: "Design & UX", icon: "Palette", category: "technology" },
  technician: { label: "Technical Support", icon: "Wrench", category: "technology" },
  it_operations: { label: "IT Operations", icon: "ServerCog", category: "technology" },
  devops: { label: "DevOps & Infrastructure", icon: "GitBranch", category: "technology" },
  networking: { label: "Networking & Telecommunications", icon: "Network", category: "technology" },
  security: { label: "Cybersecurity", icon: "ShieldCheck", category: "technology" },
  data_engineering: { label: "Data Engineering", icon: "DatabaseZap", category: "technology" },
  ai_ml: { label: "AI & Machine Learning", icon: "BrainCircuit", category: "technology" },
  database: { label: "Database Administration", icon: "Database", category: "technology" },
  tester: { label: "Quality Assurance & Testing", icon: "Bug", category: "technology" },
  analyst: { label: "Business & Systems Analysis", icon: "ClipboardCheck", category: "information" },
  researcher: { label: "Research & Investigation", icon: "Microscope", category: "information" },
  data_analyst: { label: "Data Analysis & Business Intelligence", icon: "BarChart3", category: "information" },
  data_science: { label: "Data Science & Statistics", icon: "Sigma", category: "information" },
  monitoring_evaluation: { label: "Monitoring, Evaluation & Learning", icon: "Target", category: "information" },
  information_management: { label: "Information & Records Management", icon: "FolderTree", category: "information" },
  content: { label: "Content & Technical Documentation", icon: "FileText", category: "information" },
  communications: { label: "Communications & Public Relations", icon: "Megaphone", category: "information" },
  finance: { label: "Finance & Accounting", icon: "Wallet", category: "finance" },
  auditor: { label: "Audit & Assurance", icon: "SearchCheck", category: "finance" },
  tax: { label: "Tax Management & Compliance", icon: "Receipt", category: "finance" },
  treasury: { label: "Treasury & Cash Management", icon: "Landmark", category: "finance" },
  procurement: { label: "Procurement & Purchasing", icon: "ShoppingCart", category: "finance" },
  commercial: { label: "Commercial & Contract Management", icon: "FileSignature", category: "finance" },
  cost_control: { label: "Cost Estimation & Control", icon: "Calculator", category: "finance" },
  risk_management: { label: "Enterprise Risk Management", icon: "ShieldAlert", category: "finance" },
  operations: { label: "Business Operations", icon: "Workflow", category: "operations" },
  supply_chain: { label: "Supply Chain Management", icon: "Boxes", category: "operations" },
  logistics: { label: "Logistics & Transportation", icon: "Truck", category: "operations" },
  inventory: { label: "Inventory & Warehouse Management", icon: "Package", category: "operations" },
  facilities: { label: "Facilities & Property Management", icon: "Building2", category: "operations" },
  maintenance: { label: "Maintenance & Asset Management", icon: "Hammer", category: "operations" },
  quality_management: { label: "Quality Management", icon: "BadgeCheck", category: "operations" },
  production: { label: "Production & Manufacturing", icon: "Factory", category: "operations" },
  civil_engineering: { label: "Civil & Structural Engineering", icon: "Ruler", category: "engineering" },
  construction: { label: "Construction & Site Management", icon: "HardHat", category: "engineering" },
  electrical_engineering: { label: "Electrical Engineering", icon: "Zap", category: "engineering" },
  mechanical_engineering: { label: "Mechanical Engineering", icon: "Cog", category: "engineering" },
  surveying: { label: "Surveying & Geospatial Services", icon: "Map", category: "engineering" },
  environmental: { label: "Environmental Management", icon: "Leaf", category: "engineering" },
  health_safety: { label: "Occupational Health & Safety", icon: "Siren", category: "engineering" },
  sales: { label: "Sales & Business Development", icon: "TrendingUp", category: "market" },
  marketing: { label: "Marketing & Brand Management", icon: "BadgePercent", category: "market" },
  customer_success: { label: "Customer Success & Account Management", icon: "HeartHandshake", category: "market" },
  customer_support: { label: "Customer Support & Service", icon: "Headphones", category: "market" },
  digital_marketing: { label: "Digital Marketing & E-commerce", icon: "MousePointerClick", category: "market" },
  partnerships: { label: "Partnerships & Stakeholder Engagement", icon: "Handshake", category: "market" },
  human_resources: { label: "Human Resources & People Operations", icon: "UserPlus", category: "people" },
  learning_development: { label: "Learning & Development", icon: "GraduationCap", category: "people" },
  administration: { label: "Administration & Office Management", icon: "Inbox", category: "people" },
  legal: { label: "Legal Services", icon: "Scale", category: "people" },
  compliance: { label: "Regulatory Compliance & Governance", icon: "FileCheck", category: "people" },
  ethics: { label: "Ethics & Safeguarding", icon: "ScrollText", category: "people" },
  healthcare: { label: "Healthcare & Clinical Services", icon: "Stethoscope", category: "science" },
  public_health: { label: "Public Health & Health Programs", icon: "HeartPulse", category: "science" },
  laboratory: { label: "Laboratory & Scientific Services", icon: "FlaskConical", category: "science" },
  pharmaceutical: { label: "Pharmaceutical & Medical Products", icon: "Pill", category: "science" },
  agriculture: { label: "Agriculture & Agribusiness", icon: "Sprout", category: "science" },
  education: { label: "Education & Training Delivery", icon: "BookOpen", category: "science" },
  creative: { label: "Creative & Media Production", icon: "PenTool", category: "services" },
  hospitality: { label: "Hospitality & Events", icon: "UtensilsCrossed", category: "services" },
  retail: { label: "Retail & Store Operations", icon: "Store", category: "services" },
  energy: { label: "Energy & Utilities", icon: "Flame", category: "services" },
  community_development: { label: "Community Development & Social Impact", icon: "Globe", category: "services" },
  general: { label: "General & Unclassified Work", icon: "HelpCircle", category: "services" },
}

const mapMeta = <K extends keyof DisciplineMeta>(
  key: K,
): Record<WorkDiscipline, DisciplineMeta[K]> =>
  Object.fromEntries(WORK_DISCIPLINES.map((id) => [id, DISCIPLINE_META[id][key]])) as Record<
    WorkDiscipline,
    DisciplineMeta[K]
  >

export const DISCIPLINE_LABEL = mapMeta("label")
export const DISCIPLINE_ICON = mapMeta("icon")
export const DISCIPLINE_CATEGORY = mapMeta("category")

// Every palette token in app/globals.css is an HSL channel triplet, so it is consumed
// wrapped — a bare var() here is an invalid colour and renders nothing.
export const DISCIPLINE_COLOUR: Record<WorkDiscipline, string> = Object.fromEntries(
  WORK_DISCIPLINES.map((id) => [id, DISCIPLINE_CATEGORY_COLOUR[DISCIPLINE_META[id].category]]),
) as Record<WorkDiscipline, string>

export const DISCIPLINE_TEMPLATE: Record<WorkDiscipline, string> = Object.fromEntries(
  WORK_DISCIPLINES.map((id) => [
    id,
    DISCIPLINE_TEMPLATE_OVERRIDES[id] ?? CATEGORY_TEMPLATE[DISCIPLINE_META[id].category],
  ]),
) as Record<WorkDiscipline, string>

export function disciplinesInCategory(category: DisciplineCategory): WorkDiscipline[] {
  return WORK_DISCIPLINES.filter((id) => DISCIPLINE_META[id].category === category)
}

// One message for both write whitelists. Listing 75 ids in an API error would swallow the
// sentence it belongs to.
export const DISCIPLINE_HINT =
  "discipline must be a known work discipline (see lib/roles.ts), or null to clear it"

export const DEFAULT_DISCIPLINE: WorkDiscipline = "coordinator"

export function isWorkDiscipline(value: unknown): value is WorkDiscipline {
  return typeof value === "string" && (WORK_DISCIPLINES as readonly string[]).includes(value)
}

/** Exact match after trimming; unknown values are null, never a silent default. */
export function normaliseDiscipline(value: unknown): WorkDiscipline | null {
  if (typeof value !== "string") return null
  const candidate = value.trim().toLowerCase()
  return isWorkDiscipline(candidate) ? candidate : null
}
