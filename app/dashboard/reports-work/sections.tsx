"use client"

// The builder's cards. No arithmetic and no date maths live here: a card renders rows the API
// already counted, and the period it labels comes from the Period object the caller resolved.

import {
  BarChart3,
  CalendarClock,
  CalendarRange,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  FileStack,
  FileText,
  Inbox,
  Loader2,
  NotebookPen,
  ShieldAlert,
} from "lucide-react"
import Link from "next/link"
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyNote, SectionCard } from "@/components/dashboard-kit"
import {
  isSumMetric,
  type Count,
  type MetricKey,
  type ReportAggregate,
  type ReportRow,
} from "@/lib/reports/aggregate"
import { CHART_UNIT, type ChartDatum, chartRows } from "@/lib/reports/charts"
import {
  PERIOD_LABEL,
  PERIOD_TYPES,
  shiftPeriodAnchor,
  type Period,
  type PeriodType,
} from "@/lib/reports/period"
import {
  ROW_SECTION_HINT,
  hiddenRowCount,
  refHref,
  rowsCaption,
  rowsFor,
  visibleRows,
  worklogHref,
  type RowSectionKey,
} from "@/lib/reports/row-sections"
import { MAX_REPORT_TITLE, type ReportDto } from "@/lib/reports/report-fields"
import {
  CHART_LABEL,
  formatMetricValue,
  MAX_SECTION_TEXT,
  METRIC_LABEL,
  REPORT_TEMPLATES,
  SECTION_TITLE,
  TEMPLATE_CHARTS,
  TEMPLATE_LABEL,
  TEMPLATE_METRICS,
  type ChartKey,
  type ReportSectionKey,
  type ReportTemplate,
} from "@/lib/reports/templates"
import { AUTO_TEMPLATE, type ReportState, type TemplateChoice } from "@/lib/reports/view-state"
import { formatMinutes } from "@/lib/worklog/entries"

export function ReportsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} className="h-40 w-full rounded-xl" />
      ))}
    </div>
  )
}

export function ReportEmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-dashed border-border/70 px-3 py-3 text-[12px] text-muted-foreground">
      <Inbox className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
      <p>{children}</p>
    </div>
  )
}

