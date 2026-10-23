import type { Metadata } from "next"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Section, SectionHeading } from "@/components/sections/section"
import { CheckCircle2, AlertCircle } from "lucide-react"

export const metadata: Metadata = {
  title: "Confirm subscription | JiraVision",
  description: "Confirm your JiraVision newsletter subscription.",
  robots: { index: false },
}

export default async function NewsletterConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const ok = status === "ok"

  return (
    <Section bg="dots" className="min-h-[60vh]">
      <div className="mx-auto max-w-md text-center">
        {ok ? (
          <>
            <CheckCircle2 className="mx-auto h-10 w-10 text-success" aria-hidden="true" />
            <h1 className="mt-4 font-display text-3xl font-medium tracking-tight">You&apos;re on the list</h1>
            <p className="prose-body mx-auto mt-3">
              Your email is confirmed. Expect occasional notes on AI-native project management — and nothing else.
            </p>
          </>
        ) : (
          <>
            <AlertCircle className="mx-auto h-10 w-10 text-warning" aria-hidden="true" />
            <h1 className="mt-4 font-display text-3xl font-medium tracking-tight">Link not recognised</h1>
            <p className="prose-body mx-auto mt-3">
              This confirmation link is invalid or has expired. You can subscribe again from the bottom of any page.
            </p>
          </>
        )}
        <Button asChild className="mt-8" variant={ok ? "outline" : "default"}>
          <Link href="/">{ok ? "Back to JiraVision" : "Try again"}</Link>
        </Button>
      </div>
    </Section>
  )
}
