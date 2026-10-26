"use client"

// The work log: what a member did, on the day they say they did it. State lives here, the
// URL is the state's serialised form, and every mutation goes through mutate() so a failure
// reads the same wherever it happens.

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Copy,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
  Timer,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { SectionCard } from "@/components/dashboard-kit"
import { useToast } from "@/hooks/use-toast"
import { localDay, shiftDays } from "@/lib/worklog/local-day"
import { parseQuickAdd } from "@/lib/worklog/quick-add"
import {
  DELIVERABLE_LABEL_STATUS,
  DELIVERABLE_STATUSES,
  KIND_LABEL,
  WORK_LOG_KINDS,
  formatMinutes,
  type DeliverableDto,
  type DeliverableStatus,
  type EntryDto,
  type WorkLogKind,
} from "@/lib/worklog/entries"
import type { WorklogSummary } from "@/lib/worklog/summary"
import {
  PRESET_LABEL,
  RANGE_PRESETS,
  VIEW_LABEL,
  WORKLOG_VIEWS,
  defaultViewState,
  parseViewState,
  resolveRange,
  serializeViewState,
  type ViewState,
  type WorklogView,
} from "@/lib/worklog/view-state"
import { DisciplinePicker, LogSection } from "./sections"
import { ConfirmDelete, EntryDialog, toDraft, type EntryDraft } from "./dialogs"

export type TaskOption = { id: number; title: string }

/** The three work-log endpoints share the `{ success, data | message }` envelope. */
async function readJson(res: Response): Promise<any> {
  return res.json().catch(() => null)
}

