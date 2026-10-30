import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import {
  blankPlaybook,
  blankRegister,
  fieldsFromPairs,
  pairsFromFields,
  playbookDraftIssues,
  registerDraftIssues,
  renumberSteps,
  stepFor,
} from "@/lib/agent/handover-edit"
import type { HandoverPlaybookDraft, HandoverRegisterDraft } from "@/lib/agent/handover"

const KINDS = ["Infrastructure", "Accounts and systems", "Equipment", "Outstanding work"]
const METHOD = ["Identify", "Reproduce", "Diagnose", "Fix", "Test", "Document"]

const register = (over: Partial<HandoverRegisterDraft> = {}): HandoverRegisterDraft => ({
  kind: "Infrastructure",
  title: "Production database — primary",
  custody: "member",
  fields: { location: "Server room, rack 2" },
  ...over,
})

const playbook = (over: Partial<HandoverPlaybookDraft> = {}): HandoverPlaybookDraft => ({
  discipline: null,
  title: "Replace a failed drive in the rack",
  summary: null,
  scopeKind: null,
  method: METHOD,
  steps: [{ ...stepFor(METHOD, 1), phase: "Fix", action: "Swap the failed drive." }],
  precautions: [],
  recommendations: [],
  tags: [],
  ...over,
})

describe("pairsFromFields / fieldsFromPairs", () => {
  it("round-trips a fields record through ordered pairs", () => {
    const fields = { location: "rack 2", owner: "IT" }
    const pairs = pairsFromFields(fields)
    expect(pairs).toEqual([
      { key: "location", value: "rack 2" },
      { key: "owner", value: "IT" },
    ])
    expect(fieldsFromPairs(pairs)).toEqual(fields)
  })

  it("drops blank keys and trims what it keeps", () => {
    expect(fieldsFromPairs([{ key: "  ", value: "x" }, { key: " serial ", value: " 42 " }])).toEqual({
      serial: "42",
    })
  })
})

describe("blankRegister / blankPlaybook / stepFor", () => {
  it("seeds a register from the pack's first kind with member custody", () => {
    expect(blankRegister(KINDS)).toEqual({ kind: KINDS[0], title: "", custody: "member", fields: {} })
  })

  it("falls back to an empty kind when the pack lists none", () => {
    expect(blankRegister([]).kind).toBe("")
  })

  it("seeds a playbook whose method mirrors the pack and survives the form", () => {
    const draft = blankPlaybook(METHOD)
    expect(draft.method).toEqual(METHOD)
    expect(draft.discipline).toBeNull()
    expect(playbookDraftIssues(draft)).toContain("Add at least one step.")
  })

  it("uses the six-step default when a pack has no method", () => {
    expect(blankPlaybook([]).method).toEqual(METHOD)
  })

  it("keys a fresh step to a real method phase", () => {
    const step = stepFor(METHOD, 3)
    expect(step.order).toBe(3)
    expect(METHOD).toContain(step.phase)
  })
})

describe("renumberSteps", () => {
  it("renumbers after a removal so order matches position", () => {
    const steps = [stepFor(METHOD, 1), stepFor(METHOD, 2), stepFor(METHOD, 3)]
    const trimmed = renumberSteps([steps[0], steps[2]])
    expect(trimmed.map((step) => step.order)).toEqual([1, 2])
  })
})

describe("registerDraftIssues", () => {
  it("accepts a well-formed row", () => {
    expect(registerDraftIssues(register(), KINDS)).toEqual([])
  })

  it("refuses a blank or over-long title", () => {
    expect(registerDraftIssues(register({ title: "  " }), KINDS)).toContain("A title is required.")
    expect(registerDraftIssues(register({ title: "x".repeat(201) }), KINDS)).toContain(
      "The title must be at most 200 characters.",
    )
  })

  it("refuses a kind the pack does not list", () => {
    expect(registerDraftIssues(register({ kind: "Vehicles" }), KINDS)).toContain(
      "Choose a kind this role pack lists.",
    )
  })

  it("names a credential-shaped field without repeating its value", () => {
    const issues = registerDraftIssues(register({ fields: { password: "hunter2" } }), KINDS)
    expect(issues).toHaveLength(1)
    expect(issues[0]).toContain("password")
    expect(issues.join(" ")).not.toContain("hunter2")
  })
})

describe("playbookDraftIssues", () => {
  it("accepts a draft with one titled, in-method step", () => {
    expect(playbookDraftIssues(playbook())).toEqual([])
  })

  it("accepts a discipline that is a known work discipline", () => {
    expect(playbookDraftIssues(playbook({ discipline: "technician" }))).toEqual([])
  })

  it("refuses a discipline that is not a known work discipline", () => {
    expect(playbookDraftIssues(playbook({ discipline: "welder-extraordinaire" }))).toContain(
      "Choose a known discipline or clear it.",
    )
  })

  it("refuses a step whose phase is outside the method or with no action", () => {
    const issues = playbookDraftIssues(
      playbook({ steps: [{ ...stepFor(METHOD, 1), phase: "Escalate", action: "  " }] }),
    )
    expect(issues.some((line) => line.startsWith("Step 1: phase"))).toBe(true)
    expect(issues).toContain("Step 1: an action is required.")
  })
})

describe("the commit route stays the server-side gate", () => {
  it("re-validates through the same readers the manual forms use, unchanged by the editor", () => {
    const route = readFileSync("app/api/agent/handover/commit/route.ts", "utf8")
    expect(route).toMatch(/readPlaybookInput/)
    expect(route).toMatch(/readRegisterFields/)
    expect(route).toMatch(/stripCredentialValues/)
    expect(route).toMatch(/source: "gemini"/)
    expect(route).toMatch(/aiMarked: true/)
  })

  it("the preview editor does not import a database or write path", () => {
    const editor = readFileSync("lib/agent/handover-edit.ts", "utf8")
    expect(editor).not.toMatch(/@\/lib\/db/)
    expect(editor).not.toMatch(/drizzle-orm/)
    expect(editor).not.toMatch(/>\/api\//)
  })
})
