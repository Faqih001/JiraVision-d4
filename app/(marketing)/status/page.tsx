import type { Metadata } from "next"
import { overallStatus, services, statusUpdatedAt } from "@/content/status"
import { Section } from "@/components/sections/section"

export const metadata: Metadata = {
  title: "Status — JiraVision",
  description: "Live service status for JiraVision.",
  alternates: { canonical: "/status" },
}

const dot = {
  operational: "bg-success",
  degraded: "bg-warning",
  outage: "bg-destructive",
} as const

export default function StatusPage() {
  return (
    <Section bg="grid">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-clay">Status</p>
      <h1 className="font-display text-4xl font-medium tracking-tight md:text-5xl">{overallStatus}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Last updated{" "}
        <time dateTime={statusUpdatedAt}>
          {new Date(statusUpdatedAt).toLocaleString("en", { dateStyle: "long", timeStyle: "short" })}
        </time>
      </p>
      <ul className="mt-10 max-w-xl divide-y rounded-lg border bg-card shadow-soft">
        {services.map((service) => (
          <li key={service.name} className="flex items-center justify-between px-5 py-4">
            <div>
              <div className="text-sm font-medium">{service.name}</div>
              {service.note && <div className="text-xs text-muted-foreground">{service.note}</div>}
            </div>
            <span className="flex items-center gap-2 text-xs capitalize text-muted-foreground">
              <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${dot[service.status]}`} />
              {service.status}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-6 max-w-xl text-xs text-muted-foreground">
        This page reflects the current service manifest. Automated health checks are on the roadmap — until then,
        report issues via <a href="mailto:support@jiravision.app" className="font-medium text-primary hover:underline">support@jiravision.app</a>.
      </p>
    </Section>
  )
}
