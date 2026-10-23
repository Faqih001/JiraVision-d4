import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, Check, Lock, Radio } from "lucide-react"
import { Section, SectionHeading } from "@/components/sections/section"
import {
  PageHero,
  ProblemSection,
  FeatureGridSection,
  SplitFeature,
  StepsSection,
  MethodSection,
  HonestFitSection,
  AudienceSection,
  QuotesSection,
  FaqSection,
  RelatedSection,
  CtaSection,
} from "@/components/sections/page-kit"
import {
  migrationAnchorNav,
  migrationAudience,
  migrationCta,
  migrationDataBand,
  migrationDecisions,
  migrationFaq,
  migrationFit,
  migrationHero,
  migrationMethod,
  migrationProblem,
  migrationQuotes,
  migrationRelated,
  migrationSources,
  migrationSteps,
  type MigrationSource,
} from "@/content/migration"
import { MigrationPlanner } from "./migration-planner"

export function generateMetadata(): Metadata {
  return {
    title: "Migration Hub — Bring your history with you | JiraVision",
    description:
      "JiraVision sits on your Jira, so most teams migrate nothing at all. Coming from Asana, Linear, Trello or Notion? Build a phase-by-phase plan with exit criteria and download the checklist.",
    alternates: { canonical: "/migration" },
  }
}

function AnchorNav() {
  return (
    <nav aria-label="On this page" className="border-b bg-surface">
      <div className="container flex flex-wrap items-center gap-x-6 gap-y-2 py-3">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          On this page
        </span>
        {migrationAnchorNav.links.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            {link.label}
          </a>
        ))}
      </div>
    </nav>
  )
}

