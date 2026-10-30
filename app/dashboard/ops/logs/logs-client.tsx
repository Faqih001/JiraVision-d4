"use client"

// The member activity log workspace (operations engine, D3). The pack's opsConfig declares the
// log entities and, per entity, the exact fields (name, type, required, enum values) a row must
// carry. This page reads that schema, lists the rows the member logged, and edits them through a
// form generated from the same schema — nothing is hardcoded per discipline, and nothing is
// invented: an entry only ever holds fields the pack actually declared.

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import {
  ClipboardList,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import type { FieldType } from "@/lib/packs/ops/types"

type LogFieldDef = {
  type: FieldType
  label: string
  required?: boolean
  default?: string | number
  values?: string[]
}

type LogEntityDef = {
  label: string
  fields: Record<string, LogFieldDef>
}

type PackInfo = {
  packKey: string | null
  hasOpsConfig: boolean
  discipline: string | null
  logs: Record<string, LogEntityDef> | null
}

type OpsEntry = {
  id: number
  packKey: string
  entityKey: string
  ownerId: number
  occurredAt: string
  status: string | null
  fields: Record<string, unknown>
  source: string
  createdAt: string
}

type EntryDraft = {
  id: number | null
  occurredAt: string // datetime-local "YYYY-MM-DDTHH:mm"
  status: string
  fields: Record<string, string>
}

const NONE = "__none__"

function nowLocalInput(): string {
  const now = new Date()
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

function todayInput(): string {
  return nowLocalInput().slice(0, 10)
}

function formatWhen(value: string | null | undefined): string {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

function fieldValueText(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—"
  if (typeof value === "boolean") return value ? "Yes" : "No"
  return String(value)
}

export function LogsSkeleton() {
  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-9 w-32" />
      </div>
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}

export default function LogsClient() {
  const router = useRouter()
  const search = useSearchParams()
  const { toast } = useToast()

  const [pack, setPack] = useState<PackInfo | null>(null)
  const [activeEntity, setActiveEntity] = useState<string>("")
  const [entries, setEntries] = useState<OpsEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [listLoading, setListLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [draft, setDraft] = useState<EntryDraft | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<OpsEntry | null>(null)

  const entities = useMemo(
    () => (pack?.logs ? Object.entries(pack.logs).map(([key, def]) => ({ key, ...def })) : []),
    [pack],
  )

  const activeDef = useMemo(
    () => entities.find((entity) => entity.key === activeEntity) ?? null,
    [entities, activeEntity],
  )

  const loadPack = useCallback(async () => {
    setError(null)
    try {
      const res = await fetch("/api/ops/pack")
      if (!res.ok) throw new Error("Could not load your operations pack.")
      const json = await res.json()
      const data = json.data as PackInfo
      setPack(data)

      const keys = data.logs ? Object.keys(data.logs) : []
      if (keys.length === 0) {
        setLoading(false)
        return
      }
      const wanted = search.get("entity")
      const initial = wanted && keys.includes(wanted) ? wanted : keys[0]
      setActiveEntity((prev) => (prev && keys.includes(prev) ? prev : initial))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load operations data.")
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    void loadPack()
  }, [loadPack])

  const loadEntries = useCallback(async () => {
    const packKey = pack?.packKey
    if (!packKey || !activeEntity) return
    setListLoading(true)
    try {
      const res = await fetch(
        `/api/ops/entries?pack=${encodeURIComponent(packKey)}&entity=${encodeURIComponent(activeEntity)}`,
      )
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) {
        throw new Error(json?.message ?? json?.error ?? `Request failed (${res.status})`)
      }
      setEntries((json.data?.entries as OpsEntry[]) ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load entries.")
    } finally {
      setListLoading(false)
    }
  }, [pack?.packKey, activeEntity])

  useEffect(() => {
    void loadEntries()
  }, [loadEntries])

  useLiveRefresh(() => void loadEntries(), { intervalMs: LIVE_REFRESH_MS })

  // Keep the URL's entity param in sync so recommendation links are shareable.
  useEffect(() => {
    if (!activeEntity) return
    const current = search.get("entity") ?? ""
    if (current === activeEntity) return
    const params = new URLSearchParams(search.toString())
    params.set("entity", activeEntity)
    router.replace(`/dashboard/ops/logs?${params.toString()}`, { scroll: false })
  }, [activeEntity, search, router])

  const openCreate = useCallback(() => {
    if (!activeDef) return
    const fields: Record<string, string> = {}
    for (const [name, def] of Object.entries(activeDef.fields)) {
      fields[name] = def.default !== undefined ? String(def.default) : def.type === "date" ? todayInput() : ""
    }
    setDraft({ id: null, occurredAt: nowLocalInput(), status: "", fields })
  }, [activeDef])

  const openEdit = useCallback((entry: OpsEntry) => {
    if (!activeDef) return
    const fields: Record<string, string> = {}
    for (const [name, def] of Object.entries(activeDef.fields)) {
      const raw = entry.fields[name]
      fields[name] =
        raw === null || raw === undefined
          ? def.default !== undefined
            ? String(def.default)
            : ""
          : String(raw)
    }
    const local = new Date(entry.occurredAt)
    const occurredAt = Number.isNaN(local.getTime())
      ? nowLocalInput()
      : new Date(local.getTime() - local.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
    setDraft({ id: entry.id, occurredAt, status: entry.status ?? "", fields })
  }, [activeDef])

  const setField = useCallback((name: string, value: string) => {
    setDraft((prev) => (prev ? { ...prev, fields: { ...prev.fields, [name]: value } } : prev))
  }, [])

  const submitDraft = useCallback(async () => {
    if (!draft || !pack?.packKey || !activeDef) return
    const fields: Record<string, unknown> = {}
    for (const [name, def] of Object.entries(activeDef.fields)) {
      const value = draft.fields[name] ?? ""
      if (value === "") continue
      fields[name] = def.type === "number" ? Number(value) : value
    }

    const occurredAtIso = new Date(draft.occurredAt).toISOString()
    const body = {
      occurredAt: occurredAtIso,
      status: draft.status.trim() ? draft.status.trim() : null,
      fields,
    }

    setBusy(true)
    let errorMessage: string | null = null
    try {
      const res =
        draft.id === null
          ? await fetch("/api/ops/entries", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ packKey: pack.packKey, entityKey: activeDef.key, ...body }),
            })
          : await fetch(`/api/ops/entries/${draft.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) {
        errorMessage = json?.message ?? json?.error ?? `Request failed (${res.status})`
      }
    } catch (err) {
      errorMessage = (err as Error).message
    }
    setBusy(false)

    if (errorMessage) {
      toast({ variant: "destructive", title: "Log entry", description: errorMessage })
      return
    }
    setDraft(null)
    await loadEntries()
    toast({
      title: draft.id === null ? "Entry logged" : "Entry updated",
      description: activeDef.label,
    })
  }, [draft, pack, activeDef, loadEntries, toast])

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return
    setBusy(true)
    let errorMessage: string | null = null
    try {
      const res = await fetch(`/api/ops/entries/${deleteTarget.id}`, { method: "DELETE" })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) errorMessage = json?.message ?? `Request failed (${res.status})`
    } catch (err) {
      errorMessage = (err as Error).message
    }
    setBusy(false)
    if (errorMessage) {
      toast({ variant: "destructive", title: "Delete entry", description: errorMessage })
      return
    }
    setDeleteTarget(null)
    await loadEntries()
    toast({ title: "Entry deleted" })
  }, [deleteTarget, loadEntries, toast])

  if (loading) return <LogsSkeleton />

  if (error && !pack) {
    return (
      <div className="p-4 md:p-6">
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between gap-3">
            <span>{error}</span>
            <Button size="sm" variant="outline" onClick={() => void loadPack()}>
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!pack?.hasOpsConfig || !pack?.packKey || entities.length === 0) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <h1 className="text-2xl font-bold">Activity logs</h1>
        <SectionCard title="No operations configured" icon={<ClipboardList className="h-4 w-4" />}>
          <EmptyNote>
            Your role pack has no operations configuration yet, so there are no activity logs to
            record.{" "}
            <Link href="/dashboard/ops" className="underline underline-offset-2">
              Back to operations overview
            </Link>
            .
          </EmptyNote>
        </SectionCard>
      </div>
    )
  }

  const fieldNames = activeDef ? Object.keys(activeDef.fields) : []

  return (
    <div className="space-y-4 p-4 md:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <ClipboardList className="h-5 w-5" aria-hidden />
            Activity logs
          </h1>
          <p className="text-sm text-muted-foreground">
            {pack.discipline ? pack.discipline : "Your"} operations &middot; record each activity the
            way your role pack defines it.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => void loadEntries()} disabled={listLoading || busy}>
            <RefreshCw className={cn("mr-1.5 h-4 w-4", listLoading && "animate-spin")} aria-hidden />
            Refresh
          </Button>
          <Button size="sm" onClick={openCreate} disabled={busy || !activeDef}>
            <Plus className="mr-1.5 h-4 w-4" aria-hidden />
            Log entry
          </Button>
        </div>
      </header>

      <div className="flex flex-wrap gap-1" role="tablist" aria-label="Activity log entities">
        {entities.map((entity) => (
          <Button
            key={entity.key}
            role="tab"
            aria-selected={entity.key === activeEntity}
            size="sm"
            variant={entity.key === activeEntity ? "default" : "outline"}
            className="h-8 text-xs"
            onClick={() => setActiveEntity(entity.key)}
          >
            {entity.label}
          </Button>
        ))}
      </div>

      {activeDef ? (
        <SectionCard
          title={activeDef.label}
          icon={<ClipboardList className="h-4 w-4" />}
          action={<Badge variant="outline">{entries.length} entries</Badge>}
        >
          {listLoading && entries.length === 0 ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <EmptyNote>
              Nothing logged under {activeDef.label} yet. Use "Log entry" to record the first one.
            </EmptyNote>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">When</th>
                    <th className="px-3 py-2">State</th>
                    {fieldNames.map((name) => (
                      <th key={name} className="px-3 py-2">
                        {activeDef.fields[name].label}
                      </th>
                    ))}
                    <th className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {entries.map((entry) => (
                    <tr key={entry.id} className="align-top">
                      <td className="whitespace-nowrap px-3 py-2 text-xs">{formatWhen(entry.occurredAt)}</td>
                      <td className="px-3 py-2 text-xs">{entry.status ?? "—"}</td>
                      {fieldNames.map((name) => (
                        <td key={name} className="max-w-[16rem] truncate px-3 py-2 text-xs">
                          {fieldValueText(entry.fields[name])}
                        </td>
                      ))}
                      <td className="px-3 py-2">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => openEdit(entry)}>
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-destructive"
                            disabled={busy}
                            onClick={() => setDeleteTarget(entry)}
                            aria-label="Delete entry"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      ) : null}

      <Dialog open={draft !== null} onOpenChange={(open) => (!open ? setDraft(null) : undefined)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {draft?.id === null ? `Log ${activeDef?.label ?? "entry"}` : `Edit ${activeDef?.label ?? "entry"}`}
            </DialogTitle>
            <DialogDescription>
              Fill in what your role pack defines for this activity. Required fields must have a value.
            </DialogDescription>
          </DialogHeader>

          {draft && activeDef ? (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="draft-occurred">When</Label>
                  <Input
                    id="draft-occurred"
                    type="datetime-local"
                    value={draft.occurredAt}
                    onChange={(event) => setDraft({ ...draft, occurredAt: event.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="draft-state">State (optional)</Label>
                  <Input
                    id="draft-state"
                    value={draft.status}
                    onChange={(event) => setDraft({ ...draft, status: event.target.value })}
                    placeholder="e.g. Resolved"
                  />
                </div>
              </div>

              {fieldNames.map((name) => {
                const def = activeDef.fields[name]
                const id = `field-${name}`
                const value = draft.fields[name] ?? ""
                return (
                  <div key={name} className="space-y-1.5">
                    <Label htmlFor={id}>
                      {def.label}
                      {def.required ? <span className="text-destructive"> *</span> : null}
                    </Label>
                    {def.type === "text" ? (
                      <Textarea
                        id={id}
                        value={value}
                        rows={3}
                        onChange={(event) => setField(name, event.target.value)}
                      />
                    ) : def.type === "enum" ? (
                      <Select
                        value={value || NONE}
                        onValueChange={(next) => setField(name, next === NONE ? "" : next)}
                      >
                        <SelectTrigger id={id}>
                          <SelectValue placeholder="Choose" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE}>— none —</SelectItem>
                          {(def.values ?? []).map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : def.type === "number" ? (
                      <Input
                        id={id}
                        type="number"
                        step="any"
                        value={value}
                        onChange={(event) => setField(name, event.target.value)}
                      />
                    ) : def.type === "date" ? (
                      <Input
                        id={id}
                        type="date"
                        value={value}
                        onChange={(event) => setField(name, event.target.value)}
                      />
                    ) : def.type === "datetime" ? (
                      <Input
                        id={id}
                        type="datetime-local"
                        value={value}
                        onChange={(event) => setField(name, event.target.value)}
                      />
                    ) : (
                      <Input
                        id={id}
                        value={value}
                        maxLength={200}
                        onChange={(event) => setField(name, event.target.value)}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDraft(null)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={() => void submitDraft()} disabled={busy}>
              {draft?.id === null ? "Log entry" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteTarget !== null} onOpenChange={(open) => (!open ? setDeleteTarget(null) : undefined)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete this entry?</DialogTitle>
            <DialogDescription>
              This removes the logged activity. It cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void confirmDelete()} disabled={busy}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
