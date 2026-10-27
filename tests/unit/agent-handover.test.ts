import { describe, expect, it } from "vitest"
import { GeminiError } from "@/lib/ai/gemini"
import {
  HANDOVER_SYSTEM,
  handoverPrompt,
  readHandover,
  stripCredentialValues,
  type HandoverPack,
} from "@/lib/agent/handover"

const PACK: HandoverPack = {
  packKey: "it-technician",
  title: "IT technician",
  kinds: ["infrastructure", "account", "equipment", "outstanding"],
  method: ["Identify", "Reproduce", "Diagnose", "Fix", "Test", "Document"],
}

describe("stripCredentialValues", () => {
  it("refuses a credential-shaped key and names the path", () => {
    const result = stripCredentialValues(
      [
        { key: "password", value: "hunter2" },
        { key: "admin_apiKey", value: "abc" },
        { key: "console_url", value: "https://console.example" },
      ],
      "registers[0].fields",
    )
    expect(result.kept).toEqual({ console_url: "https://console.example" })
    expect(result.refused).toHaveLength(2)
    expect(result.refused[0].path).toBe("registers[0].fields.password")
    expect(result.refused[0].reason).toMatch(/credential/i)
  })

  it("refuses a value written as an assignment and never echoes it", () => {
    const result = stripCredentialValues(
      [{ key: "notes", value: "router login password: Sup3rS3cret" }],
      "registers[0].fields",
    )
    expect(result.kept).toEqual({})
    expect(JSON.stringify(result.refused)).not.toContain("Sup3rS3cret")
    expect(result.refused[0].path).toBe("registers[0].fields.notes")
  })

  it("keeps ordinary text untouched", () => {
    const result = stripCredentialValues(
      [
        { key: "hostname", value: "fs01" },
        { key: "kept_in", value: "1Password — IT vault" },
      ],
      "registers[0].fields",
    )
    expect(result.refused).toEqual([])
    expect(result.kept).toEqual({ hostname: "fs01", kept_in: "1Password — IT vault" })
  })
})

describe("readHandover", () => {
  it("turns a payload into one register row and one playbook draft", () => {
    const preview = readHandover(
      {
        registers: [
          {
            kind: "infrastructure",
            title: "File server fs01",
            custody: "team",
            fields: [
              { key: "hostname", value: "fs01" },
              { key: "renewal", value: "2026-11-01" },
            ],
          },
        ],
        playbooks: [
          {
            title: "Replace a failed drive",
            summary: "Swap a disk without losing the array.",
            steps: [
              {
                phase: "Identify",
                action: "Confirm the failed bay from the controller alert.",
              },
            ],
            precautions: ["Power down before opening the chassis."],
            tags: ["storage"],
          },
        ],
      },
      PACK,
    )

    expect(preview.registers).toHaveLength(1)
    expect(preview.registers[0]).toMatchObject({
      kind: "infrastructure",
      title: "File server fs01",
      custody: "team",
      fields: { hostname: "fs01", renewal: "2026-11-01" },
    })
    expect(preview.playbooks).toHaveLength(1)
    expect(preview.playbooks[0].steps[0]).toMatchObject({
      phase: "Identify",
      action: "Confirm the failed bay from the controller alert.",
      checks: [],
    })
    expect(preview.refusals).toEqual([])
  })

  it("refuses a kind the pack does not list", () => {
    const preview = readHandover(
      { registers: [{ kind: "spaceship", title: "Rocket", fields: [] }], playbooks: [] },
      PACK,
    )
    expect(preview.registers).toEqual([])
    expect(preview.refusals[0].path).toBe("registers[0].kind")
  })

  it("refuses a credential key and does not repeat the value", () => {
    const preview = readHandover(
      {
        registers: [
          {
            kind: "account",
            title: "Domain admin",
            fields: [
              { key: "username", value: "svc-admin" },
              { key: "password", value: "N0tInTheOutput" },
            ],
          },
        ],
        playbooks: [],
      },
      PACK,
    )
    expect(preview.registers[0].fields).toEqual({ username: "svc-admin" })
    expect(preview.refusals[0].path).toBe("registers[0].fields.password")
    expect(JSON.stringify(preview)).not.toContain("N0tInTheOutput")
  })

  it("refuses a playbook the real validator rejects", () => {
    const preview = readHandover(
      {
        registers: [],
        playbooks: [{ title: "No action", steps: [{ phase: "Identify", action: "" }] }],
      },
      PACK,
    )
    expect(preview.playbooks).toEqual([])
    expect(preview.refusals[0].path).toBe("playbooks[0]")
    expect(preview.refusals[0].reason).toMatch(/action is required/i)
  })

  it("refuses playbook prose that asks for a credential value", () => {
    const preview = readHandover(
      {
        registers: [],
        playbooks: [
          {
            title: "Reset the console",
            precautions: ["Send the admin password to the vendor engineer."],
            steps: [{ phase: "Fix", action: "Open the console." }],
          },
        ],
      },
      PACK,
    )
    expect(preview.playbooks).toEqual([])
    expect(preview.refusals[0].reason).toMatch(/credential/i)
  })

  it("throws a badjson GeminiError for a payload that is not an object", () => {
    expect(() => readHandover("not json", PACK)).toThrow(GeminiError)
  })
})

describe("the prompt", () => {
  it("names the pack kinds and phases, and forbids credential values", () => {
    const prompt = handoverPrompt({ pack: PACK, source: "text" })
    expect(prompt).toContain("it-technician")
    expect(prompt).toContain("infrastructure, account, equipment, outstanding")
    expect(prompt).toContain("Identify → Reproduce → Diagnose → Fix → Test → Document")
    expect(HANDOVER_SYSTEM).toMatch(/never (output|include|repeat)[^.]*credential/i)
    expect(HANDOVER_SYSTEM).toMatch(/where (it|the credential) is kept/i)
    expect(HANDOVER_SYSTEM).toMatch(/do not invent/i)
  })
})
