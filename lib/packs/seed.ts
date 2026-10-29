// Role pack seeds (design §12 item 1). Each pack is a specialized handover document
// for a cluster of related disciplines. The IT technician pack is the owner's own
// verbatim shape: infrastructure, accounts and systems, equipment, outstanding work,
// plus the six-step method. Other packs follow the same pattern but with discipline-
// specific register kinds, onboarding questions, and methods.

// The explicit `.ts` extension is what lets scripts/create-registers-tables.mjs load this
// module with Node's type stripping: that loader has no tsconfig path aliases.
import { WORK_DISCIPLINES, type WorkDiscipline } from "../roles.ts"
import type { RolePack } from "./types"

// ---- IT Technician Pack -------------------------------------------------------------
const IT_TECHNICIAN_DISCIPLINES: WorkDiscipline[] = [
  "technician",
  "it_operations",
  "devops",
  "networking",
  "security",
  "database",
]

// ---- Developer Pack -----------------------------------------------------------------
const DEVELOPER_DISCIPLINES: WorkDiscipline[] = [
  "developer",
  "architect",
  "data_engineering",
  "ai_ml",
  "tester",
]

// ---- Designer Pack ------------------------------------------------------------------
const DESIGNER_DISCIPLINES: WorkDiscipline[] = [
  "designer",
  "creative",
  "content",
  "communications",
]

// ---- Analyst Pack -------------------------------------------------------------------
const ANALYST_DISCIPLINES: WorkDiscipline[] = [
  "analyst",
  "researcher",
  "data_analyst",
  "data_science",
  "monitoring_evaluation",
  "information_management",
]

// ---- Finance Pack -------------------------------------------------------------------
const FINANCE_DISCIPLINES: WorkDiscipline[] = [
  "finance",
  "auditor",
  "tax",
  "treasury",
  "procurement",
  "commercial",
  "cost_control",
  "risk_management",
]

// ---- Operations Pack ----------------------------------------------------------------
const OPERATIONS_DISCIPLINES: WorkDiscipline[] = [
  "operations",
  "supply_chain",
  "logistics",
  "inventory",
  "facilities",
  "maintenance",
  "quality_management",
  "production",
]

// ---- HR Pack ------------------------------------------------------------------------
const HR_DISCIPLINES: WorkDiscipline[] = [
  "human_resources",
  "learning_development",
  "administration",
  "legal",
  "compliance",
  "ethics",
]

// ---- Sales & Marketing Pack ---------------------------------------------------------
const SALES_MARKETING_DISCIPLINES: WorkDiscipline[] = [
  "sales",
  "marketing",
  "customer_success",
  "customer_support",
  "digital_marketing",
  "partnerships",
]

// ---- Healthcare & Science Pack ------------------------------------------------------
const HEALTHCARE_SCIENCE_DISCIPLINES: WorkDiscipline[] = [
  "healthcare",
  "public_health",
  "laboratory",
  "pharmaceutical",
  "agriculture",
  "education",
]

// ---- Engineering Pack ---------------------------------------------------------------
const ENGINEERING_DISCIPLINES: WorkDiscipline[] = [
  "civil_engineering",
  "construction",
  "electrical_engineering",
  "mechanical_engineering",
  "surveying",
  "environmental",
  "health_safety",
]

// ---- Management Pack ----------------------------------------------------------------
const MANAGEMENT_DISCIPLINES: WorkDiscipline[] = [
  "executive",
  "manager",
  "product",
  "program",
  "portfolio",
  "coordinator",
  "team_lead",
  "change_management",
]

// ---- General Pack (fallback) --------------------------------------------------------
// Claims all disciplines not covered by specialized packs
const SPECIALIZED_DISCIPLINES: WorkDiscipline[] = [
  ...IT_TECHNICIAN_DISCIPLINES,
  ...DEVELOPER_DISCIPLINES,
  ...DESIGNER_DISCIPLINES,
  ...ANALYST_DISCIPLINES,
  ...FINANCE_DISCIPLINES,
  ...OPERATIONS_DISCIPLINES,
  ...HR_DISCIPLINES,
  ...SALES_MARKETING_DISCIPLINES,
  ...HEALTHCARE_SCIENCE_DISCIPLINES,
  ...ENGINEERING_DISCIPLINES,
  ...MANAGEMENT_DISCIPLINES,
]

