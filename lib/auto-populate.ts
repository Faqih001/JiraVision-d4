// Auto-populate logic — when a job title is selected, derive the work discipline,
// role pack, and career ladder. This reduces manual configuration and ensures
// consistency across the system.

import { getDepartmentByCode, type Department } from "./departments"
import { getDisciplineForJobTitle } from "./job-titles"
import type { WorkDiscipline } from "./roles"

export type AutoPopulateResult = {
  discipline: WorkDiscipline | null
  rolePack: string | null
  careerLadder: string | null
  reportTemplate: string | null
}

// Map work disciplines to career ladder disciplines
// The career ladder only has 5 disciplines: developer, technician, designer, auditor, coordinator
// Other disciplines map to the closest match or null (no ladder yet)
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
  
  // Finance → auditor ladder
  finance: "auditor",
  auditor: "auditor",
  tax: "auditor",
  treasury: "auditor",
  procurement: "auditor",
  commercial: "auditor",
  cost_control: "auditor",
  risk_management: "auditor",
  
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
// Currently only IT technician and general packs exist
// This will expand as more packs are created
const DISCIPLINE_TO_PACK: Partial<Record<WorkDiscipline, string>> = {
  // IT technician pack disciplines
  technician: "it-technician",
  it_operations: "it-technician",
  devops: "it-technician",
  networking: "it-technician",
  security: "it-technician",
  database: "it-technician",
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
 * Returns the derived discipline, role pack, career ladder, and report template.
 */
export function autoPopulateFromJobTitle(
  jobTitle: string | null | undefined,
  departmentCode: string | null | undefined,
): AutoPopulateResult {
  const discipline = getDisciplineForJobTitle(jobTitle)
  
  if (!discipline) {
    // No discipline found — return defaults
    const dept = getDepartmentByCode(departmentCode)
    return {
      discipline: null,
      rolePack: dept?.defaultPack ?? "general",
      careerLadder: null,
      reportTemplate: "general",
    }
  }
  
  return {
    discipline,
    rolePack: DISCIPLINE_TO_PACK[discipline] ?? "general",
    careerLadder: DISCIPLINE_TO_LADDER[discipline] ?? null,
    reportTemplate: getTemplateForDiscipline(discipline),
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