export default function WorklogClient() {
  const router = useRouter()
  const search = useSearchParams()
  const { toast } = useToast()

  // Until the first response arrives, the browser's own zone is the best guess; the server
  // answers with users.timezone and every day label is recomputed from it.
  const [timezone, setTimezone] = useState<string | null>(null)
  const [todayIso, setTodayIso] = useState(() => localDay(new Date(), null))
  useEffect(() => {
    setTodayIso(localDay(new Date(), timezone))
  }, [timezone])

  const [state, setState] = useState<ViewState>(() => defaultViewState(localDay(new Date(), null)))
  const [deliverables, setDeliverables] = useState<DeliverableDto[]>([])
  const [summary, setSummary] = useState<WorklogSummary | null>(null)
  const [tasks, setTasks] = useState<TaskOption[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  // Which rows the member has ticked, which row the form is open for, and which row the delete
  // confirmation is standing on. `busy` is the two dialogs' shared "a write is in flight".
  const [selection, setSelection] = useState<number[]>([])
  const [draft, setDraft] = useState<EntryDraft | null>(null)
  const [pendingDelete, setPendingDelete] = useState<EntryDto | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const incoming = search.toString()
    const parsed = parseViewState(new URLSearchParams(incoming), todayIso)
    // Two views of the same thing are equal only when they serialise the same way, so the
    // comparison is made against this client's own state rather than against the query string.
    setState((prev) =>
      serializeViewState(parsed, todayIso) !== serializeViewState(prev, todayIso) ? parsed : prev,
    )
  }, [search, todayIso])

  useEffect(() => {
    const next = serializeViewState(state, todayIso)
    const target = next ? `/dashboard/worklog?${next}` : "/dashboard/worklog"
    // location.search keeps its leading `?` and serializeViewState does not, so the two are
    // compared after the strip — otherwise every render rewrites the URL and re-runs this effect.
    const current = window.location.search.replace(/^\?/u, "")
    if (next !== current) router.replace(target, { scroll: false })
  }, [state, todayIso, router])

  const mutate = useCallback(async (path: string, init?: RequestInit): Promise<string | null> => {
    try {
      const res = await fetch(path, init)
      const json = await readJson(res)
      if (!res.ok || !json?.success) return json?.message ?? `Request failed (${res.status})`
      return null
    } catch (error) {
      return (error as Error).message
    }
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    const qs = serializeViewState(state, todayIso)
    try {
      const [entriesRes, summaryRes] = await Promise.all([
        fetch(`/api/worklog/entries?${qs}`),
        fetch(`/api/worklog/summary?${qs}`),
      ])
      const entriesJson = await readJson(entriesRes)
      if (!entriesJson?.success) throw new Error(entriesJson?.message ?? "Could not load your work log")
      // The rows arrive with this response and are rendered by the view slot; here only the
      // member's own day and zone are taken, because a browser clock is not the account clock.
      const serverToday = entriesJson.data.today as string
      setTimezone(entriesJson.data.timezone as string | null)
      setTodayIso(serverToday)
      // A day nobody chose follows the server's clock. Left alone, a stale browser guess would
      // be pinned into the URL as `?day=` the moment todayIso moves.
      setState((prev) => (prev.day === todayIso ? { ...prev, day: serverToday } : prev))
      const summaryJson = await readJson(summaryRes)
      if (summaryJson?.success) setSummary(summaryJson.data as WorklogSummary)
      const deliverablesJson = await readJson(await fetch("/api/worklog/deliverables"))
      if (deliverablesJson?.success) {
        setDeliverables(deliverablesJson.data.deliverables as DeliverableDto[])
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Work log", description: (error as Error).message })
    } finally {
      setLoading(false)
    }
  }, [state, todayIso, toast])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    fetch("/api/tasks?pageSize=200")
      .then(readJson)
      .then((json) => {
        if (!json?.success) return
        setTasks((json.data as { id: number; title: string }[]).map((t) => ({ id: t.id, title: t.title })))
      })
      .catch(() => {
        /* the task filter offers nothing; every other control still works */
      })
  }, [])

  const patchState = useCallback(
    (patch: Partial<ViewState>) => setState((prev) => ({ ...prev, ...patch })),
    [],
  )

  // One string for the row-scoped routes, so a PUT and a DELETE cannot drift apart from the POST.
  const mutateBase = "/api/worklog/entries"

  const toggleSelect = useCallback((id: number) => {
    setSelection((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }, [])

  const openEntry = useCallback(
    (entry: EntryDto | null) => {
      // A new row starts on the day the member is looking at, not on the browser's guess of today.
      setDraft(toDraft(entry, entry?.workedOn ?? state.day))
    },
    [state.day],
  )

  const submitEntry = useCallback(
    async (value: EntryDraft) => {
      setBusy(true)
      const minutes = value.minutes.trim()
      const payload = {
        title: value.title.trim(),
        body: value.body.trim() === "" ? null : value.body,
        workedOn: value.workedOn,
        minutes: minutes === "" ? null : Number(minutes),
        kind: value.kind,
        discipline: value.discipline === "all" ? null : value.discipline,
        taskId: value.taskId === "none" ? null : Number(value.taskId),
        deliverableId: value.deliverableId === "none" ? null : Number(value.deliverableId),
      }
      const error =
        value.id === null
          ? await mutate(mutateBase, { method: "POST", body: JSON.stringify(payload) })
          : await mutate(`${mutateBase}/${value.id}`, { method: "PUT", body: JSON.stringify(payload) })
      setBusy(false)
      if (error) {
        toast({ variant: "destructive", title: "Work log", description: error })
        return
      }
      setDraft(null)
      await refresh()
      toast({ title: value.id === null ? "Logged" : "Entry updated", description: payload.title })
    },
    [mutate, refresh, toast],
  )

  const deleteEntry = useCallback(
    async (entry: EntryDto) => {
      setBusy(true)
      const error = await mutate(`${mutateBase}/${entry.id}`, { method: "DELETE" })
      setBusy(false)
      if (error) {
        toast({ variant: "destructive", title: "Work log", description: error })
        return
      }
      setPendingDelete(null)
      setSelection((prev) => prev.filter((id) => id !== entry.id))
      await refresh()
      toast({ title: "Entry deleted", description: entry.title })
    },
    [mutate, refresh, toast],
  )

  // Only the bulk endpoint turns a row into a deliverable and links it in one transaction; the
  // single-row PUT cannot create the deliverable first.
  const convertEntry = useCallback(
    async (entry: EntryDto) => {
      setBusy(true)
      const error = await mutate("/api/worklog/entries/bulk", {
        method: "POST",
        body: JSON.stringify({ action: "convert-deliverable", ids: [entry.id] }),
      })
      setBusy(false)
      if (error) {
        toast({ variant: "destructive", title: "Convert to deliverable", description: error })
        return
      }
      setSelection((prev) => prev.filter((id) => id !== entry.id))
      await refresh()
      toast({ title: "Deliverable created", description: `From "${entry.title}"` })
    },
    [mutate, refresh, toast],
  )

  const range = resolveRange(state, todayIso)
  // Every body reads the summary's own buckets: the list and the totals above it are the same
  // arithmetic over the same rows, so they cannot disagree with each other.
  const viewDaysList = useMemo(() => summary?.days ?? [], [summary])

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <TotalsSection summary={summary} loading={loading} range={range} todayIso={todayIso} />
      <QuickAddSection
        todayIso={todayIso}
        saving={saving}
        setSaving={setSaving}
        mutate={mutate}
        refresh={refresh}
        toast={toast}
        tasks={tasks}
      />
      <FilterSection state={state} patchState={patchState} tasks={tasks} deliverableCount={deliverables.length} />
      <ViewToolbarSection
        state={state}
        patchState={patchState}
        todayIso={todayIso}
        refresh={refresh}
        toast={toast}
      />
      <LogSection
        view={state.view}
        days={viewDaysList}
        loading={loading}
        // The Day view shows the day the member navigated to; week and heat keep their "is this
        // today" highlight on the member's real day.
        todayIso={state.view === "day" ? state.day : todayIso}
        onPickDay={(day) => patchState({ day, view: "day" })}
        actions={{
          selection,
          onToggle: toggleSelect,
          onEdit: openEntry,
          onDelete: setPendingDelete,
          onConvert: (entry) => void convertEntry(entry),
        }}
        onAddDay={() => openEntry(null)}
      />
      {draft !== null ? (
        <EntryDialog
          key={draft.id ?? "new"}
          draft={draft}
          todayIso={todayIso}
          tasks={tasks}
          deliverables={deliverables}
          saving={busy}
          onOpenChange={(open) => {
            if (!open) setDraft(null)
          }}
          onSubmit={submitEntry}
        />
      ) : null}
      <ConfirmDelete
        entry={pendingDelete}
        busy={busy}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null)
        }}
        onConfirm={(entry) => void deleteEntry(entry)}
      />
    </div>
  )
}

