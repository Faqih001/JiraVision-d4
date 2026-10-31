import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const src = (relative: string) => readFileSync(resolve(process.cwd(), relative), "utf8")

const panel = src("app/dashboard/ops/config/config-propose.tsx")
const client = src("app/dashboard/ops/config/config-client.tsx")
const proposeRoute = src("app/api/ops/config/propose/route.ts")

describe("pack config page after PR 11d", () => {
  it("keeps the read view free of writes and mounts the apply door separately", () => {
    expect(client).toContain('fetch("/api/ops/config")')
    expect(client).not.toContain('method: "POST"')
    expect(client).toContain('import ConfigPropose from "./config-propose"')
    expect(client).toMatch(/data\.admin && data\.packKey && data\.discipline && \(\s*<ConfigPropose/u)
    expect(client).toContain("onApplied={() => void load()}")
  })

  it("shows the admin door only to an admin", () => {
    expect(client).toMatch(/admin\?: boolean/)
    expect(client).toMatch(/data\.admin &&/u)
  })
})

describe("the propose panel", () => {
  it("is a client component that uses the three config routes", () => {
    expect(panel.startsWith('"use client"')).toBe(true)
    expect(panel).toContain('fetch("/api/ops/config/propose"')
    expect(panel).toContain('fetch("/api/ops/config/apply"')
    expect(panel).toContain('fetch("/api/ops/config/reset"')
    expect(panel).not.toContain("GOOGLE_GEMINI_API_KEY")
  })

  it("sends the proposal back untouched and names the refs the reviewer chose", () => {
    expect(panel).toContain("proposal: result.proposal")
    expect(panel).toContain("selectedRefs: selected")
  })

  it("starts from the safe default instead of checking everything", () => {
    expect(panel).toContain("defaultSelection(data.diff.items)")
    expect(panel).toContain('from "@/lib/ops/config/review"')
  })

  it("needs an acknowledgement before a rule changes", () => {
    expect(panel).toMatch(/disabled=\{selected\.length === 0 \|\| !acknowledged/u)
    expect(panel).toContain("changes the rules everyone on")
  })

  it("says plainly that the document goes to Google", () => {
    expect(panel).toContain("sent to Google for processing and is not stored")
    expect(panel).toContain("Credential values are refused")
    expect(panel).toContain("not in force until you apply them")
  })

  it("shows the refusals and the conflicts rather than hiding them", () => {
    expect(panel).toContain("Refused before you had to decide")
    expect(panel).toContain("{entry.reason}")
    expect(panel).toContain("{item.differences.map((line)")
    expect(panel).toContain('<Badge variant="destructive">replaces</Badge>')
  })

  it("lists the document types the route will accept", () => {
    const accepted = Object.fromEntries(
      (panel.match(/"([\w/+.]+)":\s*"\.\w+"/g) ?? []).map((entry) => [entry.split(":")[0].replace(/"/g, ""), entry]),
    )
    for (const mime of ["application/pdf", "text/plain", "text/csv", "image/jpeg", "image/png", "image/webp"]) {
      expect(accepted[mime], mime).toBeTruthy()
    }
    expect(acceptStringIsWellFormed()).toBe(true)
  })

  function acceptStringIsWellFormed() {
    return /const ACCEPT_STRING = Object\.keys\(ACCEPTED_TYPES\)\.join\(","\)/.test(panel)
  }

  it("treats a long read as busy work, not a frozen page", () => {
    expect(panel).toContain("Reading the document")
    expect(panel).toContain("animate-spin")
    expect(panel).toContain('phase === "reading"')
  })

  it("keeps the undo two steps away from an accidental click", () => {
    expect(panel).toContain("confirmReset ? (")
    expect(panel).toContain("Confirm reset")
    expect(panel).toContain("JSON.stringify({ confirm: true })")
  })

  it("surfaces the server's validation paths instead of a generic failure", () => {
    expect(panel).toContain("Array.isArray(json?.errors)")
    expect(panel).toContain("json?.message ?? json?.error")
  })

  it("is admin-gated at the route as well as hidden in the page", () => {
    expect(proposeRoute).toContain('session.role !== "admin"')
    expect(proposeRoute).toContain('session.role !== "super_admin"')
    expect(proposeRoute).toContain("Only an admin can propose changes")
  })
})

describe("the undo door after PR 11e", () => {
  it("calls the revert route with the previous config", () => {
    expect(panel).toContain('fetch("/api/ops/config/revert"')
    expect(panel).toContain("previous: previousConfig")
  })

  it("stores the previous config from the apply response", () => {
    expect(panel).toContain("setPreviousConfig(")
    expect(panel).toMatch(/\.previous\)/)
  })

  it("shows an undo button after a successful apply", () => {
    expect(panel).toContain("Undo last apply")
    expect(panel).toContain("undoLastApply()")
  })

  it("keeps the reset-to-code-authored button as a separate, further door", () => {
    expect(panel).toContain("Reset to code-authored config")
    expect(panel).toContain("resetToCodeAuthored()")
    expect(panel).toContain("confirmReset ? (")
  })

  it("clears the previous config when the undo fires", () => {
    expect(panel).toMatch(/setPreviousConfig\(null\)/)
  })
})

describe("the audit trail after PR 11f", () => {
  const audit = src("app/dashboard/ops/config/config-audit.tsx")

  it("is a client component that fetches the audit route", () => {
    expect(audit.startsWith('"use client"')).toBe(true)
    expect(audit).toContain('fetch("/api/ops/config/audit")')
  })

  it("shows the last 50 events with operation, summary, and timestamp", () => {
    expect(audit).toContain("OperationBadge")
    expect(audit).toContain("formatSummary")
    expect(audit).toContain("formatDate")
  })

  it("renders an empty state when there are no events", () => {
    expect(audit).toContain("No changes have been made to this pack's config yet.")
  })

  it("is mounted in the config client for admins only", () => {
    expect(client).toContain("import ConfigAudit")
    expect(client).toContain("<ConfigAudit")
    expect(client).toMatch(/data\.admin && data\.packKey/)
  })
})
