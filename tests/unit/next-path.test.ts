import { describe, expect, it } from "vitest"
import { DEFAULT_AFTER_LOGIN, safeNextPath } from "@/lib/auth/next-path"

describe("safeNextPath", () => {
  it("keeps a same-origin path", () => {
    expect(safeNextPath("/dashboard/worklog?view=week")).toBe("/dashboard/worklog?view=week")
  })

  it("falls back when there is no target", () => {
    expect(safeNextPath(null)).toBe(DEFAULT_AFTER_LOGIN)
    expect(safeNextPath(undefined)).toBe(DEFAULT_AFTER_LOGIN)
    expect(safeNextPath("")).toBe(DEFAULT_AFTER_LOGIN)
  })

  it.each([
    ["a protocol-relative host", "//evil.example/dashboard"],
    ["a backslash host", "/\\evil.example"],
    ["an absolute URL", "https://evil.example/dashboard"],
    ["a bare relative path", "dashboard"],
    ["a javascript URL", "javascript:alert(1)"],
    ["a data URL", "data:text/html,<script>alert(1)</script>"],
  ])("rejects %s", (_label, value) => {
    expect(safeNextPath(value)).toBe(DEFAULT_AFTER_LOGIN)
  })

  it("rejects control characters that could hide the real target", () => {
    expect(safeNextPath("/dashboard\nSet-Cookie: a=b")).toBe(DEFAULT_AFTER_LOGIN)
    expect(safeNextPath("/dashboard\tx")).toBe(DEFAULT_AFTER_LOGIN)
  })

  it.each(["/login", "/login?next=/dashboard", "/login/x", "/signup", "/forgot-password", "/reset-password?token=t"])(
    "refuses to send the visitor back to the form: %s",
    (value) => {
      expect(safeNextPath(value)).toBe(DEFAULT_AFTER_LOGIN)
    },
  )

  it("does not confuse a similarly named area for the form", () => {
    expect(safeNextPath("/logins")).toBe("/logins")
    expect(safeNextPath("/dashboard/login-history")).toBe("/dashboard/login-history")
  })
})
