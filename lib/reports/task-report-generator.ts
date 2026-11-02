export type ReportSection = {
  id: string
  title: string
  dataSource: {
    type: "task_instances" | "checklists"
    filters?: Record<string, string>
  } | null
}

export type ReportSectionOutput = {
  id: string
  title: string
  data: unknown[] | null
}

export function buildReportSections(
  templateSections: ReportSection[],
  instances: Array<Record<string, unknown>>,
  checklists: Array<Record<string, unknown>>,
): ReportSectionOutput[] {
  return templateSections.map((section) => {
    if (!section.dataSource) {
      return { id: section.id, title: section.title, data: null }
    }

    const { type, filters = {} } = section.dataSource

    let sourceData: Array<Record<string, unknown>>
    if (type === "task_instances") {
      sourceData = instances
    } else if (type === "checklists") {
      sourceData = checklists
    } else {
      return { id: section.id, title: section.title, data: null }
    }

    const filtered = sourceData.filter((item) => {
      return Object.entries(filters).every(([key, value]) => {
        return item[key] === value
      })
    })

    return { id: section.id, title: section.title, data: filtered }
  })
}
