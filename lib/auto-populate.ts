// Auto-populate logic — when a job title is selected, derive the work discipline,
// role pack, and career ladder. This reduces manual configuration and ensures
// consistency across the system.

import { getDepartmentByCode, type Department } from "./departments"
import { getDisciplineForJobTitle } from "./job-titles"
import type { WorkDiscipline } from "./roles"
import { SEED_PACKS } from "./packs/seed"
import { getMethodForDiscipline } from "./packs/types"

export type AutoPopulateResult = {
  discipline: WorkDiscipline | null
  rolePack: string | null
  careerLadder: string | null
  reportTemplate: string | null
  method: string[] | null
}

// Map work disciplines to career ladder disciplines
// Now we have 12 career ladder disciplines covering all major discipline categories
const DISCIPLINE_TO_LADDER: Partial<Record<WorkDiscipline, string>> = {
  // Technology → developer ladder
  developer: "developer",
  architect: "developer",
  data_engineering: "developer",
  ai_ml: "developer",
  database: "developer",
  tester: "developer",
  
  // Technology → technician ladder
  technician: "technician",
  it_operations: "technician",
  devops: "technician",
  networking: "technician",
  security: "technician",
  
  // Technology → designer ladder
  designer: "designer",
  creative: "designer",
  content: "designer",
  communications: "designer",
  
  // Analyst ladder
  analyst: "analyst",
  researcher: "analyst",
  data_analyst: "analyst",
  data_science: "analyst",
  monitoring_evaluation: "analyst",
  information_management: "analyst",
  
  // Finance ladder
  finance: "finance",
  auditor: "finance",
  tax: "finance",
  treasury: "finance",
  procurement: "finance",
  commercial: "finance",
  cost_control: "finance",
  risk_management: "finance",
  
  // Operations ladder
  operations: "operations",
  supply_chain: "operations",
  logistics: "operations",
  inventory: "operations",
  facilities: "operations",
  maintenance: "operations",
  quality_management: "operations",
  production: "operations",
  
  // HR ladder
  human_resources: "hr",
  learning_development: "hr",
  administration: "hr",
  legal: "hr",
  compliance: "hr",
  ethics: "hr",
  
  // Sales & Marketing ladder
  sales: "sales_marketing",
  marketing: "sales_marketing",
  customer_success: "sales_marketing",
  customer_support: "sales_marketing",
  digital_marketing: "sales_marketing",
  partnerships: "sales_marketing",
  
  // Healthcare & Science ladder
  healthcare: "healthcare_science",
  public_health: "healthcare_science",
  laboratory: "healthcare_science",
  pharmaceutical: "healthcare_science",
  agriculture: "healthcare_science",
  education: "healthcare_science",
  
  // Engineering ladder
  civil_engineering: "engineering",
  construction: "engineering",
  electrical_engineering: "engineering",
  mechanical_engineering: "engineering",
  surveying: "engineering",
  environmental: "engineering",
  health_safety: "engineering",
  
  // Management → coordinator ladder
  executive: "coordinator",
  manager: "coordinator",
  product: "coordinator",
  program: "coordinator",
  portfolio: "coordinator",
  coordinator: "coordinator",
  team_lead: "coordinator",
  change_management: "coordinator",
}