export function PeriodSection({
  state,
  period,
  patch,
}: {
  state: ReportState
  period: Period
  patch: (next: Partial<ReportState>) => void
}) {
  const step = (delta: number) =>
    patch({ anchor: shiftPeriodAnchor(state.periodType, state.anchor, delta) })

  return (
    <SectionCard title="Period" icon={<CalendarRange className="h-4 w-4" />}>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="report-period-type">Report type</Label>
          <Select
            value={state.periodType}
            onValueChange={(value) => patch({ periodType: value as PeriodType })}
          >
            <SelectTrigger id="report-period-type" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {PERIOD_LABEL[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-end gap-2">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="report-anchor">Within the period</Label>
            <Input
              id="report-anchor"
              type="date"
              value={state.anchor}
              // Clearing a date input yields an empty string; the previous anchor is kept rather
              // than sent, because an empty day would resolve to the epoch.
              onChange={(event) => {
                const next = event.target.value
                if (next) patch({ anchor: next })
              }}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => step(-1)}
            aria-label="Previous period"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => step(1)}
            aria-label="Next period"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {state.periodType === "custom" ? (
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="report-from">From</Label>
              <Input
                id="report-from"
                type="date"
                value={state.customFrom}
                onChange={(event) => {
                  if (event.target.value) patch({ customFrom: event.target.value })
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="report-to">To</Label>
              <Input
                id="report-to"
                type="date"
                value={state.customTo}
                onChange={(event) => {
                  if (event.target.value) patch({ customTo: event.target.value })
                }}
              />
            </div>
          </div>
        ) : null}

        <div className="space-y-1.5">
          <Label htmlFor="report-template">Template</Label>
          <Select
            value={state.template}
            onValueChange={(value) => patch({ template: value as TemplateChoice })}
          >
            <SelectTrigger id="report-template" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={AUTO_TEMPLATE}>Auto — follow my logged work</SelectItem>
              {REPORT_TEMPLATES.map((template) => (
                <SelectItem key={template} value={template}>
                  {TEMPLATE_LABEL[template]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <p className="rounded-lg bg-muted/50 px-3 py-2 text-[12px] tabular-nums text-foreground">
          {period.label}
          <span className="block text-[11px] text-muted-foreground">
            {period.start} to {period.end} · {period.days.length}{" "}
            {period.days.length === 1 ? "day" : "days"}
          </span>
        </p>
      </div>
    </SectionCard>
  )
}

export function MyReportsSection({
  reports,
  loading,
  openId,
  missingId,
  query,
  timezone,
  onQuery,
  onOpen,
}: {
  reports: ReportDto[]
  loading: boolean
  openId: number | null
  missingId: number | null
  query: string
  timezone: string | null
  onQuery: (value: string) => void
  onOpen: (id: number) => void
}) {
  return (
    <SectionCard
      title="My reports"
      icon={<FileText className="h-4 w-4" />}
      className="md:col-span-2 xl:col-span-2"
    >
      <div className="space-y-3">
        <Input
          aria-label="Search my reports"
          placeholder="Search by title"
          value={query}
          onChange={(event) => onQuery(event.target.value)}
        />

        {missingId !== null ? (
          <ReportEmptyNote>
            Report {missingId} is not one of yours, so it is shown as absent. Reports are private to
            their author until they are sent to someone.
          </ReportEmptyNote>
        ) : null}

        {loading ? (
          <Skeleton className="h-24 w-full" />
        ) : reports.length === 0 ? (
          <ReportEmptyNote>
            No reports yet. Pick a period on the left and the sections fill themselves from your work
            log; nothing has to be typed before a report can be read.
          </ReportEmptyNote>
        ) : (
          <ul className="divide-y divide-border/60">
            {reports.map((report) => (
              <li key={report.id} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{report.title}</p>
                  <p className="truncate text-[11px] text-muted-foreground tabular-nums">
                    {report.periodStart} to {report.periodEnd} · {TEMPLATE_LABEL[report.template]} ·{" "}
                    {new Date(report.updatedAt).toLocaleString(undefined, {
                      timeZone: timezone ?? undefined,
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="rounded-full border border-border/70 px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                    {report.status}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant={openId === report.id ? "default" : "outline"}
                    onClick={() => onOpen(report.id)}
                  >
                    Open
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </SectionCard>
  )
}

export function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/40 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
      {hint ? <p className="text-[10px] text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

export function HeaderSection({
  report,
  title,
  period,
  template,
  sourceLabel,
  onTitle,
}: {
  report: ReportDto | null
  title: string
  period: Period
  template: ReportTemplate
  sourceLabel: string
  onTitle: (value: string) => void
}) {
  const statusBadge = report ? (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        report.status === "draft"
          ? "bg-muted text-muted-foreground"
          : report.status === "submitted"
            ? "bg-blue-100 text-blue-800"
            : report.status === "acknowledged"
              ? "bg-green-100 text-green-800"
              : "bg-amber-100 text-amber-800"
      }`}
    >
      {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
    </span>
  ) : null

  return (
    <SectionCard
      title={SECTION_TITLE.header}
      icon={<FileText className="h-4 w-4" />}
      className="md:col-span-2 xl:col-span-2"
    >
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="report-title" className="flex-1">
            Title
          </Label>
          {statusBadge}
        </div>
        <Input
          id="report-title"
          value={title}
          maxLength={MAX_REPORT_TITLE}
          placeholder={period.label}
          onChange={(event) => onTitle(event.target.value)}
          disabled={report?.status !== "draft"}
        />
        <p className="text-[11px] text-muted-foreground tabular-nums">
          {period.start} to {period.end} · {TEMPLATE_LABEL[template]} · {sourceLabel}
          {report ? ` · ${report.status === "draft" ? "draft" : "report"} #${report.id}` : " · not saved"}
          {report?.revisionOf ? ` · revision of #${report.revisionOf}` : ""}
        </p>
        <p className="text-[11px] text-muted-foreground">
          The header is computed: the period, template and author come from the report itself, and
          nothing typed here can change them.
        </p>
        {report?.status === "returned" && report.returnedNote && (
          <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm">
            <p className="font-medium text-amber-900">Return note:</p>
            <p className="text-amber-800">{report.returnedNote}</p>
          </div>
        )}
      </div>
    </SectionCard>
  )
}

/**
 * One editable card for the prose the member owns. Generic over the section key because the
 * summary and the notes are the same component with a different title; the six row sections use
 * a commentary field inside their own card instead (Task 14).
 */
export function ProseSection({
  section,
  value,
  rows = 6,
  hint,
  onChange,
}: {
  section: ReportSectionKey
  value: string
  rows?: number
  hint?: string
  onChange: (value: string) => void
}) {
  const over = value.length > MAX_SECTION_TEXT
  return (
    <SectionCard
      title={SECTION_TITLE[section]}
      icon={<NotebookPen className="h-4 w-4" />}
      className="md:col-span-2 xl:col-span-2"
    >
      <div className="space-y-2">
        <Textarea
          aria-label={SECTION_TITLE[section]}
          value={value}
          rows={rows}
          placeholder={hint ?? "Write this in your own words. The rows below it are counted for you."}
          onChange={(event) => onChange(event.target.value)}
          className={over ? "border-destructive" : undefined}
        />
        <p
          className={`text-[11px] tabular-nums ${
            over ? "text-destructive" : "text-muted-foreground"
          }`}
        >
          {over
            ? `${value.length - MAX_SECTION_TEXT} characters over the ${MAX_SECTION_TEXT} limit — the save will refuse this.`
            : `${value.length} characters`}
        </p>
      </div>
    </SectionCard>
  )
}

const SECTION_ICON: Record<RowSectionKey, React.ReactNode> = {
  completed: <CheckCircle2 className="h-4 w-4" />,
  deliverables: <FileStack className="h-4 w-4" />,
  inProgress: <Loader2 className="h-4 w-4" />,
  blocked: <ShieldAlert className="h-4 w-4" />,
  overdue: <Clock className="h-4 w-4" />,
  nextPeriod: <CalendarClock className="h-4 w-4" />,
}

/**
 * The count is the button: it is the same number the list under it has rows for, and clicking it
 * writes `?open=<section>` so the expanded report is a linkable state rather than a click sequence.
 */
export function CountButton({
  total,
  hidden,
  expanded,
  section,
  onClick,
}: {
  total: number
  hidden: number
  expanded: boolean
  section: RowSectionKey
  onClick: () => void
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-7 gap-1 px-2 text-[11px]"
      aria-expanded={expanded}
      aria-label={`${expanded ? "Hide" : "Show"} the ${total} rows behind ${SECTION_TITLE[section]}`}
      onClick={onClick}
    >
      <span className="font-semibold tabular-nums">{total}</span>
      {hidden > 0 ? <span className="text-muted-foreground tabular-nums">+{hidden}</span> : null}
      {expanded ? <ChevronUp className="h-3.5 w-3.5" aria-hidden /> : <ChevronDown className="h-3.5 w-3.5" aria-hidden />}
    </Button>
  )
}

function rowTitle(row: ReportRow, period: Period) {
  const href = refHref(row.ref, period)
  if (!href) return row.title
  return (
    <Link href={href} className="underline decoration-border underline-offset-2 hover:decoration-foreground">
      {row.title}
    </Link>
  )
}

/**
 * `key={row.ref}` — the ref is the id list §6 promises, and it is unique per row, so a row can
 * never be painted into the wrong place when a section expands.
 */
function RowList({ rows, expanded, period }: { rows: ReportRow[]; expanded: boolean; period: Period }) {
  if (rows.length === 0) return <EmptyNote>Nothing landed in this section for the period.</EmptyNote>
  return (
    <ul className="divide-y divide-border/60">
      {rows.map((row) => (
        <li key={row.ref} className="py-1.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="break-words text-[13px] leading-snug">{rowTitle(row, period)}</p>
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
  )
}

export function CommentField({
  section,
  value,
  onChange,
}: {
  section: RowSectionKey
  value: string
  onChange: (value: string) => void
}) {
  const over = value.length > MAX_SECTION_TEXT
  return (
    <div className="space-y-1 border-t border-border/60 pt-3">
      <Label
        htmlFor={`comment-${section}`}
        className="text-[10px] uppercase tracking-wide text-muted-foreground"
      >
        Your read of this section
      </Label>
      <Textarea
        id={`comment-${section}`}
        aria-label={`${SECTION_TITLE[section]} commentary`}
        rows={2}
        value={value}
        placeholder={ROW_SECTION_HINT[section]}
        className={over ? "border-destructive" : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {over ? (
        <p className="text-[10px] text-destructive tabular-nums">
          {value.length - MAX_SECTION_TEXT} characters over the {MAX_SECTION_TEXT} limit — the save will refuse this.
        </p>
      ) : null}
    </div>
  )
}

/**
 * One card, computed rows and the author's commentary. The rows are read through
 * `lib/reports/row-sections.ts` and never re-derived here: a card that totals its own rows is a
 * second opinion on the work log, and §6's whole point is that there is only one.
 */
export function RowSection({
  section,
  aggregate,
  period,
  expanded,
  comment,
  onToggle,
  onComment,
}: {
  section: RowSectionKey
  aggregate: ReportAggregate | null
  period: Period
  expanded: boolean
  comment: string
  onToggle: () => void
  onComment: (value: string) => void
}) {
  const rows = aggregate ? rowsFor(section, aggregate) : []
  const shown = aggregate ? visibleRows(section, aggregate, expanded) : []
  const hidden = aggregate ? hiddenRowCount(section, aggregate) : 0
  const link = worklogHref(period, section)

  return (
    <SectionCard
      title={SECTION_TITLE[section]}
      icon={SECTION_ICON[section]}
      action={
        <CountButton
          total={rows.length}
          hidden={hidden}
          expanded={expanded}
          section={section}
          onClick={onToggle}
        />
      }
    >
      <div className="space-y-2">
        <p className="text-[11px] text-muted-foreground tabular-nums">
          {aggregate ? rowsCaption(section, aggregate) : "Numbers arrive with the period."}
        </p>
        {aggregate === null ? (
          <EmptyNote>The rows come from the work log, so they appear once the period has resolved.</EmptyNote>
        ) : (
          <RowList rows={shown} expanded={expanded} period={period} />
        )}
        {hidden > 0 && !expanded ? (
          <Button type="button" variant="ghost" size="sm" className="h-7 text-[11px] text-muted-foreground" onClick={onToggle}>
            Show the other {hidden}
          </Button>
        ) : null}
        {link ? (
          <Link
            href={link}
            className="text-[11px] underline decoration-border underline-offset-4 hover:decoration-foreground"
          >
            {rows.length > 0
              ? `Open these ${rows.length} rows in the work log`
              : "Open this period in the work log"}
          </Link>
        ) : (
          <p className="text-[11px] text-muted-foreground">
            These rows come from a plan, and plans get their own page in a later phase — there is
            nowhere to open them yet.
          </p>
        )}
        <CommentField section={section} value={comment} onChange={onComment} />
      </div>
    </SectionCard>
  )
}

/** The word the tooltip and the drill-down use beside each number. Both count charts count tasks. */
const UNIT_NOUN: Record<"time" | "count", string> = { time: "time", count: "tasks" }

/**
 * A tile's second line. For a count metric the value already *is* the row count, so a hint of
 * "6 rows" under "6" is noise; for a sum — minutes, story points — the row count is the only way
 * to show that a big total came from a small number of rows. A zero says what it means in words.
 */
function metricHint(key: MetricKey, count: Count): string | undefined {
  if (count.value === 0) return "Nothing in this period"
  if (!isSumMetric(key)) return undefined
  return `from ${count.refs.length} ${count.refs.length === 1 ? "row" : "rows"}`
}

/**
 * One horizontal-bar chart. Horizontal on purpose: the labels are discipline and status names, not
 * dates, and the work log already draws its splits this way — the same measure, the same token
 * colours, the same tooltip shape on both pages. The height grows with the rows so a yearly series
 * of twelve buckets never overlaps itself.
 */
export function ChartBlock({ chart, data }: { chart: ChartKey; data: ChartDatum[] }) {
  const unit = CHART_UNIT[chart]
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {CHART_LABEL[chart]}
      </p>
      {data.length === 0 ? (
        <EmptyNote>Nothing in this period to split this way.</EmptyNote>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={Math.max(120, data.length * 26)}>
            <BarChart data={data} layout="vertical" margin={{ left: 8, right: 12 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="label" width={110} tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(value) => [
                  unit === "time" ? formatMinutes(Number(value)) : String(value),
                  UNIT_NOUN[unit],
                ]}
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  fontSize: 11,
                }}
              />
              <Bar dataKey="value" name={UNIT_NOUN[unit]} radius={[0, 3, 3, 0]}>
                {data.map((cell) => (
                  <Cell key={cell.key} fill={cell.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {/* The row cards put their ids behind the count button; a chart has no button, so the
              same disclosure lives under the bars — §6's "where does 14 come from?" answered
              without leaving the page. */}
          <details className="text-[11px]">
            <summary className="cursor-pointer list-none text-muted-foreground hover:text-foreground">
              Which rows make these bars?
            </summary>
            <ul className="mt-1 space-y-1.5">
              {data.map((datum) => (
                <li key={datum.key}>
                  <p className="tabular-nums">
                    {datum.label} — {datum.display}
                  </p>
                  <p className="font-mono text-[10px] text-muted-foreground">
                    {datum.refs.join(" · ")}
                  </p>
                </li>
              ))}
            </ul>
          </details>
        </>
      )}
    </div>
  )
}

/**
 * The figures the author did not type. `sourceLabel` is on this card rather than only in the
 * toolbar because this is the card a recipient argues with, and "these are the numbers as saved on
 * 26 October" is the answer.
 */
export function MetricsSection({
  template,
  aggregate,
  sourceLabel,
}: {
  template: ReportTemplate
  aggregate: ReportAggregate | null
  sourceLabel: string
}) {
  const metrics = aggregate?.metrics
  return (
    <SectionCard
      title={SECTION_TITLE.metrics}
      icon={<BarChart3 className="h-4 w-4" />}
      className="md:col-span-2 xl:col-span-3"
    >
      <div className="space-y-4">
        <p className="text-[11px] text-muted-foreground">{sourceLabel}</p>
        <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-6">
          {TEMPLATE_METRICS[template].map((key) => (
            <Stat
              key={key}
              label={METRIC_LABEL[key]}
              value={metrics ? formatMetricValue(key, metrics[key]) : "—"}
              hint={metrics ? metricHint(key, metrics[key]) : undefined}
            />
          ))}
        </div>
        {aggregate === null ? (
          <EmptyNote>
            The charts read the same figures, so they appear once the period has resolved.
          </EmptyNote>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {TEMPLATE_CHARTS[template].map((chart) => (
              <ChartBlock key={chart} chart={chart} data={chartRows(aggregate, chart)} />
            ))}
          </div>
        )}
      </div>
    </SectionCard>
  )
}
