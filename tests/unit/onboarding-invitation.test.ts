import { describe, expect, it } from "vitest"
import {
  INVITATION_TTL_DAYS,
  createInvitation,
  invitationProblem,
  invitationTokenHash,
  isInvitationRole,
  readInvitationInput,
} from "@/lib/onboarding/invitation"

const NOW = new Date("2026-10-27T09:00:00.000Z")

describe("invitation tokens", () => {
  it("are random, hashed at rest and expire in seven days", () => {
    const first = createInvitation(NOW)
    const second = createInvitation(NOW)
    expect(first.token).not.toBe(second.token)
    expect(first.tokenHash).toBe(invitationTokenHash(first.token))
    expect(first.tokenHash).not.toContain(first.token)
    expect(first.tokenHash).toMatch(/^[a-f0-9]{64}$/)
    expect(first.expiresAt.toISOString()).toBe("2026-11-03T09:00:00.000Z")
    expect(INVITATION_TTL_DAYS).toBe(7)
  })
})

describe("invitation input", () => {
  it("accepts a user or an admin, never a superadmin", () => {
    expect(readInvitationInput({ email: "ama@example.com", role: "admin" })).toEqual({
      ok: true,
      value: { email: "ama@example.com", role: "admin" },
    })
    expect(isInvitationRole("superadmin")).toBe(false)
  })

  it("refuses a malformed email", () => {
    expect(readInvitationInput({ email: "ama", role: "user" })).toEqual({
      ok: false,
      error: "A valid email is required",
    })
  })

  it("refuses a role outside the set", () => {
    expect(readInvitationInput({ email: "ama@example.com", role: "owner" }).ok).toBe(false)
  })
})

describe("invitation use", () => {
  const row = {
    email: "ama@example.com",
    acceptedAt: null,
    expiresAt: "2026-11-03T09:00:00.000Z",
  }
  it("is accepted only by the invited email before it expires", () => {
    expect(invitationProblem(row, "2026-10-28T09:00:00.000Z", "ama@example.com")).toBeNull()
    expect(invitationProblem(row, "2026-10-28T09:00:00.000Z", "AMA@example.com")).toBeNull()
  })

  it("is single use", () => {
    expect(invitationProblem({ ...row, acceptedAt: "2026-10-27T10:00:00.000Z" }, "2026-10-28T09:00:00.000Z", "ama@example.com"))
      .toBe("That invitation has already been used.")
  })

  it("expires", () => {
    expect(invitationProblem(row, "2026-11-04T09:00:00.000Z", "ama@example.com")).toBe("That invitation has expired.")
  })

  it("does not reveal who it was for", () => {
    const message = invitationProblem(row, "2026-10-28T09:00:00.000Z", "someone@example.com")
    expect(message).toBe("That invitation was issued to a different email address.")
    expect(message).not.toContain("ama@example.com")
  })
})