"use client"

// Presentation only: no fetch and no page data. The client owns the data, this file owns the
// look, so a section can be restyled without touching a mutation path. The one piece of local
// state here is the discipline group in `DisciplinePicker`, which is a way of finding a value
// among 75 options and is deliberately never sent anywhere.

import { useState } from "react"
import {
  ArrowRight,
  CalendarCheck2,
  CalendarDays,
  ChartPie,
  Download,
  ExternalLink,
  FileStack,
  FolderKanban,
  GitBranch,
  Link2,
  Pencil,
  Plus,
  Shapes,
  Timer,
  Trash2,
  X,
} from "lucide-react"
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { EmptyNote, SectionCard } from "@/components/dashboard-kit"
import { rangeDays } from "@/lib/worklog/local-day"
import {
  DELIVERABLE_LABEL,
  DELIVERABLE_LABEL_STATUS,
  DELIVERABLE_NEXT,
  KIND_COLOUR,
  KIND_LABEL,
  WORK_LOG_KINDS,
  formatMinutes,
  minutesTotal,
  type DayBucket,
  type DeliverableDto,
  type DeliverableStatus,
  type DisciplineBucket,
  type EntryDto,
  type KindBucket,
  type TaskBucket,
  type WorkLogKind,
} from "@/lib/worklog/entries"
import { BULK_SETTABLE_KINDS, type BulkAction } from "@/lib/worklog/bulk"
import type { TransitionDto } from "@/lib/worklog/summary"
import { VIEW_LABEL, type ViewState, type WorklogView } from "@/lib/worklog/view-state"
import {
  DISCIPLINE_CATEGORIES,
  DISCIPLINE_CATEGORY,
  DISCIPLINE_CATEGORY_LABEL,
  DISCIPLINE_COLOUR,
  DISCIPLINE_LABEL,
  disciplinesInCategory,
  type DisciplineCategory,
} from "@/lib/roles"
import type { TaskOption } from "./worklog-client"

// A select cannot hold an empty string — radix reads that as "nothing chosen" and shows its
// placeholder instead of the label — so "no value" needs a word. `"all"` is already taken here for
// *every* discipline, which is the opposite of none.
const NONE = "none"

// The cards that render in every view, in the order the page puts them. `LogSection` and the bulk
// bar are absent on purpose: their headings come from `VIEW_LABEL[view]` and from the selection
// count, so they have no fixed string to declare. Nothing here reads the array at runtime — it
// exists so the page guard can compare the declared inventory with the cards, which a count of
// `<SectionCard`s cannot do.
export const SECTION_TITLES = [
  "This period",
  "Quick add",
  "Find in the log",
  "View",
  "Deliverables",
  "Status changes",
  "Time by task",
  "Where the time went",
  "Mix of work",
  "Coverage",
] as const

export function WorklogSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} className="h-40 rounded-xl" />
      ))}
    </div>
  )
}

// The series colour rides as a dot, never as the text: a --chart-* token is 3:1 against its
// surface by design (WCAG 1.4.11, for bars and lanes), which is not the 4.5:1 an 11px word needs.
export function KindBadge({ kind }: { kind: WorkLogKind }) {
  return (
    <Badge
      variant="outline"
      className="gap-1.5 border-transparent text-[10px] font-semibold uppercase tracking-wide"
      style={{ backgroundColor: `color-mix(in srgb, ${KIND_COLOUR[kind]} 15%, transparent)` }}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: KIND_COLOUR[kind] }} aria-hidden />
      {KIND_LABEL[kind]}
    </Badge>
  )
}

