"use client"

// The pack config page (operations engine, PR 11a). Everything the ops surfaces do — which entity
// tabs exist, which KPIs are counted, which reports and runbooks are previewed — is decided by the
// opsConfig stored on this member's role pack. That config has never been shown to anyone: you could
// see its effects but not the rules themselves. This page reads /api/ops/config and renders the whole
// thing: every log entity and its fields, every KPI and whether it carries a target, the report
// templates, playbook seeds, automation templates, recommendation rules and AI policy.
//
// It is read-only and says so. Where a section is empty it does not pad the gap: the empty states
// name the real reason (a derived pack has no rules nobody authored for it), which is the difference
// between this page being useful and being decoration.

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  BookOpenCheck,
  Bot,
  FileBarChart2,
  RefreshCw,
  ScrollText,
  Settings2,
  Spline,
  Target,
  TriangleAlert,
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { SectionCard, EmptyNote, PriorityPill } from "@/components/dashboard-kit"

type FieldDef = {
  type: string
  label: string
  required?: boolean
  default?: string | number
  values?: string[]
}

type EntityDef = { label: string; fields: Record<string, FieldDef> }

type KpiDef = {
  id: string
  label: string
  source: string
  aggregation: string
  unit: string
  target?: number
  field?: string
  numerator?: Record<string, unknown>
  denominator?: string | number
  filter?: Record<string, unknown>
}

type SeedDef = {
  id: string
  label: string
  frequency: string
  method: string[]
  phases: { name: string; steps: string[] }[]
}

type TemplateDef = {
  id: string
  label: string
  period: string
  sections: { kpiId: string; label: string }[]
}

type AutomationDef = {
  id: string
  label: string
  trigger: { entity: string; condition: string; params: Record<string, string | number> }
  action: { type: string; params: Record<string, string | number> }
}

type RuleDef = {
  id: string
  label: string
  entity: string
  condition: string
  params: Record<string, string | number>
  priority: string
  observation: string
  risk: string
  action: string
}

type AiPolicyDef = {
  level: string
  excludedEntities: string[]
  adminReadAccess: boolean
  managerReadAccess: boolean
}

type ConfigDef = {
  logs: Record<string, EntityDef>
  kpis: KpiDef[]
  playbookSeeds?: SeedDef[]
  reportTemplates?: TemplateDef[]
  automationTemplates?: AutomationDef[]
  recommendRules?: RuleDef[]
  aiPolicy?: AiPolicyDef
}

type ConfigResponse = {
  packKey: string | null
  discipline: string | null
  config: ConfigDef | null
  message?: string
}

const DERIVED_NOTE =
  "This pack runs on the derived baseline: the engine only declares what the pack can prove from its own register kinds and method. Rules, targets and checklists appear here once they are authored for this discipline — not invented by the importer."

function entityFieldCount(entity: EntityDef): number {
  return Object.keys(entity.fields).length
}

function totalFields(logs: Record<string, EntityDef>): number {
  return Object.values(logs).reduce((sum, entity) => sum + entityFieldCount(entity), 0)
}

function formatTarget(kpi: KpiDef): string | null {
  if (kpi.target === undefined) return null
  const value = kpi.aggregation === "ratio" ? kpi.target * 100 : kpi.target
  const rounded = Math.round(value * 100) / 100
  return `${rounded}${kpi.unit ? ` ${kpi.unit}` : ""}${kpi.aggregation === "ratio" ? "%" : ""}`
}

function paramsSummary(params: Record<string, string | number>): string {
  const entries = Object.entries(params)
  if (entries.length === 0) return "no parameters"
  return entries.map(([key, value]) => `${key}=${value}`).join(", ")
}

export function ConfigSkeleton() {
  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-9 w-40" />
      </div>
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-56 w-full" />
      <Skeleton className="h-56 w-full" />
    </div>
  )
}

