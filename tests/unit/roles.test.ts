import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import path from "node:path"
import {
  DEFAULT_DISCIPLINE,
  DISCIPLINE_CATEGORIES,
  DISCIPLINE_CATEGORY,
  DISCIPLINE_CATEGORY_COLOUR,
  DISCIPLINE_CATEGORY_LABEL,
  DISCIPLINE_COLOUR,
  DISCIPLINE_ICON,
  DISCIPLINE_LABEL,
  DISCIPLINE_TEMPLATE,
  WORK_DISCIPLINES,
  disciplinesInCategory,
  isSuperAdmin,
  isWorkDiscipline,
  normaliseDiscipline,
  parseAdminEmails,
  roleForSignup,
} from "@/lib/roles"

const rolesSource = readFileSync(path.resolve(__dirname, "../../lib/roles.ts"), "utf8")
const globalsCss = readFileSync(path.resolve(__dirname, "../../app/globals.css"), "utf8")

/** `hsl(var(--chart-pine))` -> `chart-pine`. */
function cssToken(value: string): string {
  return value.replace(/^hsl\(var\(--/u, "").replace(/\)\)$/u, "")
}

type Triplet = [h: number, s: number, l: number]

function hslTriplet(block: string, token: string): Triplet {
  const found = block.match(new RegExp(`--${token}:\\s*([\\d.]+)\\s+([\\d.]+)%\\s+([\\d.]+)%`))
  if (!found) throw new Error(`--${token} is not declared as an HSL triplet in this block`)
  return [Number(found[1]), Number(found[2]), Number(found[3])]
}

