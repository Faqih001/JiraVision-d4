"use client"

// The playbook library (design §12 item 5). The API returns only the rows this member may
// read; this file renders them, searches them, and opens a draft against a role pack. It
// never decides visibility, the author, or the version for itself.

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import {
  BookOpenCheck,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Wrench,
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
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
import { EmptyNote, SectionCard } from "@/components/dashboard-kit"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import {
  PLAYBOOK_STATUSES,
  PLAYBOOK_STATUS_LABEL,
  type PlaybookStatus,
} from "@/lib/playbooks/rules"
import { SIX_STEP_METHOD, type PlaybookStep } from "@/lib/playbooks/method"

type PlaybookRow = {
  id: number
  packKey: string
  discipline: string | null
  title: string
  summary: string | null
  scopeKind: string | null
  method: string[]
  steps: PlaybookStep[]
  precautions: string[]
  recommendations: string[]
  tags: string[]
  status: PlaybookStatus
  version: number
  authorId: number | null
  authorName: string | null
  source: string
  aiMarked: boolean
  lastVerifiedAt: string | null
  verifyIntervalDays: number | null
  updatedAt: string
}

type PackSummary = {
  packKey: string
  title: string
  method: string[]
}

type PlaybooksPayload = {
  playbooks: PlaybookRow[]
  packs: PackSummary[]
  admin: boolean
  today: string
}

type ViewState = { q: string; status: PlaybookStatus | "all"; pack: string }

type CreateDraft = {
  packKey: string
  title: string
  summary: string
  method: string
  tags: string
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

function StatusBadge({ status }: { status: PlaybookStatus }) {
  const variant = status === "published" ? "default" : status === "archived" ? "outline" : "secondary"
  return <Badge variant={variant}>{PLAYBOOK_STATUS_LABEL[status]}</Badge>
}

function formatDay(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleDateString()
}

export function PlaybooksSkeleton() {
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

export default function PlaybooksClient() {
  const router = useRouter()
  const search = useSearchParams()
  const { toast } = useToast()

  const [state, setState] = useState<ViewState>(() => ({
    q: search.get("q") ?? "",
    status: (search.get("status") as PlaybookStatus | null) ?? "all",
    pack: search.get("pack") ?? "",
  }))
  const [data, setData] = useState<PlaybooksPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [paletteQuery, setPaletteQuery] = useState("")
  const [create, setCreate] = useState<CreateDraft | null>(null)

  useEffect(() => {
    setState({
      q: search.get("q") ?? "",
      status: (search.get("status") as PlaybookStatus | null) ?? "all",
      pack: search.get("pack") ?? "",
    })
  }, [search])

  const query = useMemo(() => {
    const params = new URLSearchParams()
    if (state.q) params.set("q", state.q)
    if (state.status !== "all") params.set("status", state.status)
    if (state.pack) params.set("pack", state.pack)
    return params.toString()
  }, [state])

  useEffect(() => {
    const current = window.location.search.replace(/^\?/u, "")
    if (query === current) return
    router.replace(query ? `/dashboard/playbooks?${query}` : "/dashboard/playbooks", {
      scroll: false,
    })
  }, [query, router])

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/playbooks?${query}`)
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) {
        throw new Error(json?.error ?? json?.message ?? `Request failed (${res.status})`)
      }
      setData(json.data as PlaybooksPayload)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [query])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setPaletteOpen(true)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const rows = useMemo(() => data?.playbooks ?? [], [data])

  const matches = useMemo(() => {
    const needle = paletteQuery.trim().toLowerCase()
    if (!needle) return rows
    return rows.filter((row) =>
      [row.title, row.summary ?? "", row.tags.join(" "), ...row.steps.map((step) => step.action)]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    )
  }, [rows, paletteQuery])

  const packTitle = useCallback(
    (key: string) => data?.packs.find((pack) => pack.packKey === key)?.title ?? key,
    [data],
  )

  const openCreate = useCallback(() => {
    const pack = data?.packs[0]
    if (!pack) {
      toast({
        variant: "destructive",
        title: "No role pack",
        description: "An admin needs to publish a role pack before a playbook can be written.",
      })
      return
    }
    setCreate({
      packKey: pack.packKey,
      title: "",
      summary: "",
      method: pack.method.join("\n"),
      tags: "",
    })
  }, [data, toast])

  const submitCreate = useCallback(async () => {
    if (!create) return
    if (!create.title.trim()) {
      toast({ variant: "destructive", title: "A title is required" })
      return
    }
    const method = create.method
      .split("\n")
      .map((phase) => phase.trim())
      .filter(Boolean)
    if (method.length === 0) {
      toast({ variant: "destructive", title: "The method needs at least one phase" })
      return
    }

    setBusy(true)
    const result = await send(
      "/api/playbooks",
      jsonInit("POST", {
        packKey: create.packKey,
        title: create.title,
        summary: create.summary,
        method,
        tags: create.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      }),
    )
    setBusy(false)

    if (result.error) {
      toast({ variant: "destructive", title: "Playbook", description: result.error })
      return
    }
    const id = result.json?.data?.playbook?.id as number | undefined
    setCreate(null)
    if (typeof id === "number") router.push(`/dashboard/playbooks/${id}`)
    else await refresh()
  }, [create, refresh, router, toast])

  if (loading && !data) return <PlaybooksSkeleton />

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

  return (
    <div className="space-y-4 p-4 md:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <BookOpenCheck className="h-5 w-5" aria-hidden />
            Playbooks
          </h1>
          <p className="text-sm text-muted-foreground">
            The ways this company does a job, written down once and followed every time.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => setPaletteOpen(true)}>
            <Search className="mr-1.5 h-4 w-4" aria-hidden />
            Search
          </Button>
          <Button size="sm" variant="outline" onClick={() => void refresh()} disabled={loading || busy}>
            <RefreshCw className={cn("mr-1.5 h-4 w-4", loading && "animate-spin")} aria-hidden />
            Refresh
          </Button>
          <Button size="sm" onClick={openCreate} disabled={busy}>
            <Plus className="mr-1.5 h-4 w-4" aria-hidden />
            New playbook
          </Button>
        </div>
      </header>

      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[12rem] flex-1">
          <Label htmlFor="playbook-q" className="text-xs text-muted-foreground">
            Search
          </Label>
          <Input
            id="playbook-q"
            value={state.q}
            onChange={(event) => setState((prev) => ({ ...prev, q: event.target.value }))}
            placeholder="Title, summary, tag or step"
            className="h-9"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Status</Label>
          <Select
            value={state.status}
            onValueChange={(value) =>
              setState((prev) => ({ ...prev, status: value as PlaybookStatus | "all" }))
            }
          >
            <SelectTrigger className="h-9 w-[10rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {PLAYBOOK_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {PLAYBOOK_STATUS_LABEL[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Role pack</Label>
          <Select
            value={state.pack === "" ? "all" : state.pack}
            onValueChange={(value) =>
              setState((prev) => ({ ...prev, pack: value === "all" ? "" : value }))
            }
          >
            <SelectTrigger className="h-9 w-[12rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All packs</SelectItem>
              {data.packs.map((pack) => (
                <SelectItem key={pack.packKey} value={pack.packKey}>
                  {pack.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <span className="ml-auto rounded-md bg-muted px-2 py-1 text-xs tabular-nums">
          {rows.length} visible
        </span>
      </div>

      {rows.length === 0 ? (
        <SectionCard title="Nothing written yet" icon={<BookOpenCheck className="h-4 w-4" />}>
          <div className="space-y-3">
            <EmptyNote>
              No playbook matches this view. A new one starts from its role pack&apos;s method, or
              from the six-step default: {SIX_STEP_METHOD.join(" → ")}.
            </EmptyNote>
            <div className="flex justify-center">
              <Button size="sm" onClick={openCreate} disabled={busy}>
                <Plus className="mr-1.5 h-4 w-4" aria-hidden />
                Start the first playbook
              </Button>
            </div>
          </div>
        </SectionCard>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((row) => (
            <div key={row.id} className="flex flex-col rounded-lg border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={`/dashboard/playbooks/${row.id}`}
                  className="text-sm font-semibold hover:underline"
                >
                  {row.title}
                </Link>
                <StatusBadge status={row.status} />
              </div>
              {row.summary ? (
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{row.summary}</p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge variant="outline">v{row.version}</Badge>
                <Badge variant="outline">
                  {row.steps.length} {row.steps.length === 1 ? "step" : "steps"}
                </Badge>
                <Badge variant="outline">{packTitle(row.packKey)}</Badge>
                {row.aiMarked ? (
                  <Badge variant="secondary">
                    <Sparkles className="mr-1 h-3 w-3" aria-hidden />
                    Model draft
                  </Badge>
                ) : null}
              </div>
              {row.tags.length > 0 ? (
                <p className="mt-2 truncate text-[11px] text-muted-foreground">
                  {row.tags.map((tag) => `#${tag}`).join(" ")}
                </p>
              ) : null}
              <div className="mt-auto flex items-center justify-between pt-3 text-[11px] text-muted-foreground">
                <span>{row.authorName ?? "Unknown author"}</span>
                <span>updated {formatDay(row.updatedAt)}</span>
              </div>
              <div className="mt-2 flex gap-1">
                <Button size="sm" variant="outline" className="h-7 text-xs" asChild>
                  <Link href={`/dashboard/playbooks/${row.id}`}>Open</Link>
                </Button>
                {row.status === "published" ? (
                  <Button size="sm" variant="ghost" className="h-7 text-xs" asChild>
                    <Link href={`/dashboard/playbooks/${row.id}/run`}>Run</Link>
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      <CommandDialog open={paletteOpen} onOpenChange={setPaletteOpen}>
        <CommandInput
          placeholder="Search titles, summaries, tags and steps…"
          value={paletteQuery}
          onValueChange={setPaletteQuery}
        />
        <CommandList>
          <CommandEmpty>No playbook matches that.</CommandEmpty>
          <CommandGroup heading="Playbooks">
            {matches.map((row) => (
              <CommandItem
                key={row.id}
                value={[
                  row.title,
                  row.summary ?? "",
                  row.tags.join(" "),
                  ...row.steps.map((step) => step.action),
                ].join(" ")}
                onSelect={() => {
                  setPaletteOpen(false)
                  router.push(`/dashboard/playbooks/${row.id}`)
                }}
              >
                <BookOpenCheck className="mr-2 h-4 w-4" aria-hidden />
                <span className="flex-1 truncate">{row.title}</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {PLAYBOOK_STATUS_LABEL[row.status]} · v{row.version}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      <Dialog open={create !== null} onOpenChange={(open) => (!open ? setCreate(null) : undefined)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>New playbook</DialogTitle>
            <DialogDescription>
              It opens as a draft only you can read. Publishing is a separate, deliberate step.
            </DialogDescription>
          </DialogHeader>

          {create ? (
            <div className="space-y-3">
              <div>
                <Label htmlFor="create-pack">Role pack</Label>
                <Select
                  value={create.packKey}
                  onValueChange={(value) => {
                    const pack = data.packs.find((entry) => entry.packKey === value)
                    setCreate({
                      ...create,
                      packKey: value,
                      method: pack?.method.join("\n") ?? create.method,
                    })
                  }}
                >
                  <SelectTrigger id="create-pack">
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
                <Label htmlFor="create-title">Title</Label>
                <Input
                  id="create-title"
                  value={create.title}
                  onChange={(event) => setCreate({ ...create, title: event.target.value })}
                  placeholder="Replace a failed drive in the rack"
                />
              </div>

              <div>
                <Label htmlFor="create-summary">Summary</Label>
                <Textarea
                  id="create-summary"
                  rows={2}
                  value={create.summary}
                  onChange={(event) => setCreate({ ...create, summary: event.target.value })}
                  placeholder="When this applies and what it produces."
                />
              </div>

              <div>
                <Label htmlFor="create-method">Method — one phase per line</Label>
                <Textarea
                  id="create-method"
                  rows={6}
                  value={create.method}
                  onChange={(event) => setCreate({ ...create, method: event.target.value })}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  <Wrench className="mr-1 inline h-3 w-3" aria-hidden />
                  Starts from the pack&apos;s method. Without one, use {SIX_STEP_METHOD.join(" → ")}.
                </p>
              </div>

              <div>
                <Label htmlFor="create-tags">Tags — comma separated</Label>
                <Input
                  id="create-tags"
                  value={create.tags}
                  onChange={(event) => setCreate({ ...create, tags: event.target.value })}
                  placeholder="hardware, networking"
                />
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreate(null)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={() => void submitCreate()} disabled={busy}>
              Open draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