function TotalsSection({
  summary,
  loading,
  range,
  todayIso,
}: {
  summary: WorklogSummary | null
  loading: boolean
  range: { from: string; to: string }
  todayIso: string
}) {
  const todayRows = summary?.days.find((d) => d.day === todayIso)
  return (
    <SectionCard
      title="This period"
      icon={<CalendarDays className="h-4 w-4" />}
      action={
        <span className="text-[11px] text-muted-foreground">
          {range.from === range.to ? range.from : `${range.from} → ${range.to}`}
        </span>
      }
    >
      {loading && !summary ? (
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Entries" value={String(summary?.totals.entries ?? 0)} />
            <Stat label="Time logged" value={formatMinutes(summary?.totals.minutes ?? 0)} />
            <Stat label="Active days" value={String(summary?.totals.activeDays ?? 0)} />
            <Stat label="Longest streak" value={`${summary?.streak.longest ?? 0}d`} />
          </div>
          <p className="text-xs text-muted-foreground">
            Today: {todayRows?.count ?? 0} {todayRows?.count === 1 ? "entry" : "entries"} ·{" "}
            {formatMinutes(todayRows?.minutes ?? 0)} · current streak {summary?.streak.current ?? 0} day
            {(summary?.streak.current ?? 0) === 1 ? "" : "s"}
          </p>
        </div>
      )}
    </SectionCard>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/40 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
    </div>
  )
}

