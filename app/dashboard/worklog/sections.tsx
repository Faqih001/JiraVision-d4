"use client"

// Presentation only: no fetch and no page data. The client owns the data, this file owns the
// look, so a section can be restyled without touching a mutation path. The one piece of local
// state here is the discipline group in `DisciplinePicker`, which is a way of finding a value
// among 75 options and is deliberately never sent anywhere.

import { useState } from "react"
import { CalendarDays } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { EmptyNote, SectionCard } from "@/components/dashboard-kit"
import { KIND_COLOUR, KIND_LABEL, formatMinutes, type EntryDto, type WorkLogKind } from "@/lib/worklog/entries"
import type { ViewState } from "@/lib/worklog/view-state"
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