/** Decorative hero mock: Jira stays authoritative, the layer sits on top of it. */
function JiraLayerMock() {
  const rows = [
    { label: "Issues & history", note: "stays in Jira" },
    { label: "Sprints & story points", note: "read, not recreated" },
    { label: "Attachments", note: "never copied" },
  ]
  return (
    <div aria-hidden="true" className="select-none">
      <div className="rounded-lg border bg-surface p-3 shadow-soft-md">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Your Jira project</span>
          <span className="flex gap-1.5">
            <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />
            <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />
            <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />
          </span>
        </div>
        <div className="rounded-md bg-card p-3">
          <ul className="space-y-2 text-xs">
            {rows.map((r) => (
              <li key={r.label} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
                <span className="flex items-center gap-2">
                  <Lock className="h-3 w-3 text-muted-foreground" />
                  {r.label}
                </span>
                <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  {r.note}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-2 rounded-md border border-primary/40 bg-primary/5 px-3 py-2">
            <p className="flex items-center justify-between text-[11px] font-medium text-primary">
              <span className="flex items-center gap-1.5">
                <Radio className="h-3 w-3" />
                JiraVision layer
              </span>
              <span className="font-mono text-[10px]">read-only until you approve</span>
            </p>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {["Draft sprint", "Capacity check", "You approve"].map((s, i) => (
                <span
                  key={s}
                  className="rounded-sm border bg-surface px-2 py-1 text-center text-[10px] text-muted-foreground"
                >
                  {i + 1}. {s}
                </span>
              ))}
            </div>
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground">
            Illustrative UI mock, built in code — not a screenshot of your project.
          </p>
        </div>
      </div>
    </div>
  )
}

function FieldMapTable({ source, hint }: { source: MigrationSource; hint?: string }) {
  return (
    <div className="overflow-hidden rounded-lg border bg-card shadow-soft">
      <div className="border-b bg-muted/30 px-5 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {source.kicker} → JiraVision
        </p>
      </div>
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Sample field mapping for {source.label}</caption>
        <tbody>
          {source.fieldMap.map((row) => (
            <tr key={`${row.them}-${row.ours}`} className="border-b last:border-b-0 align-top">
              <th scope="row" className="w-[38%] px-5 py-3 font-medium">
                {row.them}
                <span className="mt-0.5 block text-xs font-normal text-muted-foreground">{row.ours}</span>
              </th>
              <td className="px-5 py-3">
                <span className="text-xs text-muted-foreground">{row.note}</span>
              </td>
              <td className="px-5 py-3 text-right">
                <span
                  className={
                    row.how === "carries"
                      ? "rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary"
                      : row.how === "rebuilt"
                        ? "rounded-full border border-warning/40 bg-warning/10 px-2 py-0.5 text-[10px] font-medium text-warning"
                        : "rounded-full border px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                  }
                >
                  {row.how}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {hint && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/20 px-5 py-3">
          <p className="text-xs text-muted-foreground">{hint}</p>
          <Link
            href="#planner"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            See your source in the planner
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      )}
    </div>
  )
}

function DualRunMock() {
  return (
    <div aria-hidden="true" className="select-none rounded-lg border bg-surface p-5 shadow-soft">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Parallel run · two sprints
      </p>
      <div className="mt-4 space-y-3">
        {[
          { sprint: "Sprint A", old: "writable", ours: "working copy", gap: "2 gaps logged" },
          { sprint: "Sprint B", old: "frozen for new boards", ours: "working copy", gap: "0 blocking gaps" },
        ].map((row) => (
          <div key={row.sprint} className="rounded-md border bg-card px-3 py-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">{row.sprint}</span>
              <span className="font-mono text-[10px] text-muted-foreground">{row.gap}</span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
              <span className="rounded-sm border border-dashed px-2 py-1 text-center text-muted-foreground">
                old tool · {row.old}
              </span>
              <span className="rounded-sm border border-primary/40 bg-primary/5 px-2 py-1 text-center text-primary">
                JiraVision · {row.ours}
              </span>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">
        Illustrative sequence, not a schedule. The gate is “zero blocking gaps across two
        consecutive sprints”.
      </p>
    </div>
  )
}

function RollbackCard() {
  const ladder = [
    { step: "During discovery", body: "Nothing to undo — the integration is read-only." },
    { step: "During the parallel run", body: "Keep writing in the old tool. It was never turned off." },
    { step: "After cutover", body: "Remove the read-only flag, carry on as before." },
    { step: "After archive", body: "Still nothing deleted by us. The old workspace is a normal account." },
  ]
  return (
    <ol className="space-y-3">
      {ladder.map((r) => (
        <li key={r.step} className="flex gap-3 rounded-lg border bg-card p-4 shadow-soft">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
          <div>
            <p className="text-sm font-semibold">{r.step}</p>
            <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{r.body}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}

const accentTone = {
  carries: "text-primary",
  stays: "text-clay",
  excluded: "text-muted-foreground",
} as const

function DataHandlingBand() {
  return (
    <Section id={migrationDataBand.id} bg="grain" className="border-y">
      <SectionHeading
        eyebrow={migrationDataBand.eyebrow}
        title={migrationDataBand.title}
        intro={migrationDataBand.intro}
      />
      <div className="grid gap-5 md:grid-cols-3">
        {migrationDataBand.columns.map((col) => (
          <div key={col.title} className="flex flex-col rounded-lg border bg-card p-6 shadow-soft">
            <h3 className={`text-sm font-semibold uppercase tracking-wide ${accentTone[col.accent]}`}>
              {col.title}
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {col.items.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mt-6 rounded-lg border border-clay/40 bg-clay/5 p-5">
        <p className="text-sm leading-relaxed">{migrationDataBand.footnote}</p>
        <Link
          href={migrationDataBand.footnoteCta.href}
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          {migrationDataBand.footnoteCta.label}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </Section>
  )
}

export default async function MigrationHubPage() {
  // The planner already renders the selected source's map (Jira by default), so
  // this editorial table shows a different, harder case to avoid printing the
  // same five rows twice.
  const exampleSource = migrationSources.find((s) => s.id === "asana") ?? migrationSources[0]!

  return (
    <>
      <PageHero
        eyebrow={migrationHero.eyebrow}
        title={migrationHero.title}
        subtitle={migrationHero.subtitle}
        bullets={migrationHero.bullets}
        badge={migrationHero.badge}
        primary={migrationHero.primary}
        secondary={migrationHero.secondary}
        visual={<JiraLayerMock />}
      />
      <AnchorNav />
      <ProblemSection
        title={migrationProblem.title}
        intro={migrationProblem.intro}
        items={migrationProblem.items}
        bg="dots"
      />
      <DataHandlingBand />
      <StepsSection
        id={migrationSteps.id}
        eyebrow={migrationSteps.eyebrow}
        title={migrationSteps.title}
        intro={migrationSteps.intro}
        steps={migrationSteps.steps}
        bg="contour"
      />
      <MigrationPlanner />
      <div id="mapping">
        <SplitFeature
          index="01"
          title="Field mapping is where a migration is won or lost"
          body="Importers rarely fail loudly. They fail by putting your sizing field in the wrong place, or by turning a grouping section into a status column that nobody can get work out of. So the mapping sheet is the artefact: every source field gets a verdict before anything moves."
          bullets={[
            "Statuses become columns on purpose, one decision each",
            "One numeric field is nominated as the sizing field — no exceptions",
            "Fields with no equivalent become labels or are dropped in writing",
            "Anything the importer will refuse is listed before it runs",
          ]}
          visual={
            <FieldMapTable
              source={exampleSource}
              hint="Asana as the example — its sections are the classic “is this a status or a grouping?” argument."
            />
          }
        />
      </div>
      <div id="dualrun">
        <SplitFeature
          index="02"
          title="Two sprints with both tools open"
          body="The parallel run is the phase people want to skip and the reason the rest survive contact with reality. The old tool stays writable, JiraVision becomes the working copy, and every place the old tool wins gets logged instead of argued about."
          bullets={[
            "Committed vs delivered compared at each retro, in both tools",
            "New dashboards and reports are frozen in the old tool",
            "Exit criterion is concrete: zero blocking gaps across two sprints",
            "For Jira teams it is the default state, not an extra project",
          ]}
          visual={<DualRunMock />}
          flip
          bg="band-sage"
        />
      </div>
      <div id="rollback">
        <SplitFeature
          index="03"
          title="Rollback is a setting, not an apology"
          body="Every phase here leaves a way out, which is why saying yes is low-stakes. We never delete anything in the old workspace, and archive means read-only — a flag somebody with admin rights can turn back off."
          bullets={[
            "Read-only archive, indefinite, unless you ask us to help delete",
            "Backup location is written down during the archive phase",
            "Jira teams can uninstall the layer and lose nothing",
            "The plan pauses anywhere; there is no point of no return",
          ]}
          visual={<RollbackCard />}
        />
      </div>
      <FeatureGridSection
        eyebrow={migrationDecisions.eyebrow}
        title={migrationDecisions.title}
        intro={migrationDecisions.intro}
        items={migrationDecisions.items}
        bg={migrationDecisions.bgVariant}
      />
      <div id="method">
        <MethodSection
          eyebrow={migrationMethod.eyebrow}
          title={migrationMethod.title}
          intro={migrationMethod.intro}
          rows={migrationMethod.rows}
          bg={migrationMethod.bgVariant}
        />
      </div>
      <HonestFitSection
        title={migrationFit.title}
        good={migrationFit.good}
        bad={migrationFit.bad}
        bg={migrationFit.bgVariant}
      />
      <div id="sources">
        <AudienceSection
          eyebrow={migrationAudience.eyebrow}
          title={migrationAudience.title}
          intro={migrationAudience.intro}
          items={migrationAudience.items}
          bg={migrationAudience.bgVariant}
        />
      </div>
      <QuotesSection title={migrationQuotes.title} items={migrationQuotes.items} bg={migrationQuotes.bgVariant} />
      <div id="faq">
        <FaqSection
          title={migrationFaq.title}
          items={migrationFaq.items}
          moreHref={migrationFaq.moreHref}
          moreLabel={migrationFaq.moreLabel}
          bg={migrationFaq.bgVariant}
        />
      </div>
      <RelatedSection
        eyebrow={migrationRelated.eyebrow}
        title={migrationRelated.title}
        items={migrationRelated.items}
        bg={migrationRelated.bgVariant}
      />
      <CtaSection
        title={migrationCta.title}
        body={migrationCta.body}
        primary={migrationCta.primary}
        secondary={migrationCta.secondary}
        bg="inverse"
        watermark={migrationCta.watermark}
      />
    </>
  )
}
