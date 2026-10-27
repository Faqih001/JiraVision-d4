import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/session"
import { readOnboardingView } from "@/lib/onboarding/read"
import { OnboardingWizard } from "./onboarding-wizard"

export const dynamic = "force-dynamic"

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>
}) {
  const session = await getCurrentUser()
  if (!session) redirect("/login")

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