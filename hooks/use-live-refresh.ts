"use client"

import { useEffect, useRef } from "react"

type Refresh = () => void | Promise<void>

interface LiveRefreshOptions {
  /** Repeat while the tab stays visible. Omit for focus-only revalidation. */
  intervalMs?: number
  /** Pause without unmounting — e.g. while an editor dialog owns the form. */
  enabled?: boolean
}

/**
 * Keeps a dashboard's data in step with the database without a manual reload.
 *
 * Runs `refresh` when the tab becomes visible again (switching back from another
 * window, or re-focusing after a while away) and, if `intervalMs` is given, on that
 * interval while the tab stays visible. Refreshes are single-flight, are skipped
 * while the tab is hidden, and never throw: a failed refresh leaves the rows the
 * page already has on screen.
 *
 * Pass the page's quiet loader — one that updates rows without flipping the
 * skeleton — so a refresh never looks like a page load. The loader must also leave its
 * own inputs alone: a read that writes state listed in its dependency array rebuilds the
 * loader, the page's load effect re-runs, and the skeleton returns on its own schedule.
 */
export function useLiveRefresh(refresh: Refresh, options: LiveRefreshOptions = {}) {
  const latest = useRef(refresh)
  const { intervalMs, enabled = true } = options

  useEffect(() => {
    latest.current = refresh
  }, [refresh])

  useEffect(() => {
    if (!enabled) return

    let running = false
    const run = () => {
      if (document.visibilityState !== "visible" || running) return
      running = true
      Promise.resolve()
        .then(() => latest.current())
        .catch(() => undefined)
        .finally(() => {
          running = false
        })
    }
    const onVisibility = () => {
      if (document.visibilityState === "visible") run()
    }

    document.addEventListener("visibilitychange", onVisibility)
    window.addEventListener("focus", run)
    const timer = intervalMs && intervalMs > 0 ? window.setInterval(run, intervalMs) : undefined

    return () => {
      document.removeEventListener("visibilitychange", onVisibility)
      window.removeEventListener("focus", run)
      if (timer !== undefined) window.clearInterval(timer)
    }
  }, [intervalMs, enabled])
}

/** One minute: often enough to feel live, rare enough to spare a waking Neon compute. */
export const LIVE_REFRESH_MS = 60_000
