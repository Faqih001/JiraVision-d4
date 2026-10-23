import type { Metadata } from "next"
import { LegalDoc } from "@/components/sections/legal-doc"
import { legalDocLinks, termsDoc } from "@/content/legal"

export function generateMetadata(): Metadata {
  return {
    title: "Terms of Service — JiraVision",
    description:
      "The terms that govern your access to and use of JiraVision's website, products, and services.",
    alternates: { canonical: "/terms" },
  }
}

export default async function TermsPage() {
  return (
    <LegalDoc
      topId="terms-top"
      selfHref="/terms"
      eyebrow="Legal"
      title={termsDoc.title}
      lastUpdated={termsDoc.lastUpdated}
      sections={termsDoc.sections}
      closingNote={termsDoc.closingNote}
      related={legalDocLinks}
      bg="grain"
      closingBg="grain"
    />
  )
}