const GENERAL_DISCIPLINES: WorkDiscipline[] = WORK_DISCIPLINES.filter(
  (discipline) => !SPECIALIZED_DISCIPLINES.includes(discipline),
)

export const IT_TECHNICIAN_PACK: RolePack = {
  packKey: "it-technician",
  title: "IT technician",
  disciplines: IT_TECHNICIAN_DISCIPLINES,
  registerKinds: [
    { key: "infrastructure", label: "Infrastructure" },
    { key: "accounts", label: "Accounts and systems" },
    { key: "equipment", label: "Equipment" },
    { key: "outstanding", label: "Outstanding work" },
  ],
  sections: ["today", "registers", "tasks", "worklog", "reports"],
  reportTemplate: "technical",
  ladderDiscipline: "technician",
  onboarding: [
    "Which servers, network devices and cloud services are you responsible for?",
    "Where are the consoles for your admin accounts, and who can authorise access?",
    "Which ticketing system holds the work that is currently open?",
    "Which equipment is out for repair or waiting to be disposed of?",
  ],
  method: ["Identify", "Reproduce", "Diagnose", "Fix", "Test", "Document"],
  methods: {
    technician: ["Identify", "Reproduce", "Diagnose", "Fix", "Test", "Document"],
    it_operations: ["Monitor", "Alert", "Triage", "Resolve", "Document", "Review"],
    devops: ["Plan", "Automate", "Deploy", "Monitor", "Optimize", "Document"],
    networking: ["Design", "Configure", "Test", "Monitor", "Troubleshoot", "Document"],
    security: ["Assess", "Detect", "Contain", "Eradicate", "Recover", "Review"],
    database: ["Backup", "Monitor", "Optimize", "Restore", "Test", "Document"],
  },
  isActive: true,
}

export const DEVELOPER_PACK: RolePack = {
  packKey: "developer",
  title: "Software Developer",
  disciplines: DEVELOPER_DISCIPLINES,
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
    "What development tools and environments do you use?",
  ],
  method: ["Plan", "Code", "Review", "Test", "Deploy", "Monitor"],
  methods: {
    developer: ["Plan", "Code", "Review", "Test", "Deploy", "Monitor"],
    architect: ["Design", "Review", "Approve", "Document", "Govern", "Mentor"],
    data_engineering: ["Extract", "Transform", "Load", "Validate", "Optimize", "Monitor"],
    ai_ml: ["Research", "Collect", "Train", "Validate", "Deploy", "Monitor"],
    tester: ["Plan", "Design", "Execute", "Report", "Verify", "Close"],
  },
  isActive: true,
}

export const DESIGNER_PACK: RolePack = {
  packKey: "designer",
  title: "Designer",
  disciplines: DESIGNER_DISCIPLINES,
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
    "What design systems or component libraries do you maintain?",
  ],
  method: ["Research", "Ideate", "Prototype", "Test", "Iterate", "Document"],
  methods: {
    designer: ["Research", "Ideate", "Prototype", "Test", "Iterate", "Document"],
    creative: ["Brief", "Concept", "Create", "Review", "Refine", "Deliver"],
    content: ["Research", "Write", "Edit", "Review", "Publish", "Measure"],
    communications: ["Plan", "Create", "Distribute", "Monitor", "Engage", "Report"],
  },
  isActive: true,
}

export const ANALYST_PACK: RolePack = {
  packKey: "analyst",
  title: "Analyst",
  disciplines: ANALYST_DISCIPLINES,
  registerKinds: [
    { key: "data_sources", label: "Data sources" },
    { key: "reports", label: "Analysis reports" },
    { key: "dashboards", label: "Dashboards" },
    { key: "methodology", label: "Methodology" },
  ],
  sections: ["today", "registers", "tasks", "worklog", "reports", "career"],
  reportTemplate: "assurance",
  ladderDiscipline: "analyst",
  onboarding: [
    "Which data sources do you access?",
    "What dashboards are you responsible for?",
    "Which analysis reports are currently open?",
    "What methodology frameworks do you follow?",
  ],
  method: ["Define question", "Collect data", "Analyze", "Validate", "Report", "Archive"],
  methods: {
    analyst: ["Define question", "Collect data", "Analyze", "Validate", "Report", "Archive"],
    researcher: ["Literature review", "Design study", "Collect data", "Analyze", "Publish", "Peer review"],
    data_analyst: ["Extract", "Clean", "Analyze", "Visualize", "Report", "Archive"],
    data_science: ["Hypothesize", "Collect", "Model", "Validate", "Deploy", "Monitor"],
    monitoring_evaluation: ["Framework", "Indicators", "Data collection", "Analysis", "Reporting", "Learning"],
    information_management: ["Assess", "Catalog", "Store", "Retrieve", "Preserve", "Dispose"],
  },
  isActive: true,
}

