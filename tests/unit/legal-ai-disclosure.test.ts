import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import path from "node:path"
import { legalNoticeDoc } from "@/content/legal"

const repo = path.resolve(__dirname, "..", "..")
const src = (relative: string) => readFileSync(path.join(repo, relative), "utf8")

const disclosure = () => legalNoticeDoc.sections.find((s) => s.id === "ai-assistant-answers")

describe("the AI assistant disclosure on the legal notice", () => {
  it("exists, because the widget answers from a model and the visitor is owed that much", () => {
    expect(disclosure()).toBeTruthy()
    expect(disclosure()?.heading).toBe("AI Assistant Answers")
  })

  it("says what the model is allowed to read, and that it is nothing private", () => {
    const text = (disclosure()?.paragraphs ?? []).join("\n")
    expect(text).toMatch(/machine-learning model/u)
    expect(text).toMatch(/no access to anything that is not already public/u)
  })

  it("makes the published page win, so a machine answer cannot become the terms", () => {
    const text = (disclosure()?.paragraphs ?? []).join("\n")
    expect(text).toMatch(/not a guarantee/u)
    expect(text).toMatch(/the page wins/u)
  })

  it("sits with the other notices rather than buried at the end of the document", () => {
    const ids = legalNoticeDoc.sections.map((s) => s.id)
    const at = ids.indexOf("ai-assistant-answers")
    expect(at).toBeGreaterThan(ids.indexOf("disclaimer"))
    expect(at).toBeLessThan(ids.indexOf("external-links"))
  })

  it("keeps every section id unique, because the ids are the page's anchors", () => {
    const ids = legalNoticeDoc.sections.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("keeps the section ids kebab-case, matching the rest of the document", () => {
    for (const id of legalNoticeDoc.sections.map((s) => s.id)) {
      expect(id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u)
    }
  })
})

describe("the site assistant's own instructions", () => {
  it("tells the model the same thing the legal page tells the visitor", () => {
    const site = src("lib/assistant/site.ts")
    expect(site).toMatch(/the published page, which is the authoritative version/u)
    expect(site).toMatch(/Never invent pricing, features, or policies/u)
  })
})
