import { describe, expect, it } from "vitest"
import {
  ACTIONS,
  ACTION_KEYS,
  isActionKey,
  isTriggerKey,
  conditionsPass,
  describeTrigger,
  TEMPLATES,
  TRIGGERS,
  TRIGGER_KEYS,
  type TaskShape,
  type TriggerKey,
} from "@/app/api/automation/registry"

const task = (over: Partial<TaskShape> = {}): TaskShape => ({
  id: 1,
  title: "Ship the thing",
  status: "todo",
  priority: "medium",
  storyPoints: 3,
  assigneeId: 7,
  assigneeName: "Ada",
  sprintId: 2,
  dueDate: null,
  createdAt: "2026-10-01T09:00:00Z",
  updatedAt: "2026-10-20T09:00:00Z",
  ...over,
})

describe("trigger and action vocabulary", () => {
  it("key lists match the definition objects", () => {
    expect(TRIGGER_KEYS).toEqual(Object.keys(TRIGGERS))
    expect(ACTION_KEYS).toEqual(Object.keys(ACTIONS))
    expect(TRIGGER_KEYS.length).toBeGreaterThanOrEqual(7)
    expect(ACTION_KEYS.length).toBeGreaterThanOrEqual(5)
  })

  it("guards accept declared keys only", () => {
    for (const key of TRIGGER_KEYS) expect(isTriggerKey(key)).toBe(true)
    expect(isTriggerKey("whenever")).toBe(false)
    expect(isTriggerKey(null)).toBe(false)
    expect(isTriggerKey(3)).toBe(false)

    for (const key of ACTION_KEYS) expect(isActionKey(key)).toBe(true)
    expect(isActionKey("delete_everything")).toBe(false)
    expect(isActionKey(undefined)).toBe(false)
  })

  it("every declared param has a label, type and finite default where applicable", () => {
    for (const key of TRIGGER_KEYS) {
      for (const p of TRIGGERS[key].params) {
        expect(p.label.trim().length, `${key}.${p.key} label`).toBeGreaterThan(0)
        expect(p.type).toBe("number")
        expect(Number.isFinite(p.default), `${key}.${p.key} default`).toBe(true)
      }
    }
    for (const key of ACTION_KEYS) {
      for (const p of ACTIONS[key].params) {
        expect(p.label.trim().length, `${key}.${p.key} label`).toBeGreaterThan(0)
        expect(["status", "user", "number", "text"]).toContain(p.type)
      }
    }
  })

  it("every trigger and action carries a description", () => {
    for (const key of TRIGGER_KEYS) expect(TRIGGERS[key].description.length).toBeGreaterThan(10)
    for (const key of ACTION_KEYS) expect(ACTIONS[key].description.length).toBeGreaterThan(10)
  })
})

describe("conditionsPass", () => {
  it("empty conditions match everything", () => {
    expect(conditionsPass(task(), {})).toBe(true)
    expect(conditionsPass(task({ status: "done" }), {})).toBe(true)
  })

  it("filters by status and priority lists", () => {
    expect(conditionsPass(task({ status: "blocked" }), { statusIn: ["todo", "blocked"] })).toBe(true)
    expect(conditionsPass(task({ status: "review" }), { statusIn: ["todo", "blocked"] })).toBe(false)
    expect(conditionsPass(task({ priority: "urgent" }), { priorityIn: ["urgent", "high"] })).toBe(true)
    expect(conditionsPass(task({ priority: "low" }), { priorityIn: ["urgent", "high"] })).toBe(false)
  })

  it("empty filter arrays are ignored, not treated as match-nothing", () => {
    expect(conditionsPass(task(), { statusIn: [], priorityIn: [] })).toBe(true)
  })

  it("compares story points inclusively at the minimum", () => {
    expect(conditionsPass(task({ storyPoints: 5 }), { minStoryPoints: 5 })).toBe(true)
    expect(conditionsPass(task({ storyPoints: 4 }), { minStoryPoints: 5 })).toBe(false)
    expect(conditionsPass(task({ storyPoints: 0 }), { minStoryPoints: null })).toBe(true)
  })

  it("matches a specific sprint and rejects others including unscoped tasks", () => {
    expect(conditionsPass(task({ sprintId: 2 }), { sprintId: 2 })).toBe(true)
    expect(conditionsPass(task({ sprintId: 3 }), { sprintId: 2 })).toBe(false)
    expect(conditionsPass(task({ sprintId: null }), { sprintId: 2 })).toBe(false)
    expect(conditionsPass(task({ sprintId: null }), { sprintId: null })).toBe(true)
  })

  it("ANDs all conditions together", () => {
    const c = { statusIn: ["todo"], priorityIn: ["high"], minStoryPoints: 3, sprintId: 2 }
    expect(conditionsPass(task({ priority: "high" }), c)).toBe(true)
    expect(conditionsPass(task({ priority: "low" }), c)).toBe(false)
    expect(conditionsPass(task({ priority: "high", storyPoints: 2 }), c)).toBe(false)
    expect(conditionsPass(task({ priority: "high", sprintId: 9 }), c)).toBe(false)
  })
})