export const FINANCE_PACK: RolePack = {
  packKey: "finance",
  title: "Finance",
  disciplines: FINANCE_DISCIPLINES,
  registerKinds: [
    { key: "accounts", label: "Accounts" },
    { key: "audits", label: "Audits" },
    { key: "compliance", label: "Compliance" },
    { key: "reports", label: "Financial reports" },
  ],
  sections: ["today", "registers", "tasks", "worklog", "reports", "career"],
  reportTemplate: "assurance",
  ladderDiscipline: "auditor",
  onboarding: [
    "Which accounting systems do you manage?",
    "What audits are currently in progress?",
    "Which compliance requirements must you track?",
    "What financial reports are you responsible for?",
  ],
  method: ["Record", "Reconcile", "Audit", "Report", "Comply", "Archive"],
  methods: {
    finance: ["Record", "Reconcile", "Report", "Analyze", "Forecast", "Archive"],
    auditor: ["Plan", "Test", "Document", "Report", "Follow-up", "Close"],
    tax: ["Collect", "Calculate", "File", "Review", "Audit", "Archive"],
    treasury: ["Forecast", "Cash manage", "Invest", "Hedge", "Report", "Reconcile"],
    procurement: ["Source", "Evaluate", "Contract", "Purchase", "Receive", "Pay"],
    commercial: ["Analyze", "Price", "Negotiate", "Contract", "Monitor", "Report"],
    cost_control: ["Budget", "Track", "Analyze", "Variance", "Report", "Forecast"],
    risk_management: ["Identify", "Assess", "Mitigate", "Monitor", "Report", "Review"],
  },
  isActive: true,
}

export const OPERATIONS_PACK: RolePack = {
  packKey: "operations",
  title: "Operations",
  disciplines: OPERATIONS_DISCIPLINES,
  registerKinds: [
    { key: "processes", label: "Processes" },
    { key: "inventory", label: "Inventory" },
    { key: "logistics", label: "Logistics" },
    { key: "quality", label: "Quality control" },
  ],
  sections: ["today", "registers", "tasks", "worklog", "reports", "career"],
  reportTemplate: "technical",
  ladderDiscipline: "coordinator",
  onboarding: [
    "Which operational processes do you own?",
    "What inventory or assets are you tracking?",
    "Which logistics workflows are you responsible for?",
    "What quality metrics do you monitor?",
  ],
  method: ["Plan", "Execute", "Monitor", "Control", "Improve", "Document"],
  methods: {
    operations: ["Plan", "Execute", "Monitor", "Control", "Improve", "Document"],
    supply_chain: ["Source", "Procure", "Receive", "Store", "Distribute", "Track"],
    logistics: ["Plan", "Route", "Load", "Transport", "Deliver", "Confirm"],
    inventory: ["Forecast", "Order", "Receive", "Store", "Issue", "Count"],
    facilities: ["Inspect", "Maintain", "Repair", "Upgrade", "Document", "Review"],
    maintenance: ["Schedule", "Inspect", "Service", "Repair", "Test", "Document"],
    quality_management: ["Plan", "Control", "Assure", "Improve", "Audit", "Certify"],
    production: ["Plan", "Setup", "Produce", "Inspect", "Package", "Deliver"],
  },
  isActive: true,
}

