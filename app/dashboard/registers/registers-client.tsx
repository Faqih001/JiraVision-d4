"use client"

// The member register workspace (design §12 item 2). The server returns the rows this person
// may see, already filtered by the URL's own state; this file renders them, edits them, and
// never decides visibility for itself. A credential-looking field is refused by the API, so
// the form carries the placeholder rather than a guess at what the boundary allows.

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import {
  AlertTriangle,
  CalendarClock,
  Columns3,
  Download,
  LayoutGrid,
  List as ListIcon,
  Plus,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Wrench,
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { SectionCard, EmptyNote } from "@/components/dashboard-kit"
import { LIVE_REFRESH_MS, useLiveRefresh } from "@/hooks/use-live-refresh"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import {
  CREDENTIAL_HINT,
  CREDENTIAL_PLACEHOLDER,
} from "@/lib/registers/fields"
import {
  CUSTODY_LABEL,
  REGISTER_CUSTODY,
  REGISTER_STATUSES,
  REGISTER_STATUS_LABEL,
  transitionsFrom,
  type RegisterCustody,
  type RegisterStatus,
} from "@/lib/registers/rules"
import { STALENESS_LABEL, type Staleness } from "@/lib/registers/staleness"
import {
  REGISTER_VIEWS,
  REGISTER_VIEW_LABEL,
  groupRegistersByKind,
  parseRegisterView,
  serializeRegisterView,
  type RegisterView,
  type RegisterViewState,
} from "@/lib/registers/view-state"

type RegisterRow = {
  id: number
  packKey: string
  kind: string
  title: string
  fields: Record<string, string>
  status: RegisterStatus
  ownerId: number | null
  ownerName: string | null
  custody: RegisterCustody
  lastVerifiedAt: string | null
  verifyIntervalDays: number | null
  parentId: number | null
  source: string
  updatedAt: string
  staleness: Staleness
}

type PackSummary = {
  packKey: string
  title: string
  registerKinds: { key: string; label: string }[]
  sections: string[]
  reportTemplate: string | null
  ladderDiscipline: string | null
  method: string[]
  onboarding: string[]
}

type RegistersPayload = {
  registers: RegisterRow[]
  packs: PackSummary[]
  pack: PackSummary | null
  admin: boolean
  today: string
  counts: { total: number; stale: number; unknown: number }
}

type FieldPair = { key: string; value: string }

type RegisterDraft = {
  id: number | null
  packKey: string
  kind: string
  title: string
  custody: RegisterCustody
  verifyIntervalDays: string
  ownerId: string
  fields: FieldPair[]
  status: RegisterStatus
}

type SendResult = { json: any; error: string | null }

async function send(path: string, init?: RequestInit): Promise<SendResult> {
  try {
    const res = await fetch(path, init)
    const json = await res.json().catch(() => null)
    if (!res.ok || !json?.success) {
      return { json, error: json?.error ?? json?.message ?? `Request failed (${res.status})` }
    }
    return { json, error: null }
  } catch (error) {
    return { json: null, error: (error as Error).message }
  }
}

const jsonInit = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
})

function formatDay(value: string | null): string {
  if (!value) return "Never"
  const date = new Date(`${value}T00:00:00Z`)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString()
}

function StatusBadge({ status }: { status: RegisterStatus }) {
  const variant =
    status === "in_service"
      ? "default"
      : status === "disposed"
        ? "destructive"
        : status === "retired"
          ? "outline"
          : "secondary"
  return <Badge variant={variant}>{REGISTER_STATUS_LABEL[status]}</Badge>
}

function StaleBadge({ state }: { state: Staleness }) {
  const variant = state === "stale" ? "destructive" : state === "unknown" ? "secondary" : "outline"
  return <Badge variant={variant}>{STALENESS_LABEL[state]}</Badge>
}

