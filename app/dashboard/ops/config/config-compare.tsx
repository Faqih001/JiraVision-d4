"use client"

// The comparison view for the pack config (PR 11h).
//
// Shows the diff between the current config and the code-authored baseline. Each section (logs, kpis, etc.)
// lists what was added, removed, or modified. This helps admins see what's been customized before deciding
// to reset.

import { useCallback, useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { SectionCard, EmptyNote } from "@/components/dashboard-kit"
import { GitCompare, Loader2 } from "lucide-react"

type DiffCounts = {
  added: number
  removed: number
  modified: number
}

type DiffSummary = {
  counts: Record<string, DiffCounts>
  items: Array<{
    section: string
    ref: string
    status: "new" | "conflict" | "duplicate"
    label: string
    key: string
  }>
}

type CompareResponse = {
  current: unknown
  baseline: unknown
  diff: DiffSummary | null
  message?: string
}

function StatusBadge({ status }: { status: string }) {
  if (status === "new" || status === "added") return <Badge>added</Badge>
  if (status === "conflict" || status === "modified") return <Badge variant="destructive">modified</Badge>
  if (status === "removed") return <Badge variant="outline">removed</Badge>
  return <Badge variant="outline">{status}</Badge>
}

export default function ConfigCompare({ packKey }: { packKey: string }) {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<CompareResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/ops/config/compare")
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) {
        throw new Error(json?.message ?? `Request failed (${res.status})`)
      }
      setData(json.data as CompareResponse)
      setExpanded(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load comparison")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (expanded && !data && !loading) {
      void load()
    }
  }, [expanded, data, loading, load])

  if (!expanded) {
    return (
      <SectionCard title="Compare with code-authored baseline" icon={<GitCompare className="h-4 w-4" />}>
        <EmptyNote>
          See what has been customized in this pack's config compared to the baseline the seed script declares.
        </EmptyNote>
        <Button size="sm" variant="outline" onClick={() => setExpanded(true)} className="mt-2">
          <GitCompare className="mr-2 h-4 w-4" aria-hidden />
          Show comparison
        </Button>
      </SectionCard>
    )
  }

  return (
    <SectionCard
      title="Compare with code-authored baseline"
      icon={<GitCompare className="h-4 w-4" />}
      action={
        <Button size="sm" variant="ghost" onClick={() => void load()} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : <GitCompare className="mr-2 h-4 w-4" aria-hidden />}
          Refresh
        </Button>
      }
    >
      {loading && <EmptyNote>Loading comparison…</EmptyNote>}
      {error && <EmptyNote>{error}</EmptyNote>}
      {!loading && !error && data?.message && <EmptyNote>{data.message}</EmptyNote>}
      {!loading && !error && data?.diff && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Pack <span className="font-mono text-xs">{packKey}</span> has{" "}
            {data.diff.items.length} customization{data.diff.items.length === 1 ? "" : "s"} compared to the code-authored baseline.
          </p>

          {Object.entries(data.diff.counts).map(([section, counts]) => {
            const total = counts.added + counts.modified + counts.removed
            if (total === 0) return null
            return (
              <div key={section} className="space-y-2">
                <h3 className="text-sm font-semibold capitalize">{section}</h3>
                <ul className="space-y-1">
                  {data.diff!.items
                    .filter((item) => item.section === section)
                    .map((item) => (
                      <li key={item.ref} className="flex items-start gap-2 text-sm">
                        <StatusBadge status={item.status} />
                        <span className="flex-1">
                          <span className="font-medium">{item.label}</span>{" "}
                          <span className="font-mono text-xs text-muted-foreground">{item.key}</span>
                        </span>
                      </li>
                    ))}
                </ul>
              </div>
            )
          })}

          {data.diff.items.length === 0 && (
            <EmptyNote>No customizations — this pack matches the code-authored baseline exactly.</EmptyNote>
          )}
        </div>
      )}
    </SectionCard>
  )
}