export const HR_PACK: RolePack = {
  packKey: "hr",
  title: "Human Resources",
  disciplines: HR_DISCIPLINES,
  registerKinds: [
    { key: "employees", label: "Employee records" },
    { key: "policies", label: "Policies" },
    { key: "training", label: "Training" },
    { key: "compliance", label: "Compliance" },
  ],
  sections: ["today", "registers", "tasks", "worklog", "reports", "career"],
  reportTemplate: "general",
  ladderDiscipline: "coordinator",
  onboarding: [
    "Which employee records do you manage?",
    "What HR policies are you responsible for?",
    "Which training programs are currently running?",
    "What compliance requirements must you track?",
  ],
  method: ["Recruit", "Onboard", "Develop", "Retain", "Comply", "Document"],
  methods: {
    human_resources: ["Recruit", "Onboard", "Develop", "Retain", "Comply", "Document"],
    learning_development: ["Assess", "Design", "Deliver", "Evaluate", "Improve", "Certify"],
    administration: ["Process", "File", "Track", "Respond", "Archive", "Report"],
    legal: ["Research", "Draft", "Review", "Negotiate", "Execute", "Comply"],
    compliance: ["Monitor", "Assess", "Report", "Remediate", "Audit", "Certify"],
    ethics: ["Investigate", "Advise", "Train", "Report", "Resolve", "Document"],
  },
  isActive: true,
}

export const SALES_MARKETING_PACK: RolePack = {
  packKey: "sales-marketing",
  title: "Sales & Marketing",
  disciplines: SALES_MARKETING_DISCIPLINES,
  registerKinds: [
    { key: "leads", label: "Leads" },
    { key: "campaigns", label: "Campaigns" },
    { key: "customers", label: "Customers" },
    { key: "metrics", label: "Metrics" },
  ],
  sections: ["today", "registers", "tasks", "worklog", "reports", "career"],
  reportTemplate: "creative",
  ladderDiscipline: "coordinator",
  onboarding: [
    "Which leads or opportunities are you tracking?",
    "What campaigns are currently running?",
    "Which customer accounts are you responsible for?",
    "What sales or marketing metrics do you monitor?",
  ],
  method: ["Prospect", "Qualify", "Pitch", "Close", "Retain", "Analyze"],
  methods: {
    sales: ["Prospect", "Qualify", "Pitch", "Close", "Retain", "Analyze"],
    marketing: ["Research", "Plan", "Create", "Launch", "Monitor", "Optimize"],
    customer_success: ["Onboard", "Train", "Support", "Retain", "Expand", "Advocate"],
    customer_support: ["Receive", "Triage", "Resolve", "Follow-up", "Close", "Learn"],
    digital_marketing: ["Target", "Create", "Publish", "Monitor", "Optimize", "Report"],
    partnerships: ["Identify", "Pitch", "Negotiate", "Contract", "Manage", "Review"],
  },
  isActive: true,
}

export const HEALTHCARE_SCIENCE_PACK: RolePack = {
  packKey: "healthcare-science",
  title: "Healthcare & Science",
  disciplines: HEALTHCARE_SCIENCE_DISCIPLINES,
  registerKinds: [
    { key: "patients", label: "Patients" },
    { key: "protocols", label: "Clinical protocols" },
    { key: "research", label: "Research" },
    { key: "compliance", label: "Compliance" },
  ],
  sections: ["today", "registers", "tasks", "worklog", "reports", "career"],
  reportTemplate: "technical",
  ladderDiscipline: "coordinator",
  onboarding: [
    "Which patient populations do you serve?",
    "What clinical protocols must you follow?",
    "Which research projects are you involved in?",
    "What compliance requirements apply to your work?",
  ],
  method: ["Assess", "Plan", "Implement", "Evaluate", "Document", "Review"],
  methods: {
    healthcare: ["Assess", "Plan", "Implement", "Evaluate", "Document", "Review"],
    public_health: ["Surveillance", "Prevent", "Educate", "Policy", "Evaluate", "Report"],
    laboratory: ["Sample", "Test", "Analyze", "Validate", "Report", "Archive"],
    pharmaceutical: ["Research", "Develop", "Test", "Approve", "Manufacture", "Monitor"],
    agriculture: ["Plan", "Plant", "Monitor", "Harvest", "Test", "Market"],
    education: ["Plan", "Teach", "Assess", "Review", "Improve", "Certify"],
  },
  isActive: true,
}

