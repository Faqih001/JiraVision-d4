import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import path from "node:path"

// A card created with a status has to keep that status on every surface that draws it, and the
// one case where it genuinely cannot is a schedule: a cadence makes the row a template, a
// template is never finished (lib/task-updates.ts `recurringStatusError`), and the board draws
// today's occurrence rather than the template — and every occurrence is born `todo`. So a
// create form must not offer a status its own writer will refuse, and POST had to gain the check
// PUT already had, or a "Daily + Done" card would sit in Done on the tasks page and To do on the
// board at the same time.
//
// These are source guards, house style: they read the files and assert on the code, never on a
// comment, because the failure being prevented is a future edit quietly putting the rule back.

const repo = path.resolve(__dirname, "..", "..")
const code = (relative: string) =>
  readFileSync(path.join(repo, relative), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "")

/** The `<Select>` block a labelled field owns, from its Label down to its closing tag. */
function selectBlock(source: string, triggerId: string): string {
  const start = source.indexOf(`htmlFor="${triggerId}"`)
  expect(start, `no field with htmlFor="${triggerId}"`).toBeGreaterThan(-1)
  const end = source.indexOf("</Select>", start)
  expect(end, `field ${triggerId} never closes its Select`).toBeGreaterThan(start)
  return source.slice(start, end)
}

const postRoute = code("app/api/tasks/route.ts")
const kanban = code("app/dashboard/kanban/page.tsx")
const tasksPage = code("app/dashboard/tasks/page.tsx")

describe("a create cannot store a status its own writer refuses", () => {
  it("POST /api/tasks runs the recurring-status rule and answers 409", () => {
    expect(postRoute).toMatch(/recurringStatusError\(/)
    expect(postRoute).toMatch(/\{ status: 409 \}/)
  })

  it("POST reads the rule from lib/task-updates rather than restating it", () => {
    expect(postRoute).toMatch(/import \{[^}]*recurringStatusError[^}]*\} from "@\/lib\/task-updates"/)
    expect(postRoute).not.toMatch(/cadence !== "one-off"[\s\S]{0,80}&&[\s\S]{0,80}done/)
  })
})

describe("the status list a card may hold has one home", () => {
  const pages = [
    ["app/dashboard/kanban/page.tsx", kanban],
    ["app/dashboard/tasks/page.tsx", tasksPage],
  ] as const

  it("neither page filters the finished words out inline any more", () => {
    for (const [file, source] of pages) {
      // The two dialogs each spelled the same rule out on the fly; the reader in isOverdue takes
      // a status variable, so naming the filter's own parameter is what identifies the inline copy.
      expect(source, file).not.toMatch(/isCompletedTaskStatus\(s\)/u)
    }
  })

  it("both pages call creatableStatusesFor", () => {
    for (const [file, source] of pages) {
      expect(source, file).toMatch(/from "@\/lib\/tasks\/statuses"/u)
      expect((source.match(/creatableStatusesFor\(/gu) ?? []).length, file).toBeGreaterThanOrEqual(2)
    }
  })

  it("the create dialog's Status list is the filtered one, not the bare board", () => {
    for (const [id, source] of [
      ["kf-status", kanban],
      ["tf-status", tasksPage],
    ] as const) {
      const block = selectBlock(source, id)
      expect(block, id).toMatch(/creatableStatusesFor\(/u)
      expect(block, id).not.toMatch(/(?<!able)\bSTATUSES\.map/u)
    }
  })
})

/**
 * The source between two markers, where the second marker is the first one AFTER the first.
 * A plain `indexOf(a), indexOf(b)` pair silently returns "" whenever b also appears before a.
 */
function between(source: string, open: string, close: string): string {
  const start = source.indexOf(open)
  expect(start, `no ${JSON.stringify(open)} in the source`).toBeGreaterThan(-1)
  const end = source.indexOf(close, start + open.length)
  expect(end, `no ${JSON.stringify(close)} after ${JSON.stringify(open)}`).toBeGreaterThan(start)
  return source.slice(start, end)
}

describe("the kanban add-card modal can create a schedule", () => {
  it("the draft carries cadence and checklist items", () => {
    const draft = between(kanban, "type TaskDraft", "export type KanbanTask")
    expect(draft).toMatch(/cadence:\s*Cadence/u)
    expect(draft).toMatch(/checklistItems: ChecklistItem\[\]/u)
  })

  it("a new card starts one-off with no checklist", () => {
    const open = between(kanban, "const openCreate", "const openEdit")
    expect(open).toMatch(/cadence: "one-off"/u)
    expect(open).toMatch(/checklistItems: \[\]/u)
  })

  it("editing a card loads its cadence, so a save cannot quietly reset a schedule", () => {
    const open = between(kanban, "const openEdit", "const saveTask")
    expect(open).toMatch(/cadence:/u)
    expect(open).toMatch(/checklistItems:/u)
  })

  it("the payload sends both fields, and drops a checklist that is no longer scheduled", () => {
    const payload = between(kanban, "const saveTask", "const deleteTask")
    expect(payload).toMatch(/cadence: draft\.cadence/u)
    expect(payload).toMatch(/checklistItems: draft\.cadence !== "one-off" \? draft\.checklistItems\s*:\s*\[\]/u)
  })

  it("the modal renders a Cadence select and a checklist editor", () => {
    expect(kanban).toMatch(/htmlFor="kf-cadence"/u)
    expect(kanban).toMatch(/draft\.cadence !== "one-off" &&/u)
    expect(kanban).toMatch(/Checklist items/u)
  })

  it("picking a schedule cadence drops a status the writer would refuse", () => {
    const block = selectBlock(kanban, "kf-cadence")
    expect(block).toMatch(/status: statusAfterCadenceChange\(v, draft\.status, STATUSES\)/u)
  })
})

describe("the tasks dialog keeps the same promise", () => {
  it("changing cadence there resets an unacceptable status too", () => {
    const block = selectBlock(tasksPage, "tf-cadence")
    expect(block).toMatch(/status: statusAfterCadenceChange\(v, draft\.status, STATUSES\)/u)
  })
})
