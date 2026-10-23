import type { Metadata } from "next"
import { LegalDoc } from "@/components/sections/legal-doc"
import { accessibilityDoc, legalDocLinks } from "@/content/legal"

export function generateMetadata(): Metadata {
  return {
    title: "Accessibility Statement — JiraVision",
    description:
      "JiraVision's commitment to digital accessibility, WCAG 2.1 AA conformance status, known limitations and feedback channels.",
    alternates: { canonical: "/accessibility" },
  }
}

export default async function AccessibilityPage() {
  return (
    <LegalDoc
      topId="accessibility-top"
      selfHref="/accessibility"
      eyebrow="Inclusion"
      title={accessibilityDoc.title}
      lastUpdated={accessibilityDoc.lastUpdated}
      sections={accessibilityDoc.sections}
      closingNote={accessibilityDoc.closingNote}
      related={legalDocLinks}
      bg="dots"
      closingBg="dots"
    />
  )
}
