import { describe, expect, it } from "vitest"
import { readSettingsPatch } from "@/lib/settings-patch"

describe("the settings patch sanitiser", () => {
  it("keeps primitives and arrays", () => {
    const { patch } = readSettingsPatch({ theme: "dark", notifyEmail: false, list: [1, 2] })
    expect(patch).toEqual({ theme: "dark", notifyEmail: false, list: [1, 2] })
  })

  it("still drops an unknown nested object", () => {
    const { patch } = readSettingsPatch({ billing: { plan: "pro" } })
    expect(patch).toEqual({})
  })

  it("lets the onboarding namespace through for the route to validate", () => {
    const { patch } = readSettingsPatch({ onboarding: { step: 2, data: {} } })
    expect(patch).toEqual({ onboarding: { step: 2, data: {} } })
  })

  it("refuses an onboarding value that is not an object", () => {
    const { error } = readSettingsPatch({ onboarding: "done" })
    expect(error).toBe("onboarding must be an object")
  })

  it("never accepts a __proto__ style key", () => {
    const { patch } = readSettingsPatch({ __proto__hack: 1 })
    expect(patch).toEqual({})
  })
})