// The two seeded packs (design §12 item 1). The IT technician pack is the owner's own
// handover document, verbatim in shape: infrastructure, accounts and systems, equipment,
// outstanding work, plus the six-step method. The general pack is the fallback that keeps
// every other role reachable without an edit, and it claims exactly the disciplines the
// technician pack does not, so resolution is never ambiguous.

// The explicit `.ts` extension is what lets scripts/create-registers-tables.mjs load this
// module with Node's type stripping: that loader has no tsconfig path aliases.
import { WORK_DISCIPLINES, type WorkDiscipline } from "../roles.ts"
import type { RolePack } from "./types"

const IT_TECHNICIAN_DISCIPLINES: WorkDiscipline[] = [
  "technician",
  "it_operations",
  "devops",
  "networking",
  "security",
  "database",
]

const GENERAL_DISCIPLINES: WorkDiscipline[] = WORK_DISCIPLINES.filter(
  (discipline) => !IT_TECHNICIAN_DISCIPLINES.includes(discipline),
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
  ladderDiscipline: "general",
  onboarding: [
    "What are you the keeper of in your role?",
    "Which records must stay current for someone else to take over your work?",
  ],
  method: ["Plan", "Do", "Check", "Act"],
  isActive: true,
}

export const SEED_PACKS: RolePack[] = [IT_TECHNICIAN_PACK, GENERAL_PACK]
