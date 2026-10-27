import { describe, expect, it } from "vitest"
import { canReadReport, isAdmin } from "@/lib/reports/visibility"

describe("isAdmin", () => {
  it("returns true for admin and superadmin roles", () => {
    expect(isAdmin({ role: "admin", email: "x@y.z" })).toBe(true)
    expect(isAdmin({ role: "superadmin", email: "x@y.z" })).toBe(true)
  })

  it("returns false for user role", () => {
    expect(isAdmin({ role: "user", email: "x@y.z" })).toBe(false)
  })
})

describe("canReadReport", () => {
  const report = { userId: 10 }

  it("lets the author read their own report", () => {
    expect(canReadReport({ id: 10, role: "user", email: "a@b.c" }, report, [])).toBe(true)
  })

  it("lets a listed recipient read the report", () => {
    expect(canReadReport({ id: 5, role: "user", email: "a@b.c" }, report, [5, 7])).toBe(true)
  })

  it("refuses an unlisted non-admin", () => {
    expect(canReadReport({ id: 99, role: "user", email: "a@b.c" }, report, [5, 7])).toBe(false)
  })

  it("lets an admin read any report regardless of recipients", () => {
    expect(canReadReport({ id: 99, role: "admin", email: "a@b.c" }, report, [])).toBe(true)
  })
})
