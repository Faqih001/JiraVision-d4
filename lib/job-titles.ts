// Job title vocabulary — common professional titles mapped to work disciplines.
// Organized by department so the cascading dropdown can filter.
// This is the source of truth for the job title dropdown in onboarding and team management.

import type { WorkDiscipline } from "./roles"

export type JobTitle = {
  title: string
  discipline: WorkDiscipline
}

// Job titles organized by department code (matching lib/departments.ts)
export const JOB_TITLES_BY_DEPARTMENT: Record<string, JobTitle[]> = {
  IT: [
    { title: "Software Developer", discipline: "developer" },
    { title: "Frontend Developer", discipline: "developer" },
    { title: "Backend Developer", discipline: "developer" },
    { title: "Full Stack Developer", discipline: "developer" },
    { title: "Solutions Architect", discipline: "architect" },
    { title: "Systems Architect", discipline: "architect" },
    { title: "IT Technician", discipline: "technician" },
    { title: "Systems Administrator", discipline: "it_operations" },
    { title: "DevOps Engineer", discipline: "devops" },
    { title: "Network Engineer", discipline: "networking" },
    { title: "Security Engineer", discipline: "security" },
    { title: "Data Engineer", discipline: "data_engineering" },
    { title: "Machine Learning Engineer", discipline: "ai_ml" },
    { title: "Database Administrator", discipline: "database" },
    { title: "QA Engineer", discipline: "tester" },
    { title: "Software Tester", discipline: "tester" },
  ],
  ENG: [
    { title: "Civil Engineer", discipline: "civil_engineering" },
    { title: "Structural Engineer", discipline: "civil_engineering" },
    { title: "Electrical Engineer", discipline: "electrical_engineering" },
    { title: "Mechanical Engineer", discipline: "mechanical_engineering" },
    { title: "Construction Manager", discipline: "construction" },
    { title: "Site Engineer", discipline: "construction" },
    { title: "Surveyor", discipline: "surveying" },
    { title: "Environmental Engineer", discipline: "environmental" },
    { title: "Health & Safety Officer", discipline: "health_safety" },
  ],
  DES: [
    { title: "UX Designer", discipline: "designer" },
    { title: "UI Designer", discipline: "designer" },
    { title: "Product Designer", discipline: "designer" },
    { title: "Graphic Designer", discipline: "creative" },
    { title: "Visual Designer", discipline: "creative" },
    { title: "Content Writer", discipline: "content" },
    { title: "Technical Writer", discipline: "content" },
    { title: "Communications Specialist", discipline: "communications" },
  ],
  FIN: [
    { title: "Accountant", discipline: "finance" },
    { title: "Financial Analyst", discipline: "finance" },
    { title: "Auditor", discipline: "auditor" },
    { title: "Internal Auditor", discipline: "auditor" },
    { title: "Tax Specialist", discipline: "tax" },
    { title: "Treasury Analyst", discipline: "treasury" },
    { title: "Procurement Officer", discipline: "procurement" },
    { title: "Purchasing Manager", discipline: "procurement" },
    { title: "Commercial Manager", discipline: "commercial" },
    { title: "Cost Controller", discipline: "cost_control" },
    { title: "Risk Manager", discipline: "risk_management" },
  ],
  OPS: [
    { title: "Operations Manager", discipline: "operations" },
    { title: "Business Operations Analyst", discipline: "operations" },
    { title: "Supply Chain Manager", discipline: "supply_chain" },
    { title: "Logistics Coordinator", discipline: "logistics" },
    { title: "Inventory Manager", discipline: "inventory" },
    { title: "Warehouse Manager", discipline: "inventory" },
    { title: "Facilities Manager", discipline: "facilities" },
    { title: "Maintenance Technician", discipline: "maintenance" },
    { title: "Quality Manager", discipline: "quality_management" },
    { title: "Production Manager", discipline: "production" },
  ],
  HR: [
    { title: "HR Manager", discipline: "human_resources" },
    { title: "HR Business Partner", discipline: "human_resources" },
    { title: "Recruiter", discipline: "human_resources" },
    { title: "Talent Acquisition Specialist", discipline: "human_resources" },
    { title: "Learning & Development Specialist", discipline: "learning_development" },
    { title: "Training Coordinator", discipline: "learning_development" },
    { title: "Administrative Assistant", discipline: "administration" },
    { title: "Office Manager", discipline: "administration" },
    { title: "Legal Counsel", discipline: "legal" },
    { title: "Compliance Officer", discipline: "compliance" },
    { title: "Ethics Officer", discipline: "ethics" },
  ],
  SAL: [
    { title: "Sales Representative", discipline: "sales" },
    { title: "Account Executive", discipline: "sales" },
    { title: "Business Development Manager", discipline: "sales" },
    { title: "Marketing Manager", discipline: "marketing" },
    { title: "Brand Manager", discipline: "marketing" },
    { title: "Digital Marketing Specialist", discipline: "digital_marketing" },
    { title: "SEO Specialist", discipline: "digital_marketing" },
    { title: "Customer Success Manager", discipline: "customer_success" },
    { title: "Account Manager", discipline: "customer_success" },
    { title: "Customer Support Representative", discipline: "customer_support" },
    { title: "Partnership Manager", discipline: "partnerships" },
  ],
  RES: [
    { title: "Business Analyst", discipline: "analyst" },
    { title: "Systems Analyst", discipline: "analyst" },
    { title: "Researcher", discipline: "researcher" },
    { title: "Data Analyst", discipline: "data_analyst" },
    { title: "Business Intelligence Analyst", discipline: "data_analyst" },
    { title: "Data Scientist", discipline: "data_science" },
    { title: "Monitoring & Evaluation Specialist", discipline: "monitoring_evaluation" },
    { title: "Information Manager", discipline: "information_management" },
  ],
  HEA: [
    { title: "Doctor", discipline: "healthcare" },
    { title: "Nurse", discipline: "healthcare" },
    { title: "Registered Nurse", discipline: "healthcare" },
    { title: "Public Health Specialist", discipline: "public_health" },
    { title: "Laboratory Technician", discipline: "laboratory" },
    { title: "Pharmacist", discipline: "pharmaceutical" },
    { title: "Agricultural Scientist", discipline: "agriculture" },
    { title: "Teacher", discipline: "education" },
    { title: "Trainer", discipline: "education" },
  ],
  MGT: [
    { title: "CEO", discipline: "executive" },
    { title: "CTO", discipline: "executive" },
    { title: "CFO", discipline: "executive" },
    { title: "COO", discipline: "executive" },
    { title: "Project Manager", discipline: "manager" },
    { title: "Program Manager", discipline: "program" },
    { title: "Portfolio Manager", discipline: "portfolio" },
    { title: "Product Manager", discipline: "product" },
    { title: "Team Lead", discipline: "team_lead" },
    { title: "Coordinator", discipline: "coordinator" },
    { title: "Change Manager", discipline: "change_management" },
  ],
  GEN: [
    { title: "General Worker", discipline: "general" },
    { title: "Consultant", discipline: "general" },
    { title: "Freelancer", discipline: "general" },
    { title: "Intern", discipline: "general" },
  ],
}

// Flat list of all job titles for lookup
const ALL_JOB_TITLES: JobTitle[] = Object.values(JOB_TITLES_BY_DEPARTMENT).flat()

// Map from job title string to discipline
const JOB_TITLE_TO_DISCIPLINE: Record<string, WorkDiscipline> = Object.fromEntries(
  ALL_JOB_TITLES.map((jt) => [jt.title, jt.discipline]),
)

export function getDisciplineForJobTitle(jobTitle: string | null | undefined): WorkDiscipline | null {
  if (!jobTitle) return null
  return JOB_TITLE_TO_DISCIPLINE[jobTitle] ?? null
}

export function getJobTitlesForDepartment(departmentCode: string | null | undefined): JobTitle[] {
  if (!departmentCode) return []
  return JOB_TITLES_BY_DEPARTMENT[departmentCode] ?? []
}

export function getAllJobTitles(): JobTitle[] {
  return ALL_JOB_TITLES
}
