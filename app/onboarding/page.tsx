import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/session"
import { safeNextPath } from "@/lib/auth/next-path"
import { readOnboardingView } from "@/lib/onboarding/read"
import { OnboardingWizard } from "./onboarding-wizard"

export const dynamic = "force-dynamic"

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>
}) {
  const session = await getCurrentUser()
  if (!session) {
    // The invite token travels in the path proxy.ts recorded, so an invited visitor who has to
    // sign in first comes back to the same link instead of a bare wizard.
    const requested = safeNextPath((await headers()).get("x-jv-path"))
    redirect(`/login?next=${encodeURIComponent(requested)}`)
  }

  const view = await readOnboardingView(session)
  const params = await searchParams
  const invite = typeof params.invite === "string" && params.invite.length <= 200 ? params.invite : null

  return (
    <OnboardingWizard
      initial={view}
      inviteToken={invite}
      account={{ name: session.name, email: session.email, avatar: session.avatar }}
    />
  )
}