export function EntryLine({
  entry,
  selected = false,
  onToggle,
  onEdit,
  onDelete,
  onConvert,
}: {
  entry: EntryDto
  selected?: boolean
  // Every action is optional: a view that has no handlers renders a row with no checkbox and
  // no buttons, so an unwired control can never reach a member's screen.
  onToggle?: (id: number) => void
  onEdit?: (entry: EntryDto) => void
  onDelete?: (entry: EntryDto) => void
  onConvert?: (entry: EntryDto) => void
}) {
  return (
    <li className="flex items-start gap-3 rounded-lg border border-border/60 bg-card p-3">
      {onToggle ? (
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 accent-[hsl(var(--chart-pine))]"
          checked={selected}
          aria-label={`Select ${entry.title}`}
          onChange={() => onToggle(entry.id)}
        />
      ) : null}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <KindBadge kind={entry.kind} />
          <span className="text-sm font-medium leading-snug">{entry.title}</span>
        </div>
        {entry.body ? <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">{entry.body}</p> : null}
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-3 w-3" aria-hidden />
            {entry.workedOn}
          </span>
          <span>{entry.minutes === null ? "no time" : formatMinutes(entry.minutes)}</span>
          {entry.taskTitle ? (
            <a href={`/dashboard/tasks?task=${entry.taskId}`} className="underline underline-offset-2 hover:text-foreground">
              {entry.taskTitle}
            </a>
          ) : (
            <span>unlinked</span>
          )}
          {entry.deliverableId ? <span>· deliverable #{entry.deliverableId}</span> : null}
          {entry.redatedAt ? <span title={entry.redatedAt}>· re-dated</span> : null}
        </div>
      </div>
      {onEdit ? (
        <div className="flex shrink-0 gap-1">
          <button type="button" className="rounded p-1 text-xs underline underline-offset-2 hover:bg-muted" onClick={() => onEdit(entry)}>
            Edit
          </button>
          {onConvert && entry.kind !== "deliverable" && entry.deliverableId === null ? (
            <button type="button" className="rounded p-1 text-xs underline underline-offset-2 hover:bg-muted" onClick={() => onConvert(entry)}>
              To deliverable
            </button>
          ) : null}
          {onDelete ? (
            <button
              type="button"
              className="rounded p-1 text-xs text-destructive underline underline-offset-2 hover:bg-muted"
              onClick={() => onDelete(entry)}
            >
              Delete
            </button>
          ) : null}
        </div>
      ) : null}
    </li>
  )
}

// Seventy-five disciplines will not fit a readable dropdown, so the group comes first: the
// category narrows the list below it and is never itself a filter — the URL carries one
// `discipline` param, which is what the API reads.
export function DisciplinePicker({
  value,
  onChange,
  compact = false,
}: {
  value: ViewState["discipline"]
  onChange: (discipline: ViewState["discipline"]) => void
  // The filter sits directly in a grid, so the picker must not add a box around the two selects;
  // the dialog wants them side by side inside its own column. Only the spacing differs.
  compact?: boolean
}) {
  const [group, setGroup] = useState<DisciplineCategory | "all">(
    value === "all" ? "all" : DISCIPLINE_CATEGORY[value],
  )

  const options = group === "all" ? [] : disciplinesInCategory(group)

  const pickGroup = (next: DisciplineCategory | "all") => {
    setGroup(next)
    // Staying on a discipline that just left the list would show one filter and send another.
    if (value !== "all" && DISCIPLINE_CATEGORY[value] !== next) onChange("all")
  }

  return (
    <div className={compact ? "grid gap-2 sm:grid-cols-2" : "contents"}>
      <Select value={group} onValueChange={(v) => pickGroup(v as DisciplineCategory | "all")}>
        <SelectTrigger className="h-8 text-xs" aria-label="Discipline group">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All groups</SelectItem>
          {DISCIPLINE_CATEGORIES.map((category) => (
            <SelectItem key={category} value={category}>
              {DISCIPLINE_CATEGORY_LABEL[category]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={value}
        onValueChange={(v) => onChange(v as ViewState["discipline"])}
        disabled={group === "all"}
      >
        <SelectTrigger className="h-8 text-xs" aria-label="Work discipline">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">
            {group === "all" ? "Pick a group first" : "Any discipline in this group"}
          </SelectItem>
          {options.map((discipline) => (
            <SelectItem key={discipline} value={discipline}>
              {DISCIPLINE_LABEL[discipline]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

// One object, so a new body cannot forget one of the five controls and every body hands the same
// set down. Every field is optional: a view that passes nothing renders rows with no checkbox and
// no buttons, which is how the week and heat views stay read-only.
type RowActions = {
  selection?: number[]
  onToggle?: (id: number) => void
  onEdit?: (entry: EntryDto) => void
  onDelete?: (entry: EntryDto) => void
  onConvert?: (entry: EntryDto) => void
}

function RowList({
  entries,
  actions,
  className = "space-y-2",
}: {
  entries: EntryDto[]
  actions: RowActions
  className?: string
}) {
  return (
    <ul className={className}>
      {entries.map((entry) => (
        <EntryLine
          key={entry.id}
          entry={entry}
          selected={actions.selection?.includes(entry.id) ?? false}
          onToggle={actions.onToggle}
          onEdit={actions.onEdit}
          onDelete={actions.onDelete}
          onConvert={actions.onConvert}
        />
      ))}
    </ul>
  )
}

function DayList({ entries, actions }: { entries: EntryDto[]; actions: RowActions }) {
  if (entries.length === 0) {
    return <EmptyNote>Nothing logged on this day yet. Quick add above, or Add an entry at the top of this card.</EmptyNote>
  }
  return <RowList entries={entries} actions={actions} />
}

function DayBody({ days, day, actions }: { days: DayBucket[]; day: string; actions: RowActions }) {
  const bucket = days.find((d) => d.day === day)
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        {day} · {bucket?.count ?? 0} {(bucket?.count ?? 0) === 1 ? "entry" : "entries"} ·{" "}
        {formatMinutes(bucket?.minutes ?? 0)}
      </p>
      <DayList entries={bucket?.entries ?? []} actions={actions} />
    </div>
  )
}

function WeekBody({
  days,
  loading,
  onPickDay,
}: {
  days: DayBucket[]
  loading: boolean
  onPickDay: (day: string) => void
}) {
  const week = days.slice(0, 7)
  if (!loading && week.every((bucket) => bucket.count === 0)) {
    return <EmptyNote>Nothing logged in this week. Nothing to move — try another week.</EmptyNote>
  }
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-7">
      {week.map((bucket) => (
        <div key={bucket.day} className="rounded-lg border border-border/60 bg-background/40 p-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 w-full justify-between px-1 text-[11px] font-semibold"
            onClick={() => onPickDay(bucket.day)}
          >
            <span>{bucket.day.slice(5)}</span>
            <span className="tabular-nums text-muted-foreground">
              {bucket.count} · {formatMinutes(bucket.minutes)}
            </span>
          </Button>
          <ul className="mt-1 space-y-1">
            {bucket.entries.slice(0, 3).map((entry) => (
              <li key={entry.id} className="truncate text-[11px]" title={entry.title}>
                {entry.title}
              </li>
            ))}
            {bucket.entries.length > 3 ? (
              // Plain text, not a link: the day it would open is already one click away in the
              // header above, and a second control for the same thing is noise.
              <li className="text-[11px] text-muted-foreground">+{bucket.entries.length - 3} more</li>
            ) : null}
          </ul>
        </div>
      ))}
    </div>
  )
}

function ListBody({ days, actions }: { days: DayBucket[]; actions: RowActions }) {
  const filled = days.filter((bucket) => bucket.count > 0)
  if (filled.length === 0) {
    return <EmptyNote>Nothing logged in this range. Widen it in View, or clear a filter.</EmptyNote>
  }
  return (
    <div className="space-y-3">
      {filled.map((bucket) => (
        <div key={bucket.day}>
          <div className="flex items-baseline justify-between gap-2">
            <h4 className="text-xs font-semibold tabular-nums">{bucket.day}</h4>
            <span className="text-[11px] text-muted-foreground">
              {bucket.count} entries · {formatMinutes(bucket.minutes)}
            </span>
          </div>
          <RowList entries={bucket.entries} actions={actions} className="mt-1.5 space-y-2" />
        </div>
      ))}
    </div>
  )
}

function BoardBody({ days, actions }: { days: DayBucket[]; actions: RowActions }) {
  const entries = days.flatMap((bucket) => bucket.entries)
  const kinds = WORK_LOG_KINDS.map((kind) => ({
    kind,
    rows: entries.filter((entry) => entry.kind === kind),
  }))
  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {kinds.map(({ kind, rows }) => (
        <div key={kind} className="rounded-lg border border-border/60 bg-background/40 p-2">
          <div className="flex items-center justify-between gap-2">
            <KindBadge kind={kind} />
            <span className="text-[11px] tabular-nums text-muted-foreground">
              {rows.length} · {formatMinutes(minutesTotal(rows))}
            </span>
          </div>
          {rows.length === 0 ? (
            <p className="mt-2 text-[11px] text-muted-foreground">No {KIND_LABEL[kind].toLowerCase()} logged.</p>
          ) : (
            <RowList entries={rows} actions={actions} className="mt-2 space-y-2" />
          )}
        </div>
      ))}
    </div>
  )
}

function HeatBody({
  days,
  todayIso,
  onPickDay,
}: {
  days: DayBucket[]
  todayIso: string
  onPickDay: (day: string) => void
}) {
  const busiest = Math.max(1, ...days.map((bucket) => bucket.minutes))
  return (
    <div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((bucket) => {
          const ratio = bucket.minutes / busiest
          return (
            <button
              key={bucket.day}
              type="button"
              onClick={() => onPickDay(bucket.day)}
              title={`${bucket.day} · ${bucket.count} entries · ${formatMinutes(bucket.minutes)}`}
              className={
                "flex h-9 flex-col items-center justify-center rounded border border-border/60 text-[10px] tabular-nums transition-colors hover:border-foreground " +
                (bucket.day === todayIso ? "outline outline-1 outline-offset-1" : "")
              }
              style={{
                // The number is the reading; the tint is only a hint, so a colour-blind member
                // still sees the difference between an empty day and a six-hour one.
                backgroundColor:
                  bucket.count === 0
                    ? "transparent"
                    : `color-mix(in srgb, hsl(var(--chart-pine)) ${Math.round(12 + ratio * 55)}%, transparent)`,
              }}
            >
              <span>{Number(bucket.day.slice(8))}</span>
              <span className={bucket.count === 0 ? "text-muted-foreground" : "font-semibold"}>{bucket.count}</span>
            </button>
          )
        })}
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        {days.length} days shown · click a day to open it. The number is entries logged.
      </p>
    </div>
  )
}

export function LogSection({
  view,
  days,
  loading,
  todayIso,
  onPickDay,
  actions,
  onAddDay,
}: {
  view: WorklogView
  days: DayBucket[]
  loading: boolean
  todayIso: string
  onPickDay: (day: string) => void
  actions: RowActions
  onAddDay: () => void
}) {
  const body = (() => {
    switch (view) {
      case "day":
        return <DayBody days={days} day={todayIso} actions={actions} />
      case "week":
        return <WeekBody days={days} loading={loading} onPickDay={onPickDay} />
      case "list":
        return <ListBody days={days} actions={actions} />
      case "board":
        return <BoardBody days={days} actions={actions} />
      case "heat":
        return <HeatBody days={days} todayIso={todayIso} onPickDay={onPickDay} />
    }
  })()

  return (
    <SectionCard
      title={`${VIEW_LABEL[view]} view`}
      icon={<CalendarDays className="h-4 w-4" />}
      className="md:col-span-2 xl:col-span-3"
      action={
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onAddDay}>
          <Plus className="h-3.5 w-3.5" aria-hidden />
          Add an entry
        </Button>
      }
    >
      {loading && days.length === 0 ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      ) : (
        body
      )}
    </SectionCard>
  )
}

// The bar exists only while a selection exists, so the client mounts it conditionally and this
// component never renders an empty state. `BULK_SETTABLE_KINDS` is the reader's own list: a
// Reclassify button for `time` or `deliverable` could only ever toast an error, because those two
// need a companion field that differs per row.
export function BulkSection({
  selected,
  busy,
  todayIso,
  tasks,
  onApply,
  onExport,
  onClear,
}: {
  selected: EntryDto[]
  busy: boolean
  todayIso: string
  tasks: TaskOption[]
  onApply: (action: BulkAction, payload?: Record<string, unknown>) => void
  onExport: () => void
  onClear: () => void
}) {
  const [taskId, setTaskId] = useState(NONE)
  const [kind, setKind] = useState<WorkLogKind>(BULK_SETTABLE_KINDS[0])
  const [workedOn, setWorkedOn] = useState(todayIso)

  return (
    <SectionCard
      title={`Selected — ${selected.length} ${selected.length === 1 ? "entry" : "entries"}`}
      icon={<FileStack className="h-4 w-4" />}
      className="md:col-span-2 xl:col-span-3"
      action={
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onClear} disabled={busy}>
          <X className="h-3.5 w-3.5" aria-hidden />
          Clear
        </Button>
      }
    >
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <Label htmlFor="bulk-task" className="text-[11px]">
            Move to task
          </Label>
          <Select value={taskId} onValueChange={setTaskId} disabled={busy}>
            <SelectTrigger id="bulk-task" className="h-8 w-44 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Unlink from any task</SelectItem>
              {tasks.map((task) => (
                <SelectItem key={task.id} value={String(task.id)}>
                  {task.title.slice(0, 44)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="bulk-kind" className="text-[11px]">
            Reclassify as
          </Label>
          <Select
            value={kind}
            onValueChange={(value) => setKind(value as WorkLogKind)}
            disabled={busy}
          >
            <SelectTrigger id="bulk-kind" className="h-8 w-36 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BULK_SETTABLE_KINDS.map((option) => (
                <SelectItem key={option} value={option}>
                  {KIND_LABEL[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="bulk-date" className="text-[11px]">
            Re-date to
          </Label>
          <Input
            id="bulk-date"
            type="date"
            value={workedOn}
            max={todayIso}
            onChange={(event) => setWorkedOn(event.target.value)}
            className="h-8 w-40 text-xs"
            disabled={busy}
          />
        </div>

        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          disabled={busy}
          onClick={() => onApply("set-task", { taskId: taskId === NONE ? null : Number(taskId) })}
        >
          <Link2 className="h-3.5 w-3.5" aria-hidden />
          Move
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          disabled={busy}
          onClick={() => onApply("set-kind", { kind })}
        >
          Reclassify
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          disabled={busy}
          onClick={() => onApply("re-date", { workedOn })}
        >
          Re-date
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          disabled={busy}
          onClick={() => onApply("convert-deliverable")}
        >
          To deliverables
        </Button>
        <Button variant="outline" size="sm" className="h-8 text-xs" disabled={busy} onClick={onExport}>
          <Download className="h-3.5 w-3.5" aria-hidden />
          Export CSV
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs text-destructive hover:text-destructive"
          disabled={busy}
          onClick={() => onApply("delete")}
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
          Delete
        </Button>
        <span className="text-[11px] text-muted-foreground">
          {formatMinutes(minutesTotal(selected))} in the selection
        </span>
      </div>
    </SectionCard>
  )
}

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/40 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
    </div>
  )
}

export function DeliverablesSection({
  deliverables,
  loading,
  onNew,
  onEdit,
  onMove,
  onDelete,
}: {
  deliverables: DeliverableDto[]
  loading: boolean
  onNew: () => void
  onEdit: (deliverable: DeliverableDto) => void
  onMove: (deliverable: DeliverableDto, status: DeliverableStatus) => void
  onDelete: (id: number) => void
}) {
  return (
    <SectionCard
      title="Deliverables"
      icon={<FolderKanban className="h-4 w-4" />}
      className="md:col-span-2 xl:col-span-3"
      action={
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onNew}>
          <Plus className="h-3.5 w-3.5" aria-hidden />
          Add one
        </Button>
      }
    >
      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : deliverables.length === 0 ? (
        <EmptyNote>
          Nothing on file for this range. Convert a log row with the bulk bar, or add one here — a
          deliverable is what you handed over; the rows under it are the evidence.
        </EmptyNote>
      ) : (
        <ul className="divide-y divide-border">
          {deliverables.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2 first:pt-0 last:pb-0">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{
                  background: d.discipline ? DISCIPLINE_COLOUR[d.discipline] : "hsl(var(--muted-foreground))",
                }}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{d.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {DELIVERABLE_LABEL_STATUS[d.status]} · {DELIVERABLE_LABEL[d.type]}
                  {d.producedOn ? ` · ${d.producedOn}` : ""}
                  {d.taskTitle ? ` · ${d.taskTitle}` : ""} · {d.entryCount}{" "}
                  {d.entryCount === 1 ? "entry" : "entries"}
                  {d.discipline ? ` · ${DISCIPLINE_LABEL[d.discipline]}` : ""}
                </p>
              </div>
              {d.link ? (
                <a
                  href={d.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-muted-foreground underline-offset-2 hover:underline"
                >
                  <ExternalLink className="h-3 w-3" aria-hidden />
                  Open
                </a>
              ) : null}
              {/* The only buttons rendered are the ones the lifecycle allows from this row's own
                  status, so a `delivered` deliverable shows none — there is no way back, and the
                  board does not pretend there is. */}
              {DELIVERABLE_NEXT[d.status].map((next) => (
                <Button
                  key={next}
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => onMove(d, next)}
                >
                  <ArrowRight className="h-3 w-3" aria-hidden />
                  {DELIVERABLE_LABEL_STATUS[next]}
                </Button>
              ))}
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onEdit(d)}>
                <Pencil className="h-3.5 w-3.5" aria-hidden />
                <span className="sr-only">Edit {d.name}</span>
              </Button>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onDelete(d.id)}>
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                <span className="sr-only">Delete {d.name}</span>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  )
}

// Source is shown because an automatic capture and a hand-written log row carry different weight in
// a report, and the member is entitled to know which one they are looking at.
const SOURCE_LABEL: Record<string, string> = {
  route: "edited on the task",
  bulk: "bulk change",
  agent: "from an assistant",
  auto: "captured automatically",
}

export function TransitionsSection({
  transitions,
  loading,
}: {
  transitions: TransitionDto[]
  loading: boolean
}) {
  return (
    <SectionCard title="Status changes" icon={<GitBranch className="h-4 w-4" />} className="md:col-span-2">
      {loading ? (
        <Skeleton className="h-24 w-full" />
      ) : transitions.length === 0 ? (
        <EmptyNote>
          No task moved status in this range. Moving one on the task page writes its row here —
          nothing has to be logged by hand for this section to fill.
        </EmptyNote>
      ) : (
        <ol className="space-y-2">
          {transitions.map((t) => (
            <li key={t.id} className="flex flex-wrap items-baseline gap-x-2 text-xs">
              <span className="tabular-nums text-muted-foreground">{t.at.slice(11, 16)}</span>
              <span className="font-medium">{t.taskTitle ?? "a task"}</span>
              <span className="text-muted-foreground">
                {t.fromStatus ?? "—"} <ArrowRight className="inline h-3 w-3" aria-hidden /> {t.toStatus}
              </span>
              <span className="text-[11px] text-muted-foreground/80">{SOURCE_LABEL[t.source] ?? t.source}</span>
            </li>
          ))}
        </ol>
      )}
    </SectionCard>
  )
}

export function TimeByTaskSection({
  tasks,
  loading,
  totalMinutes,
}: {
  tasks: TaskBucket[]
  loading: boolean
  totalMinutes: number
}) {
  const rows = tasks.slice(0, 8)
  return (
    <SectionCard title="Time by task" icon={<Timer className="h-4 w-4" />} className="md:col-span-2 xl:col-span-2">
      {loading ? (
        <Skeleton className="h-24 w-full" />
      ) : rows.length === 0 ? (
        <EmptyNote>Nothing logged against a task yet in this range.</EmptyNote>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((task) => {
            // The share is a reading of the server's own minute totals, never a re-add of the rows.
            const share = totalMinutes > 0 ? Math.round((task.minutes / totalMinutes) * 100) : 0
            return (
              <li key={task.taskId ?? "unlinked"} className="space-y-1">
                <div className="flex items-baseline justify-between gap-2 text-xs">
                  <span className="min-w-0 truncate">{task.taskTitle ?? "Unlinked entries"}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {formatMinutes(task.minutes)} · {share}%
                  </span>
                </div>
                <div
                  className="h-1.5 rounded-full bg-muted"
                  role="img"
                  aria-label={`${task.taskTitle ?? "Unlinked"}: ${formatMinutes(task.minutes)}, ${share}% of the range`}
                >
                  <div
                    className="h-1.5 rounded-full"
                    style={{ width: `${Math.max(share, 2)}%`, background: "hsl(var(--chart-pine))" }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {task.entries.length} {task.entries.length === 1 ? "entry" : "entries"}
                </p>
              </li>
            )
          })}
        </ul>
      )}
    </SectionCard>
  )
}

export function DisciplineSplitSection({
  disciplines,
  loading,
  totalMinutes,
}: {
  disciplines: DisciplineBucket[]
  loading: boolean
  totalMinutes: number
}) {
  const data = disciplines.map((row) => ({
    name: DISCIPLINE_LABEL[row.discipline],
    minutes: row.minutes,
    count: row.count,
    fill: DISCIPLINE_COLOUR[row.discipline],
  }))
  return (
    <SectionCard
      title="Where the time went"
      icon={<ChartPie className="h-4 w-4" />}
      className="md:col-span-2 xl:col-span-2"
    >
      {loading ? (
        <Skeleton className="h-40 w-full" />
      ) : data.length === 0 ? (
        <EmptyNote>
          No classified minutes in this range. A discipline is set on the entry form; unclassified
          work still shows in the log, it just cannot be split.
        </EmptyNote>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={data} layout="vertical" margin={{ left: 8, right: 12 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(value, name) =>
                  name === "minutes"
                    ? [formatMinutes(Number(value)), "time"]
                    : [String(value), String(name)]
                }
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  fontSize: 11,
                }}
              />
              <Bar dataKey="minutes" radius={[0, 3, 3, 0]}>
                {data.map((cell) => (
                  <Cell key={cell.name} fill={cell.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-[11px] text-muted-foreground">
            {formatMinutes(totalMinutes)} classified across {data.length}{" "}
            {data.length === 1 ? "discipline" : "disciplines"}
          </p>
        </>
      )}
    </SectionCard>
  )
}

export function KindMixSection({
  kinds,
  openBlockers,
  loading,
}: {
  kinds: KindBucket[]
  openBlockers: number
  loading: boolean
}) {
  return (
    <SectionCard
      title="Mix of work"
      icon={<Shapes className="h-4 w-4" />}
      className="md:col-span-2 xl:col-span-2"
      action={
        openBlockers > 0 ? (
          <span className="text-[11px] font-medium text-destructive">
            {openBlockers} open {openBlockers === 1 ? "blocker" : "blockers"}
          </span>
        ) : null
      }
    >
      {loading ? (
        <Skeleton className="h-24 w-full" />
      ) : (
        <ul className="grid gap-1.5 sm:grid-cols-2">
          {kinds.map((k) => (
            <li key={k.kind} className="flex items-center gap-2 text-xs">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: KIND_COLOUR[k.kind] }}
                aria-hidden
              />
              <span className="min-w-0 flex-1 truncate">{k.label}</span>
              <span className="tabular-nums text-muted-foreground">
                {k.count} · {formatMinutes(k.minutes)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  )
}

export function CoverageSection({
  gaps,
  streak,
  unlinked,
  totals,
  range,
  loading,
  onPickDay,
}: {
  gaps: string[]
  streak: { current: number; longest: number }
  unlinked: number
  totals: { entries: number; minutes: number; activeDays: number }
  range: { from: string; to: string }
  loading: boolean
  onPickDay: (day: string) => void
}) {
  const spanned = rangeDays(range.from, range.to).length
  return (
    <SectionCard title="Coverage" icon={<CalendarCheck2 className="h-4 w-4" />} className="md:col-span-2 xl:col-span-3">
      {loading ? (
        <Skeleton className="h-20 w-full" />
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Stat label="Days logged" value={`${totals.activeDays} of ${spanned}`} />
            <Stat label="Current streak" value={`${streak.current} ${streak.current === 1 ? "day" : "days"}`} />
            <Stat label="Longest streak" value={`${streak.longest} ${streak.longest === 1 ? "day" : "days"}`} />
            <Stat label="Unlinked entries" value={String(unlinked)} />
          </div>
          {gaps.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Every day from {range.from} to {range.to} has something in it.
            </p>
          ) : (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">
                {Math.min(gaps.length, 21)} of {gaps.length}{" "}
                {gaps.length === 1 ? "day" : "days"} with no entry in this range — select one to
                fill it:
              </p>
              <div className="flex flex-wrap gap-1">
                {gaps.slice(0, 21).map((day) => (
                  <Button
                    key={day}
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-[11px] tabular-nums"
                    onClick={() => onPickDay(day)}
                  >
                    {day.slice(5)}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </SectionCard>
  )
}
