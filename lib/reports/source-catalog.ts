import { MODULE_LABEL } from "./aggregate"
import { MODULE_SECTIONS, type ModuleSectionKey } from "./module-sections"

export type ReportSourceGroup = {
  label: string
  description: string
  sections: ModuleSectionKey[]
}

export const CORE_REPORT_SOURCES = [
  { label: "Dashboard overview", description: "Period summary and delivery totals" },
  { label: "Kanban, sprints and tasks", description: "Work movement, completion and priorities" },
  { label: "Work log and deliverables", description: "Time, activity and shipped outcomes" },
  { label: "Planner", description: "Plans and upcoming commitments" },
] as const

export const REPORT_SOURCE_GROUPS: ReportSourceGroup[] = [
  {
    label: "Delivery and operations",
    description: "Operational work, service requests and registers",
    sections: ["operations", "registers", "serviceDesk"],
  },
  {
    label: "Planning and improvement",
    description: "Goals, meetings, retrospectives and career progress",
    sections: ["goals", "meetings", "retros", "career"],
  },
  {
    label: "Processes and automation",
    description: "Playbooks, automation runs and imported operational activity",
    sections: ["playbooks", "automation"],
  },
  {
    label: "AI and collaboration",
    description: "AI assistant, chat and communication activity",
    sections: ["assistant", "chat", "email"],
  },
  {
    label: "People and culture",
    description: "Wellbeing, gamification and ethical metrics",
    sections: ["wellbeing", "gamification", "ethics"],
  },
]

export function reportSourceLabel(section: ModuleSectionKey): string {
  return MODULE_LABEL[section]
}

export function isReportSourceSection(section: string): section is ModuleSectionKey {
  return (MODULE_SECTIONS as readonly string[]).includes(section)
}