function QuickAddSection({
  todayIso,
  saving,
  setSaving,
  mutate,
  refresh,
  toast,
  tasks,
}: {
  todayIso: string
  saving: boolean
  setSaving: (v: boolean) => void
  mutate: (path: string, init?: RequestInit) => Promise<string | null>
  refresh: () => Promise<void>
  toast: ReturnType<typeof useToast>["toast"]
  tasks: TaskOption[]
}) {
  const [line, setLine] = useState("")
  const [kind, setKind] = useState<WorkLogKind | "auto">("auto")
  const [taskId, setTaskId] = useState("none")

  const submit = async () => {
    const parsed = parseQuickAdd(line)
    if ("error" in parsed) {
      toast({ variant: "destructive", title: "Quick add", description: parsed.error })
      return
    }
    setSaving(true)
    const body = {
      workedOn: todayIso,
      title: parsed.title,
      minutes: parsed.minutes,
      kind: kind === "auto" ? parsed.kind : kind,
      taskId: taskId === "none" ? null : Number(taskId),
    }
    const error = await mutate("/api/worklog/entries", { method: "POST", body: JSON.stringify(body) })
    setSaving(false)
    if (error) {
      toast({ variant: "destructive", title: "Quick add", description: error })
      return
    }
    setLine("")
    await refresh()
    toast({ title: "Logged", description: body.title })
  }

  return (
    <SectionCard title="Quick add" icon={<Sparkles className="h-4 w-4" />}>
      <form
        className="space-y-2"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <Label htmlFor="quick-add" className="sr-only">
          What did you do?
        </Label>
        <Input
          id="quick-add"
          placeholder="Fixed the failing build #90 #action"
          value={line}
          onChange={(event) => setLine(event.target.value)}
          disabled={saving}
        />
        <div className="grid grid-cols-2 gap-2">
          <Select value={taskId} onValueChange={setTaskId}>
            <SelectTrigger className="h-8 text-xs" aria-label="Link to a task">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No task — a standalone line</SelectItem>
              {tasks.map((t) => (
                <SelectItem key={t.id} value={String(t.id)}>
                  {t.title.slice(0, 40)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={kind} onValueChange={(v) => setKind(v as WorkLogKind | "auto")}>
            <SelectTrigger className="h-8 text-xs" aria-label="Kind for this line">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Kind from tags</SelectItem>
              {WORK_LOG_KINDS.map((k) => (
                <SelectItem key={k} value={k}>
                  {KIND_LABEL[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-muted-foreground">
            <Timer className="mr-1 inline h-3 w-3" aria-hidden />
            #90 = 90 minutes
          </span>
          <Button type="submit" size="sm" disabled={saving}>
            {saving ? "Saving…" : "Log it"}
          </Button>
        </div>
      </form>
    </SectionCard>
  )
}

function FilterSection({
  state,
  patchState,
  tasks,
  deliverableCount,
}: {
  state: ViewState
  patchState: (patch: Partial<ViewState>) => void
  tasks: TaskOption[]
  deliverableCount: number
}) {
  const active =
    (state.q.trim() ? 1 : 0) +
    (state.kind !== "all" ? 1 : 0) +
    (state.discipline !== "all" ? 1 : 0) +
    (state.taskId !== null ? 1 : 0) +
    (state.deliverableStatus !== "all" ? 1 : 0) +
    (state.hasDeliverable ? 1 : 0)

  const clearAll = () =>
    patchState({
      q: "",
      kind: "all",
      discipline: "all",
      taskId: null,
      deliverableStatus: "all",
      hasDeliverable: false,
    })

  return (
    <SectionCard
      title="Find in the log"
      icon={<SlidersHorizontal className="h-4 w-4" />}
      action={
        active > 0 ? (
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={clearAll}>
            Clear {active}
          </Button>
        ) : null
      }
    >
      <div className="space-y-2">
        <Label htmlFor="worklog-search" className="sr-only">
          Search titles and notes
        </Label>
        <Input
          id="worklog-search"
          placeholder="Search titles and notes"
          value={state.q}
          onChange={(event) => patchState({ q: event.target.value })}
        />
        <div className="grid grid-cols-2 gap-2">
          <Select value={state.kind} onValueChange={(v) => patchState({ kind: v as WorkLogKind | "all" })}>
            <SelectTrigger className="h-8 text-xs" aria-label="Entry kind">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All kinds</SelectItem>
              {WORK_LOG_KINDS.map((k) => (
                <SelectItem key={k} value={k}>
                  {KIND_LABEL[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={state.taskId === null ? "all" : String(state.taskId)}
            onValueChange={(v) => patchState({ taskId: v === "all" ? null : Number(v) })}
          >
            <SelectTrigger className="h-8 text-xs" aria-label="Task">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any task</SelectItem>
              {tasks.map((t) => (
                <SelectItem key={t.id} value={String(t.id)}>
                  {t.title.slice(0, 40)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={state.deliverableStatus}
            onValueChange={(v) => patchState({ deliverableStatus: v as DeliverableStatus | "all" })}
          >
            <SelectTrigger className="h-8 text-xs" aria-label="Deliverable state">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any deliverable state</SelectItem>
              {DELIVERABLE_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {DELIVERABLE_LABEL_STATUS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DisciplinePicker value={state.discipline} onChange={(d) => patchState({ discipline: d })} />
        </div>
        <div className="flex items-center justify-between gap-2">
          <Button
            variant={state.hasDeliverable ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs"
            aria-pressed={state.hasDeliverable}
            onClick={() => patchState({ hasDeliverable: !state.hasDeliverable })}
          >
            {state.hasDeliverable ? "Linked only" : "Any deliverable link"}
          </Button>
          <span className="text-[11px] text-muted-foreground">{deliverableCount} deliverables on file</span>
        </div>
      </div>
    </SectionCard>
  )
}

function ViewToolbarSection({
  state,
  patchState,
  todayIso,
  refresh,
  toast,
}: {
  state: ViewState
  patchState: (patch: Partial<ViewState>) => void
  todayIso: string
  refresh: () => Promise<void>
  toast: ReturnType<typeof useToast>["toast"]
}) {
  const copyLink = async () => {
    const url = window.location.href
    try {
      await navigator.clipboard.writeText(url)
      toast({ title: "Link copied", description: "This view opens exactly here." })
    } catch {
      // A browser that blocks the clipboard still gets the link, and it is never lost.
      window.prompt("Copy this view's link", url)
    }
  }

  return (
    <SectionCard
      title="View"
      icon={<CalendarDays className="h-4 w-4" />}
      action={
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => void refresh()}>
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            <span className="sr-only">Reload</span>
          </Button>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => void copyLink()}>
            <Copy className="h-3.5 w-3.5" aria-hidden />
            <span className="sr-only">Copy link to this view</span>
          </Button>
        </div>
      }
    >
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1">
          {WORKLOG_VIEWS.map((v) => (
            <Button
              key={v}
              variant={state.view === v ? "default" : "outline"}
              size="sm"
              className="h-7 px-2 text-xs"
              aria-pressed={state.view === v}
              onClick={() => patchState({ view: v as WorklogView })}
            >
              {VIEW_LABEL[v]}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => patchState({ day: shiftDays(state.day, -1) })}
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
            <span className="sr-only">Previous day</span>
          </Button>
          <span className="min-w-24 text-center text-xs font-medium tabular-nums">{state.day}</span>
          <Button
            variant="outline"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => patchState({ day: shiftDays(state.day, 1) })}
          >
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            <span className="sr-only">Next day</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => patchState({ day: todayIso })}
            disabled={state.day === todayIso}
          >
            Today
          </Button>
        </div>
        <div className="flex flex-wrap gap-1">
          {RANGE_PRESETS.map((p) => (
            <Button
              key={p}
              variant={state.preset === p ? "secondary" : "ghost"}
              size="sm"
              className="h-6 px-2 text-[11px]"
              aria-pressed={state.preset === p}
              onClick={() => patchState({ preset: p })}
            >
              {PRESET_LABEL[p]}
            </Button>
          ))}
        </div>
        {state.preset === "custom" ? (
          <div className="flex items-center gap-2">
            <Input
              type="date"
              className="h-8 w-40 text-xs"
              value={state.from ?? ""}
              max={todayIso}
              onChange={(event) => patchState({ from: event.target.value || null })}
            />
            <span className="text-xs text-muted-foreground">to</span>
            <Input
              type="date"
              className="h-8 w-40 text-xs"
              value={state.to ?? ""}
              max={todayIso}
              onChange={(event) => patchState({ to: event.target.value || null })}
            />
          </div>
        ) : null}
      </div>
    </SectionCard>
  )
}
