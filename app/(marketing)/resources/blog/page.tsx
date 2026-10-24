import type { Metadata } from "next"

import BlogIndex from "@/components/blog-index"
import { blogList } from "@/content/blog"

export const metadata: Metadata = {
  title: "Blog",
  description: `Articles on AI-assisted delivery, team wellbeing, gamification and the ethics of measuring people — ${blogList.length} posts from the team building JiraVision.`,
  alternates: { canonical: "/resources/blog" },
  openGraph: {
    title: "Blog",
    description:
      "Articles on AI-assisted delivery, team wellbeing, gamification and the ethics of measuring people.",
    url: "/resources/blog",
    type: "website",
  },
}

export default function BlogPage() {
  return <BlogIndex />
}