function relativeLuminance([h, s, l]: Triplet): number {
  const chroma = (s / 100) * Math.min(l / 100, 1 - l / 100)
  const channel = (offset: number) => {
    const t = (offset + h / 30) % 12
    const raw = l / 100 - chroma * Math.max(-1, Math.min(t - 3, 9 - t, 1))
    return raw <= 0.03928 ? raw / 12.92 : ((raw + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(0) + 0.7152 * channel(8) + 0.0722 * channel(4)
}

function contrastRatio(a: Triplet, b: Triplet): number {
  const [x, y] = [relativeLuminance(a), relativeLuminance(b)].sort((m, n) => n - m)
  return (x + 0.05) / (y + 0.05)
}

const THEME_BLOCKS = [
  { name: "light", block: globalsCss.slice(0, globalsCss.indexOf(".dark {")) },
  { name: "dark", block: globalsCss.slice(globalsCss.indexOf(".dark {")) },
]
const SURFACES = ["background", "surface", "card"]

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
  it("is the only discipline vocabulary the app has: 75 unique members", () => {
    expect(WORK_DISCIPLINES).toHaveLength(75)
    expect(new Set(WORK_DISCIPLINES).size).toBe(75)
  })

  it("keeps the five ids phase 1 wrote into the database", () => {
    // These strings are row data in tasks/work_log_entries/deliverables. A rename here is a
    // migration, so the test exists to make an accidental one loud.
    for (const id of ["developer", "technician", "designer", "auditor", "coordinator"]) {
      expect(WORK_DISCIPLINES).toContain(id)
    }
    expect(DISCIPLINE_LABEL.developer).toBe("Software Development")
    expect(DISCIPLINE_LABEL.technician).toBe("Technical Support")
    expect(DISCIPLINE_LABEL.designer).toBe("Design & UX")
    expect(DISCIPLINE_LABEL.auditor).toBe("Audit & Assurance")
    expect(DISCIPLINE_LABEL.coordinator).toBe("Coordination")
  })

  it("labels, colours, names an icon and a category for every member", () => {
    for (const discipline of WORK_DISCIPLINES) {
      expect(DISCIPLINE_LABEL[discipline]).toBeTruthy()
      expect(DISCIPLINE_COLOUR[discipline]).toMatch(/^hsl\(var\(--chart-[a-z]+\)\)$/u)
      expect(DISCIPLINE_ICON[discipline]).toMatch(/^[A-Z][A-Za-z0-9]+$/u)
      expect(DISCIPLINE_TEMPLATE[discipline]).toBeTruthy()
      expect(DISCIPLINE_CATEGORIES).toContain(DISCIPLINE_CATEGORY[discipline])
    }
  })

  it("partitions into the ten categories without losing or inventing a member", () => {
    const groups = DISCIPLINE_CATEGORIES.map(disciplinesInCategory)
    expect(groups.every((group) => group.length > 0)).toBe(true)
    expect(groups.flat().sort()).toEqual([...WORK_DISCIPLINES].sort())
    expect(DISCIPLINE_CATEGORIES).toHaveLength(10)
  })

  it("labels every category and gives it a colour", () => {
    for (const category of DISCIPLINE_CATEGORIES) {
      expect(DISCIPLINE_CATEGORY_LABEL[category]).toBeTruthy()
      expect(DISCIPLINE_CATEGORY_COLOUR[category]).toMatch(/^hsl\(var\(--chart-[a-z]+\)\)$/u)
    }
  })

  it("defines each category colour in both themes", () => {
    // Counting the token in the whole file passes by accident: --chart-stone appears twice
    // (light and dark) and three times for a token a rule already uses. Declared in *both*
    // blocks is the thing that keeps a badge from rendering transparent in one theme.
    for (const theme of THEME_BLOCKS) {
      for (const category of DISCIPLINE_CATEGORIES) {
        const token = cssToken(DISCIPLINE_CATEGORY_COLOUR[category])
        expect(theme.block.split(token).length - 1, `${theme.name} --${token}`).toBeGreaterThanOrEqual(1)
      }
    }
  })

  it("keeps every category colour visible on every surface it can sit on", () => {
    // Computed from the CSS rather than asserted as literals: nothing else in this suite notices
    // a token being brightened past its surface, and the plan's own light --chart-ochre shipped at
    // 3.44:1. The floor is 3:1 because these tokens are graphics (dots, bars, lanes, swatch
    // borders) under WCAG 1.4.11, not text — badge and label text is always --foreground.
    for (const theme of THEME_BLOCKS) {
      for (const category of DISCIPLINE_CATEGORIES) {
        const token = cssToken(DISCIPLINE_CATEGORY_COLOUR[category])
        const colour = hslTriplet(theme.block, token)
        for (const surface of SURFACES) {
          const ratio = contrastRatio(colour, hslTriplet(theme.block, surface))
          expect(ratio, `${theme.name} --${token} on --${surface}`).toBeGreaterThanOrEqual(3)
        }
      }
    }
  })

  it("fits the varchar(40) columns that store an id", () => {
    for (const id of WORK_DISCIPLINES) expect(id.length).toBeLessThanOrEqual(40)
  })

  it("defaults to the general template so nobody gets an empty report", () => {
    expect(DEFAULT_DISCIPLINE).toBe("coordinator")
    expect(DISCIPLINE_TEMPLATE.coordinator).toBe("general")
  })

  it("accepts a member in any casing and rejects a job title", () => {
    expect(isWorkDiscipline("technician")).toBe(true)
    expect(isWorkDiscipline("Tech-Nician")).toBe(false)
    expect(isWorkDiscipline("engineer")).toBe(false)
    expect(normaliseDiscipline(" DEVELOPER ")).toBe("developer")
    // A job title is a person, not a classification: it is not a discipline.
    expect(normaliseDiscipline("senior software engineer")).toBeNull()
    expect(normaliseDiscipline("nurse")).toBeNull()
    expect(normaliseDiscipline(null)).toBeNull()
    expect(normaliseDiscipline(undefined)).toBeNull()
  })

  it("names icons as strings, so this module never imports React", () => {
    // lib/roles.ts is imported by unit tests in a node environment; a component import
    // here would drag the whole icon package into every one of them. The rule is about
    // loading the package, so the guard reads load syntax — the file's comment is allowed
    // to *name* lucide-react, because that is where it records that all 75 icon strings were
    // checked against the installed exports instead of guessed.
    const loads = /(?:from|require\(|import\()\s*["'](?:lucide-react|react)(?:\/[^"']*)?["']/u
    expect(rolesSource).not.toMatch(loads)
  })
})
