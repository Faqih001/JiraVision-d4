// Service status data for the topbar chip and /status page.
// NOTE(owner): this is a static manifest until wired to real health checks in V2-2.
// Update `status` values here (or the future route handler) when reality changes.

export interface ServiceStatus {
  name: string
  status: "operational" | "degraded" | "outage"
  note?: string
}

export const statusUpdatedAt = "2026-10-23T08:00:00Z"

export const services: ServiceStatus[] = [
  { name: "Marketing site", status: "operational" },
  { name: "Dashboard & API", status: "operational" },
  { name: "Jira sync", status: "operational" },
  { name: "Email notifications", status: "operational" },
]

export const overallStatus = services.every((s) => s.status === "operational")
  ? "All systems normal"
  : services.some((s) => s.status === "outage")
    ? "Partial outage"
    : "Degraded performance"