function CountStrip({ config }: { config: ConfigDef }) {
  const withTarget = config.kpis.filter((kpi) => kpi.target !== undefined).length
  const stats: { label: string; value: number; hint?: string }[] = [
    { label: "Log entities", value: Object.keys(config.logs).length },
    { label: "Fields defined", value: totalFields(config.logs) },
    { label: "KPIs", value: config.kpis.length, hint: `${withTarget} with a target` },
    { label: "Playbook seeds", value: config.playbookSeeds?.length ?? 0 },
    { label: "Report templates", value: config.reportTemplates?.length ?? 0 },
    { label: "Automation templates", value: config.automationTemplates?.length ?? 0 },
    { label: "Recommendation rules", value: config.recommendRules?.length ?? 0 },
  ]
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-7">
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-lg border bg-card p-3">
          <p className="text-2xl font-semibold tabular-nums">{stat.value}</p>
          <p className="text-xs text-muted-foreground">{stat.label}</p>
          {stat.hint && <p className="text-[11px] text-muted-foreground/80">{stat.hint}</p>}
        </div>
      ))}
    </div>
  )
}

function EntityCard({ entityKey, entity }: { entityKey: string; entity: EntityDef }) {
  const fields = Object.entries(entity.fields)
  return (
    <SectionCard
      title={entity.label}
      icon={<ScrollText className="h-4 w-4" />}
      action={
        <Badge variant="outline">
          {fields.length} {fields.length === 1 ? "field" : "fields"}
        </Badge>
      }
    >
      <p className="mb-2 font-mono text-[11px] text-muted-foreground">{entityKey}</p>
      <div className="divide-y">
        {fields.map(([name, field]) => {
          const target = formatTargetName(field)
          return (
            <div key={name} className="flex flex-wrap items-baseline gap-x-2 gap-y-1 py-1.5">
              <span className="font-mono text-xs">{name}</span>
              <Badge variant="secondary" className="text-[10px]">
                {field.type}
              </Badge>
              {field.required && (
                <span className="text-[11px] font-medium text-amber-700">required</span>
              )}
              <span className="text-xs text-muted-foreground">{field.label}</span>
              {target && <span className="text-[11px] text-muted-foreground">{target}</span>}
            </div>
          )
        })}
      </div>
    </SectionCard>
  )
}

function formatTargetName(field: FieldDef): string | null {
  if (field.values?.length) return field.values.join(" · ")
  if (field.default !== undefined) return `default: ${field.default}`
  return null
}

