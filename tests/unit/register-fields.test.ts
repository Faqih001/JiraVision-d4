import { describe, expect, it } from "vitest"
import {
  CREDENTIAL_PLACEHOLDER,
  asksForCredentialValue,
  readRegisterFields,
} from "@/lib/registers/fields"

describe("credential fields never enter the register", () => {
  it.each([
    "password",
    "Password",
    "passwd",
    "api_key",
    "apiKey",
    "private_key",
    "privateKey",
    "otp",
    "mfa_secret",
    "token",
    "credential_id",
  ])("rejects %s and names the field", (key) => {
    const result = readRegisterFields({ title: "Backup console", [key]: "hunter2" })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain(key)
      expect(result.error).toMatch(/record where the credential is kept/i)
    }
  })

  it("rejects a nested credential and never repeats its value", () => {
    const result = readRegisterFields({
      account: { label: "backup admin", payload: { password: "s3cr3t-value" } },
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain("account.payload.password")
      expect(result.error).not.toContain("s3cr3t-value")
      expect(JSON.stringify(result)).not.toContain("s3cr3t-value")
    }
  })

  it("accepts where a credential is kept and who can authorise it", () => {
    const result = readRegisterFields({
      console: "https://backup.example.test",
      kept_in: "password-manager entry: Backup admin",
      authoriser: "IT manager",
      renewal_date: "2027-03-01",
    })
    expect(result).toEqual({
      ok: true,
      fields: {
        console: "https://backup.example.test",
        kept_in: "password-manager entry: Backup admin",
        authoriser: "IT manager",
        renewal_date: "2027-03-01",
      },
    })
  })

  it("refuses nested values that are not credentials rather than storing a blob", () => {
    const result = readRegisterFields({ address: { street: "12 Main", city: "Nairobi" } })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('"address"')
  })

  it("drops blank values and keeps numbers as text", () => {
    const result = readRegisterFields({ serial: "  ", port: 443, spare: true })
    expect(result).toEqual({ ok: true, fields: { port: "443", spare: "true" } })
  })

  it("ships the placeholder the account form shows", () => {
    expect(CREDENTIAL_PLACEHOLDER).toBe(
      "kept in: password-manager entry / vault path / safe, and who can authorise it",
    )
    expect(CREDENTIAL_PLACEHOLDER).toMatch(/password-manager entry/)
  })

  it("recognises prose that asks for a credential value", () => {
    expect(asksForCredentialValue("Enter the admin password for the backup console.")).toBe(true)
    expect(asksForCredentialValue("Please paste your API key here.")).toBe(true)
    expect(asksForCredentialValue("Where is the console kept, and who authorises access?")).toBe(false)
  })
})
