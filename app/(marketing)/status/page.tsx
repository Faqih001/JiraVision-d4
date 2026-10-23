import type { Metadata } from "next"
import {
  PageHero,
  MethodSection,
  FeatureGridSection,
  StepsSection,
  ProblemSection,
  UpdatesSection,
  RelatedSection,
  CtaSection,
} from "@/components/sections/page-kit"
import { Section, SectionHeading } from "@/components/sections/section"
import { changelog } from "@/content/changelog"
import {
  overallStatus,
  services,
  statusUpdatedAt,
  statusHero,
  reviewRows,
  componentExplainers,
  incidentProcess,
  honestGaps,
  commitments,
  whereToHear,
  statusCta,
} from "@/content/status"

export function generateMetadata(): Metadata {
  return {
    title: "Status — JiraVision",
    description:
      "Service status for JiraVision, maintained by hand and labelled as such: per-component states, the review cadence behind them, and what this page does not measure yet.",
    alternates: { canonical: "/status" },
  }
}

const dot = {
  operational: "bg-success",
  degraded: "bg-warning",
  outage: "bg-destructive",
} as const

export default async function StatusPage() {
  return (
    <>
      <PageHero
        eyebrow={statusHero.eyebrow}
        badge={overallStatus}
        title={statusHero.title}
        subtitle={statusHero.subtitle}
        bullets={statusHero.bullets}
        primary={statusHero.primary}
        secondary={statusHero.secondary}
        visual={
          <div className="rounded-lg border bg-card p-6 shadow-soft">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-clay">Current posture</p>
            <ul className="mt-4 space-y-2.5">
              {services.map((service) => (
                <li key={service.name} className="flex items-center justify-between gap-4 text-sm">
                  <span className="font-medium">{service.name}</span>
                  <span className="flex items-center gap-2 text-xs capitalize text-muted-foreground">
                    <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${dot[service.status]}`} />
                    {service.status}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
              Last reviewed{" "}
              <time dateTime={statusUpdatedAt}>
                {new Date(statusUpdatedAt).toLocaleString("en", { dateStyle: "medium", timeStyle: "short" })}
              </time>{" "}
              — by a human, not a probe.
            </p>
          </div>
        }
      />
      <Section bg="grid" className="border-b">
        <SectionHeading
          eyebrow="The manifest"
          title="Component states, right now"
          intro="Every part of the service and its current state. These rows are verified during manual review passes; the caveat on automated checks sits directly below the table."
        />
        <div className="overflow-x-auto rounded-lg border bg-card shadow-soft">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <caption className="sr-only">Current status of each JiraVision service component</caption>
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <th scope="col" className="px-5 py-3 font-semibold">Component</th>
                <th scope="col" className="px-5 py-3 font-semibold">Status</th>
                <th scope="col" className="px-5 py-3 font-semibold">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {services.map((service) => (
                <tr key={service.name}>
                  <th scope="row" className="px-5 py-4 font-medium">{service.name}</th>
                  <td className="px-5 py-4">
                    <span className="flex items-center gap-2 text-xs capitalize text-muted-foreground">
                      <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${dot[service.status]}`} />
                      {service.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 leading-relaxed text-muted-foreground">
                    {service.note ?? "No caveats on this component today."}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-6 max-w-xl text-xs text-muted-foreground">
          This page reflects the current service manifest. Automated health checks are on the roadmap — until then,
          report issues via <a href="mailto:support@jiravision.app" className="font-medium text-primary hover:underline">support@jiravision.app</a>.
        </p>
      </Section>
      <MethodSection
        eyebrow={reviewRows.eyebrow}
        title={reviewRows.title}
        intro={reviewRows.intro}
        rows={reviewRows.rows}
        bg="dots"
      />
      <FeatureGridSection
        eyebrow={componentExplainers.eyebrow}
        title={componentExplainers.title}
        intro={componentExplainers.intro}
        items={componentExplainers.items}
        bg="grain"
      />
      <StepsSection
        eyebrow={incidentProcess.eyebrow}
        title={incidentProcess.title}
        intro={incidentProcess.intro}
        steps={incidentProcess.steps}
        bg="contour"
      />
      <ProblemSection
        eyebrow={honestGaps.eyebrow}
        title={honestGaps.title}
        intro={honestGaps.intro}
        items={honestGaps.items}
        bg="hatch"
      />
      <RelatedSection
        eyebrow={whereToHear.eyebrow}
        title={whereToHear.title}
        items={whereToHear.items}
        bg="band-sage"
      />
      <MethodSection
        eyebrow={commitments.eyebrow}
        title={commitments.title}
        rows={commitments.rows}
        bg="grid"
      />
      <UpdatesSection
        title="Recent changes that touched these systems"
        entries={changelog.slice(0, 3)}
        bg="dots"
      />
      <CtaSection
        title={statusCta.title}
        body={statusCta.body}
        primary={statusCta.primary}
        secondary={statusCta.secondary}
        bg="inverse"
        watermark="S"
      />
    </>
  )
}
