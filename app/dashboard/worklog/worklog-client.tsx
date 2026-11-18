"use client"

// The work log: what a member did, on the day they say they did it. State lives here, the
// URL is the state's serialised form, and every mutation goes through mutate() so a failure
// reads the same wherever it happens.

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import {
  Bot,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Copy,
  FileText,
  Flame,
  Play,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Square,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { SectionCard, FILTER_TRIGGER, DASHBOARD_SECTION_GRID } from "@/components/dashboard-kit"
import { LIVE_REFRESH_MS, useLiveRefresh } from "@/hooks/use-live-refresh"
import { useToast } from "@/hooks/use-toast"
import { localDay, shiftDays } from "@/lib/worklog/local-day"
import { appendMinutes, parseQuickAdd } from "@/lib/worklog/quick-add"
import { previousRange, periodDelta, type PeriodDelta } from "@/lib/worklog/period-delta"
import {
  IDLE_TIMER,
  TIMER_STORAGE_KEY,
  elapsedMs,
  formatClock,
  parseTimer,
  serializeTimer,
  startTimer,
  stopTimer,
  timerMinutes,
  type TimerState,
} from "@/lib/worklog/timer"
import { assistantLink, dayQuestion } from "@/lib/assistant/ask"
import {
  DELIVERABLE_LABEL_STATUS,
  DELIVERABLE_STATUSES,
  KIND_COLOUR,
  KIND_LABEL,
  WORK_LOG_KINDS,
  entriesToCsv,
  formatMinutes,
  type DayBucket,
  type DeliverableDto,
  type DeliverableStatus,
  type EntryDto,
  type WorkLogKind,
} from "@/lib/worklog/entries"
import type { BulkAction } from "@/lib/worklog/bulk"
import { exportLogPdf } from "@/lib/export/pdf"
import { exportLogXlsx } from "@/lib/export/xlsx"
import type { WorklogSummary } from "@/lib/worklog/summary"
import { DISCIPLINE_LABEL, type WorkDiscipline } from "@/lib/roles"
import {
  PRESET_LABEL,
  RANGE_PRESETS,
  VIEW_LABEL,
  WORKLOG_VIEWS,
  adoptServerDay,
  defaultViewState,
  parseViewState,
  resolveRange,
  serializeViewState,
  type RangePreset,
  type ViewState,
  type WorklogView,
} from "@/lib/worklog/view-state"
import { weekStartsOn } from "@/lib/settings/preferences"
import { useSettings } from "@/hooks/use-settings"
import {
  BulkSection,
  CoverageSection,
  DigestDialog,
  DisciplinePicker,
  DisciplineSplitSection,
  DeliverablesSection,
  KindMixSection,
  LogSection,
  TimeByTaskSection,
  TransitionsSection,
} from "./sections"
import {
  ConfirmBulkDelete,
  ConfirmDelete,
  ConfirmDeliverableDelete,
  DeliverableDialog,
  EMPTY_DELIVERABLE,
  EntryDialog,
  toDeliverableDraft,
  toDraft,
  type DeliverableDraft,
  type EntryDraft,
} from "./dialogs"

export type TaskOption = { id: number; title: string }

/** The three work-log endpoints share the `{ success, data | message }` envelope. */
async function readJson(res: Response): Promise<any> {
  return res.json().catch(() => null)
}

export default function WorklogClient() {
  const router = useRouter()
  const search = useSearchParams()
  const { toast } = useToast()
  const { settings } = useSettings()

  // Until the first response arrives, the browser's own zone is the best guess; the server
  // answers with users.timezone and every day label is recomputed from it.
  const [timezone, setTimezone] = useState<string | null>(null)
  const [todayIso, setTodayIso] = useState(() => localDay(new Date(), null))
  // The discipline a new row opens with, decided on the server from what this member last
  // logged, their job title and their onboarding choice. A browser cannot read those.
  const [defaultDiscipline, setDefaultDiscipline] = useState<WorkDiscipline | null>(null)
  useEffect(() => {
    setTodayIso(localDay(new Date(), timezone))
  }, [timezone])

  const [state, setState] = useState<ViewState>(() => defaultViewState(localDay(new Date(), null)))
  const [deliverables, setDeliverables] = useState<DeliverableDto[]>([])
  const [summary, setSummary] = useState<WorklogSummary | null>(null)
  // The equal-length period immediately before this one, for the delta chips; and the last
  // 8 weeks for the coverage strip. Both are readings, not filters — a failed read of either
  // leaves the page itself untouched.
  const [prevSummary, setPrevSummary] = useState<WorklogSummary | null>(null)
  const [activity, setActivity] = useState<DayBucket[]>([])
  const [digestOpen, setDigestOpen] = useState(false)
  const [tasks, setTasks] = useState<TaskOption[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  // Which rows the member has ticked, which row the form is open for, and which row the delete
  // confirmation is standing on. `busy` is the two dialogs' shared "a write is in flight".
  const [selection, setSelection] = useState<number[]>([])
  const [draft, setDraft] = useState<EntryDraft | null>(null)
  const [pendingDelete, setPendingDelete] = useState<EntryDto | null>(null)
  const [pendingBulkDelete, setPendingBulkDelete] = useState(false)
  const [deliverableDraft, setDeliverableDraft] = useState<DeliverableDraft | null>(null)
  const [pendingDeliverableDelete, setPendingDeliverableDelete] = useState<number | null>(null)
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

  const refresh = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true)
    const qs = serializeViewState(state, todayIso)
    // The comparison period is fetched as a list view with a custom range: day/week/heat views
    // follow the navigated day and would ignore the preset, so only "list" honours from/to.
    const prev = previousRange(resolveRange(state, todayIso, weekStartsOn(settings.weekStart)))
    const prevQs = serializeViewState(
      { ...state, view: "list", preset: "custom", from: prev.from, to: prev.to },
      todayIso,
    )
    const activityQs = new URLSearchParams({
      v: "list",
      p: "custom",
      from: shiftDays(todayIso, -55),
      to: todayIso,
    }).toString()
    try {
      const [entriesRes, summaryRes, prevRes, activityRes] = await Promise.all([
        fetch(`/api/worklog/entries?${qs}`),
        fetch(`/api/worklog/summary?${qs}`),
        fetch(`/api/worklog/summary?${prevQs}`),
        fetch(`/api/worklog/summary?${activityQs}`),
      ])
      const entriesJson = await readJson(entriesRes)
      if (!entriesJson?.success) throw new Error(entriesJson?.message ?? "Could not load your work log")
      // The rows arrive with this response and are rendered by the view slot; here only the
      // member's own day and zone are taken, because a browser clock is not the account clock.
      const serverToday = entriesJson.data.today as string
      setTimezone(entriesJson.data.timezone as string | null)
      setTodayIso(serverToday)
      setDefaultDiscipline((entriesJson.data.defaultDiscipline as WorkDiscipline | null) ?? null)
      // A day nobody chose follows the server's clock. Left alone, a stale browser guess would
      // be pinned into the URL as `?day=` the moment todayIso moves. Once the day matches, the
      // updater returns the same object; a new one with the same values re-runs this loader.
      setState((prev) => adoptServerDay(prev, todayIso, serverToday))
      const summaryJson = await readJson(summaryRes)
      if (summaryJson?.success) setSummary(summaryJson.data as WorklogSummary)
      const prevJson = await readJson(prevRes)
      setPrevSummary(prevJson?.success ? (prevJson.data as WorklogSummary) : null)
      const activityJson = await readJson(activityRes)
      setActivity(activityJson?.success ? (activityJson.data as WorklogSummary).days : [])
      const deliverablesJson = await readJson(await fetch("/api/worklog/deliverables"))
      if (deliverablesJson?.success) {
        setDeliverables(deliverablesJson.data.deliverables as DeliverableDto[])
      }
    } catch (error) {
      if (!quiet) toast({ variant: "destructive", title: "Work log", description: (error as Error).message })
    } finally {
      if (!quiet) setLoading(false)
    }
  }, [state, todayIso, toast, settings.weekStart])

  useEffect(() => {
    void refresh()
  }, [refresh])

  // The day, the totals and the deliverables move when a teammate edits their side, so the
  // page re-reads them quietly; a failed background read leaves the rows already on screen.
  useLiveRefresh(() => refresh(true), { intervalMs: LIVE_REFRESH_MS })

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

  // N / T / arrows are page-level shortcuts, so they stand down while a person is typing or
  // while a dialog holds the screen — a shortcut must never eat a character or move the day
  // behind an open form.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target as HTMLElement | null
      if (target?.closest("input, textarea, select, button, a, [contenteditable=true]")) return
      if (document.querySelector('[role="dialog"]')) return
      if (event.key === "n") {
        event.preventDefault()
        document.getElementById("quick-add")?.focus()
      } else if (event.key === "/") {
        event.preventDefault()
        document.getElementById("worklog-search")?.focus()
      } else if (event.key === "ArrowLeft") {
        event.preventDefault()
        patchState({ day: shiftDays(state.day, -1) })
      } else if (event.key === "ArrowRight") {
        event.preventDefault()
        patchState({ day: shiftDays(state.day, 1) })
      } else if (event.key === "t") {
        event.preventDefault()
        patchState({ day: todayIso })
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [patchState, state.day, todayIso])

  // One string for the row-scoped routes, so a PUT and a DELETE cannot drift apart from the POST.
  const mutateBase = "/api/worklog/entries"
  // The bulk route is one path for six actions, so the bar, the row's Convert and the batch
  // delete all post to the same place.
  const bulkUrl = "/api/worklog/entries/bulk"
  const deliverableBase = "/api/worklog/deliverables"

  const range = resolveRange(state, todayIso, weekStartsOn(settings.weekStart))
  // Every body reads the summary's own buckets: the list and the totals above it are the same
  // arithmetic over the same rows, so they cannot disagree with each other.
  const viewDaysList = useMemo(() => summary?.days ?? [], [summary])
  // The bar and the write both act on this list, so what the member reads is what gets sent.
  const selectedEntries = useMemo(
    () => viewDaysList.flatMap((bucket) => bucket.entries).filter((entry) => selection.includes(entry.id)),
    [selection, viewDaysList],
  )
  const selectedIds = useMemo(() => selectedEntries.map((entry) => entry.id), [selectedEntries])
  // The newest row in the range, for the composer's "log again" shortcut.
  const lastEntry = useMemo(() => {
    const all = viewDaysList.flatMap((bucket) => bucket.entries)
    if (all.length === 0) return null
    return [...all].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
  }, [viewDaysList])

  const toggleSelect = useCallback((id: number) => {
    setSelection((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }, [])

  const openEntry = useCallback(
    (entry: EntryDto | null) => {
      // A new row starts on the day the member is looking at, not on the browser's guess of today,
      // and with the discipline they keep working in — an existing row always keeps its own.
      setDraft(toDraft(entry, entry?.workedOn ?? state.day, defaultDiscipline))
    },
    [defaultDiscipline, state.day],
  )

  // A duplicate is a new row pre-filled from an old one: same words, today's date, no id — so
  // saving it can never overwrite the row it was copied from.
  const duplicateEntry = useCallback(
    (entry: EntryDto) => {
      setDraft({ ...toDraft(entry, todayIso, defaultDiscipline), id: null })
    },
    [todayIso, defaultDiscipline],
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
      const error = await mutate(bulkUrl, {
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

  // One handler for the bar's four non-destructive actions. Delete leaves the selection alone and
  // opens the dialog instead: a batch has no undo, so it is the one action asked about twice.
  const applyBulk = useCallback(
    async (action: BulkAction, payload?: Record<string, unknown>) => {
      if (selectedIds.length === 0) return
      if (action === "delete") {
        setPendingBulkDelete(true)
        return
      }
      const count = selectedIds.length
      setBusy(true)
      const error = await mutate(bulkUrl, {
        method: "POST",
        body: JSON.stringify({ action, ids: selectedIds, ...payload }),
      })
      setBusy(false)
      if (error) {
        toast({ variant: "destructive", title: "Bulk action", description: error })
        return
      }
      setSelection([])
      await refresh()
      toast({
        title: "Applied to your log",
        description: `${count} ${count === 1 ? "entry" : "entries"} · ${action.replace("-", " ")}`,
      })
    },
    [mutate, refresh, selectedIds, toast],
  )

  const confirmBulkDelete = useCallback(async () => {
    const count = selectedIds.length
    setBusy(true)
    const error = await mutate(bulkUrl, {
      method: "POST",
      body: JSON.stringify({ action: "delete", ids: selectedIds }),
    })
    setBusy(false)
    if (error) {
      toast({ variant: "destructive", title: "Delete", description: error })
      return
    }
    setSelection([])
    setPendingBulkDelete(false)
    await refresh()
    toast({ title: "Entries deleted", description: `${count} removed from your log` })
  }, [mutate, refresh, selectedIds, toast])

  // Client-side, like the activity export: the file is exactly the rows on screen, so no second
  // query can widen or narrow what the member just looked at.
  const exportCsv = useCallback(() => {
    const csv = entriesToCsv(selectedEntries)
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `jiravision-worklog-${range.from}-${range.to}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    toast({ title: "CSV exported", description: `${selectedEntries.length} entries` })
  }, [range.from, range.to, selectedEntries, toast])

  const exportPdf = useCallback(() => {
    exportLogPdf({
      entries: selectedEntries,
      deliverables,
      from: range.from,
      to: range.to,
      authorName: "You",
    })
    toast({ title: "PDF exported", description: `${selectedEntries.length} entries` })
  }, [range.from, range.to, selectedEntries, deliverables, toast])

  const exportXlsx = useCallback(async () => {
    await exportLogXlsx({
      entries: selectedEntries,
      deliverables,
      from: range.from,
      to: range.to,
      authorName: "You",
    })
    toast({ title: "Excel exported", description: `${selectedEntries.length} entries` })
  }, [range.from, range.to, selectedEntries, deliverables, toast])

  // A deliverable is a noun with its own lifecycle, so it saves through its own route rather than
  // as a side effect of an entry. `producedOn` empty means "not dated", which the server stores
  // as null — same as a link or evidence note nobody filled in.
  const saveDeliverable = useCallback(
    async (value: DeliverableDraft) => {
      const payload = {
        name: value.name.trim(),
        type: value.type,
        status: value.status,
        producedOn: value.producedOn.trim() === "" ? null : value.producedOn,
        link: value.link.trim() === "" ? null : value.link.trim(),
        evidence: value.evidence.trim() === "" ? null : value.evidence,
        taskId: value.taskId === "none" ? null : Number(value.taskId),
        discipline: value.discipline === "all" ? null : value.discipline,
      }
      setBusy(true)
      const error =
        value.id === null
          ? await mutate(deliverableBase, { method: "POST", body: JSON.stringify(payload) })
          : await mutate(`${deliverableBase}/${value.id}`, { method: "PUT", body: JSON.stringify(payload) })
      setBusy(false)
      if (error) {
        toast({ variant: "destructive", title: "Deliverable", description: error })
        return
      }
      setDeliverableDraft(null)
      await refresh()
      toast({
        title: value.id === null ? "Deliverable created" : "Deliverable updated",
        description: payload.name,
      })
    },
    [mutate, refresh, toast],
  )

  const moveDeliverable = useCallback(
    async (d: DeliverableDto, status: DeliverableStatus) => {
      setBusy(true)
      // Only the state travels: the whitelist on the route refuses a jump the lifecycle forbids,
      // so a tab left open since before the last move gets a readable error instead of a bad row.
      const error = await mutate(`${deliverableBase}/${d.id}`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      })
      setBusy(false)
      if (error) {
        toast({ variant: "destructive", title: "Deliverable state", description: error })
        return
      }
      await refresh()
      toast({ title: "Deliverable moved", description: `${d.name} → ${DELIVERABLE_LABEL_STATUS[status]}` })
    },
    [mutate, refresh, toast],
  )

  const deleteDeliverable = useCallback(
    async (id: number) => {
      setBusy(true)
      const error = await mutate(`${deliverableBase}/${id}`, { method: "DELETE" })
      setBusy(false)
      if (error) {
        toast({ variant: "destructive", title: "Delete deliverable", description: error })
        return
      }
      setPendingDeliverableDelete(null)
      await refresh()
      toast({ title: "Deliverable deleted", description: "Its log entries stay in the log." })
    },
    [mutate, refresh, toast],
  )

  const pendingDeliverableName =
    pendingDeliverableDelete === null
      ? null
      : (deliverables.find((d) => d.id === pendingDeliverableDelete)?.name ?? null)

  return (
    <div className="space-y-3">
      <ViewToolbarSection
        state={state}
        patchState={patchState}
        todayIso={todayIso}
        refresh={refresh}
        toast={toast}
        onOpenDigest={() => setDigestOpen(true)}
      />
      <TotalsSection summary={summary} previous={prevSummary} loading={loading} range={range} todayIso={todayIso} />
      <QuickAddSection
        todayIso={todayIso}
        saving={saving}
        setSaving={setSaving}
        mutate={mutate}
        refresh={refresh}
        toast={toast}
        tasks={tasks}
        lastEntry={lastEntry}
      />
      <FilterSection state={state} patchState={patchState} tasks={tasks} deliverableCount={deliverables.length} />
      <div className={`${DASHBOARD_SECTION_GRID} md:grid-cols-2 xl:grid-cols-2`}>
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
          onDuplicate: duplicateEntry,
        }}
        onAddDay={() => openEntry(null)}
      />
      {selectedEntries.length > 0 && (
        <BulkSection
          selected={selectedEntries}
          busy={busy}
          todayIso={todayIso}
          tasks={tasks}
          onApply={applyBulk}
          onExport={exportCsv}
          onExportPdf={exportPdf}
          onExportXlsx={() => void exportXlsx()}
          onClear={() => setSelection([])}
        />
      )}
      <DeliverablesSection
        deliverables={deliverables}
        loading={loading}
        onNew={() =>
          setDeliverableDraft({
            ...EMPTY_DELIVERABLE,
            producedOn: state.day,
            discipline: defaultDiscipline ?? "all",
          })
        }
        onEdit={(d) => setDeliverableDraft(toDeliverableDraft(d, todayIso))}
        onMove={(d, status) => void moveDeliverable(d, status)}
        onDelete={setPendingDeliverableDelete}
      />
      <TransitionsSection transitions={summary?.transitions ?? []} loading={loading} />
      <TimeByTaskSection
        tasks={summary?.tasks ?? []}
        loading={loading}
        totalMinutes={summary?.totals.minutes ?? 0}
      />
      <DisciplineSplitSection
        disciplines={summary?.disciplines ?? []}
        loading={loading}
        totalMinutes={summary?.totals.minutes ?? 0}
      />
      <KindMixSection
        kinds={summary?.kinds ?? []}
        openBlockers={summary?.openBlockers ?? 0}
        totalEntries={summary?.totals.entries ?? 0}
        loading={loading}
      />
      <CoverageSection
        gaps={summary?.gaps ?? []}
        streak={summary?.streak ?? { current: 0, longest: 0 }}
        unlinked={summary?.unlinked ?? 0}
        totals={summary?.totals ?? { entries: 0, minutes: 0, activeDays: 0 }}
        range={range}
        activity={activity}
        loading={loading}
        onPickDay={(day) => patchState({ day, view: "day" })}
      />
      {deliverableDraft !== null ? (
        <DeliverableDialog
          key={deliverableDraft.id ?? "new"}
          draft={deliverableDraft}
          tasks={tasks}
          saving={busy}
          onOpenChange={(open) => {
            if (!open) setDeliverableDraft(null)
          }}
          onSubmit={saveDeliverable}
        />
      ) : null}
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
      <ConfirmDeliverableDelete
        id={pendingDeliverableDelete}
        name={pendingDeliverableName}
        busy={busy}
        onOpenChange={(open) => {
          if (!open) setPendingDeliverableDelete(null)
        }}
        onConfirm={(id) => void deleteDeliverable(id)}
      />
      <ConfirmBulkDelete
        count={selectedEntries.length}
        busy={busy}
        open={pendingBulkDelete}
        onOpenChange={(open) => {
          if (!open) setPendingBulkDelete(false)
        }}
        onConfirm={() => void confirmBulkDelete()}
      />
      <DigestDialog
        open={digestOpen}
        onOpenChange={setDigestOpen}
        summary={summary}
        deliverables={deliverables}
        onCopied={(ok) =>
          toast(
            ok
              ? { title: "Summary copied", description: "Markdown is on your clipboard." }
              : {
                  variant: "destructive",
                  title: "Copy blocked",
                  description: "Select the text in the panel and copy it manually.",
                },
          )
        }
      />
      </div>
    </div>
  )
}

function DeltaChip({ delta }: { delta: PeriodDelta | null }) {
  if (!delta) return null
  const tone =
    delta.direction === "up"
      ? "text-emerald-700 dark:text-emerald-400"
      : delta.direction === "down"
        ? "text-destructive"
        : "text-muted-foreground"
  return (
    <span className={`mt-1 inline-flex items-center gap-1 text-[11px] font-medium ${tone}`}>
      {delta.direction === "up" ? <TrendingUp className="h-3 w-3" aria-hidden /> : null}
      {delta.direction === "down" ? <TrendingDown className="h-3 w-3" aria-hidden /> : null}
      {delta.label}
    </span>
  )
}

function TotalsSection({
  summary,
  previous,
  loading,
  range,
  todayIso,
}: {
  summary: WorklogSummary | null
  previous: WorklogSummary | null
  loading: boolean
  range: { from: string; to: string }
  todayIso: string
}) {
  const todayRows = summary?.days.find((d) => d.day === todayIso)
  const streak = summary?.streak.current ?? 0
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
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Entries</p>
              <p className="mt-1 text-3xl font-semibold tabular-nums">{summary?.totals.entries ?? 0}</p>
              <DeltaChip
                delta={periodDelta(summary?.totals.entries ?? 0, previous ? previous.totals.entries : null, "count")}
              />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Time logged</p>
              <p className="mt-1 text-3xl font-semibold tabular-nums">{formatMinutes(summary?.totals.minutes ?? 0)}</p>
              <DeltaChip
                delta={periodDelta(summary?.totals.minutes ?? 0, previous ? previous.totals.minutes : null, "minutes")}
              />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Active days</p>
              <p className="mt-1 text-3xl font-semibold tabular-nums">{summary?.totals.activeDays ?? 0}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Streak</p>
              <p className="mt-1 flex items-center gap-1.5 text-3xl font-semibold tabular-nums">
                <Flame
                  className={`h-6 w-6 ${streak > 0 ? "text-orange-500" : "text-muted-foreground/40"}`}
                  aria-hidden
                />
                {streak}d
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">longest {summary?.streak.longest ?? 0}d</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Today: {todayRows?.count ?? 0} {todayRows?.count === 1 ? "entry" : "entries"} ·{" "}
            {formatMinutes(todayRows?.minutes ?? 0)}
          </p>
        </div>
      )}
    </SectionCard>
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
  lastEntry,
}: {
  todayIso: string
  saving: boolean
  setSaving: (v: boolean) => void
  mutate: (path: string, init?: RequestInit) => Promise<string | null>
  refresh: () => Promise<void>
  toast: ReturnType<typeof useToast>["toast"]
  tasks: TaskOption[]
  lastEntry: EntryDto | null
}) {
  const [line, setLine] = useState("")
  const [kind, setKind] = useState<WorkLogKind | "auto">("auto")
  const [taskId, setTaskId] = useState("none")
  // The timer is restored in an effect, not in the initialiser: localStorage does not exist on
  // the server, and reading it during render would hydrate a different clock than the markup.
  const [timer, setTimer] = useState<TimerState>(IDLE_TIMER)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    setTimer(parseTimer(window.localStorage.getItem(TIMER_STORAGE_KEY)))
  }, [])
  useEffect(() => {
    if (timer.startedAt === null) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [timer.startedAt])
  const running = timer.startedAt !== null

  const persistTimer = (next: TimerState) => {
    setTimer(next)
    window.localStorage.setItem(TIMER_STORAGE_KEY, serializeTimer(next))
  }

  const toggleTimer = () => {
    if (running) {
      const minutes = timerMinutes(timer, Date.now())
      persistTimer(IDLE_TIMER)
      if (minutes > 0) setLine((prev) => appendMinutes(prev, minutes))
    } else {
      setNow(Date.now())
      persistTimer(startTimer(timer, Date.now()))
    }
  }

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

  const parsed = parseQuickAdd(line)
  const preview =
    line.trim() === ""
      ? "#90 = 90 minutes · #action picks the kind"
      : "error" in parsed
        ? parsed.error
        : `${parsed.title} · ${parsed.minutes === null ? "no time" : formatMinutes(parsed.minutes)} · ${
            KIND_LABEL[kind === "auto" ? parsed.kind : kind]
          }`

  const pill =
    "inline-flex h-7 items-center gap-1.5 rounded-full border border-border/60 px-2.5 text-[11px] transition-colors hover:border-border"

  return (
    <section aria-label="Quick add" className="rounded-xl border border-border/60 bg-card p-3">
      <form
        className="space-y-2"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <div className="flex flex-wrap items-center gap-2">
          <Label htmlFor="quick-add" className="sr-only">
            What did you do?
          </Label>
          <Input
            id="quick-add"
            className="h-10 min-w-52 flex-1"
            placeholder="Fixed the failing build #90 #action  ( N )"
            value={line}
            onChange={(event) => setLine(event.target.value)}
            disabled={saving}
          />
          <Select value={taskId} onValueChange={setTaskId}>
            <SelectTrigger className="h-10 w-full text-xs sm:w-48" aria-label="Link to a task">
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
          <Button
            type="button"
            variant={running ? "default" : "outline"}
            size="sm"
            className="h-10 gap-1.5 px-3 font-mono text-xs tabular-nums"
            aria-label={running ? "Stop timer" : "Start timer"}
            onClick={toggleTimer}
          >
            {running ? <Square className="h-3.5 w-3.5" aria-hidden /> : <Play className="h-3.5 w-3.5" aria-hidden />}
            {formatClock(elapsedMs(timer, now))}
          </Button>
          <Button type="submit" className="h-10" disabled={saving}>
            {saving ? "Saving…" : "Log it"}
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            className={`${pill} ${kind === "auto" ? "border-transparent bg-muted font-medium" : ""}`}
            aria-pressed={kind === "auto"}
            onClick={() => setKind("auto")}
          >
            Auto
          </button>
          {WORK_LOG_KINDS.map((k) => (
            <button
              key={k}
              type="button"
              className={`${pill} ${kind === k ? "border-transparent font-medium" : ""}`}
              style={
                kind === k
                  ? { backgroundColor: `color-mix(in srgb, ${KIND_COLOUR[k]} 15%, transparent)` }
                  : undefined
              }
              aria-pressed={kind === k}
              onClick={() => setKind(k)}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: KIND_COLOUR[k] }} aria-hidden />
              {KIND_LABEL[k]}
            </button>
          ))}
          {lastEntry ? (
            <button
              type="button"
              className={`${pill} text-muted-foreground`}
              onClick={() => setLine(lastEntry.title)}
            >
              Log again: {lastEntry.title.slice(0, 32)}
            </button>
          ) : null}
        </div>
        <p className="text-[11px] text-muted-foreground">{preview}</p>
      </form>
    </section>
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

  // Every active filter is a chip with its own remove button, so narrowing the log never
  // requires opening the popover to find out what is narrowing it.
  const chips = [
    state.kind !== "all"
      ? { key: "kind", label: KIND_LABEL[state.kind], onRemove: () => patchState({ kind: "all" }) }
      : null,
    state.taskId !== null
      ? {
          key: "task",
          label: tasks.find((t) => t.id === state.taskId)?.title.slice(0, 24) ?? `Task ${state.taskId}`,
          onRemove: () => patchState({ taskId: null }),
        }
      : null,
    state.discipline !== "all"
      ? {
          key: "discipline",
          label: DISCIPLINE_LABEL[state.discipline],
          onRemove: () => patchState({ discipline: "all" }),
        }
      : null,
    state.deliverableStatus !== "all"
      ? {
          key: "dstatus",
          label: DELIVERABLE_LABEL_STATUS[state.deliverableStatus],
          onRemove: () => patchState({ deliverableStatus: "all" }),
        }
      : null,
    state.hasDeliverable
      ? { key: "dlv", label: "Linked only", onRemove: () => patchState({ hasDeliverable: false }) }
      : null,
  ].filter((chip): chip is { key: string; label: string; onRemove: () => void } => chip !== null)

  return (
    <section aria-label="Find in the log" className="rounded-xl border border-border/60 bg-card p-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <Search
            className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Label htmlFor="worklog-search" className="sr-only">
            Search titles and notes
          </Label>
          <Input
            id="worklog-search"
            className="h-8 pl-8"
            placeholder="Search titles and notes  ( / )"
            value={state.q}
            onChange={(event) => patchState({ q: event.target.value })}
          />
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
              <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
              Filters
              {active > 0 ? (
                <span className="rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                  {active}
                </span>
              ) : null}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-80 space-y-2">
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
                className="h-8 border border-border text-xs"
                aria-pressed={state.hasDeliverable}
                onClick={() => patchState({ hasDeliverable: !state.hasDeliverable })}
              >
                {state.hasDeliverable ? "Linked only" : "Any deliverable link"}
              </Button>
              <span className="text-[11px] text-muted-foreground">{deliverableCount} deliverables on file</span>
            </div>
            {active > 0 ? (
              <Button variant="ghost" size="sm" className="h-8 w-full border border-border text-xs" onClick={clearAll}>
                Clear all filters
              </Button>
            ) : null}
          </PopoverContent>
        </Popover>
        {chips.map((chip) => (
          <span
            key={chip.key}
            className="inline-flex h-7 items-center gap-1 rounded-full bg-muted px-2.5 text-[11px]"
          >
            {chip.label}
            <button
              type="button"
              className="rounded-full p-0.5 hover:bg-background"
              aria-label={`Remove ${chip.label} filter`}
              onClick={chip.onRemove}
            >
              <X className="h-3 w-3" aria-hidden />
            </button>
          </span>
        ))}
      </div>
    </section>
  )
}

function ViewToolbarSection({
  state,
  patchState,
  todayIso,
  refresh,
  toast,
  onOpenDigest,
}: {
  state: ViewState
  patchState: (patch: Partial<ViewState>) => void
  todayIso: string
  refresh: () => Promise<void>
  toast: ReturnType<typeof useToast>["toast"]
  onOpenDigest: () => void
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
    <div className="sticky top-0 z-30 rounded-xl border border-border/60 bg-card/85 px-3 py-2 shadow-sm backdrop-blur">
      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Log view" className="flex flex-wrap gap-1">
          {WORKLOG_VIEWS.map((v) => (
            <Button
              key={v}
              variant={state.view === v ? "default" : "outline"}
              size="sm"
              className="h-8 border border-border px-2.5 text-xs"
              aria-pressed={state.view === v}
              onClick={() => patchState({ view: v as WorklogView })}
            >
              {VIEW_LABEL[v]}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            title="Previous day (←)"
            onClick={() => patchState({ day: shiftDays(state.day, -1) })}
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
            <span className="sr-only">Previous day</span>
          </Button>
          <span className="min-w-24 text-center text-xs font-medium tabular-nums">{state.day}</span>
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            title="Next day (→)"
            onClick={() => patchState({ day: shiftDays(state.day, 1) })}
          >
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            <span className="sr-only">Next day</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            title="Jump to today (T)"
            onClick={() => patchState({ day: todayIso })}
            disabled={state.day === todayIso}
          >
            Today
          </Button>
        </div>
        <Select value={state.preset} onValueChange={(v) => patchState({ preset: v as RangePreset })}>
          <SelectTrigger className={FILTER_TRIGGER} aria-label="Range preset">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RANGE_PRESETS.map((p) => (
              <SelectItem key={p} value={p}>
                {PRESET_LABEL[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {state.preset === "custom" ? (
          <DateRangePicker
            from={state.from}
            to={state.to}
            onChange={(from, to) => patchState({ from, to })}
            max={todayIso}
            placeholder="Pick a range"
            className={FILTER_TRIGGER}
          />
        ) : null}
        <div className="ml-auto flex items-center gap-1">
          <Button variant="outline" size="sm" className="h-8 gap-1.5 px-2.5 text-xs" onClick={onOpenDigest}>
            <FileText className="h-3.5 w-3.5" aria-hidden />
            Summary
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 border border-border p-0" onClick={() => void refresh()}>
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            <span className="sr-only">Reload</span>
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 border border-border p-0" onClick={() => void copyLink()}>
            <Copy className="h-3.5 w-3.5" aria-hidden />
            <span className="sr-only">Copy link to this view</span>
          </Button>
          {/* The day in the URL is the day the question asks about, so the assistant opens already
              scoped to what the member is looking at. */}
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" asChild>
            <Link href={assistantLink(dayQuestion(state.day))}>
              <Bot className="h-3.5 w-3.5" aria-hidden />
              <span className="sr-only">Ask about this day</span>
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}