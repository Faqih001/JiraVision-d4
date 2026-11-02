export type ChecklistItemType = "yes-no-na"
export const CHECKLIST_ITEM_TYPES: ChecklistItemType[] = ["yes-no-na"]

export type ChecklistItem = {
  id: string
  label: string
  type: ChecklistItemType
}

export type ChecklistResponse = {
  id: string
  value: "yes" | "no" | "n/a"
}

const VALID_RESPONSE_VALUES = new Set(["yes", "no", "n/a"])

export function validateChecklistItem(item: unknown): item is ChecklistItem {
  if (!item || typeof item !== "object") return false
  const obj = item as Record<string, unknown>
  return (
    typeof obj.id === "string" &&
    obj.id.length > 0 &&
    typeof obj.label === "string" &&
    obj.label.length > 0 &&
    typeof obj.type === "string" &&
    CHECKLIST_ITEM_TYPES.includes(obj.type as ChecklistItemType)
  )
}

export function parseChecklistItems(raw: string | null | undefined): ChecklistItem[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(validateChecklistItem)
  } catch {
    return []
  }
}

export function validateChecklistResponses(
  items: ChecklistItem[],
  responses: unknown,
): boolean {
  if (!Array.isArray(responses)) return false
  if (responses.length !== items.length) return false
  const itemIds = new Set(items.map((i) => i.id))
  const seenIds = new Set<string>()
  for (const r of responses) {
    if (!r || typeof r !== "object") return false
    const resp = r as Record<string, unknown>
    if (typeof resp.id !== "string" || !itemIds.has(resp.id)) return false
    if (seenIds.has(resp.id)) return false
    seenIds.add(resp.id)
    if (typeof resp.value !== "string" || !VALID_RESPONSE_VALUES.has(resp.value)) return false
  }
  return true
}
