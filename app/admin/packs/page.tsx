"use client"

// /admin/packs — the super-admin pack workspace (design §12 item 1). The wall here only
// mirrors the wall in the route: every write is gated again by `isSuperAdmin` on the server,
// so an unauthenticated visitor never sees an editor that could save.

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { GoogleTranslateSelect } from "@/components/layout/google-translate"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CircleJVLoader } from "@/components/ui/loader"
import { LayoutDashboard, Lock, Plus, RefreshCw, ShieldCheck } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { PackEditor, type AdminPack, type PackPayload } from "./pack-editor"

type AccessState = "loading" | "authed" | "unauthenticated" | "forbidden"

export default function AdminPacksPage() {
  const { toast } = useToast()
  const [access, setAccess] = useState<AccessState>("loading")
  const [packs, setPacks] = useState<AdminPack[]>([])
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/packs?all=1")
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
      const next = json.data.packs as AdminPack[]
      setPacks(next)
      setAccess("authed")
      setSelectedKey((prev) => (prev && next.some((pack) => pack.packKey === prev) ? prev : (next[0]?.packKey ?? null)))
    } catch (error) {
      toast({ variant: "destructive", title: "Role packs", description: (error as Error).message })
    }
  }, [toast])

  const refresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [load])

  useEffect(() => {
    const run = async () => {
      await load()
    }
    void run()
  }, [load])

  const selected = creating ? null : (packs.find((pack) => pack.packKey === selectedKey) ?? null)

  const save = useCallback(
    async (payload: PackPayload) => {
      setSaving(true)
      try {
        const res = await fetch("/api/packs", {
          method: creating ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        const json = await res.json().catch(() => null)
        if (!res.ok || !json?.success) {
          throw new Error(json?.error ?? json?.message ?? `Request failed (${res.status})`)
        }
        toast({
          title: creating ? "Pack created" : "Pack saved",
          description: `${payload.title} — ${payload.disciplines.length} discipline(s), ${payload.registerKinds.length} kind(s).`,
        })
        setCreating(false)
        setSelectedKey(payload.packKey)
        await load()
      } catch (error) {
        toast({ variant: "destructive", title: "Role packs", description: (error as Error).message })
      } finally {
        setSaving(false)
      }
    },
    [creating, load, toast],
  )

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
              ? "Role packs decide what a person is the keeper of. Sign in with a super-admin account to author them."
              : "Role packs are restricted to super-admins: accounts with the admin role, or emails listed in the server's ADMIN_EMAILS environment variable. Your account has neither right now."}
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
          <ShieldCheck className="h-5 w-5 text-primary" aria-hidden />
          <div className="mr-auto">
            <p className="text-sm font-semibold leading-tight">Role packs</p>
            <p className="text-xs text-muted-foreground">
              What each role is the keeper of — kinds, method and onboarding, as data
            </p>
          </div>
          <GoogleTranslateSelect />
          <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={refreshing}>
            <RefreshCw className={refreshing ? "mr-1.5 h-4 w-4 animate-spin" : "mr-1.5 h-4 w-4"} aria-hidden />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus className="mr-1.5 h-4 w-4" aria-hidden />
            New pack
          </Button>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-4 md:px-6 lg:grid-cols-[18rem_1fr]">
        <aside className="space-y-2">
          <p className="px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {packs.length} published or inactive
          </p>
          {packs.length === 0 ? (
            <p className="rounded-md border bg-card p-3 text-xs text-muted-foreground">
              No packs yet. The migration seeds two; create one here if the seed was skipped.
            </p>
          ) : (
            packs.map((pack) => (
              <button
                key={pack.packKey}
                type="button"
                onClick={() => {
                  setCreating(false)
                  setSelectedKey(pack.packKey)
                }}
                className={
                  !creating && selectedKey === pack.packKey
                    ? "w-full rounded-md border bg-card p-3 text-left ring-1 ring-primary"
                    : "w-full rounded-md border bg-card p-3 text-left hover:bg-muted/40"
                }
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{pack.title}</span>
                  <Badge variant={pack.isActive ? "default" : "outline"}>
                    {pack.isActive ? "Live" : "Inactive"}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{pack.packKey}</p>
                <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                  {pack.disciplines.length} disciplines · {pack.registerKinds.length} kinds
                </p>
              </button>
            ))
          )}
        </aside>

        <main className="rounded-lg border bg-card p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h1 className="text-lg font-semibold">
                {creating ? "New role pack" : (selected?.title ?? "Choose a pack")}
              </h1>
              <p className="text-xs text-muted-foreground">
                {creating
                  ? "A new key starts its own row; existing rows keep the pack they were created under."
                  : "Edits apply to every member whose onboarding resolves to this pack."}
              </p>
            </div>
            {!creating && selected ? (
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/registers">Open registers</Link>
              </Button>
            ) : null}
          </div>

          {creating || selected ? (
            <PackEditor
              key={creating ? "new" : (selected?.packKey ?? "none")}
              pack={selected}
              saving={saving}
              onSave={(payload) => void save(payload)}
            />
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Select a pack on the left, or create a new one.
            </p>
          )}
        </main>
      </div>
    </div>
  )
}
