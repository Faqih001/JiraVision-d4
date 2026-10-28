import type React from "react"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import DashboardLayout from "@/components/dashboard-layout"
import { safeNextPath } from "@/lib/auth/next-path"
import { resolveSession } from "@/lib/session"
import { readOnboardingGate } from "@/lib/onboarding/read"
import type { OnboardingGateDecision } from "@/lib/onboarding/state"
import { ensureGateRow } from "@/lib/onboarding/write"

// The workspace is entered here rather than from the browser. proxy.ts can only tell that a
// token is present; this can read the row behind it, so a session that has expired, been signed
// out on another device, or belonged to an account that has since been deleted is turned away
// before any dashboard data is fetched or rendered.
export default async function DashboardRootLayout({ children }: { children: React.ReactNode }) {
  const session = await resolveSession()

  // Where they were trying to go, so the login round-trip lands back there. The value came from
  // proxy.ts, but it is validated anyway — a header is still an input, not a promise.
  const requested = safeNextPath((await headers()).get("x-jv-path"))
  const loginHref = (reason?: string) => {
    const params = new URLSearchParams({ next: requested })
    if (reason) params.set("reason", reason)
    return `/login?${params.toString()}`
  }

  if (session.state === "anonymous") redirect(loginHref())
  if (session.state === "invalid") redirect(loginHref(session.reason))

  // `unreachable` deliberately falls through. The Neon compute is waking and nothing has said
  // this person is signed out; sending them to /login for that is the fake sign-out this whole
  // path exists to stop. The client shell waits and asks again.

  if (session.state === "active") {
    // A failed gate read is the same rule as a failed session read: a database that did not
    // answer never decides where somebody goes. It falls through and the next request asks again.
    let gate: OnboardingGateDecision | null = null
    try {
      gate = await readOnboardingGate(session.user)
    } catch {
      gate = null
    }

    if (gate?.redirect) {
      // First contact is the moment an account becomes a record: the row says the gate has
      // seen it, without claiming progress the member never made.
      if (!gate.row) await ensureGateRow(session.user.id).catch(() => undefined)
      redirect("/onboarding")
    }
  }

  return <DashboardLayout>{children}</DashboardLayout>
}
