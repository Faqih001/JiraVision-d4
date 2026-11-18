"use client"

// The eight activity-module cards and the merged timeline. Presentational like sections.tsx:
// every number comes from lib/reports/module-sections.ts and the aggregate, never from maths
// here. A module with no rows renders nothing — an empty card would read as a broken section.

import {
  Activity,
  BookOpen,
  Bot,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  HeartPulse,
  History,
  LifeBuoy,
  Mail,
  MessageSquare,
  MessagesSquare,
  Scale,
  Target,
  TrendingUp,
  Trophy,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { SectionCard } from "@/components/dashboard-kit"
import { MODULE_LABEL, type ReportAggregate } from "@/lib/reports/aggregate"
import {
  hiddenModuleRowCount,
  moduleCaption,
  moduleRowsFor,
  visibleModuleRows,
  type ModuleSectionKey,
} from "@/lib/reports/module-sections"

const MODULE_SECTION_ICON: Record<ModuleSectionKey, React.ReactNode> = {
  operations: <Activity className="h-4 w-4" aria-hidden />,
  registers: <BookOpen className="h-4 w-4" aria-hidden />,
  serviceDesk: <LifeBuoy className="h-4 w-4" aria-hidden />,
  goals: <Target className="h-4 w-4" aria-hidden />,
  meetings: <CalendarDays className="h-4 w-4" aria-hidden />,
  retros: <MessagesSquare className="h-4 w-4" aria-hidden />,
  career: <TrendingUp className="h-4 w-4" aria-hidden />,
  playbooks: <ClipboardList className="h-4 w-4" aria-hidden />,
  automation: <Zap className="h-4 w-4" aria-hidden />,
  assistant: <Bot className="h-4 w-4" aria-hidden />,
  chat: <MessageSquare className="h-4 w-4" aria-hidden />,
  gamification: <Trophy className="h-4 w-4" aria-hidden />,
  wellbeing: <HeartPulse className="h-4 w-4" aria-hidden />,
  ethics: <Scale className="h-4 w-4" aria-hidden />,
  email: <Mail className="h-4 w-4" aria-hidden />,
}

function ModuleCountButton({
  total,
  hidden,
  expanded,
  label,
  onClick,
}: {
  total: number
  hidden: number
  expanded: boolean
  label: string
  onClick: () => void
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-7 gap-1 px-2 text-[11px]"
      aria-expanded={expanded}
      aria-label={`${expanded ? "Hide" : "Show"} the ${total} rows behind ${label}`}
      onClick={onClick}
    >
      <span className="font-semibold tabular-nums">{total}</span>
      {hidden > 0 ? <span className="text-muted-foreground tabular-nums">+{hidden}</span> : null}
      {expanded ? <ChevronUp className="h-3.5 w-3.5" aria-hidden /> : <ChevronDown className="h-3.5 w-3.5" aria-hidden />}
    </Button>
  )
}

export function ModuleSectionCard({
  section,
  aggregate,
  expanded,
  onToggle,
}: {
  section: ModuleSectionKey
  aggregate: ReportAggregate
  expanded: boolean
  onToggle: () => void
}) {
  const rows = moduleRowsFor(section, aggregate)
  if (rows.length === 0) return null
  const shown = visibleModuleRows(section, aggregate, expanded)
  const hidden = hiddenModuleRowCount(section, aggregate)

  return (
    <SectionCard
      title={MODULE_LABEL[section]}
      icon={MODULE_SECTION_ICON[section]}
      action={
        <ModuleCountButton
          total={rows.length}
          hidden={hidden}
          expanded={expanded}
          label={MODULE_LABEL[section]}
          onClick={onToggle}
        />
      }
    >
      <div className="space-y-2">
        <p className="text-[11px] text-muted-foreground tabular-nums">{moduleCaption(section, aggregate)}</p>
        <ul className="divide-y divide-border/60">
          {shown.map((row) => (
            <li key={row.ref} className="py-1.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="break-words text-[13px] leading-snug">{row.title}</p>
                  <p className="break-words text-[11px] text-muted-foreground">{row.detail}</p>
                </div>
                <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                  {row.date ?? "no date"}
                </span>
              </div>
              {expanded ? <p className="font-mono text-[10px] text-muted-foreground">{row.ref}</p> : null}
            </li>
          ))}
        </ul>
      </div>
    </SectionCard>
  )
}

const TIMELINE_PREVIEW_LIMIT = 12

function TimelineRowItem({ row }: { row: ReportAggregate["timeline"][number] }) {
  return (
    <li key={`${row.source}:${row.ref}`} className="py-1.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="break-words text-[13px] leading-snug">
            <span className="mr-1.5 inline-flex items-center rounded-full border border-border/60 bg-muted/40 px-1.5 py-0.5 align-middle text-[10px] font-medium text-muted-foreground">
              {MODULE_LABEL[row.source]}
            </span>
            {row.title}
          </p>
          <p className="break-words text-[11px] text-muted-foreground">{row.detail}</p>
        </div>
        <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">{row.date ?? "no date"}</span>
      </div>
    </li>
  )
}

export function TimelineSection({ aggregate }: { aggregate: ReportAggregate | null }) {
  const rows = aggregate?.timeline ?? []
  if (rows.length === 0) return null
  const shown = rows.slice(0, TIMELINE_PREVIEW_LIMIT)
  const rest = rows.slice(TIMELINE_PREVIEW_LIMIT)

  return (
    <SectionCard
      title="Activity timeline"
      icon={<History className="h-4 w-4" aria-hidden />}
      action={<span className="text-[11px] tabular-nums text-muted-foreground">{rows.length} events</span>}
    >
      <div className="space-y-2">
        <p className="text-[11px] text-muted-foreground">
          Dated activity from every module, newest first — the period read as one story.
        </p>
        <ul className="divide-y divide-border/60">
          {shown.map((row) => (
            <TimelineRowItem key={`${row.source}:${row.ref}`} row={row} />
          ))}
        </ul>
        {rest.length > 0 ? (
          <details>
            <summary className="cursor-pointer text-[11px] text-muted-foreground hover:text-foreground">
              Show {rest.length} more
            </summary>
            <ul className="divide-y divide-border/60">
              {rest.map((row) => (
                <TimelineRowItem key={`${row.source}:${row.ref}`} row={row} />
              ))}
            </ul>
          </details>
        ) : null}
      </div>
    </SectionCard>
  )
}