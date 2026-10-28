import type React from "react"
import { redirect } from "next/navigation"
import DashboardLayout from "@/components/dashboard-layout"
import { resolveSession } from "@/lib/session"

// The workspace is entered here rather than from the browser. proxy.ts can only tell that a
// token is present; this can read the row behind it, so a session that has expired, been signed
// out on another device, or belonged to an account that has since been deleted is turned away
// before any dashboard data is fetched or rendered.
export default async function DashboardRootLayout({ children }: { children: React.ReactNode }) {
  const session = await resolveSession()

  if (session.state === "anonymous") redirect("/login")
  if (session.state === "invalid") redirect(`/login?reason=${session.reason}`)

  // `unreachable` deliberately falls through. The Neon compute is waking and nothing has said
  // this person is signed out; sending them to /login for that is the fake sign-out this whole
  // path exists to stop. The client shell waits and asks again.
  return <DashboardLayout>{children}</DashboardLayout>
}
