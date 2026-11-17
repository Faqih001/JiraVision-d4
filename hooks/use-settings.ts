"use client"

// One read of the merged workspace settings per mount. No module-level cache: a save on
// the settings page followed by navigation must show the new values, not a stale snapshot.
// Until the response lands (or if it fails) consumers render with the shared defaults, so
// a surface never blocks or blanks on this fetch.

import { useEffect, useState } from "react"
import { DEFAULT_SETTINGS } from "@/lib/settings/preferences"

export type WorkspaceSettings = Record<string, unknown>

export function useSettings(): { settings: WorkspaceSettings; ready: boolean } {
  const [settings, setSettings] = useState<WorkspaceSettings>(DEFAULT_SETTINGS)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch("/api/settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (cancelled) return
        if (json?.success && json.settings && typeof json.settings === "object") {
          setSettings({ ...DEFAULT_SETTINGS, ...(json.settings as WorkspaceSettings) })
        }
        setReady(true)
      })
      .catch(() => {
        if (!cancelled) setReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { settings, ready }
}