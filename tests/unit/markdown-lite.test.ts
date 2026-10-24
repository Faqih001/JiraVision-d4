import { describe, expect, it } from "vitest"

import { blockMatches, parseMarkdown, sectionsOf, slugifyHeading, wordCount } from "@/lib/markdown-lite"

describe("parseMarkdown", () => {
  it("splits headings, paragraphs, bullets and steps", () => {
    const blocks = parseMarkdown(`
# Title

A paragraph that wraps
across two lines.

## Section

- first
- second

1. step one
2. step two
`)
    expect(blocks.map((block) => block.kind)).toEqual([
      "heading",
      "para",
      "heading",
      "ul",
      "ol",
    ])
    expect(blocks[0]).toEqual({ kind: "heading", level: 1, text: "Title" })
    expect(blocks[1]).toEqual({ kind: "para", text: "A paragraph that wraps across two lines." })
    expect(blocks[3]).toEqual({ kind: "ul", items: ["first", "second"] })
    expect(blocks[4]).toEqual({ kind: "ol", items: ["step one", "step two"] })
  })

  it("folds an indented continuation into the list item above it", () => {
    const blocks = parseMarkdown(`
- an item that runs
  onto a second line
- a short one

1. a step that also
   wraps
`)
    expect(blocks[0]).toEqual({
      kind: "ul",
      items: ["an item that runs onto a second line", "a short one"],
    })
    expect(blocks[1]).toEqual({ kind: "ol", items: ["a step that also wraps"] })
  })

  it("treats a four-space indent as a code block", () => {
    const blocks = parseMarkdown("Para\n\n    const a = 1\n    const b = 2\n")
    expect(blocks[1]).toEqual({ kind: "code", lines: ["const a = 1", "const b = 2"] })
  })

  it("never emits an empty block", () => {
    const blocks = parseMarkdown("\n\n\n")
    expect(blocks).toEqual([])
  })
})

describe("sectionsOf", () => {
  it("lists level-2 and level-3 headings with anchor ids", () => {
    expect(sectionsOf("# Title\n\n## What it reads\n\n### The inputs\n")).toEqual([
      { id: "what-it-reads", title: "What it reads", depth: 2 },
      { id: "the-inputs", title: "The inputs", depth: 3 },
    ])
  })
})

describe("slugifyHeading", () => {
  it("lowercases, strips punctuation and collapses spaces", () => {
    expect(slugifyHeading("Tasks — grid and list")).toBe("tasks-grid-and-list")
    expect(slugifyHeading("API   overview")).toBe("api-overview")
  })
})

describe("blockMatches", () => {
  it("is true for an empty needle and searches every block kind", () => {
    expect(blockMatches({ kind: "para", text: "anything" }, "")).toBe(true)
    expect(blockMatches({ kind: "ul", items: ["alpha", "beta"] }, "beta")).toBe(true)
    expect(blockMatches({ kind: "code", lines: ["const x"] }, "const")).toBe(true)
    expect(blockMatches({ kind: "para", text: "alpha" }, "gamma")).toBe(false)
  })
})

describe("wordCount", () => {
  it("counts rendered prose across headings, paragraphs and list items", () => {
    expect(wordCount("# Two words\n\nThree more words\n\n- one two\n")).toBe(7)
  })
})
