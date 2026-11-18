"use client"

// The list view's overview: a KPI strip and six insight cards, in the work log's visual
// vocabulary. Every number comes from lib/reports/overview.ts — these cards render counts the
// lib already made, and the only maths here is display scaling (shares, bar heights).

import { BarChart3, CalendarRange, FileClock, Hourglass, Layers, PieChart as PieChartIcon } from "lucide-react"
import { Cell, Pie, PieChart, Tooltip } from "recharts"
import {
  DASHBOARD_KPI_GRID,
  EmptyNote,
  SectionCard,
  TOOLTIP_STYLE,
} from "@/components/dashboard-kit"
import { MODULE_KEYS, type ReportAggregate } from "@/lib/reports/aggregate"
import {
  cadenceTotal,
  cadenceWeeks,
  draftAging,
  reportingSpan,
  statusCounts,
  turnaroundStats,
} from "@/lib/reports/overview"
import { PERIOD_LABEL } from "@/lib/reports/period"
import { REPORT_STATUSES, type ReportDto } from "@/lib/reports/report-fields"
import { REPORT_STATUS_COLOR, REPORT_STATUS_LABEL, Stat } from "./sections"

export function PipelineSection({ reports }: { reports: ReportDto[] }) {
  const counts = statusCounts(reports)
  const total = reports.length
  const slices = REPORT_STATUSES.filter((status) => counts[status] > 0).map((status) => ({
    status,
    label: REPORT_STATUS_LABEL[status],
    value: counts[status],
  }))

  return (
    <SectionCard title="Pipeline" icon={<PieChartIcon className="h-4 w-4" />}>
      {total === 0 ? (
        <EmptyNote>No reports yet — the pipeline fills as you create them.</EmptyNote>
      ) : (
        <div className="flex h-full flex-col justify-between gap-4">
          <div className="flex flex-1 items-center gap-3">
            <div className="relative h-[160px] w-[160px] shrink-0">
              <PieChart width={160} height={160}>
                <Pie
                  data={slices}
                  dataKey="value"
                  nameKey="label"
                  innerRadius={48}
                  outerRadius={75}
                  paddingAngle={2}
                  strokeWidth={0}
                >
                  {slices.map((slice) => (
                    <Cell key={slice.status} fill={REPORT_STATUS_COLOR[slice.status]} />
                  ))}
                </Pie>
                <Tooltip {...TOOLTIP_STYLE} />
              </PieChart>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-semibold tabular-nums">{total}</span>
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {total === 1 ? "report" : "reports"}
                </span>
              </div>
            </div>
            <ul className="flex min-w-0 flex-1 flex-col justify-between gap-1 py-1 self-stretch">
              {REPORT_STATUSES.map((status) => {
                const pct = Math.round((counts[status] / total) * 100)
                return (
                  <li
                    key={status}
                    className="flex items-center gap-2 text-[11px]"
                    title={`${REPORT_STATUS_LABEL[status]}: ${counts[status]}`}
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: REPORT_STATUS_COLOR[status] }}
                    />
                    <span className="min-w-0 flex-1 truncate">{REPORT_STATUS_LABEL[status]}</span>
                    <span className="tabular-nums text-muted-foreground">{pct}%</span>
                    <span className="font-medium tabular-nums">{counts[status]}</span>
                  </li>
                )
              })}
            </ul>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Where every report sits right now — a draft is editable, a submitted one is locked until
            it is acknowledged or returned.
          </p>
        </div>
      )}
    </SectionCard>
  )
}