describe("describeTrigger", () => {
  it("interpolates numeric params", () => {
    expect(describeTrigger("due_soon", { days: 5 })).toBe("Due within 5 days")
    expect(describeTrigger("stale", { days: 14 })).toBe("No update for 14+ days")
    expect(describeTrigger("newly_created", { hours: 48 })).toBe("Created in last 48h")
  })

  it("falls back to the registry defaults when params are missing", () => {
    expect(describeTrigger("due_soon", {})).toBe(`Due within ${TRIGGERS.due_soon.params[0].default} days`)
    expect(describeTrigger("stale", {})).toBe(`No update for ${TRIGGERS.stale.params[0].default}+ days`)
    expect(describeTrigger("newly_created", {})).toBe(`Created in last ${TRIGGERS.newly_created.params[0].default}h`)
  })

  it("uses the plain label for parameter-less triggers", () => {
    expect(describeTrigger("overdue", {})).toBe(TRIGGERS.overdue.label)
    expect(describeTrigger("blocked", {})).toBe(TRIGGERS.blocked.label)
    expect(describeTrigger("unassigned_open", {})).toBe(TRIGGERS.unassigned_open.label)
  })

  it("echoes an unknown trigger instead of throwing", () => {
    expect(describeTrigger("invented" as TriggerKey, {})).toBe("invented")
  })
})

describe("TEMPLATES", () => {
  it("has unique keys and names", () => {
    const keys = TEMPLATES.map((t) => t.key)
    const names = TEMPLATES.map((t) => t.name)
    expect(new Set(keys).size).toBe(keys.length)
    expect(new Set(names).size).toBe(names.length)
    expect(TEMPLATES.length).toBeGreaterThanOrEqual(5)
  })

  it("only references declared triggers and actions", () => {
    for (const tpl of TEMPLATES) {
      expect(isTriggerKey(tpl.trigger), `${tpl.key} trigger`).toBe(true)
      expect(tpl.actions.length).toBeGreaterThan(0)
      for (const action of tpl.actions) expect(isActionKey(action.type), `${tpl.key} action`).toBe(true)
    }
  })

  it("supplies every required action param", () => {
    for (const tpl of TEMPLATES) {
      for (const action of tpl.actions) {
        for (const p of ACTIONS[action.type].params) {
          if (!p.required) continue
          const value = action.params?.[p.key]
          expect(value !== undefined && value !== "", `${tpl.key}/${action.type}.${p.key}`).toBe(true)
        }
      }
    }
  })

  it("uses only declared trigger params", () => {
    for (const tpl of TEMPLATES) {
      const declared = TRIGGERS[tpl.trigger].params.map((p) => p.key)
      for (const key of Object.keys(tpl.triggerParams)) {
        expect(declared, `${tpl.key} triggerParams.${key}`).toContain(key)
      }
    }
  })
})
