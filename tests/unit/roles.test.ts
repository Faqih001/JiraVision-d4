import { describe, expect, it } from "vitest"
import { isSuperAdmin, parseAdminEmails, roleForSignup } from "@/lib/roles"

describe("parseAdminEmails", () => {
  it("returns nothing for an unset variable", () => {
    expect(parseAdminEmails(undefined)).toEqual([])
    expect(parseAdminEmails("")).toEqual([])
  })

  it("splits, trims, lowercases and drops blanks", () => {
    expect(parseAdminEmails(" A@a.com ,,  B@A.com ")).toEqual(["a@a.com", "b@a.com"])
  })
})

describe("roleForSignup", () => {
  it("gives an address on the bootstrap list a real superadmin row", () => {
    expect(roleForSignup("Owner@Example.com", "owner@example.com")).toBe("superadmin")
  })

  it("gives everyone else the plain user role", () => {
    expect(roleForSignup("someone@example.com", "owner@example.com")).toBe("user")
  })

  it("treats a non-listed address case-insensitively but whitespace-tolerantly", () => {
    expect(roleForSignup(" OWNER@EXAMPLE.COM ", " owner@example.com ")).toBe("superadmin")
    expect(roleForSignup("mallory@example.com", "owner@example.com")).toBe("user")
  })

  it("never grants admin when the list is empty", () => {
    expect(roleForSignup("owner@example.com", "")).toBe("user")
    expect(roleForSignup("owner@example.com", undefined)).not.toBe("superadmin")
  })
})

describe("isSuperAdmin", () => {
  it("rejects a missing user", () => {
    expect(isSuperAdmin(null)).toBe(false)
    expect(isSuperAdmin(undefined)).toBe(false)
  })

  it("accepts either admin role spelling", () => {
    expect(isSuperAdmin({ email: "a@b.com", role: "admin" })).toBe(true)
    expect(isSuperAdmin({ email: "a@b.com", role: "SUPERADMIN" })).toBe(true)
  })

  it("accepts a bootstrap address whose row is still role=user", () => {
    expect(isSuperAdmin({ email: "Owner@Example.com", role: "user" }, "owner@example.com")).toBe(true)
  })

  it("rejects an ordinary member", () => {
    expect(isSuperAdmin({ email: "dev@example.com", role: "user" }, "owner@example.com")).toBe(false)
    expect(isSuperAdmin({ email: "dev@example.com", role: "manager" }, "owner@example.com")).toBe(false)
  })

  it("tolerates a null role", () => {
    expect(isSuperAdmin({ email: "dev@example.com", role: null })).toBe(false)
  })
})
