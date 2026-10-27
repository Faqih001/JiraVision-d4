import { describe, expect, it } from "vitest"
import {
  SIX_STEP_METHOD,
  cloneStep,
  defaultMethod,
  emptyStep,
  moveStep,
  readMethod,
  readRunNotes,
  readStep,
  readSteps,
  runEntryDrafts,
} from "@/lib/playbooks/method"
import { canPublish, publishProblem } from "@/lib/playbooks/rules"

describe("the six-step method", () => {
  it("is complete and ordered", () => {
    expect(SIX_STEP_METHOD).toEqual(["Identify", "Reproduce", "Diagnose", "Fix", "Test", "Document"])
  })

  it("yields to a pack method and falls back to the six steps", () => {
    expect(defaultMethod(["Plan", "Do", "Check", "Act"])).toEqual(["Plan", "Do", "Check", "Act"])
    expect(defaultMethod([])).toEqual([...SIX_STEP_METHOD])
    expect(defaultMethod(null)).toEqual([...SIX_STEP_METHOD])
  })

  it("rejects duplicates and empty phase lists at the boundary", () => {
    expect(readMethod([]).ok).toBe(false)
    const duplicate = readMethod(["Fix", "fix"])
    expect(duplicate.ok).toBe(false)
  })
})

describe("steps", () => {
  const method = [...SIX_STEP_METHOD]

  it("always carries the five arrays, even when the input omits them", () => {
    const parsed = readStep({ phase: "Fix", action: "Replace the failed disk" }, method, 1)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.value.checks).toEqual([])
    expect(parsed.value.precautions).toEqual([])
    expect(parsed.value.warnings).toEqual([])
    expect(parsed.value.ppe).toEqual([])
    expect(parsed.value.tools_parts).toEqual([])
    expect(parsed.value.action).toBe("Replace the failed disk")
    expect(parsed.value.order).toBe(1)
  })

  it("rejects a phase outside the method", () => {
    const parsed = readStep({ phase: "Deploy", action: "Ship it" }, method, 1)
    expect(parsed.ok).toBe(false)
  })

  it("rejects a step with no action", () => {
    expect(readStep({ phase: "Fix", action: "   " }, method, 1).ok).toBe(false)
  })

  it("drops blank array entries and rejects a non-string entry", () => {
    const ok = readStep({ phase: "Fix", action: "Do it", checks: ["look", "  "] }, method, 1)
    expect(ok.ok).toBe(true)
    if (ok.ok) expect(ok.value.checks).toEqual(["look"])
    expect(readStep({ phase: "Fix", action: "Do it", checks: [1] }, method, 1).ok).toBe(false)
  })

  it("names the failing step", () => {
    const parsed = readSteps([{ phase: "Fix", action: "ok" }, { phase: "Nope", action: "x" }], method)
    expect(parsed.ok).toBe(false)
    if (!parsed.ok) expect(parsed.error).toMatch(/^Step 2:/)
  })

  it("renumbers on move and clone", () => {
    const steps = ["Identify", "Reproduce", "Diagnose"].map((phase, i) => emptyStep(phase, i + 1))
    const moved = moveStep(steps, 0, 2)
    expect(moved.map((step) => step.phase)).toEqual(["Reproduce", "Diagnose", "Identify"])
    expect(moved.map((step) => step.order)).toEqual([1, 2, 3])
    const cloned = cloneStep(moved, 1)
    expect(cloned).toHaveLength(4)
    expect(cloned.map((step) => step.order)).toEqual([1, 2, 3, 4])
    expect(cloned[2].phase).toBe(cloned[1].phase)
  })

  it("is a no-op on an out-of-range move", () => {
    const steps = [emptyStep("Fix", 1)]
    expect(moveStep(steps, 0, 5)).toEqual(steps)
  })
})

describe("run logging", () => {
  const playbook = {
    id: 12,
    title: "Replace a failed disk",
    version: 3,
    discipline: "technician" as const,
    method: [...SIX_STEP_METHOD],
  }

  it("writes one entry per phase with the version", () => {
    const drafts = runEntryDrafts(playbook, { Diagnose: "SMART reported a reallocated sector." })
    expect(drafts).toHaveLength(SIX_STEP_METHOD.length)
    expect(drafts.map((draft) => draft.title.split(" — ")[1])).toEqual([...SIX_STEP_METHOD])
    expect(drafts.every((draft) => draft.playbookId === 12)).toBe(true)
    expect(drafts.every((draft) => draft.playbookVersion === 3)).toBe(true)
    expect(drafts[2].body).toBe("SMART reported a reallocated sector.")
    expect(drafts[0].body).toBeNull()
  })

  it("refuses a note for a phase the method does not have", () => {
    expect(readRunNotes({ Deploy: "x" }, SIX_STEP_METHOD).ok).toBe(false)
    expect(readRunNotes(undefined, SIX_STEP_METHOD)).toEqual({ ok: true, value: {} })
  })
})

describe("publishing", () => {
  const steps = [{ ...emptyStep("Fix", 1), action: "Replace the disk" }]

  it("blocks a model draft until a human edit clears ai_marked", () => {
    const gemini = { status: "draft", source: "gemini", aiMarked: true, steps }
    expect(canPublish(gemini)).toBe(false)
    expect(publishProblem(gemini)).toMatch(/human edit/)
    expect(canPublish({ ...gemini, aiMarked: false })).toBe(true)
  })

  it("allows a manual playbook and refuses an empty one", () => {
    expect(canPublish({ status: "draft", source: "manual", aiMarked: false, steps })).toBe(true)
    expect(canPublish({ status: "draft", source: "manual", aiMarked: false, steps: [] })).toBe(false)
  })

  it("refuses an archived playbook until it is restored", () => {
    expect(publishProblem({ status: "archived", source: "manual", aiMarked: false, steps })).toMatch(/Restore/)
  })
})
