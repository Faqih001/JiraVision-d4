import type { Metadata } from "next"
import { LegalDoc } from "@/components/sections/legal-doc"
import { cookiesDoc, legalDocLinks } from "@/content/legal"

export function generateMetadata(): Metadata {
  return {
    title: "Cookie Policy — JiraVision",
    description:
      "How JiraVision uses cookies and similar technologies on our website and services, and how you can manage them.",
    alternates: { canonical: "/cookies" },
  }
}

export default async function CookiesPage() {
  return (
    <LegalDoc
      topId="cookies-top"
      selfHref="/cookies"
      eyebrow="Legal"
      title={cookiesDoc.title}
      lastUpdated={cookiesDoc.lastUpdated}
      sections={cookiesDoc.sections}
      closingNote={cookiesDoc.closingNote}
      related={legalDocLinks}
      bg="contour"
      closingBg="contour"
    />
  )
}