export function CadenceSection({
  reports,
  todayIso,
  timezone,
}: {
  reports: ReportDto[]
  todayIso: string
  timezone: string | null
}) {
  const weeks = cadenceWeeks(reports, todayIso, timezone)
  const total = cadenceTotal(weeks)
  const max = Math.max(1, ...weeks.map((week) => week.count))

  return (
    <SectionCard title="Creation cadence" icon={<BarChart3 className="h-4 w-4" />}>
      <div className="flex h-full flex-col">
        <div className="grid min-h-0 flex-1 grid-cols-8 grid-rows-1 items-end gap-2">
          {weeks.map((week) => (
            <div
              key={week.weekStart}
              className="flex h-full min-w-0 flex-col items-center justify-end gap-1"
              title={`Week of ${week.label}: ${week.count} created`}
            >
              <span className="text-[10px] tabular-nums text-muted-foreground">
                {week.count > 0 ? week.count : ""}
              </span>
              <div
                className="w-full rounded-t"
                style={{
                  height: `${(week.count / max) * 100}%`,
                  minHeight: 2,
                  background: week.count > 0 ? "hsl(var(--chart-moss))" : "hsl(var(--chart-stone))",
                }}
              />
              <span className="truncate text-[10px] text-muted-foreground">{week.label}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          {total === 0
            ? "Nothing created in the last 8 weeks — a new report starts the rhythm."
            : `${total} created in the last 8 weeks · busiest week ${max}.`}
        </p>
      </div>
    </SectionCard>
  )
}

export function TurnaroundSection({ reports }: { reports: ReportDto[] }) {
  const stats = turnaroundStats(reports)
  const days = (value: number | null) =>
    value === null ? "—" : `${value} ${value === 1 ? "day" : "days"}`

  return (
    <SectionCard title="Review turnaround" icon={<Hourglass className="h-4 w-4" />}>
      <div className="flex h-full flex-col justify-between gap-4">
        <div className="grid grid-cols-2 gap-2 flex-1 grid-rows-2">
          <Stat label="Awaiting review" value={String(stats.awaiting)} hint="submitted, not yet read" />
          <Stat
            label="Avg time to ack"
            value={days(stats.avgDays)}
            hint={stats.avgDays === null ? "no acknowledgements yet" : "submit → acknowledge"}
          />
          <Stat label="Fastest ack" value={days(stats.fastestDays)} />
          <Stat label="Slowest ack" value={days(stats.slowestDays)} />
        </div>
        <p className="text-[11px] text-muted-foreground">
          {stats.returned > 0
            ? `${stats.returned} ${stats.returned === 1 ? "report was" : "reports were"} returned — a revision keeps the original filed.`
            : "How long recipients take to acknowledge a submitted report."}
        </p>
      </div>
    </SectionCard>
  )
}

export function ReportsKpiStrip({ reports, filtered }: { reports: ReportDto[]; filtered: boolean }) {
  const counts = statusCounts(reports)
  return (
    <div className={`${DASHBOARD_KPI_GRID} xl:grid-cols-5`}>
      <Stat
        asCard
        label="Total reports"
        value={String(reports.length)}
        hint={filtered ? "matching your search" : "in your list"}
      />
      <Stat asCard label="Drafts" value={String(counts.draft)} hint="still editable" />
      <Stat asCard label="Awaiting review" value={String(counts.submitted)} hint="with recipients" />
      <Stat asCard label="Acknowledged" value={String(counts.acknowledged)} hint="read and accepted" />
      <Stat asCard label="Returned" value={String(counts.returned)} hint="sent back for revision" />
    </div>
  )
}

export function WorkspaceMixSection({ aggregate }: { aggregate: ReportAggregate | null }) {
  const buckets = aggregate?.byModule ?? []
  const max = Math.max(1, ...buckets.map((bucket) => bucket.count.value))

  return (
    <SectionCard title="Workspace mix" icon={<Layers className="h-4 w-4" />}>
      {buckets.length === 0 ? (
        <EmptyNote>No module activity in this period yet — the mix fills as you work.</EmptyNote>
      ) : (
        <div className="flex h-full flex-col justify-between gap-3">
          <ul className="flex flex-1 flex-col justify-between gap-1.5">
            {buckets.map((bucket) => (
              <li
                key={bucket.key}
                className="flex items-center gap-2 text-[11px]"
                title={`${bucket.label}: ${bucket.count.value}`}
              >
                <span className="w-24 shrink-0 truncate">{bucket.label}</span>
                <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-muted/40">
                  <span
                    className="block h-full rounded-full"
                    style={{
                      width: `${(bucket.count.value / max) * 100}%`,
                      background: "hsl(var(--chart-moss))",
                    }}
                  />
                </span>
                <span className="w-8 shrink-0 text-right font-medium tabular-nums">{bucket.count.value}</span>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-muted-foreground">
            Where this period&apos;s activity came from — {buckets.length} of {MODULE_KEYS.length} modules.
          </p>
        </div>
      )}
    </SectionCard>
  )
}

export function OpenDraftsSection({
  reports,
  todayIso,
  timezone,
}: {
  reports: ReportDto[]
  todayIso: string
  timezone: string | null
}) {
  const aging = draftAging(reports, todayIso, timezone)
  const age = (value: number | null) =>
    value === null ? "—" : value === 0 ? "today" : `${value} ${value === 1 ? "day" : "days"}`

  return (
    <SectionCard title="Open drafts" icon={<FileClock className="h-4 w-4" />}>
      {aging.count === 0 ? (
        <EmptyNote>No open drafts — every report is filed or acknowledged.</EmptyNote>
      ) : (
        <div className="flex h-full flex-col justify-between gap-4">
          <div className="grid flex-1 grid-cols-2 grid-rows-2 gap-2">
            <Stat label="Open drafts" value={String(aging.count)} hint="still editable" />
            <Stat label="Oldest" value={age(aging.oldestDays)} hint="waiting longest" />
            <Stat label="Newest" value={age(aging.newestDays)} />
            <Stat label="Avg age" value={age(aging.avgDays)} />
          </div>
          <p className="text-[11px] text-muted-foreground">
            A draft only counts once it is submitted — finish the oldest one first.
          </p>
        </div>
      )}
    </SectionCard>
  )
}

export function ReportingSpanSection({ reports }: { reports: ReportDto[] }) {
  const span = reportingSpan(reports)
  const shortDate = (iso: string | null) =>
    iso === null
      ? "—"
      : new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          timeZone: "UTC",
        })

  return (
    <SectionCard title="Reporting span" icon={<CalendarRange className="h-4 w-4" />}>
      {span.periods === 0 ? (
        <EmptyNote>No periods covered yet — your first report sets the span.</EmptyNote>
      ) : (
        <div className="flex h-full flex-col justify-between gap-4">
          <div className="grid flex-1 grid-cols-2 grid-rows-2 gap-2">
            <Stat label="Periods covered" value={String(span.periods)} hint="distinct periods" />
            <Stat
              label="Top cadence"
              value={span.dominantType ? PERIOD_LABEL[span.dominantType] : "—"}
              hint={`${span.dominantCount} of ${reports.length}`}
            />
            <Stat label="First period" value={shortDate(span.earliest)} />
            <Stat label="Latest period" value={shortDate(span.latest)} />
          </div>
          <p className="text-[11px] text-muted-foreground">
            The breadth of your reporting — from the first period to the most recent.
          </p>
        </div>
      )}
    </SectionCard>
  )
}