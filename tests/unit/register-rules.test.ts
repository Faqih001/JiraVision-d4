import { describe, expect, it } from "vitest"
import {
  REGISTER_STATUSES,
  REGISTER_LIFECYCLE,
  canReadRegister,
  canWriteRegister,
  readRegisterTransition,
} from "@/lib/registers/rules"
import {
  defaultRegisterView,
  filterRegisters,
  groupRegistersByKind,
  parseRegisterView,
  registersToCsv,
  serializeRegisterView,
  type RegisterExportRow,
} from "@/lib/registers/view-state"

const TODAY = "2026-10-27"

const row = (overrides: Partial<RegisterExportRow> = {}): RegisterExportRow => ({
  id: 1,
  packKey: "it-technician",
  kind: "infrastructure",
  title: "Server room switch",
  status: "in_service",
  custody: "member",
  ownerId: 7,
  ownerName: "Amina",
  lastVerifiedAt: "2026-10-20",
  verifyIntervalDays: 30,
  fields: { location: "Rack 2", address: "10.0.0.2" },
  ...overrides,
})

describe("register custody", () => {
  it("keeps a member row inside its owner's circle", () => {
    const mine = { ownerId: 7, custody: "member" as const }
    expect(canReadRegister(mine, { id: 7, admin: false })).toBe(true)
    expect(canReadRegister(mine, { id: 8, admin: false })).toBe(false)
    expect(canReadRegister(mine, { id: 8, admin: true })).toBe(true)
  })

  it("lets every authenticated member read team and organisation rows", () => {
    expect(canReadRegister({ ownerId: null, custody: "team" }, { id: 8, admin: false })).toBe(true)
    expect(canReadRegister({ ownerId: null, custody: "org" }, { id: 8, admin: false })).toBe(true)
  })

  it("lets the owner and an admin write, and nobody else", () => {
    const team = { ownerId: 7, custody: "team" as const }
    expect(canWriteRegister(team, { id: 7, admin: false })).toBe(true)
    expect(canWriteRegister(team, { id: 8, admin: false })).toBe(false)
    expect(canWriteRegister(team, { id: 8, admin: true })).toBe(true)
    expect(canWriteRegister({ ownerId: null, custody: "org" }, { id: 8, admin: false })).toBe(false)
  })
})

describe("register lifecycle", () => {
  it("requires a reason to take an item out of service", () => {
    const missing = readRegisterTransition("in_service", "awaiting_repair", "  ")
    expect(missing.ok).toBe(false)
    if (!missing.ok) expect(missing.error).toMatch(/reason is required/i)

    const given = readRegisterTransition("in_service", "awaiting_repair", "  PSU failed  ")
    expect(given).toEqual({ ok: true, status: "awaiting_repair", reason: "PSU failed" })
  })

  it("lets a repaired item return to service without a reason", () => {
    expect(readRegisterTransition("awaiting_repair", "in_service", "")).toEqual({
      ok: true,
      status: "in_service",
      reason: null,
    })
  })

  it("requires a reason to dispose and treats disposal as final", () => {
    const disposed = readRegisterTransition("awaiting_disposal", "disposed", "Collected by vendor")
    expect(disposed).toEqual({ ok: true, status: "disposed", reason: "Collected by vendor" })

    const final = readRegisterTransition("disposed", "in_service", "Reinstated")
    expect(final.ok).toBe(false)
    if (!final.ok) expect(final.error).toMatch(/final/i)
  })

  it("names the allowed moves when the target is not one", () => {
    const result = readRegisterTransition("in_service", "disposed", "Done")
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/Allowed:/)
  })

  it("has a label and a target inside the vocabulary for every move", () => {
    for (const status of REGISTER_STATUSES) {
      for (const transition of REGISTER_LIFECYCLE[status]) {
        expect(REGISTER_STATUSES).toContain(transition.to)
        expect(transition.label.length).toBeGreaterThan(0)
      }
    }
  })
})

describe("register view state", () => {
  it("parses the §4 grammar and ignores hand-edited values", () => {
    const parsed = parseRegisterView(
      new URLSearchParams(
        "v=grid&q=switch&kind=infrastructure&status=awaiting_repair&custody=team&owner=5&mine=1&stale=1",
      ),
    )
    expect(parsed).toEqual({
      view: "grid",
      q: "switch",
      kind: "infrastructure",
      status: "awaiting_repair",
      custody: "team",
      owner: 5,
      mine: true,
      stale: true,
    })

    const fallback = parseRegisterView(new URLSearchParams("v=timeline&status=lost&custody=public&owner=x"))
    expect(fallback.view).toBe("list")
    expect(fallback.status).toBe("all")
    expect(fallback.custody).toBe("all")
    expect(fallback.owner).toBeNull()
  })

  it("round-trips without writing defaults into the URL", () => {
    expect(serializeRegisterView(defaultRegisterView())).toBe("")
    const state = { ...defaultRegisterView(), view: "board" as const, q: " rack ", stale: true }
    expect(parseRegisterView(new URLSearchParams(serializeRegisterView(state)))).toEqual({
      ...state,
      q: "rack",
    })
  })

  it("filters by query, register filters and computed staleness", () => {
    const rows = [
      row(),
      row({ id: 2, title: "Printer", kind: "equipment", custody: "team", ownerId: null, fields: { serial: "ABC" } }),
      row({
        id: 3,
        title: "Backup console",
        lastVerifiedAt: "2026-01-01",
        verifyIntervalDays: 7,
        fields: { console: "backup.example.test" },
      }),
    ]

    const base = defaultRegisterView()
    expect(filterRegisters(rows, { ...base, q: "10.0.0" }, 7, TODAY).map((r) => r.id)).toEqual([1])
    expect(filterRegisters(rows, { ...base, kind: "equipment" }, 7, TODAY).map((r) => r.id)).toEqual([2])
    expect(filterRegisters(rows, { ...base, stale: true }, 7, TODAY).map((r) => r.id)).toEqual([3])
    expect(filterRegisters(rows, { ...base, mine: true }, 7, TODAY).map((r) => r.id)).toEqual([1, 3])
    expect(filterRegisters(rows, { ...base, custody: "team" }, 7, TODAY).map((r) => r.id)).toEqual([2])
  })

  it("groups a board by kind, alphabetically", () => {
    const groups = groupRegistersByKind([
      row({ id: 1, kind: "infrastructure" }),
      row({ id: 2, kind: "equipment" }),
      row({ id: 3, kind: "equipment" }),
    ])
    expect(groups.map((group) => [group.kind, group.rows.length])).toEqual([
      ["equipment", 2],
      ["infrastructure", 1],
    ])
  })

  it("quotes CSV cells so a comma or quote cannot split a row", () => {
    const csv = registersToCsv([row({ title: 'Switch "core", rack 2' })], TODAY)
    const lines = csv.split("\n")
    expect(lines).toHaveLength(2)
    expect(lines[0]).toMatch(/"last_verified","verify_interval_days","staleness","fields"/)
    expect(lines[1]).toContain('"Switch ""core"", rack 2"')
    expect(lines[1]).toContain('"fresh"')
  })
})
