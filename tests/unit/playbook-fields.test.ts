import { describe, expect, it } from "vitest"
import { readPlaybookInput } from "@/lib/playbooks/fields"

const base = {
  packKey: "it-technician",
  title: "Replace a failed disk",
  method: ["Identify", "Fix"],
  steps: [{ phase: "Fix", action: "Replace the disk" }],
}

describe("readPlaybookInput", () => {
  it("resolves a minimal input and hands back only the write whitelist", () => {
    const parsed = readPlaybookInput(
      {
        ...base,
        source: "gemini",
        aiMarked: true,
        version: 99,
        authorId: 5,
        status: "published",
      },
      ["Identify", "Reproduce"],
    )
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.value.method).toEqual(["Identify", "Fix"])
    expect(parsed.value.steps).toHaveLength(1)
    expect(parsed.value.steps[0].checks).toEqual([])
    expect(parsed.value).not.toHaveProperty("source")
    expect(parsed.value).not.toHaveProperty("aiMarked")
    expect(parsed.value).not.toHaveProperty("version")
    expect(parsed.value).not.toHaveProperty("authorId")
    expect(parsed.value).not.toHaveProperty("status")
  })

  it("uses the fallback method when the input omits one", () => {
    const parsed = readPlaybookInput(
      { packKey: "general", title: "Open the shop", steps: [] },
      ["Plan", "Do", "Check", "Act"],
    )
    expect(parsed.ok).toBe(true)
    if (parsed.ok) expect(parsed.value.method).toEqual(["Plan", "Do", "Check", "Act"])
  })

  it("rejects duplicate phases", () => {
    const parsed = readPlaybookInput({ ...base, method: ["Fix", "fix"] }, [])
    expect(parsed.ok).toBe(false)
    if (!parsed.ok) expect(parsed.error).toMatch(/distinct/i)
  })

  it("rejects a discipline the app does not know", () => {
    const parsed = readPlaybookInput({ ...base, discipline: "astronaut" }, [])
    expect(parsed.ok).toBe(false)
  })

  it("accepts a known discipline and null", () => {
    expect(readPlaybookInput({ ...base, discipline: "technician" }, []).ok).toBe(true)
    expect(readPlaybookInput({ ...base, discipline: null }, []).ok).toBe(true)
  })

  it("trims list fields and drops blanks", () => {
    const parsed = readPlaybookInput(
      {
        ...base,
        precautions: [" Lock out first ", "  "],
        recommendations: ["Keep a spare"],
        tags: [" disk ", ""],
      },
      [],
    )
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.value.precautions).toEqual(["Lock out first"])
    expect(parsed.value.recommendations).toEqual(["Keep a spare"])
    expect(parsed.value.tags).toEqual(["disk"])
  })

  it("names the failing step in a step error", () => {
    const parsed = readPlaybookInput(
      { ...base, steps: [{ phase: "Fix", action: "ok" }, { phase: "Deploy", action: "x" }] },
      [],
    )
    expect(parsed.ok).toBe(false)
    if (!parsed.ok) expect(parsed.error).toMatch(/^Step 2:/)
  })

  it("rejects a body that is not an object", () => {
    expect(readPlaybookInput(null, []).ok).toBe(false)
    expect(readPlaybookInput("playbook", []).ok).toBe(false)
  })
})
