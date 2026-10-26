"use client"

// Presentation only: no fetch and no page data. The client owns the data, this file owns the
// look, so a section can be restyled without touching a mutation path. The one piece of local
// state here is the discipline group in `DisciplinePicker`, which is a way of finding a value
// among 75 options and is deliberately never sent anywhere.

import { useState } from "react"
import { CalendarDays } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { EmptyNote, SectionCard } from "@/components/dashboard-kit"
import {
  KIND_COLOUR,
  KIND_LABEL,
  WORK_LOG_KINDS,
  formatMinutes,
  type DayBucket,
  type EntryDto,
  type WorkLogKind,
} from "@/lib/worklog/entries"
import { VIEW_LABEL, type ViewState, type WorklogView } from "@/lib/worklog/view-state"
import {
  DISCIPLINE_CATEGORIES,
  DISCIPLINE_CATEGORY,
  DISCIPLINE_CATEGORY_LABEL,
  DISCIPLINE_LABEL,
  disciplinesInCategory,
  type DisciplineCategory,
} from "@/lib/roles"

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

export function EmptySection({ title }: { title: string }) {
  return (
    <SectionCard title={title}>
      <EmptyNote>Nothing logged here yet. Quick add above takes one line.</EmptyNote>
    </SectionCard>
  )
}

// Seventy-five disciplines will not fit a readable dropdown, so the group comes first: the
// category narrows the list below it and is never itself a filter — the URL carries one
// `discipline` param, which is what the API reads.
export function DisciplinePicker({
  value,
  onChange,
}: {
  value: ViewState["discipline"]
  onChange: (discipline: ViewState["discipline"]) => void
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
    <>
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
    </>
  )
}

function DayList({ entries }: { entries: EntryDto[] }) {
  if (entries.length === 0) {
    return <EmptyNote>Nothing logged on this day yet. Quick add above, or the day picker in View.</EmptyNote>
  }
  return (
    <ul className="space-y-2">
      {entries.map((entry) => (
        <EntryLine key={entry.id} entry={entry} />
      ))}
    </ul>
  )
}

function DayBody({ days, day }: { days: DayBucket[]; day: string }) {
  const bucket = days.find((d) => d.day === day)
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        {day} · {bucket?.count ?? 0} {(bucket?.count ?? 0) === 1 ? "entry" : "entries"} ·{" "}
        {formatMinutes(bucket?.minutes ?? 0)}
      </p>
      <DayList entries={bucket?.entries ?? []} />
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

function ListBody({ days }: { days: DayBucket[] }) {
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
          <ul className="mt-1.5 space-y-2">
            {bucket.entries.map((entry) => (
              <EntryLine key={entry.id} entry={entry} />
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

function BoardBody({ days }: { days: DayBucket[] }) {
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
              {rows.length} · {formatMinutes(rows.reduce((sum, e) => sum + (e.minutes ?? 0), 0))}
            </span>
          </div>
          {rows.length === 0 ? (
            <p className="mt-2 text-[11px] text-muted-foreground">No {KIND_LABEL[kind].toLowerCase()} logged.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {rows.map((entry) => (
                <EntryLine key={entry.id} entry={entry} />
              ))}
            </ul>
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
}: {
  view: WorklogView
  days: DayBucket[]
  loading: boolean
  todayIso: string
  onPickDay: (day: string) => void
}) {
  const body = (() => {
    switch (view) {
      case "day":
        return <DayBody days={days} day={todayIso} />
      case "week":
        return <WeekBody days={days} loading={loading} onPickDay={onPickDay} />
      case "list":
        return <ListBody days={days} />
      case "board":
        return <BoardBody days={days} />
      case "heat":
        return <HeatBody days={days} todayIso={todayIso} onPickDay={onPickDay} />
    }
  })()

  return (
    <SectionCard
      title={`${VIEW_LABEL[view]} view`}
      icon={<CalendarDays className="h-4 w-4" />}
      className="md:col-span-2 xl:col-span-3"
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