function KpiCard({ kpis }: { kpis: KpiDef[] }) {
  return (
    <SectionCard
      title="KPI definitions"
      icon={<Target className="h-4 w-4" />}
      action={
        <Badge variant="outline">
          {kpis.filter((k) => k.target !== undefined).length} of {kpis.length} with a target
        </Badge>
      }
    >
      <div className="divide-y">
        {kpis.map((kpi) => {
          const target = formatTarget(kpi)
          return (
            <div key={kpi.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
              <div className="min-w-0">
                <p className="text-sm font-medium">{kpi.label}</p>
                <p className="font-mono text-[11px] text-muted-foreground">
                  {kpi.id} &middot; {kpi.aggregation}({kpi.field ?? kpi.source})
                  {kpi.filter ? ` where ${Object.keys(kpi.filter).join(", ")}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground">{kpi.unit || "count"}</span>
                {target ? (
                  <Badge className="shrink-0">{target}</Badge>
                ) : (
                  <Badge variant="outline" className="shrink-0 font-normal text-muted-foreground">
                    no target set
                  </Badge>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </SectionCard>
  )
}

function SeedCard({ seeds }: { seeds: SeedDef[] }) {
  return (
    <SectionCard title="Playbook seeds" icon={<BookOpenCheck className="h-4 w-4" />}>
      <div className="space-y-3">
        {seeds.map((seed) => (
          <div key={seed.id} className="rounded-md border bg-muted/10 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium">{seed.label}</p>
              <Badge variant="outline" className="capitalize">
                {seed.frequency}
              </Badge>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {seed.phases.length} {seed.phases.length === 1 ? "phase" : "phases"} &middot;{" "}
              {seed.id}
            </p>
            <ol className="mt-2 space-y-1">
              {seed.phases.map((phase, index) => (
                <li key={`${seed.id}-${index}`} className="flex gap-2 text-xs">
                  <span className="tabular-nums text-muted-foreground">{index + 1}.</span>
                  <span>
                    <span className="font-medium">{phase.name}</span>
                    {" — "}
                    {phase.steps.join("; ")}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
      <div className="mt-3">
        <Button size="sm" variant="outline" asChild>
          <Link href="/dashboard/ops/playbooks">
            <BookOpenCheck className="mr-2 h-4 w-4" aria-hidden />
            See them as runbook previews
          </Link>
        </Button>
      </div>
    </SectionCard>
  )
}

function ReportTemplateCard({ templates }: { templates: TemplateDef[] }) {
  return (
    <SectionCard title="Report templates" icon={<FileBarChart2 className="h-4 w-4" />}>
      <div className="space-y-3">
        {templates.map((template) => (
          <div key={template.id} className="rounded-md border bg-muted/10 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium">{template.label}</p>
              <Badge variant="outline" className="capitalize">
                {template.period}
              </Badge>
            </div>
            <ul className="mt-2 space-y-0.5">
              {template.sections.map((section, index) => (
                <li key={`${template.id}-${index}`} className="flex gap-2 text-xs">
                  <span className="tabular-nums text-muted-foreground">{index + 1}.</span>
                  <span>
                    {section.label}{" "}
                    <span className="font-mono text-[11px] text-muted-foreground">{section.kpiId}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mt-3">
        <Button size="sm" variant="outline" asChild>
          <Link href="/dashboard/ops/reports">
            <FileBarChart2 className="mr-2 h-4 w-4" aria-hidden />
            See them filled with your numbers
          </Link>
        </Button>
      </div>
    </SectionCard>
  )
}

function AutomationCard({ templates }: { templates: AutomationDef[] }) {
  return (
    <SectionCard title="Automation templates" icon={<Spline className="h-4 w-4" />}>
      <div className="space-y-3">
        {templates.map((template) => (
          <div key={template.id} className="rounded-md border bg-muted/10 p-3">
            <p className="text-sm font-medium">{template.label}</p>
            <p className="mt-1 font-mono text-[11px] text-muted-foreground">{template.id}</p>
            <dl className="mt-2 space-y-1 text-xs">
              <div className="flex flex-wrap gap-1">
                <dt className="text-muted-foreground">When:</dt>
                <dd>
                  <span className="font-mono">{template.trigger.entity}</span>{" "}
                  <span className="font-mono">{template.trigger.condition}</span>{" "}
                  <span className="text-muted-foreground">({paramsSummary(template.trigger.params)})</span>
                </dd>
              </div>
              <div className="flex flex-wrap gap-1">
                <dt className="text-muted-foreground">Then:</dt>
                <dd>
                  <span className="font-mono">{template.action.type}</span>{" "}
                  <span className="text-muted-foreground">({paramsSummary(template.action.params)})</span>
                </dd>
              </div>
            </dl>
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

function RuleCard({ rules }: { rules: RuleDef[] }) {
  return (
    <SectionCard title="Recommendation rules" icon={<TriangleAlert className="h-4 w-4" />}>
      <div className="space-y-3">
        {rules.map((rule) => (
          <div key={rule.id} className="rounded-md border bg-muted/10 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium">{rule.label}</p>
              <PriorityPill priority={rule.priority} />
            </div>
            <p className="mt-1 font-mono text-[11px] text-muted-foreground">
              {rule.entity} {rule.condition} ({paramsSummary(rule.params)})
            </p>
            <dl className="mt-2 space-y-1 text-xs">
              <div>
                <dt className="inline text-muted-foreground">Observation: </dt>
                <dd className="inline">{rule.observation}</dd>
              </div>
              <div>
                <dt className="inline text-muted-foreground">Risk: </dt>
                <dd className="inline">{rule.risk}</dd>
              </div>
              <div>
                <dt className="inline text-muted-foreground">Action: </dt>
                <dd className="inline">{rule.action}</dd>
              </div>
            </dl>
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

function AiPolicyCard({ policy }: { policy: AiPolicyDef }) {
  return (
    <SectionCard title="AI policy" icon={<Bot className="h-4 w-4" />}>
      <dl className="space-y-1 text-xs">
        <div className="flex gap-2">
          <dt className="text-muted-foreground">Level</dt>
          <dd className="font-mono">{policy.level}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-muted-foreground">Excluded entities</dt>
          <dd className="font-mono">{policy.excludedEntities.join(", ") || "none"}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-muted-foreground">Admin read access</dt>
          <dd>{policy.adminReadAccess ? "allowed" : "not allowed"}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-muted-foreground">Manager read access</dt>
          <dd>{policy.managerReadAccess ? "allowed" : "not allowed"}</dd>
        </div>
      </dl>
    </SectionCard>
  )
}

export default function OpsConfigClient() {
  const [data, setData] = useState<ConfigResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch("/api/ops/config")
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) {
        throw new Error(json?.message ?? json?.error ?? `Request failed (${res.status})`)
      }
      setData(json.data as ConfigResponse)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load the pack config.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const config = data?.config ?? null
  const json = useMemo(() => (config ? JSON.stringify(config, null, 2) : ""), [config])

  if (loading) return <ConfigSkeleton />

  if (error) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <h1 className="text-2xl font-bold">Pack config</h1>
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between gap-3">
            <span>{error}</span>
            <Button size="sm" variant="outline" onClick={() => void load()}>
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!config || !data?.packKey) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <h1 className="text-2xl font-bold">Pack config</h1>
        <SectionCard title="No operations configured" icon={<Settings2 className="h-4 w-4" />}>
          <EmptyNote>
            {data?.message ??
              `No operations config is stored for ${data?.discipline ?? "your discipline"} yet.`}{" "}
            <Link href="/dashboard/ops" className="underline underline-offset-2">
              Back to operations overview
            </Link>
            .
          </EmptyNote>
        </SectionCard>
      </div>
    )
  }

  const seeds = config.playbookSeeds ?? []
  const templates = config.reportTemplates ?? []
  const automations = config.automationTemplates ?? []
  const rules = config.recommendRules ?? []

  return (
    <div className="space-y-4 p-4 md:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Settings2 className="h-5 w-5" aria-hidden />
            Pack config
          </h1>
          <p className="text-sm text-muted-foreground">
            {data.discipline} &middot; pack{" "}
            <span className="font-mono text-xs">{data.packKey}</span> &middot; the rules the operations
            engine runs on for this discipline, read-only.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => void load()}>
          <RefreshCw className="mr-2 h-4 w-4" aria-hidden />
          Reload
        </Button>
      </header>

      <CountStrip config={config} />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          {Object.entries(config.logs).map(([entityKey, entity]) => (
            <EntityCard key={entityKey} entityKey={entityKey} entity={entity} />
          ))}
        </div>

        <div className="space-y-4">
          <KpiCard kpis={config.kpis} />

          {seeds.length > 0 ? (
            <SeedCard seeds={seeds} />
          ) : (
            <SectionCard title="Playbook seeds" icon={<BookOpenCheck className="h-4 w-4" />}>
              <EmptyNote>{DERIVED_NOTE}</EmptyNote>
            </SectionCard>
          )}

          {templates.length > 0 ? (
            <ReportTemplateCard templates={templates} />
          ) : (
            <SectionCard title="Report templates" icon={<FileBarChart2 className="h-4 w-4" />}>
              <EmptyNote>{DERIVED_NOTE}</EmptyNote>
            </SectionCard>
          )}

          {automations.length > 0 ? (
            <AutomationCard templates={automations} />
          ) : (
            <SectionCard title="Automation templates" icon={<Spline className="h-4 w-4" />}>
              <EmptyNote>{DERIVED_NOTE}</EmptyNote>
            </SectionCard>
          )}

          {rules.length > 0 ? (
            <RuleCard rules={rules} />
          ) : (
            <SectionCard title="Recommendation rules" icon={<TriangleAlert className="h-4 w-4" />}>
              <EmptyNote>{DERIVED_NOTE}</EmptyNote>
            </SectionCard>
          )}

          {config.aiPolicy && <AiPolicyCard policy={config.aiPolicy} />}

          <details className="rounded-lg border bg-card p-3">
            <summary className="cursor-pointer text-sm font-medium">Raw config JSON</summary>
            <pre className="mt-2 max-h-96 overflow-auto rounded-md bg-muted/30 p-3 font-mono text-[11px] leading-relaxed">
              {json}
            </pre>
          </details>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" asChild>
          <Link href="/dashboard/ops">Operations overview</Link>
        </Button>
        <Button size="sm" variant="outline" asChild>
          <Link href="/dashboard/ops/logs">Activity logs</Link>
        </Button>
        <Button size="sm" variant="outline" asChild>
          <Link href="/dashboard/ops/kpis">KPIs</Link>
        </Button>
        <Button size="sm" variant="outline" asChild>
          <Link href="/dashboard/ops/import">Import a document</Link>
        </Button>
      </div>
    </div>
  )
}