export const ENGINEERING_PACK: RolePack = {
  packKey: "engineering",
  title: "Engineering",
  disciplines: ENGINEERING_DISCIPLINES,
  registerKinds: [
    { key: "projects", label: "Projects" },
    { key: "specifications", label: "Specifications" },
    { key: "inspections", label: "Inspections" },
    { key: "compliance", label: "Compliance" },
  ],
  sections: ["today", "registers", "tasks", "worklog", "reports", "career"],
  reportTemplate: "engineering",
  ladderDiscipline: "coordinator",
  onboarding: [
    "Which engineering projects are you working on?",
    "What specifications must you follow?",
    "Which inspections are currently scheduled?",
    "What safety or environmental compliance applies?",
  ],
  method: ["Design", "Plan", "Build", "Inspect", "Test", "Document"],
  methods: {
    civil_engineering: ["Survey", "Design", "Plan", "Build", "Inspect", "Certify"],
    construction: ["Plan", "Mobilize", "Build", "Inspect", "Test", "Handover"],
    electrical_engineering: ["Design", "Specify", "Install", "Test", "Commission", "Maintain"],
    mechanical_engineering: ["Design", "Fabricate", "Assemble", "Test", "Commission", "Maintain"],
    surveying: ["Recon", "Measure", "Map", "Report", "Verify", "Certify"],
    environmental: ["Assess", "Plan", "Monitor", "Report", "Remediate", "Certify"],
    health_safety: ["Identify", "Assess", "Control", "Monitor", "Review", "Certify"],
  },
  isActive: true,
}

export const MANAGEMENT_PACK: RolePack = {
  packKey: "management",
  title: "Management",
  disciplines: MANAGEMENT_DISCIPLINES,
  registerKinds: [
    { key: "initiatives", label: "Initiatives" },
    { key: "stakeholders", label: "Stakeholders" },
    { key: "risks", label: "Risks" },
    { key: "reports", label: "Reports" },
  ],
  sections: ["today", "registers", "tasks", "worklog", "reports", "career"],
  reportTemplate: "general",
  ladderDiscipline: "coordinator",
  onboarding: [
    "Which initiatives are you leading?",
    "Who are your key stakeholders?",
    "What risks are you tracking?",
    "Which reports must you deliver?",
  ],
  method: ["Initiate", "Plan", "Execute", "Monitor", "Control", "Close"],
  methods: {
    executive: ["Strategize", "Align", "Decide", "Communicate", "Review", "Adapt"],
    manager: ["Plan", "Organize", "Lead", "Control", "Report", "Improve"],
    product: ["Discover", "Define", "Design", "Develop", "Launch", "Iterate"],
    program: ["Initiate", "Plan", "Execute", "Monitor", "Control", "Close"],
    portfolio: ["Select", "Prioritize", "Balance", "Monitor", "Review", "Optimize"],
    coordinator: ["Schedule", "Communicate", "Track", "Resolve", "Report", "Close"],
    team_lead: ["Plan", "Assign", "Coach", "Review", "Report", "Improve"],
    change_management: ["Assess", "Plan", "Communicate", "Implement", "Reinforce", "Review"],
  },
  isActive: true,
}

export const GENERAL_PACK: RolePack = {
  packKey: "general",
  title: "General",
  disciplines: GENERAL_DISCIPLINES,
  registerKinds: [
    { key: "responsibilities", label: "Responsibilities" },
    { key: "records", label: "Records and documents" },
    { key: "assets", label: "Assets and equipment" },
    { key: "outstanding", label: "Outstanding work" },
  ],
  sections: ["today", "registers", "tasks", "worklog", "reports", "career"],
  reportTemplate: "general",
  ladderDiscipline: "coordinator",
  onboarding: [
    "What are you the keeper of in your role?",
    "Which records must stay current for someone else to take over your work?",
  ],
  method: ["Plan", "Do", "Check", "Act"],
  isActive: true,
}

export const SEED_PACKS: RolePack[] = [
  IT_TECHNICIAN_PACK,
  DEVELOPER_PACK,
  DESIGNER_PACK,
  ANALYST_PACK,
  FINANCE_PACK,
  OPERATIONS_PACK,
  HR_PACK,
  SALES_MARKETING_PACK,
  HEALTHCARE_SCIENCE_PACK,
  ENGINEERING_PACK,
  MANAGEMENT_PACK,
  GENERAL_PACK,
]
