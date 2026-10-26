"use client"

// The builder's cards. No arithmetic and no date maths live here: a card renders rows the API
// already counted, and the period it labels comes from the Period object the caller resolved.

import { CalendarRange, ChevronLeft, ChevronRight, FileText, Inbox } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { SectionCard } from "@/components/dashboard-kit"
import {
  PERIOD_LABEL,
  PERIOD_TYPES,
  shiftPeriodAnchor,
  type Period,
  type PeriodType,
} from "@/lib/reports/period"
import type { ReportDto } from "@/lib/reports/report-fields"
import { REPORT_TEMPLATES, TEMPLATE_LABEL } from "@/lib/reports/templates"
import { AUTO_TEMPLATE, type ReportState, type TemplateChoice } from "@/lib/reports/view-state"

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
