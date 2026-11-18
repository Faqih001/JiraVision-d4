// A running timer that survives a reload. The state is two numbers, so persistence is a JSON
// string the client reads once on mount; every transition is pure and tested, and the component
// only owns the interval that re-reads elapsedMs against Date.now().

export const TIMER_STORAGE_KEY = "jiravision.worklog.timer"

export type TimerState = { startedAt: number | null; elapsedMs: number }

export const IDLE_TIMER: TimerState = { startedAt: null, elapsedMs: 0 }

export function startTimer(state: TimerState, now: number): TimerState {
  if (state.startedAt !== null) return state
  return { startedAt: now, elapsedMs: state.elapsedMs }
}

export function stopTimer(state: TimerState, now: number): TimerState {
  if (state.startedAt === null) return state
  return { startedAt: null, elapsedMs: state.elapsedMs + Math.max(0, now - state.startedAt) }
}

export function elapsedMs(state: TimerState, now: number): number {
  return state.elapsedMs + (state.startedAt === null ? 0 : Math.max(0, now - state.startedAt))
}

// Twenty seconds of real work is a minute logged, not zero — a zero-minute entry would claim
// the member said "no time", which is a different statement.
export function timerMinutes(state: TimerState, now: number): number {
  const ms = elapsedMs(state, now)
  return ms === 0 ? 0 : Math.max(1, Math.round(ms / 60_000))
}

export function formatClock(ms: number): string {
  const total = Math.floor(ms / 1000)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  const mm = String(minutes).padStart(2, "0")
  const ss = String(seconds).padStart(2, "0")
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`
}

export function serializeTimer(state: TimerState): string {
  return JSON.stringify(state)
}

export function parseTimer(raw: string | null): TimerState {
  if (!raw) return IDLE_TIMER
  try {
    const parsed = JSON.parse(raw) as Partial<TimerState>
    const startedAt = parsed.startedAt
    const elapsed = parsed.elapsedMs
    if (startedAt !== null && (typeof startedAt !== "number" || !Number.isFinite(startedAt))) return IDLE_TIMER
    if (typeof elapsed !== "number" || !Number.isFinite(elapsed) || elapsed < 0) return IDLE_TIMER
    return { startedAt, elapsedMs: elapsed }
  } catch {
    return IDLE_TIMER
  }
}