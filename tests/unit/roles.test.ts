import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import path from "node:path"
import {
  DEFAULT_DISCIPLINE,
  DISCIPLINE_COLOUR,
  DISCIPLINE_ICON,
  DISCIPLINE_LABEL,
  DISCIPLINE_TEMPLATE,
  WORK_DISCIPLINES,
  isSuperAdmin,
  isWorkDiscipline,
  normaliseDiscipline,
  parseAdminEmails,
  roleForSignup,
} from "@/lib/roles"

const rolesSource = readFileSync(path.resolve(__dirname, "../../lib/roles.ts"), "utf8")

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

describe("work disciplines", () => {
  it("is the only discipline vocabulary the app has, in report order", () => {
    expect(WORK_DISCIPLINES).toEqual([
      "developer",
      "technician",
      "designer",
      "auditor",
      "coordinator",
    ])
  })

  it("labels, colours, names an icon and picks a template for every member", () => {
    for (const discipline of WORK_DISCIPLINES) {
      expect(DISCIPLINE_LABEL[discipline]).toBeTruthy()
      expect(DISCIPLINE_COLOUR[discipline]).toMatch(/^hsl\(var\(--/)
      expect(DISCIPLINE_ICON[discipline]).toMatch(/^[A-Z]/)
      expect(DISCIPLINE_TEMPLATE[discipline]).toBeTruthy()
    }
  })

  it("defaults to the general template so nobody gets an empty report", () => {
    expect(DEFAULT_DISCIPLINE).toBe("coordinator")
    expect(DISCIPLINE_TEMPLATE.coordinator).toBe("general")
  })

  it("accepts a member in any casing and rejects a near miss", () => {
    expect(isWorkDiscipline("technician")).toBe(true)
    expect(isWorkDiscipline("Tech-Nician")).toBe(false)
    expect(isWorkDiscipline("engineer")).toBe(false)
    expect(normaliseDiscipline(" DEVELOPER ")).toBe("developer")
    expect(normaliseDiscipline("nurse")).toBeNull()
    expect(normaliseDiscipline(null)).toBeNull()
    expect(normaliseDiscipline(undefined)).toBeNull()
  })

  it("names icons as strings, so this module never imports React", () => {
    // lib/roles.ts is imported by unit tests in a node environment; a component import
    // here would drag the whole icon package into every one of them.
    expect(rolesSource).not.toMatch(/lucide-react/)
    expect(rolesSource).not.toMatch(/from "react"/)
  })
})
