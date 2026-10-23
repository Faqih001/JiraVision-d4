import type { Metadata } from "next"
import { LegalDoc } from "@/components/sections/legal-doc"
import { legalDocLinks, privacyDoc } from "@/content/legal"

export function generateMetadata(): Metadata {
  return {
    title: "Privacy Policy — JiraVision",
    description:
      "How JiraVision collects, uses, discloses and safeguards your information when you use our website, products, and services.",
    alternates: { canonical: "/privacy" },
  }
}

export default async function PrivacyPage() {
  return (
    <LegalDoc
      topId="privacy-top"
      selfHref="/privacy"
      eyebrow="Legal"
      title={privacyDoc.title}
      lastUpdated={privacyDoc.lastUpdated}
      sections={privacyDoc.sections}
      closingNote={privacyDoc.closingNote}
      related={legalDocLinks}
      bg="dots"
      closingBg="dots"
    />
  )
}