// Map work disciplines to role packs
// Now we have 11 specialized packs plus the general fallback
const DISCIPLINE_TO_PACK: Partial<Record<WorkDiscipline, string>> = {
  // IT technician pack disciplines
  technician: "it-technician",
  it_operations: "it-technician",
  devops: "it-technician",
  networking: "it-technician",
  security: "it-technician",
  database: "it-technician",
  
  // Developer pack disciplines
  developer: "developer",
  architect: "developer",
  data_engineering: "developer",
  ai_ml: "developer",
  tester: "developer",
  
  // Designer pack disciplines
  designer: "designer",
  creative: "designer",
  content: "designer",
  communications: "designer",
  
  // Analyst pack disciplines
  analyst: "analyst",
  researcher: "analyst",
  data_analyst: "analyst",
  data_science: "analyst",
  monitoring_evaluation: "analyst",
  information_management: "analyst",
  
  // Finance pack disciplines
  finance: "finance",
  auditor: "finance",
  tax: "finance",
  treasury: "finance",
  procurement: "finance",
  commercial: "finance",
  cost_control: "finance",
  risk_management: "finance",
  
  // Operations pack disciplines
  operations: "operations",
  supply_chain: "operations",
  logistics: "operations",
  inventory: "operations",
  facilities: "operations",
  maintenance: "operations",
  quality_management: "operations",
  production: "operations",
  
  // HR pack disciplines
  human_resources: "hr",
  learning_development: "hr",
  administration: "hr",
  legal: "hr",
  compliance: "hr",
  ethics: "hr",
  
  // Sales & Marketing pack disciplines
  sales: "sales-marketing",
  marketing: "sales-marketing",
  customer_success: "sales-marketing",
  customer_support: "sales-marketing",
  digital_marketing: "sales-marketing",
  partnerships: "sales-marketing",
  
  // Healthcare & Science pack disciplines
  healthcare: "healthcare-science",
  public_health: "healthcare-science",
  laboratory: "healthcare-science",
  pharmaceutical: "healthcare-science",
  agriculture: "healthcare-science",
  education: "healthcare-science",
  
  // Engineering pack disciplines
  civil_engineering: "engineering",
  construction: "engineering",
  electrical_engineering: "engineering",
  mechanical_engineering: "engineering",
  surveying: "engineering",
  environmental: "engineering",
  health_safety: "engineering",
  
  // Management pack disciplines
  executive: "management",
  manager: "management",
  product: "management",
  program: "management",
  portfolio: "management",
  coordinator: "management",
  team_lead: "management",
  change_management: "management",
}

// Map work disciplines to report templates
const DISCIPLINE_TO_TEMPLATE: Partial<Record<WorkDiscipline, string>> = {
  // Technology → engineering
  developer: "engineering",
  architect: "engineering",
  data_engineering: "engineering",
  ai_ml: "engineering",
  database: "engineering",
  tester: "engineering",
  devops: "engineering",
  
  // Technology → technical
  technician: "technical",
  it_operations: "technical",
  networking: "technical",
  security: "technical",
  
  // Technology → creative
  designer: "creative",
  creative: "creative",
  content: "creative",
  communications: "creative",
}

// Set default template for all disciplines not explicitly mapped
const DEFAULT_TEMPLATE = "general"
function getTemplateForDiscipline(discipline: WorkDiscipline): string {
  return DISCIPLINE_TO_TEMPLATE[discipline] ?? DEFAULT_TEMPLATE
}

/**
 * Auto-populate fields based on job title and department.
 * Returns the derived discipline, role pack, career ladder, report template, and method.
 */
export function autoPopulateFromJobTitle(
  jobTitle: string | null | undefined,
  departmentCode: string | null | undefined,
): AutoPopulateResult {
  const discipline = getDisciplineForJobTitle(jobTitle)
  
  if (!discipline) {
    // No discipline found — return defaults
    const dept = getDepartmentByCode(departmentCode)
    const defaultPackKey = dept?.defaultPack ?? "general"
    const defaultPack = SEED_PACKS.find((p) => p.packKey === defaultPackKey) ?? SEED_PACKS.find((p) => p.packKey === "general")!
    return {
      discipline: null,
      rolePack: defaultPackKey,
      careerLadder: null,
      reportTemplate: "general",
      method: defaultPack.method,
    }
  }
  
  const packKey = DISCIPLINE_TO_PACK[discipline] ?? "general"
  const pack = SEED_PACKS.find((p) => p.packKey === packKey) ?? SEED_PACKS.find((p) => p.packKey === "general")!
  
  return {
    discipline,
    rolePack: packKey,
    careerLadder: DISCIPLINE_TO_LADDER[discipline] ?? null,
    reportTemplate: getTemplateForDiscipline(discipline),
    method: getMethodForDiscipline(pack, discipline),
  }
}

/**
 * Auto-populate fields based on department alone (when no job title is selected).
 * Returns the default role pack for the department.
 */
export function autoPopulateFromDepartment(
  departmentCode: string | null | undefined,
): Pick<AutoPopulateResult, "rolePack"> {
  const dept = getDepartmentByCode(departmentCode)
  return {
    rolePack: dept?.defaultPack ?? "general",
  }
}
