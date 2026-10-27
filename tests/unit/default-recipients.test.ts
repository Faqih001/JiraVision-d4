import { describe, expect, it } from "vitest"
import {
  readDefaultRecipients,
  writeDefaultRecipients,
} from "@/lib/reports/default-recipients"

describe("readDefaultRecipients", () => {
  it("returns [] when preferences is null, undefined, or empty", () => {
    expect(readDefaultRecipients(null)).toEqual([])
    expect(readDefaultRecipients(undefined)).toEqual([])
    expect(readDefaultRecipients({})).toEqual([])
  })

  it("returns [] when settings.defaultReportRecipients is absent", () => {
    expect(readDefaultRecipients({ settings: {} })).toEqual([])
    expect(readDefaultRecipients({ settings: { theme: "dark" } })).toEqual([])
  })

  it("returns the stored array when every entry is a positive integer", () => {
    expect(readDefaultRecipients({ settings: { defaultReportRecipients: [3, 1, 2] } })).toEqual([3, 1, 2])
  })

  it("returns [] when the stored value is not an array of positive integers", () => {
    expect(readDefaultRecipients({ settings: { defaultReportRecipients: "foo" } })).toEqual([])
    expect(readDefaultRecipients({ settings: { defaultReportRecipients: [0, 1] } })).toEqual([])
    expect(readDefaultRecipients({ settings: { defaultReportRecipients: [1, null] } })).toEqual([])
  })
})

describe("writeDefaultRecipients", () => {
  it("creates the settings subtree when preferences has none", () => {
    const result = writeDefaultRecipients(null, [5, 3])
    expect(result).toEqual({ settings: { defaultReportRecipients: [5, 3] } })
  })

  it("preserves sibling settings keys", () => {
    const result = writeDefaultRecipients({ settings: { theme: "dark" } }, [1])
    expect(result).toEqual({ settings: { theme: "dark", defaultReportRecipients: [1] } })
  })

  it("replaces any previous defaultReportRecipients", () => {
    const result = writeDefaultRecipients(
      { settings: { defaultReportRecipients: [1, 2] } },
      [3, 4],
    )
    expect(result).toEqual({ settings: { defaultReportRecipients: [3, 4] } })
  })
})
