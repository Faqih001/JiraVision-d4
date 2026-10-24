import { blogList } from "@/content/blog"
import { changelog } from "@/content/changelog"
import { faqEntries } from "@/content/faq"
import { productItems, resourceItems, solutionItems } from "@/content/site"

// Static site search corpus for the Cmd/Ctrl+K palette. Derived from the same
// content modules the pages render from, so the index can't drift from the nav.
// (FAQ entries move here as data files in V2-5 when /faq becomes data-driven.)

export type SearchGroup = "Pages" | "Products" | "Solutions" | "Resources" | "Blog" | "FAQ" | "Changelog"

export interface SearchEntry {
  title: string
  subtitle: string
  href: string
  group: SearchGroup
}

const nav = (items: typeof productItems, group: SearchGroup): SearchEntry[] =>
  items.map((item) => ({ title: item.title, subtitle: item.description, href: item.href, group }))

export const searchIndex: SearchEntry[] = [
  { title: "Home", subtitle: "AI-native project management with wellbeing at the core", href: "/", group: "Pages" },
  { title: "Pricing", subtitle: "Plans, seat calculator and comparison table", href: "/pricing", group: "Pages" },
  { title: "About", subtitle: "Mission, principles and the team", href: "/about", group: "Pages" },
  { title: "Careers", subtitle: "Open roles and how we work", href: "/careers", group: "Pages" },
  { title: "Contact", subtitle: "Talk to the team, book a demo", href: "/contact", group: "Pages" },
  { title: "FAQ", subtitle: "Common questions about JiraVision", href: "/faq", group: "Pages" },
  { title: "Changelog", subtitle: "What shipped, newest first", href: "/changelog", group: "Pages" },
  { title: "Status", subtitle: "Service health", href: "/status", group: "Pages" },
  { title: "Printable one-pager", subtitle: "One-page overview, built for printing", href: "/one-pager", group: "Pages" },
  { title: "Log in", subtitle: "Your workspace", href: "/login", group: "Pages" },
  { title: "Sign up", subtitle: "Create an account", href: "/signup", group: "Pages" },
  ...nav(productItems, "Products"),
  ...nav(solutionItems, "Solutions"),
  ...nav(resourceItems, "Resources"),
  ...blogList.map((post) => ({
    title: post.title,
    subtitle: post.excerpt.slice(0, 90) + "…",
    href: `/resources/blog/${post.slug}`,
    group: "Blog" as SearchGroup,
  })),
  ...faqEntries.map((entry) => ({
    title: entry.q,
    subtitle: `${entry.category} FAQ`,
    href: `/faq?q=${encodeURIComponent(entry.q)}`,
    group: "FAQ" as SearchGroup,
  })),
  ...changelog.map((entry) => ({
    title: `${entry.version} — ${entry.title}`,
    subtitle: entry.body.slice(0, 90) + "…",
    href: "/changelog",
    group: "Changelog" as SearchGroup,
  })),
]