function RowSummary({ row }: { row: RegisterRow }) {
  const entries = Object.entries(row.fields).slice(0, 2)
  if (entries.length === 0) return null
  return (
    <p className="mt-0.5 truncate text-xs text-muted-foreground">
      {entries.map(([key, value]) => `${key}: ${value || "—"}`).join(" · ")}
    </p>
  )
}

export function RegistersSkeleton() {
  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-9 w-32" />
      </div>
      <Skeleton className="h-20 w-full" />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-32 w-full" />
        ))}
      </div>
    </div>
  )
}

export default function RegistersClient() {
  const router = useRouter()
  const search = useSearchParams()
  const { toast } = useToast()

  const [state, setState] = useState<RegisterViewState>(() =>
    parseRegisterView(new URLSearchParams(search.toString())),
  )
  const [packScope, setPackScope] = useState<string>(() => search.get("pack") ?? "")
  const [data, setData] = useState<RegistersPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selection, setSelection] = useState<number[]>([])
  const [busy, setBusy] = useState(false)

  const [draft, setDraft] = useState<RegisterDraft | null>(null)
  const [move, setMove] = useState<{ label: string; to: RegisterStatus; requiresReason: boolean } | null>(null)
  const [moveReason, setMoveReason] = useState("")
  const [reassignOpen, setReassignOpen] = useState(false)
  const [reassignOwner, setReassignOwner] = useState("")
  const [stalePlanId, setStalePlanId] = useState<number | null>(null)

  useEffect(() => {
    const parsed = parseRegisterView(new URLSearchParams(search.toString()))
    setState((prev) => (serializeRegisterView(parsed) !== serializeRegisterView(prev) ? parsed : prev))
    setPackScope(search.get("pack") ?? "")
  }, [search])

  const query = useMemo(() => {
    const params = new URLSearchParams(serializeRegisterView(state))
    if (packScope) params.set("pack", packScope)
    return params.toString()
  }, [state, packScope])

  useEffect(() => {
    const current = window.location.search.replace(/^\?/u, "")
    if (query === current) return
    router.replace(query ? `/dashboard/registers?${query}` : "/dashboard/registers", { scroll: false })
  }, [query, router])

  const refresh = useCallback(
    async (quiet = false) => {
      if (!quiet) {
        setLoading(true)
        setError(null)
      }
      try {
        const res = await fetch(`/api/registers?${query}`)
        const json = await res.json().catch(() => null)
        if (!res.ok || !json?.success) {
          throw new Error(json?.error ?? json?.message ?? `Request failed (${res.status})`)
        }
        setData(json.data as RegistersPayload)
      } catch (err) {
        if (!quiet) setError((err as Error).message)
      } finally {
        if (!quiet) setLoading(false)
      }
    },
    [query],
  )

  useEffect(() => {
    void refresh()
  }, [refresh])

  useLiveRefresh(() => refresh(true), { intervalMs: LIVE_REFRESH_MS })

  const rows = useMemo(() => data?.registers ?? [], [data])
  const admin = data?.admin ?? false
  const today = data?.today ?? null

  const kinds = useMemo(() => {
    const map = new Map<string, string>()
    for (const pack of data?.packs ?? []) {
      for (const kind of pack.registerKinds) map.set(kind.key, kind.label)
    }
    for (const row of rows) if (!map.has(row.kind)) map.set(row.kind, row.kind)
    return [...map.entries()]
      .map(([key, label]) => ({ key, label }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [data, rows])

  const kindLabel = useCallback(
    (key: string) => kinds.find((kind) => kind.key === key)?.label ?? key,
    [kinds],
  )

  const packTitle = useCallback(
    (key: string) => data?.packs.find((pack) => pack.packKey === key)?.title ?? key,
    [data],
  )

  const setView = useCallback((patch: Partial<RegisterViewState>) => {
    setState((prev) => ({ ...prev, ...patch }))
  }, [])

  const toggleSelect = useCallback((id: number) => {
    setSelection((prev) => (prev.includes(id) ? prev.filter((entry) => entry !== id) : [...prev, id]))
  }, [])

  const allSelected = rows.length > 0 && rows.every((row) => selection.includes(row.id))
  const toggleAll = useCallback(() => {
    setSelection((prev) => (prev.length === rows.length ? [] : rows.map((row) => row.id)))
  }, [rows])

  const openCreate = useCallback(() => {
    const pack = data?.pack ?? data?.packs[0]
    if (!pack) {
      toast({
        variant: "destructive",
        title: "No role pack",
        description: "An admin needs to publish a role pack before a register row can be added.",
      })
      return
    }
    setMove(null)
    setMoveReason("")
    setDraft({
      id: null,
      packKey: pack.packKey,
      kind: pack.registerKinds[0]?.key ?? "",
      title: "",
      custody: "member",
      verifyIntervalDays: "",
      ownerId: "",
      fields: [{ key: "location", value: "" }],
      status: "in_service",
    })
  }, [data, toast])

  const openEdit = useCallback((row: RegisterRow) => {
    setMove(null)
    setMoveReason("")
    setDraft({
      id: row.id,
      packKey: row.packKey,
      kind: row.kind,
      title: row.title,
      custody: row.custody,
      verifyIntervalDays: row.verifyIntervalDays === null ? "" : String(row.verifyIntervalDays),
      ownerId: row.ownerId === null ? "" : String(row.ownerId),
      fields: Object.entries(row.fields).map(([key, value]) => ({ key, value })),
      status: row.status,
    })
  }, [])

  const draftPack = data?.packs.find((pack) => pack.packKey === draft?.packKey) ?? null

  const submitDraft = useCallback(async () => {
    if (!draft) return
    const title = draft.title.trim()
    if (!title) {
      toast({ variant: "destructive", title: "A title is required" })
      return
    }
    if (draft.id === null && !draft.kind) {
      toast({ variant: "destructive", title: "This pack has no register kinds yet" })
      return
    }

    const fields: Record<string, string> = {}
    for (const pair of draft.fields) {
      const key = pair.key.trim()
      if (!key) continue
      fields[key] = pair.value.trim()
    }

    const interval = draft.verifyIntervalDays.trim()

    setBusy(true)
    const result =
      draft.id === null
        ? await send(
            "/api/registers",
            jsonInit("POST", {
              packKey: draft.packKey,
              kind: draft.kind,
              title,
              fields,
              custody: draft.custody,
              verifyIntervalDays: interval === "" ? null : Number(interval),
              ...(admin && draft.ownerId.trim() !== "" ? { ownerId: Number(draft.ownerId) } : {}),
            }),
          )
        : await send(
            `/api/registers/${draft.id}`,
            jsonInit("PATCH", {
              title,
              fields,
              custody: draft.custody,
              verifyIntervalDays: interval === "" ? null : Number(interval),
              ...(admin ? { ownerId: draft.ownerId.trim() === "" ? null : Number(draft.ownerId) } : {}),
            }),
          )
    setBusy(false)

    if (result.error) {
      toast({ variant: "destructive", title: "Register", description: result.error })
      return
    }
    setDraft(null)
    await refresh()
    toast({ title: draft.id === null ? "Register row added" : "Register row updated", description: title })
  }, [admin, draft, refresh, toast])

  const verify = useCallback(
    async (row: RegisterRow) => {
      setBusy(true)
      const result = await send(`/api/registers/${row.id}/verify`, { method: "POST" })
      setBusy(false)
      if (result.error) {
        toast({ variant: "destructive", title: "Verify", description: result.error })
        return
      }
      await refresh()
      toast({ title: "Verified", description: `${row.title} was checked today.` })
    },
    [refresh, toast],
  )

  const applyMove = useCallback(
    async (
      row: RegisterRow,
      target: { label: string; to: RegisterStatus },
      reason: string,
    ) => {
      setBusy(true)
      const result = await send(
        `/api/registers/${row.id}`,
        jsonInit("PATCH", { status: target.to, ...(reason ? { reason } : {}) }),
      )
      setBusy(false)
      if (result.error) {
        toast({ variant: "destructive", title: "Lifecycle", description: result.error })
        return
      }
      setDraft(null)
      setMove(null)
      setMoveReason("")
      await refresh()
      toast({ title: target.label, description: row.title })
    },
    [refresh, toast],
  )

  const bulk = useCallback(
    async (body: Record<string, unknown>) => {
      setBusy(true)
      const result = await send("/api/registers/bulk", jsonInit("POST", body))
      setBusy(false)
      if (result.error) {
        toast({ variant: "destructive", title: "Bulk action", description: result.error })
        return
      }
      const updated = (result.json?.data?.updated as number[] | undefined)?.length ?? 0
      const skipped = (result.json?.data?.skipped as unknown[] | undefined)?.length ?? 0
      setSelection([])
      setReassignOpen(false)
      await refresh()
      toast({
        title: "Bulk action complete",
        description: `${updated} updated${skipped ? `, ${skipped} skipped` : ""}.`,
      })
    },
    [refresh, toast],
  )

  const scheduleChecks = useCallback(async () => {
    setBusy(true)
    const result = await send("/api/registers/stale", { method: "POST" })
    setBusy(false)
    if (result.error) {
      toast({ variant: "destructive", title: "Stale checks", description: result.error })
      return
    }
    const planId = result.json?.data?.planId as number | undefined
    if (typeof planId === "number") setStalePlanId(planId)
    toast({
      title: result.json?.data?.created ? "Draft plan created" : "Draft plan already exists",
      description: "Review it in the planner; promote is what turns it into tasks.",
    })
  }, [toast])

  if (loading && !data) return <RegistersSkeleton />

  if (error && !data) {
    return (
      <div className="p-4 md:p-6">
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between gap-3">
            <span>{error}</span>
            <Button size="sm" variant="outline" onClick={() => void refresh()}>
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!data) return null

  const selectedRows = rows.filter((row) => selection.includes(row.id))
  const canBulkVerify = selectedRows.some((row) => row.status !== "disposed")
  const exportHref = `/api/registers/export?${query}`

  return (
    <div className="space-y-4 p-4 md:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <ShieldCheck className="h-5 w-5" aria-hidden />
            Registers
          </h1>
          <p className="text-sm text-muted-foreground">
            {data.pack
              ? `${data.pack.title} — what you are the keeper of, and when it was last checked.`
              : "What you are the keeper of, and when it was last checked."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => void refresh()} disabled={loading || busy}>
            <RefreshCw className={cn("mr-1.5 h-4 w-4", loading && "animate-spin")} aria-hidden />
            Refresh
          </Button>
          <Button size="sm" variant="outline" asChild>
            <a href={exportHref} download>
              <Download className="mr-1.5 h-4 w-4" aria-hidden />
              CSV
            </a>
          </Button>
          {admin ? (
            <Button size="sm" variant="outline" asChild>
              <Link href="/admin/packs">
                <Settings2 className="mr-1.5 h-4 w-4" aria-hidden />
                Role packs
              </Link>
            </Button>
          ) : null}
          <Button size="sm" onClick={openCreate} disabled={busy}>
            <Plus className="mr-1.5 h-4 w-4" aria-hidden />
            New item
          </Button>
        </div>
      </header>

      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded-md bg-muted px-2 py-1 tabular-nums">{data.counts.total} visible</span>
        <span
          className={cn(
            "rounded-md px-2 py-1 tabular-nums",
            data.counts.stale > 0 ? "bg-destructive/10 font-medium text-destructive" : "bg-muted",
          )}
        >
          {data.counts.stale} stale
        </span>
        <span className="rounded-md bg-muted px-2 py-1 tabular-nums">
          {data.counts.unknown} never verified
        </span>
        {today ? <span className="rounded-md bg-muted px-2 py-1 tabular-nums">Today {today}</span> : null}
      </div>

      {data.counts.stale > 0 ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-destructive" aria-hidden />
          <p className="mr-auto text-sm">
            {data.counts.stale} {data.counts.stale === 1 ? "row is" : "rows are"} past the check
            interval. Scheduling writes one draft plan; nothing becomes a task until you promote it.
          </p>
          <Button size="sm" onClick={() => void scheduleChecks()} disabled={busy}>
            <CalendarClock className="mr-1.5 h-4 w-4" aria-hidden />
            Schedule checks
          </Button>
          {stalePlanId !== null ? (
            <Button size="sm" variant="outline" asChild>
              <Link href={`/dashboard/planner/${stalePlanId}`}>Open draft plan</Link>
            </Button>
          ) : null}
        </div>
      ) : null}

      <SectionCard
        title={data.pack ? data.pack.title : "Role packs"}
        icon={<Wrench className="h-4 w-4" />}
        action={
          <div className="flex flex-wrap gap-1">
            <Button
              size="sm"
              variant={packScope === "" ? "default" : "outline"}
              className="h-7 text-xs"
              onClick={() => setPackScope("")}
            >
              All packs
            </Button>
            {data.packs.map((pack) => (
              <Button
                key={pack.packKey}
                size="sm"
                variant={packScope === pack.packKey ? "default" : "outline"}
                className="h-7 text-xs"
                onClick={() => setPackScope(pack.packKey)}
              >
                {pack.title}
              </Button>
            ))}
          </div>
        }
      >
        {data.pack ? (
          <div className="space-y-2 text-sm">
            {data.pack.method.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Method</span>
                {data.pack.method.map((step, index) => (
                  <span key={step} className="rounded-md bg-muted px-2 py-0.5 text-xs">
                    {index + 1}. {step}
                  </span>
                ))}
              </div>
            ) : null}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Kinds</span>
              {data.pack.registerKinds.map((kind) => (
                <Badge key={kind.key} variant="outline">
                  {kind.label}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">{CREDENTIAL_HINT}</p>
          </div>
        ) : (
          <EmptyNote>
            No role pack is published yet. An admin can author one at{" "}
            <Link href="/admin/packs" className="underline underline-offset-2">
              /admin/packs
            </Link>
            .
          </EmptyNote>
        )}
      </SectionCard>

      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[12rem] flex-1">
          <Label htmlFor="register-q" className="text-xs text-muted-foreground">
            Search
          </Label>
          <Input
            id="register-q"
            value={state.q}
            onChange={(event) => setView({ q: event.target.value })}
            placeholder="Title, kind or a field value"
            className="h-9"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Kind</Label>
          <Select value={state.kind} onValueChange={(value) => setView({ kind: value })}>
            <SelectTrigger className="h-9 w-[10rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All kinds</SelectItem>
              {kinds.map((kind) => (
                <SelectItem key={kind.key} value={kind.key}>
                  {kind.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Status</Label>
          <Select value={state.status} onValueChange={(value) => setView({ status: value as RegisterStatus | "all" })}>
            <SelectTrigger className="h-9 w-[10rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {REGISTER_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {REGISTER_STATUS_LABEL[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Custody</Label>
          <Select
            value={state.custody}
            onValueChange={(value) => setView({ custody: value as RegisterCustody | "all" })}
          >
            <SelectTrigger className="h-9 w-[10rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any custody</SelectItem>
              {REGISTER_CUSTODY.map((custody) => (
                <SelectItem key={custody} value={custody}>
                  {CUSTODY_LABEL[custody]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <label className="flex h-9 items-center gap-2 text-xs">
          <Checkbox checked={state.mine} onCheckedChange={(checked) => setView({ mine: checked === true })} />
          Only mine
        </label>
        <label className="flex h-9 items-center gap-2 text-xs">
          <Checkbox checked={state.stale} onCheckedChange={(checked) => setView({ stale: checked === true })} />
          Only stale
        </label>
        <div className="ml-auto flex gap-1" role="group" aria-label="Register view">
          {REGISTER_VIEWS.map((view) => (
            <Button
              key={view}
              size="sm"
              variant={state.view === view ? "default" : "outline"}
              className="h-9"
              onClick={() => setView({ view: view as RegisterView })}
            >
              {view === "list" ? (
                <ListIcon className="mr-1.5 h-4 w-4" aria-hidden />
              ) : view === "grid" ? (
                <LayoutGrid className="mr-1.5 h-4 w-4" aria-hidden />
              ) : (
                <Columns3 className="mr-1.5 h-4 w-4" aria-hidden />
              )}
              {REGISTER_VIEW_LABEL[view]}
            </Button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <SectionCard title="Nothing here yet" icon={<ShieldCheck className="h-4 w-4" />}>
          <EmptyNote>
            No rows match this view. Add what you are the keeper of — a server, an account, a
            laptop — and say where its credential is kept, never the credential itself.
          </EmptyNote>
        </SectionCard>
      ) : state.view === "list" ? (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>
                <th className="w-10 px-3 py-2">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={() => toggleAll()}
                    aria-label="Select every visible row"
                  />
                </th>
                <th className="px-3 py-2">Item</th>
                <th className="px-3 py-2">Kind</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Check</th>
                <th className="px-3 py-2">Owner</th>
                <th className="px-3 py-2">Last verified</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((row) => (
                <tr key={row.id} className="align-top">
                  <td className="px-3 py-2">
                    <Checkbox
                      checked={selection.includes(row.id)}
                      onCheckedChange={() => toggleSelect(row.id)}
                      aria-label={`Select ${row.title}`}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      className="text-left font-medium hover:underline"
                      onClick={() => openEdit(row)}
                    >
                      {row.title}
                    </button>
                    <RowSummary row={row} />
                    {packScope === "" ? (
                      <p className="text-[11px] text-muted-foreground">{packTitle(row.packKey)}</p>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant="outline">{kindLabel(row.kind)}</Badge>
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="px-3 py-2">
                    <StaleBadge state={row.staleness} />
                  </td>
                  <td className="px-3 py-2 text-xs">{row.ownerName ?? "Unowned"}</td>
                  <td className="px-3 py-2 text-xs">{formatDay(row.lastVerifiedAt)}</td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        disabled={busy || row.status === "disposed"}
                        onClick={() => void verify(row)}
                      >
                        Verify
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => openEdit(row)}
                      >
                        Edit
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : state.view === "grid" ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((row) => (
            <div key={row.id} className="rounded-lg border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <Checkbox
                    checked={selection.includes(row.id)}
                    onCheckedChange={() => toggleSelect(row.id)}
                    aria-label={`Select ${row.title}`}
                  />
                  <div>
                    <button
                      type="button"
                      className="text-left text-sm font-medium hover:underline"
                      onClick={() => openEdit(row)}
                    >
                      {row.title}
                    </button>
                    <RowSummary row={row} />
                  </div>
                </div>
                <Badge variant="outline">{kindLabel(row.kind)}</Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <StatusBadge status={row.status} />
                <StaleBadge state={row.staleness} />
                {row.verifyIntervalDays !== null ? (
                  <Badge variant="outline">Every {row.verifyIntervalDays}d</Badge>
                ) : null}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {row.ownerName ?? "Unowned"} · last checked {formatDay(row.lastVerifiedAt)}
              </p>
              <div className="mt-3 flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  disabled={busy || row.status === "disposed"}
                  onClick={() => void verify(row)}
                >
                  Verify
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => openEdit(row)}>
                  Edit
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {groupRegistersByKind(rows).map((group) => (
            <div key={group.kind} className="rounded-lg border bg-muted/20 p-3">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold">{kindLabel(group.kind)}</h3>
                <Badge variant="outline">{group.rows.length}</Badge>
              </div>
              <div className="space-y-2">
                {group.rows.map((row) => (
                  <div key={row.id} className="rounded-md border bg-card p-2">
                    <div className="flex items-start gap-2">
                      <Checkbox
                        checked={selection.includes(row.id)}
                        onCheckedChange={() => toggleSelect(row.id)}
                        aria-label={`Select ${row.title}`}
                      />
                      <button
                        type="button"
                        className="text-left text-xs font-medium hover:underline"
                        onClick={() => openEdit(row)}
                      >
                        {row.title}
                      </button>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      <StaleBadge state={row.staleness} />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="ml-auto h-6 px-1.5 text-[11px]"
                        disabled={busy || row.status === "disposed"}
                        onClick={() => void verify(row)}
                      >
                        Verify
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {selection.length > 0 ? (
        <div className="sticky bottom-4 z-20 flex flex-wrap items-center gap-2 rounded-lg border bg-card/95 px-3 py-2 shadow-lg backdrop-blur">
          <span className="text-sm tabular-nums">{selection.length} selected</span>
          <Button
            size="sm"
            disabled={busy || !canBulkVerify}
            onClick={() => void bulk({ action: "verify", ids: selection })}
          >
            Verify selected
          </Button>
          {admin ? (
            <Button size="sm" variant="outline" disabled={busy} onClick={() => setReassignOpen(true)}>
              Reassign
            </Button>
          ) : null}
          <Button size="sm" variant="outline" asChild>
            <a href={exportHref} download>
              Export CSV
            </a>
          </Button>
          <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setSelection([])}>
            Clear
          </Button>
        </div>
      ) : null}

      <Dialog open={draft !== null} onOpenChange={(open) => (!open ? setDraft(null) : undefined)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{draft?.id === null ? "New register item" : "Edit register item"}</DialogTitle>
            <DialogDescription>
              Record where a credential is kept and who can authorise it — never the credential
              itself.
            </DialogDescription>
          </DialogHeader>

          {draft ? (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="draft-pack">Role pack</Label>
                  <Select
                    value={draft.packKey}
                    onValueChange={(value) => {
                      const pack = data.packs.find((entry) => entry.packKey === value)
                      setDraft({
                        ...draft,
                        packKey: value,
                        kind: pack?.registerKinds[0]?.key ?? "",
                      })
                    }}
                    disabled={draft.id !== null}
                  >
                    <SelectTrigger id="draft-pack">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {data.packs.map((pack) => (
                        <SelectItem key={pack.packKey} value={pack.packKey}>
                          {pack.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="draft-kind">Kind</Label>
                  <Select
                    value={draft.kind}
                    onValueChange={(value) => setDraft({ ...draft, kind: value })}
                    disabled={draft.id !== null}
                  >
                    <SelectTrigger id="draft-kind">
                      <SelectValue placeholder="Choose a kind" />
                    </SelectTrigger>
                    <SelectContent>
                      {(draftPack?.registerKinds ?? []).map((kind) => (
                        <SelectItem key={kind.key} value={kind.key}>
                          {kind.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="draft-title">Title</Label>
                <Input
                  id="draft-title"
                  value={draft.title}
                  onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                  placeholder="Production database — primary"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="draft-custody">Who can see it</Label>
                  <Select
                    value={draft.custody}
                    onValueChange={(value) => setDraft({ ...draft, custody: value as RegisterCustody })}
                  >
                    <SelectTrigger id="draft-custody">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REGISTER_CUSTODY.map((custody) => (
                        <SelectItem key={custody} value={custody}>
                          {CUSTODY_LABEL[custody]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="draft-interval">Verify every (days)</Label>
                  <Input
                    id="draft-interval"
                    type="number"
                    min={0}
                    max={3650}
                    step={1}
                    value={draft.verifyIntervalDays}
                    onChange={(event) => setDraft({ ...draft, verifyIntervalDays: event.target.value })}
                    placeholder="e.g. 90 — blank means never scheduled"
                  />
                </div>
              </div>

              {admin ? (
                <div>
                  <Label htmlFor="draft-owner">Owner id (blank for unowned)</Label>
                  <Input
                    id="draft-owner"
                    type="number"
                    min={1}
                    step={1}
                    value={draft.ownerId}
                    onChange={(event) => setDraft({ ...draft, ownerId: event.target.value })}
                    placeholder="User id"
                  />
                </div>
              ) : null}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Fields</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => setDraft({ ...draft, fields: [...draft.fields, { key: "", value: "" }] })}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" aria-hidden />
                    Add field
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">{CREDENTIAL_HINT}</p>
                {draft.fields.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No fields yet. Add where it is kept, who authorised it, or its serial number.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {draft.fields.map((pair, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          aria-label="Field name"
                          value={pair.key}
                          onChange={(event) => {
                            const next = [...draft.fields]
                            next[index] = { ...next[index], key: event.target.value }
                            setDraft({ ...draft, fields: next })
                          }}
                          placeholder="Field name"
                          className="w-2/5"
                        />
                        <Input
                          aria-label="Field value"
                          value={pair.value}
                          onChange={(event) => {
                            const next = [...draft.fields]
                            next[index] = { ...next[index], value: event.target.value }
                            setDraft({ ...draft, fields: next })
                          }}
                          placeholder={CREDENTIAL_PLACEHOLDER}
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-9 px-2 text-xs"
                          onClick={() =>
                            setDraft({
                              ...draft,
                              fields: draft.fields.filter((_, position) => position !== index),
                            })
                          }
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {draft.id !== null ? (
                <div className="space-y-2 rounded-md border p-3">
                  <p className="text-xs font-medium">Lifecycle — {REGISTER_STATUS_LABEL[draft.status]}</p>
                  {transitionsFrom(draft.status).length === 0 ? (
                    <p className="text-xs text-muted-foreground">This state is final; it cannot move again.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {transitionsFrom(draft.status).map((transition) => (
                        <Button
                          key={transition.to}
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          disabled={busy || move !== null}
                          onClick={() => {
                            const row = rows.find((entry) => entry.id === draft.id)
                            if (!row) return
                            if (transition.requiresReason) {
                              setMove(transition)
                              setMoveReason("")
                              return
                            }
                            void applyMove(row, transition, "")
                          }}
                        >
                          {transition.label}
                        </Button>
                      ))}
                    </div>
                  )}

                  {move ? (
                    <div className="space-y-2 pt-1">
                      <Label htmlFor="draft-reason">Reason — required to {move.label.toLowerCase()}</Label>
                      <Textarea
                        id="draft-reason"
                        value={moveReason}
                        onChange={(event) => setMoveReason(event.target.value)}
                        placeholder="What happened, and what it means for this item."
                        rows={3}
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setMove(null)
                            setMoveReason("")
                          }}
                        >
                          Cancel move
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          disabled={busy || moveReason.trim() === ""}
                          onClick={() => {
                            const row = rows.find((entry) => entry.id === draft.id)
                            if (row) void applyMove(row, move, moveReason.trim())
                          }}
                        >
                          Confirm move
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDraft(null)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={() => void submitDraft()} disabled={busy}>
              {draft?.id === null ? "Add item" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={reassignOpen} onOpenChange={setReassignOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Reassign {selection.length} rows</DialogTitle>
            <DialogDescription>
              Move ownership in one step. Leave the id blank to unassign them — an unowned org or
              team row then becomes admin-only to change.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="reassign-owner">New owner id</Label>
            <Input
              id="reassign-owner"
              type="number"
              min={1}
              step={1}
              value={reassignOwner}
              onChange={(event) => setReassignOwner(event.target.value)}
              placeholder="Blank means unowned"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReassignOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button
              disabled={busy}
              onClick={() =>
                void bulk({
                  action: "reassign",
                  ids: selection,
                  ownerId: reassignOwner.trim() === "" ? null : Number(reassignOwner),
                })
              }
            >
              Reassign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
