import type { Metadata } from "next"

import WebinarIndex from "@/components/webinar-index"
import { webinarList } from "@/content/webinars"

export const metadata: Metadata = {
  title: "Webinars",
  description: `Session outlines for ${webinarList.length} JiraVision walkthroughs — AI Scrum Master, Ethical Metrics and Gamification — each linking to the documentation and product pages that cover the same ground.`,
  alternates: { canonical: "/resources/webinars" },
  openGraph: {
    title: "JiraVision webinars",
    description: `Session outlines for ${webinarList.length} JiraVision walkthroughs.`,
    url: "/resources/webinars",
    type: "website",
  },
}

export default function WebinarsPage() {
  return <WebinarIndex />
}
