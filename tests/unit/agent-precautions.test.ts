import { describe, expect, it } from "vitest"
import { GeminiError } from "@/lib/ai/gemini"
import {
  PRECAUTIONS_SYSTEM,
  precautionsPrompt,
  readPrecautionDraft,
  readPrecautions,
} from "@/lib/agent/precautions"

const draft = {
  title: "Replace a failed drive",
  summary: "Swap a disk without losing the array.",
  method: ["Identify", "Fix", "Test"],
  steps: [
    { phase: "Identify", action: "Confirm the failed bay from the controller alert." },
    { phase: "Fix", action: "Replace the disk with an approved spare." },
  ],
  existing: ["Power down before opening the chassis."],
}

describe("readPrecautionDraft", () => {
  it("accepts the editor's unsaved state", () => {
    const read = readPrecautionDraft(draft)
    expect(read.ok).toBe(true)
    if (read.ok) {
      expect(read.value.steps).toHaveLength(2)
      expect(read.value.existing).toEqual(["Power down before opening the chassis."])
    }
  })

  it("rejects a step whose phase is not in the method", () => {
    const read = readPrecautionDraft({
      ...draft,
      steps: [{ phase: "Improvise", action: "Try it." }],
    })
    expect(read.ok).toBe(false)
  })

  it("rejects a blank title", () => {
    expect(readPrecautionDraft({ ...draft, title: "  " }).ok).toBe(false)
  })
})

describe("readPrecautions", () => {
  it("keeps 3-6 suggestions and trims them", () => {
    const result = readPrecautions(
      {
        suggestions: [
          { text: "  Lock out the array controller.  ", why: "The Fix step changes live hardware." },
          { text: "Match the spare's firmware before insertion.", why: "A mismatch can rebuild wrong." },
          { text: "Record the serial in the change note.", why: "The Test step needs evidence." },
        ],
      },
      [],
    )
    expect(result).toHaveLength(3)
    expect(result[0].text).toBe("Lock out the array controller.")
  })

  it("drops a duplicate of something a person already wrote", () => {
    const result = readPrecautions(
      {
        suggestions: [
          { text: "power down before opening the chassis.", why: "Already present." },
          { text: "Wear an anti-static strap.", why: "The Fix step touches components." },
        ],
      },
      ["Power down before opening the chassis."],
    )
    expect(result.map((entry) => entry.text)).toEqual(["Wear an anti-static strap."])
  })

  it("drops prose that asks for a credential value", () => {
    const result = readPrecautions(
      {
        suggestions: [
          { text: "Enter the admin password into the console prompt.", why: "Sign-in." },
          { text: "Confirm the maintenance window before touching the array.", why: "Users are live." },
        ],
      },
      [],
    )
    expect(result.map((entry) => entry.text)).toEqual([
      "Confirm the maintenance window before touching the array.",
    ])
  })

  it("drops an over-long suggestion and caps the list", () => {
    const long = "x".repeat(201)
    const suggestions = Array.from({ length: 8 }, (_, index) => ({
      text: `Precaution number ${index + 1}`,
      why: "Because the procedure touches live hardware.",
    }))
    suggestions.push({ text: long, why: "Too long." })
    const result = readPrecautions({ suggestions }, [], 6)
    expect(result).toHaveLength(6)
    expect(result.some((entry) => entry.text === long)).toBe(false)
  })

  it("throws badjson when nothing survives", () => {
    expect(() =>
      readPrecautions({ suggestions: [{ text: "Enter the admin password now.", why: "sign-in" }] }, []),
    ).toThrow(GeminiError)
  })
})

describe("the prompt", () => {
  it("names the steps and keeps advice grounded", () => {
    const prompt = precautionsPrompt(draft)
    expect(prompt).toContain("Replace a failed drive")
    expect(prompt).toContain("Confirm the failed bay")
    expect(PRECAUTIONS_SYSTEM).toMatch(/only from the steps/i)
    expect(PRECAUTIONS_SYSTEM).toMatch(/do not invent/i)
    expect(PRECAUTIONS_SYSTEM).toMatch(/never[^.]*credential/i)
  })
})
