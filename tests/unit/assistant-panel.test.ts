import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import path from "node:path"

const repo = path.resolve(__dirname, "..", "..")
const src = (relative: string) => readFileSync(path.join(repo, relative), "utf8")

/** Comment-stripped: a guard about the wiring cannot be satisfied by a sentence in a comment. */
function codeOnly(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//gu, "").replace(/^\s*\/\/.*$/gmu, "")
}

describe("the top-bar assistant panel", () => {
  const panel = () => codeOnly(src("components/assistant-panel.tsx"))

  it("is a client component, because it holds the conversation while the popover is open", () => {
    expect(src("components/assistant-panel.tsx")).toMatch(/^"use client"/u)
  })

  it("talks to the same endpoint as the full page, so the two surfaces cannot drift apart", () => {
    expect(panel()).toMatch(/fetch\("\/api\/assistant\/workspace"/u)
    expect(panel()).not.toMatch(/fetch\("\/api\/assistant\/site"/u)
  })

  it("keeps one thread across turns instead of starting a conversation per question", () => {
    expect(panel()).toMatch(/threadId: threadId \?\? undefined/u)
    expect(panel()).toMatch(/setThreadId\(json\.data\.threadId\)/u)
  })

  it("offers the full page, because the panel is deliberately too small for a long answer", () => {
    expect(panel()).toMatch(/href="\/dashboard\/assistant"/u)
  })

  it("labels the trigger for a screen reader, which sees an icon and nothing else", () => {
    expect(panel()).toMatch(/aria-label="Open AI assistant"/u)
    expect(panel()).toMatch(/aria-label="Send question"/u)
  })

  it("caps the question at the length the API accepts", () => {
    expect(panel()).toMatch(/maxLength=\{2000\}/u)
  })

  it("shows a failure as an answer rather than dropping the question silently", () => {
    expect(panel()).toMatch(/prev\.filter\(\(m\) => m\.id !== tempId\)/u)
    expect(panel()).toMatch(/error\.message/u)
  })

  it("scrolls the element that scrolls, not the root that only clips", () => {
    expect(panel()).toMatch(/\[data-radix-scroll-area-viewport\]/u)
    expect(panel()).not.toMatch(/scrollRef\.current\?\.scrollTo/u)
  })
})

describe("where the panel is mounted", () => {
  const layout = () => codeOnly(src("components/dashboard-layout.tsx"))

  it("sits in the top bar's action cluster, ahead of the bell", () => {
    const panelAt = layout().indexOf("<AssistantPanel />")
    const bellAt = layout().indexOf("<NotificationsBell />")
    expect(panelAt).toBeGreaterThan(-1)
    expect(bellAt).toBeGreaterThan(panelAt)
  })

  it("is desktop-only, because the mobile bar has no room for a second popover", () => {
    expect(layout()).toMatch(/\{!isMobile && <AssistantPanel \/>\}/u)
  })

  it("imports the panel rather than redefining a second chat surface", () => {
    expect(layout()).toMatch(/from "@\/components\/assistant-panel"/u)
  })
})
