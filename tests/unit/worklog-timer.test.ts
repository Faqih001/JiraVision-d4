import { describe, expect, it } from "vitest"
import {
  IDLE_TIMER,
  TIMER_STORAGE_KEY,
  elapsedMs,
  formatClock,
  parseTimer,
  serializeTimer,
  startTimer,
  stopTimer,
  timerMinutes,
} from "@/lib/worklog/timer"
import { appendMinutes } from "@/lib/worklog/quick-add"

describe("timer state machine", () => {
  it("starts idle and stays the same object when started twice", () => {
    const running = startTimer(IDLE_TIMER, 1_000)
    expect(running).toEqual({ startedAt: 1_000, elapsedMs: 0 })
    expect(startTimer(running, 5_000)).toBe(running)
  })

  it("accumulates across stop/start instead of resetting", () => {
    let state = startTimer(IDLE_TIMER, 0)
    state = stopTimer(state, 60_000)
    expect(state).toEqual({ startedAt: null, elapsedMs: 60_000 })
    state = startTimer(state, 120_000)
    expect(elapsedMs(state, 150_000)).toBe(90_000)
  })

  it("stopping an idle timer changes nothing", () => {
    expect(stopTimer(IDLE_TIMER, 9_999)).toBe(IDLE_TIMER)
  })

  it("reads elapsed time while running without mutating", () => {
    const running = startTimer(IDLE_TIMER, 10_000)
    expect(elapsedMs(running, 70_000)).toBe(60_000)
    expect(running.startedAt).toBe(10_000)
  })
})

describe("timerMinutes", () => {
  it("is zero for an untouched timer", () => {
    expect(timerMinutes(IDLE_TIMER, 999_999)).toBe(0)
  })

  it("rounds to the nearest minute but never logs zero for real work", () => {
    const running = startTimer(IDLE_TIMER, 0)
    expect(timerMinutes(running, 20_000)).toBe(1)
    expect(timerMinutes(running, 89_000)).toBe(1)
    expect(timerMinutes(running, 91_000)).toBe(2)
  })
})

describe("formatClock", () => {
  it("shows mm:ss under an hour", () => {
    expect(formatClock(0)).toBe("00:00")
    expect(formatClock(7 * 60_000 + 32_000)).toBe("07:32")
  })

  it("shows h:mm:ss once an hour passes", () => {
    expect(formatClock(67 * 60_000 + 32_000)).toBe("1:07:32")
  })
})

describe("timer persistence", () => {
  it("round-trips a running timer through its serialized form", () => {
    const running = startTimer(IDLE_TIMER, 1_700_000_000_000)
    expect(parseTimer(serializeTimer(running))).toEqual(running)
  })

  it("falls back to idle on anything unreadable", () => {
    for (const raw of [null, "", "not json", "{}", '{"startedAt":"x","elapsedMs":0}', '{"startedAt":null,"elapsedMs":-5}']) {
      expect(parseTimer(raw)).toEqual(IDLE_TIMER)
    }
  })

  it("uses a namespaced storage key", () => {
    expect(TIMER_STORAGE_KEY).toBe("jiravision.worklog.timer")
  })
})

describe("appendMinutes", () => {
  it("appends the token to a plain line", () => {
    expect(appendMinutes("Fixed the build", 90)).toBe("Fixed the build #90")
  })

  it("replaces an existing minutes token instead of adding a second", () => {
    expect(appendMinutes("Fixed the build #30 #action", 90)).toBe("Fixed the build #action #90")
  })

  it("leaves kind tokens alone", () => {
    expect(appendMinutes("Reviewed the PR #review", 45)).toBe("Reviewed the PR #review #45")
  })
})