import { describe, expect, it } from "vitest"
import { classifyRowRead } from "@/lib/reports/read-outcome"

describe("classifyRowRead", () => {
  it("calls a successful read ok regardless of status", () => {
    expect(classifyRowRead(200, true)).toBe("ok")
  })

  it("calls a genuine 404 absent — the report is not this member's", () => {
    expect(classifyRowRead(404, false)).toBe("absent")
  })

  it("calls a 503 transient, not absent — a waking database is not a privacy violation", () => {
    expect(classifyRowRead(503, false)).toBe("transient")
  })

  it("calls a 500 transient", () => {
    expect(classifyRowRead(500, false)).toBe("transient")
  })

  it("calls a network failure (status 0) transient", () => {
    expect(classifyRowRead(0, false)).toBe("transient")
  })

  it("calls a 400 transient rather than absent", () => {
    expect(classifyRowRead(400, false)).toBe("transient")
  })

  it("lets success win even on an odd status", () => {
    expect(classifyRowRead(404, true)).toBe("ok")
  })
})