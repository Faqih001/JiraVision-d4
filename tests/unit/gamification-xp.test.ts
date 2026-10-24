import { describe, expect, it } from "vitest"
import {
  computeDemo,
  nodeUnlocks,
  teamLevelProgress,
  totalXp,
  xpByBranch,
  xpByMembers,
  type Behavior,
  type SkillNode,
  type TeamLevel,
} from "@/lib/gamification/xp"

const behaviors: Behavior[] = [
  { id: "b1", label: "Review a peer PR", points: 10, branch: "collaboration" },
  { id: "b2", label: "Flaky test fixed", points: 15, branch: "craft" },
  { id: "b3", label: "Runbook updated", points: 20, branch: "stewardship" },
  { id: "b4", label: "Mentoring session", points: 25, branch: "collaboration" },
]

const nodes: SkillNode[] = [
  { id: "n1", branch: "craft", short: "C1", name: "Craft novice", description: "", threshold: 10 },
  { id: "n2", branch: "craft", short: "C2", name: "Craft pro", description: "", threshold: 50 },
  { id: "n3", branch: "collaboration", short: "K1", name: "Reviewer", description: "", threshold: 30 },
]

const levels: TeamLevel[] = [
  { level: 1, title: "Forming", minXp: 0 },
  { level: 2, title: "Storming", minXp: 30 },
  { level: 3, title: "Norming", minXp: 60 },
]

describe("xp core", () => {
  it("nothing checked yields zero XP and no unlocks", () => {
    const checked = Object.fromEntries(behaviors.map((b) => [b.id, false]))
    const branchXp = xpByBranch(behaviors, checked)
    expect(totalXp(branchXp)).toBe(0)
    expect(Object.values(nodeUnlocks(nodes, branchXp)).every((v) => v === false)).toBe(true)
  })

  it("everything checked matches the declared point totals per branch", () => {
    const checked = Object.fromEntries(behaviors.map((b) => [b.id, true]))
    const branchXp = xpByBranch(behaviors, checked)
    expect(branchXp.craft).toBe(15)
    expect(branchXp.collaboration).toBe(35)
    expect(branchXp.stewardship).toBe(20)
    expect(totalXp(branchXp)).toBe(70)
  })

  it("unlock threshold is >= not >", () => {
    const checked = { b2: true }
    expect(nodeUnlocks(nodes, xpByBranch(behaviors, checked)).n1).toBe(true) // 15 >= 10
    expect(nodeUnlocks(nodes, xpByBranch(behaviors, checked)).n2).toBe(false) // 15 < 50
  })

  it("computeDemo is deterministic: same checked set, same state", () => {
    const checked = { b1: true, b3: true, b4: true }
    const a = computeDemo({ behaviors, nodes, levels, checked })
    const b = computeDemo({ behaviors, nodes, levels, checked })
    expect(a).toEqual(b)
  })

  it("turning behaviours on strictly increases total XP", () => {
    const some = computeDemo({ behaviors, nodes, levels, checked: { b1: true } })
    const more = computeDemo({ behaviors, nodes, levels, checked: { b1: true, b2: true, b3: true } })
    expect(more.totalXp).toBeGreaterThan(some.totalXp)
  })
})

describe("teamLevelProgress", () => {
  it("interpolates percent between levels", () => {
    const p = teamLevelProgress(45, levels)
    expect(p.level).toBe(2)
    expect(p.nextTitle).toBe("Norming")
    expect(p.percent).toBe(50)
  })

  it("caps at 100 percent on the top level", () => {
    const p = teamLevelProgress(9999, levels)
    expect(p.level).toBe(3)
    expect(p.nextTitle).toBeNull()
    expect(p.percent).toBe(100)
  })
})

describe("xpByMembers", () => {
  it("attributes XP per member and hides zero-XP members", () => {
    const members = [{ initials: "AD" }, { initials: "BO" }, { initials: "CY" }]
    const attribution = { b1: "BO", b2: "AD", b3: "AD" }
    const rows = xpByMembers(behaviors, { b1: true, b2: true, b3: true }, attribution, members)
    expect(rows).toEqual([
      { initials: "AD", xp: 35 },
      { initials: "BO", xp: 10 },
    ])
  })

  it("ignores unknown attribution targets", () => {
    const rows = xpByMembers(behaviors, { b1: true }, { b1: "ZZ" }, [{ initials: "AD" }])
    expect(rows).toHaveLength(0)
  })
})
