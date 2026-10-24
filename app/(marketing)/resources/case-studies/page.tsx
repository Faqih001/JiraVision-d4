import type { Metadata } from "next"

import CaseStudyIndex from "@/components/case-study-index"
import { caseStudyList } from "@/content/case-studies"

export const metadata: Metadata = {
  title: "Deployment scenarios",
  description: `Three illustrative deployment scenarios — ${caseStudyList.length} worked setups showing which JiraVision settings to turn on, in order, and where each measure is computed. No invented results.`,
  alternates: { canonical: "/resources/case-studies" },
  openGraph: {
    title: "JiraVision deployment scenarios",
    description:
      "Illustrative scenarios, not customer stories: the settings to turn on and where each number comes from.",
    url: "/resources/case-studies",
    type: "website",
  },
}

export default function CaseStudiesPage() {
  return <CaseStudyIndex />
}
