import type { Metadata } from "next"
import { LegalDoc } from "@/components/sections/legal-doc"
import { legalDocLinks, legalNoticeDoc } from "@/content/legal"

export function generateMetadata(): Metadata {
  return {
    title: "Legal Notice — JiraVision",
    description:
      "Company information, legal representatives, trademark and copyright details for JiraVision, Inc.",
    alternates: { canonical: "/legal-notice" },
  }
}

export default async function LegalNoticePage() {
  return (
    <LegalDoc
      topId="legal-notice-top"
      selfHref="/legal-notice"
      eyebrow="Legal"
      title={legalNoticeDoc.title}
      lastUpdated={legalNoticeDoc.lastUpdated}
      sections={legalNoticeDoc.sections}
      closingNote={legalNoticeDoc.closingNote}
      related={legalDocLinks}
      bg="grain"
      closingBg="grain"
    />
  )
}
