// Department vocabulary — the controlled list of organizational units.
// Each department maps to one or more discipline categories and has a default role pack.
// This is the source of truth for the department dropdown in onboarding and team management.

import type { DisciplineCategory } from "./roles"

export type Department = {
  code: string
  name: string
  categories: DisciplineCategory[]
  defaultPack: string
}

export const DEPARTMENTS: Department[] = [
  {
    code: "IT",
    name: "Information Technology",
    categories: ["technology"],
    defaultPack: "it-technician",
  },
  {
    code: "ENG",
    name: "Engineering",
    categories: ["engineering"],
    defaultPack: "engineering",
  },
  {
    code: "DES",
    name: "Design",
    categories: ["technology", "services"],
    defaultPack: "designer",
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
    categories: ["operations"],
    defaultPack: "operations",
  },
  {
    code: "HR",
    name: "Human Resources",
    categories: ["people"],
    defaultPack: "hr",
  },
  {
    code: "SAL",
    name: "Sales & Marketing",
    categories: ["market"],
    defaultPack: "sales-marketing",
  },
  {
    code: "RES",
    name: "Research & Analysis",
    categories: ["information"],
    defaultPack: "analyst",
  },
  {
    code: "HEA",
    name: "Healthcare & Science",
    categories: ["science"],
    defaultPack: "healthcare-science",
  },
  {
    code: "MGT",
    name: "Management",
    categories: ["delivery"],
    defaultPack: "management",
  },
  {
    code: "GEN",
    name: "General",
    categories: ["services"],
    defaultPack: "general",
  },
]

export const DEPARTMENT_BY_CODE: Record<string, Department> = Object.fromEntries(
  DEPARTMENTS.map((dept) => [dept.code, dept]),
)

export function getDepartmentByCode(code: string | null | undefined): Department | null {
  if (!code) return null
  return DEPARTMENT_BY_CODE[code] ?? null
}

export function getDepartmentName(code: string | null | undefined): string {
  if (!code) return ""
  return getDepartmentByCode(code)?.name ?? code
}
