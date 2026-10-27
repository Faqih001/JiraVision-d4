"use client"

// /admin/career — the super-admin career workspace (design §11). Three surfaces share one
// gate: the ladder editor writes what a rung asks for, the placement panel puts people on
// a rung and ticks its checklist, and the review queue decides promotion requests from the
// evidence frozen at submit time. Every write is re-gated in its route; this page only
// mirrors the wall so an unauthenticated visitor is not shown an empty editor.

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import {
  ClipboardCheck,
  LayoutDashboard,
  ListChecks,
  Lock,
  RefreshCw,
  TrendingUp,
  Users,
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { CircleJVLoader } from "@/components/ui/loader"
import { cn } from "@/lib/utils"
import { LadderEditor, type AdminLevel } from "./ladder-editor"
import { PlacementPanel } from "./placement-panel"
import { ReviewQueue } from "./review-queue"

type AccessState = "loading" | "authed" | "unauthenticated" | "forbidden"
type TabId = "ladder" | "placements" | "review"

const TABS: ReadonlyArray<{ id: TabId; label: string; icon: typeof ListChecks }> = [
  { id: "ladder", label: "Ladder", icon: ListChecks },
  { id: "placements", label: "Placements", icon: Users },
  { id: "review", label: "Review queue", icon: ClipboardCheck },
]

export default function AdminCareerPage() {
  const [access, setAccess] = useState<AccessState>("loading")
  const [levels, setLevels] = useState<AdminLevel[]>([])
  const [active, setActive] = useState<TabId>("ladder")
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    setRefreshing(true)
    try {
      const res = await fetch("/api/career/levels?all=1")
      if (res.status === 401) {
        setAccess("unauthenticated")
        return
      }
      if (res.status === 403) {
        setAccess("forbidden")
        return
      }
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) {
        throw new Error(json?.error ?? json?.message ?? `Request failed (${res.status})`)
      }
      setLevels(json.data.levels as AdminLevel[])
      setAccess("authed")
      setError(null)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    fetch("/api/career/levels?all=1")
      .then(async (res) => {
        if (res.status === 401) return { kind: "unauthenticated" as const }
        if (res.status === 403) return { kind: "forbidden" as const }
        const json = await res.json().catch(() => null)
        if (!res.ok || !json?.success) {
          throw new Error(json?.error ?? json?.message ?? `Request failed (${res.status})`)
        }
        return { kind: "authed" as const, levels: json.data.levels as AdminLevel[] }
      })
      .then((result) => {
        if (cancelled) return
        if (result.kind === "authed") {
          setLevels(result.levels)
          setAccess("authed")
          setError(null)
        } else {
          setAccess(result.kind)
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return
        // The page shell still renders: every write is gated again in its route.
        setAccess("authed")
        setError((err as Error).message)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const handleSaved = useCallback((saved: AdminLevel) => {
    setLevels((prev) => prev.map((level) => (level.id === saved.id ? saved : level)))
  }, [])

  if (access === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <CircleJVLoader size="md" showText={true} />
      </div>
    )
  }

  if (access === "unauthenticated" || access === "forbidden") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
        <div className="w-full max-w-md rounded-xl border bg-card p-8 text-center shadow-soft">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <Lock className="h-6 w-6" aria-hidden />
          </span>
          <h1 className="mt-4 font-display text-2xl font-medium tracking-tight">
            {access === "unauthenticated" ? "Sign in required" : "Super-admin access required"}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {access === "unauthenticated"
              ? "The career workspace publishes what each rung asks for and records who signed it off. Sign in with a super-admin account to continue."
              : "The career workspace is restricted to super-admins: accounts with the admin role, or emails listed in the server's ADMIN_EMAILS environment variable. Your account has neither right now."}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            {access === "unauthenticated" ? (
              <Button asChild>
                <Link href="/login">Sign in</Link>
              </Button>
            ) : (
              <Button asChild variant="outline">
                <Link href="/dashboard">
                  <LayoutDashboard className="mr-2 h-4 w-4" aria-hidden />
                  Back to dashboard
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 md:px-6">
          <TrendingUp className="h-5 w-5 text-primary" aria-hidden />
          <div className="mr-auto">
            <p className="text-sm font-semibold leading-tight">Career workspace</p>
            <p className="text-xs text-muted-foreground">
              Ladder wording, placements and sign-offs, and the promotion review queue
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={refreshing}>
            <RefreshCw className={cn("mr-1.5 h-4 w-4", refreshing && "animate-spin")} aria-hidden />
            Reload
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/career">My career</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard">
              <LayoutDashboard className="mr-1.5 h-4 w-4" aria-hidden />
              Dashboard
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-5 px-4 py-6 md:px-6">
        {error ? (
          <Alert variant="destructive">
            <AlertDescription className="flex items-center justify-between gap-3">
              <span>{error}</span>
              <Button size="sm" variant="outline" onClick={() => void load()}>
                Try again
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        <div role="tablist" aria-label="Career workspace sections" className="flex flex-wrap gap-1.5">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const selected = active === tab.id
            return (
              <Button
                key={tab.id}
                role="tab"
                aria-selected={selected}
                size="sm"
                variant={selected ? "default" : "outline"}
                onClick={() => setActive(tab.id)}
              >
                <Icon className="mr-1.5 h-4 w-4" aria-hidden />
                {tab.label}
              </Button>
            )
          })}
        </div>

        {active === "ladder" ? <LadderEditor levels={levels} onSaved={handleSaved} /> : null}
        {active === "placements" ? <PlacementPanel /> : null}
        {active === "review" ? <ReviewQueue /> : null}
      </main>
    </div>
  )
}
