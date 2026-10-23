import { describe, expect, it } from "vitest"

import {
  behaviors,
  behaviorAttribution,
  members,
  skillNodes,
  teamLevels,
} from "@/content/gamification-demo"
import {
  computeDemo,
  nodeUnlocks,
  teamLevelProgress,
  totalXp,
  xpByBranch,
  xpByMembers,
  type CheckedBehaviors,
} from "@/lib/gamification/xp"

const allOff: CheckedBehaviors = {}
const allOn: CheckedBehaviors = Object.fromEntries(behaviors.map((b) => [b.id, true]))

const branchTotals = {
  craft: behaviors.filter((b) => b.branch === "craft").reduce((s, b) => s + b.points, 0),
  collaboration: behaviors
    .filter((b) => b.branch === "collaboration")
    .reduce((s, b) => s + b.points, 0),
  stewardship: behaviors
    .filter((b) => b.branch === "stewardship")
    .reduce((s, b) => s + b.points, 0),
}

describe("computeDemo — all-off behaviour set", () => {
  it("unlocks nothing and reports zero XP", () => {
    const demo = computeDemo({ behaviors, nodes: skillNodes, levels: teamLevels, checked: allOff })
    expect(demo.totalXp).toBe(0)
    expect(Object.values(demo.branchXp).every((v) => v === 0)).toBe(true)
    expect(Object.values(demo.unlocks)).toHaveLength(skillNodes.length)
    expect(Object.values(demo.unlocks).filter(Boolean)).toHaveLength(0)
    expect(demo.level.level).toBe(1)
    expect(demo.level.percent).toBe(0)
  })

  it("every node's threshold is above zero, so all-off genuinely gates them", () => {
    expect(Math.min(...skillNodes.map((n) => n.threshold))).toBeGreaterThan(0)
  })
})

describe("computeDemo — all-on behaviour set", () => {
  it("accumulates exactly the fixture's branch point totals", () => {
    const branchXp = xpByBranch(behaviors, allOn)
    expect(branchXp).toEqual(branchTotals)
    expect(totalXp(branchXp)).toBe(
      branchTotals.craft + branchTotals.collaboration + branchTotals.stewardship,
    )
  })

  it("unlocks every node (each branch maxes its top threshold)", () => {
    const demo = computeDemo({ behaviors, nodes: skillNodes, levels: teamLevels, checked: allOn })
    const expectedUnlocks = skillNodes.filter(
      (n) => branchTotals[n.branch] >= n.threshold,
    ).length
    expect(Object.values(demo.unlocks).filter(Boolean)).toHaveLength(expectedUnlocks)
    // With this fixture that is the whole tree — 9 of 9.
    expect(expectedUnlocks).toBe(skillNodes.length)
    expect(expectedUnlocks).toBe(9)
  })

  it("reaches the top team level with the next-level fields cleared", () => {
    const demo = computeDemo({ behaviors, nodes: skillNodes, levels: teamLevels, checked: allOn })
    expect(demo.level.level).toBe(5)
    expect(demo.level.nextTitle).toBeNull()
    expect(demo.level.percent).toBe(100)
  })
})

describe("guardrails change derived output", () => {
  it("flipping one behaviour switches its gated nodes (deterministic derive)", () => {
    const before = computeDemo({ behaviors, nodes: skillNodes, levels: teamLevels, checked: allOff })
    const after = computeDemo({
      behaviors,
      nodes: skillNodes,
      levels: teamLevels,
      checked: { "pr-review": true }, // craft 2 ≥ craft-review threshold 2
    })
    expect(after.totalXp).toBe(before.totalXp + 2)
    expect(after.unlocks["craft-review"]).toBe(true)
    expect(after.unlocks["craft-ship"]).toBe(false)
    expect(
      Object.values(after.unlocks).filter(Boolean).length,
    ).toBeGreaterThan(Object.values(before.unlocks).filter(Boolean).length)
    // Determinism: same checked set always yields the same state.
    const again = computeDemo({
      behaviors,
      nodes: skillNodes,
      levels: teamLevels,
      checked: { "pr-review": true },
    })
    expect(again).toEqual(after)
  })

  it("the team-only guardrail hides standings; the per-member derive sums to total XP", () => {
    const standings = xpByMembers(behaviors, allOn, behaviorAttribution, members)
    expect(standings.length).toBeGreaterThan(0)
    expect(standings.length).toBeLessThan(behaviors.length) // merged per person
    expect(standings.reduce((s, m) => s + m.xp, 0)).toBe(totalXp(xpByBranch(behaviors, allOn)))
    // Sorted high→low.
    for (let i = 1; i < standings.length; i++) {
      expect(standings[i - 1].xp).toBeGreaterThanOrEqual(standings[i].xp)
    }
    // With all-off the individual view is empty while the team view still computes.
    expect(xpByMembers(behaviors, allOff, behaviorAttribution, members)).toHaveLength(0)
  })
})

describe("nodeUnlocks / teamLevelProgress boundaries", () => {
  it("threshold is inclusive", () => {
    const unlocks = nodeUnlocks(skillNodes, { craft: 5, collaboration: 3, stewardship: 6 })
    expect(unlocks["craft-ship"]).toBe(true) // exactly at threshold 5
    expect(unlocks["craft-debt"]).toBe(false) // 5 < 9
    expect(unlocks["collab-pair"]).toBe(true)
    expect(unlocks["stew-retro"]).toBe(false) // 6 < 7
  })

  it("level percent tracks between thresholds", () => {
    expect(teamLevelProgress(0, teamLevels).title).toBe("Getting started")
    expect(teamLevelProgress(6, teamLevels).level).toBe(2)
    expect(teamLevelProgress(6, teamLevels).percent).toBe(0)
    expect(teamLevelProgress(9, teamLevels).percent).toBe(50) // halfway 6→12
    expect(teamLevelProgress(23, teamLevels).level).toBe(4)
    expect(teamLevelProgress(23, teamLevels).nextMinXp).toBe(24)
    // Out-of-order levels are handled via sorting.
    expect(teamLevelProgress(24, [...teamLevels].reverse()).level).toBe(5)
  })
})
