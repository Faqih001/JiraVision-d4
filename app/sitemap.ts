import type { MetadataRoute } from "next"
import { caseStudySlugs } from "@/content/case-studies"
import { changelog } from "@/content/changelog"
import { docSlugs } from "@/content/documentation"
import { webinarSlugs } from "@/content/webinars"

const site = "https://jiravision.vercel.app"

// Auth and transactional pages are excluded (they carry noindex at page level).
const marketing: { path: string; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]; priority: number }[] = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/pricing", changeFrequency: "monthly", priority: 0.9 },
  { path: "/about", changeFrequency: "monthly", priority: 0.6 },
  { path: "/contact", changeFrequency: "yearly", priority: 0.6 },
  { path: "/careers", changeFrequency: "monthly", priority: 0.5 },
  { path: "/faq", changeFrequency: "monthly", priority: 0.6 },
  { path: "/fit-quiz", changeFrequency: "monthly", priority: 0.7 },
  { path: "/changelog", changeFrequency: "weekly", priority: 0.5 },
  { path: "/roadmap", changeFrequency: "weekly", priority: 0.5 },
  { path: "/status", changeFrequency: "daily", priority: 0.4 },
  { path: "/templates", changeFrequency: "monthly", priority: 0.7 },
  { path: "/migration", changeFrequency: "monthly", priority: 0.7 },
  { path: "/compare", changeFrequency: "monthly", priority: 0.7 },
  { path: "/compare/generic-jira", changeFrequency: "monthly", priority: 0.6 },
  { path: "/compare/asana", changeFrequency: "monthly", priority: 0.6 },
  { path: "/compare/linear", changeFrequency: "monthly", priority: 0.6 },
  { path: "/compare/trello", changeFrequency: "monthly", priority: 0.6 },
  { path: "/compare/notion", changeFrequency: "monthly", priority: 0.6 },
  { path: "/one-pager", changeFrequency: "monthly", priority: 0.3 },
  ...["ai-scrum-master", "team-wellbeing", "gamification", "ethical-metrics"].map((slug) => ({
    path: `/products/${slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  })),
  ...["startups", "enterprise", "agencies", "remote-teams"].map((slug) => ({
    path: `/solutions/${slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  })),
  { path: "/resources/blog", changeFrequency: "weekly", priority: 0.6 },
  { path: "/resources/blog/ai-scrum-master-guide", changeFrequency: "yearly", priority: 0.5 },
  // The four dynamic posts from blogPosts in
  // app/(marketing)/resources/blog/[slug]/page.tsx — kept in sync by hand
  // because that list is not importable from a page module.
  ...[
    "ai-transforming-agile",
    "improve-team-wellbeing",
    "gamification-science",
    "ethical-ai-project-management",
  ].map((slug) => ({
    path: `/resources/blog/${slug}`,
    changeFrequency: "yearly" as const,
    priority: 0.5,
  })),
  { path: "/resources/documentation", changeFrequency: "monthly", priority: 0.5 },
  ...docSlugs().map((slug) => ({
    path: `/resources/documentation/${slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.4,
  })),
  { path: "/resources/case-studies", changeFrequency: "monthly", priority: 0.5 },
  ...caseStudySlugs().map((slug) => ({
    path: `/resources/case-studies/${slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.4,
  })),
  { path: "/resources/webinars", changeFrequency: "monthly", priority: 0.5 },
  ...webinarSlugs().map((slug) => ({
    path: `/resources/webinars/${slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.4,
  })),
  { path: "/terms", changeFrequency: "yearly", priority: 0.2 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.2 },
  { path: "/cookies", changeFrequency: "yearly", priority: 0.2 },
  { path: "/legal-notice", changeFrequency: "yearly", priority: 0.2 },
  { path: "/accessibility", changeFrequency: "yearly", priority: 0.2 },
]

export default function sitemap(): MetadataRoute.Sitemap {
  return marketing.map((entry) => ({
    url: `${site}${entry.path}`,
    lastModified:
      entry.path === "/changelog"
        ? new Date(changelog[0]!.date)
        : new Date("2026-10-23"),
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
  }))
}
