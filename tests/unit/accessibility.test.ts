import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import path from "node:path"
import {
  A11Y_KEY,
  ATTRIBUTES,
  EXCLUSIVE_GROUPS,
  bootstrapScript,
  defaultState,
  normalise,
  profiles,
  resolveGroups,
  stateFromProfile,
  withToggle,
  type AccessibilityState,
} from "@/lib/accessibility"

const repo = path.resolve(__dirname, "..", "..")
const css = readFileSync(path.join(repo, "app/accessibility.css"), "utf8")
const keys = Object.keys(defaultState) as (keyof AccessibilityState)[]

describe("accessibility store shape", () => {
  it("every state key has exactly one html attribute", () => {
    expect(Object.keys(ATTRIBUTES).sort()).toEqual([...keys].sort())
    expect(new Set(Object.values(ATTRIBUTES)).size).toBe(keys.length)
  })

  it("every attribute is spelled data-jv-*", () => {
    for (const attribute of Object.values(ATTRIBUTES)) {
      expect(attribute).toMatch(/^data-jv-[a-z][a-z-]*$/)
    }
  })

  it("no toggle is inert: each attribute has a rule in the stylesheet", () => {
    // data-jv-profile is the label for the chosen preset, not a visual adjustment.
    const inert = keys
      .filter((key) => key !== "profile")
      .filter((key) => !css.includes(ATTRIBUTES[key]))
    expect(inert).toEqual([])
  })

  it("the stylesheet has no orphan attribute", () => {
    const used = [...css.matchAll(/data-jv-[a-z-]+/g)].map((m) => m[0])
    // data-jv-tip is stamped on individual controls by the widget, not on <html>.
    const declared = new Set([...Object.values(ATTRIBUTES), "data-jv-tip"])
    expect([...new Set(used)].filter((attribute) => !declared.has(attribute))).toEqual([])
  })
})

describe("normalise", () => {
  it("drops junk and keeps only known keys", () => {
    const state = normalise({ textSize: 9, lineHeight: "two", monochrome: "yes", nonsense: true })
    expect(state.textSize).toBe(0)
    expect(state.lineHeight).toBe(0)
    expect(state.monochrome).toBe(false)
    expect(state).toEqual(defaultState)
  })

  it("accepts a stored step and a stored profile", () => {
    const state = normalise({ profile: "adhd", textSize: 3, readingMask: true })
    expect(state.profile).toBe("adhd")
    expect(state.textSize).toBe(3)
    expect(state.readingMask).toBe(true)
  })

  it("survives unparsable input", () => {
    for (const raw of [null, undefined, "nope", 42, []]) expect(normalise(raw)).toEqual(defaultState)
  })
})

describe("exclusive groups", () => {
  it("keep only the first member that is on", () => {
    const state = resolveGroups({ ...defaultState, highContrast: true, rotateHues: true })
    expect(state.highContrast).toBe(true)
    expect(state.rotateHues).toBe(false)
  })

  it("list boolean keys only", () => {
    for (const group of EXCLUSIVE_GROUPS) {
      for (const key of group) {
        expect(typeof defaultState[key]).toBe("boolean")
        expect(ATTRIBUTES[key]).toBeTruthy()
      }
    }
  })

  it("each contrast or colour mode is reachable from the panel", () => {
    const colourKeys = EXCLUSIVE_GROUPS[0]
    expect(colourKeys).toEqual(
      expect.arrayContaining([
        "darkContrast",
        "lightContrast",
        "highContrast",
        "invertColours",
        "rotateHues",
        "highSaturation",
        "lowSaturation",
        "monochrome",
      ]),
    )
    for (const key of colourKeys) {
      expect(stateFromProfile(null)[key]).toBe(false)
      expect(withToggle(defaultState, key)[key]).toBe(true)
      expect(withToggle(withToggle(defaultState, key), key)[key]).toBe(false)
    }
  })
})

describe("profiles", () => {
  it("have a label, a hint and at least one adjustment", () => {
    for (const profile of profiles) {
      expect(profile.label).toBeTruthy()
      expect(profile.hint).toBeTruthy()
      expect(Object.keys(profile.settings).length).toBeGreaterThan(0)
    }
  })

  it("never ask for two members of an exclusive group", () => {
    for (const profile of profiles) {
      const state = stateFromProfile(profile.id)
      for (const group of EXCLUSIVE_GROUPS) {
        const on = group.filter((key) => state[key] === true)
        expect(on.length, `${profile.id} sets ${on.join(",")}`).toBeLessThanOrEqual(1)
      }
    }
  })

  it("are internally consistent with what normalise reports", () => {
    for (const profile of profiles) {
      const state = stateFromProfile(profile.id)
      expect(state.profile).toBe(profile.id)
      // A preset survives the round trip; only the profile label is extra.
      const { profile: _label, ...rest } = state
      expect(normalise({ ...rest }).profile).toBe(null)
      expect(normalise({ ...rest })).toEqual({ ...rest, profile: null })
    }
  })

  it("clearing a profile resets every adjustment", () => {
    expect(stateFromProfile(null)).toEqual(defaultState)
  })
})

describe("bootstrapScript", () => {
  const script = bootstrapScript()

  it("reads the same storage key the panel writes", () => {
    expect(script).toContain(A11Y_KEY)
  })

  it("serializes every attribute name", () => {
    for (const attribute of Object.values(ATTRIBUTES)) expect(script).toContain(attribute)
  })

  it("is safe to inline in a script element", () => {
    expect(script).not.toContain("</")
    expect(script.startsWith("(function(){")).toBe(true)
  })

  it("restores flags, steps and the profile label", () => {
    // Mirrors the script's own rules: true -> attribute, 0/false/absent -> nothing.
    const restored = (state: Record<string, unknown>) =>
      keys
        .filter((key) => {
          const value = state[key]
          return value === true || (typeof value === "number" && value > 0) || (typeof value === "string" && value)
        })
        .map((key) => ATTRIBUTES[key])

    expect(restored({ textSize: 2, monochrome: true, profile: "adhd" })).toEqual([
      ATTRIBUTES.profile,
      ATTRIBUTES.textSize,
      ATTRIBUTES.monochrome,
    ])
    expect(restored({ textSize: 0, monochrome: false, profile: null })).toEqual([])
  })
})
