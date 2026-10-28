// Central content for the marketing chrome (navbar, footer, announcements).
// NOTE(owner): values marked PLACEHOLDER must be replaced with verified data.

export interface NavItem {
  title: string
  href: string
  description: string
  image?: string
}

const unsplash = (id: string, w = 320) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=70`

export const productItems: NavItem[] = [
  {
    title: "AI Scrum Master",
    href: "/products/ai-scrum-master",
    description: "Sprint planning that reads capacity, history and goals",
    image: unsplash("photo-1531403009284-440f080d1e12"),
  },
  {
    title: "Team Wellbeing",
    href: "/products/team-wellbeing",
    description: "Mood-aware workload balancing to prevent burnout",
    image: unsplash("photo-1573497019940-1c28c88b4f3e"),
  },
  {
    title: "Gamification Suite",
    href: "/products/gamification",
    description: "Skill trees and rewards that fit real engineering work",
    image: unsplash("photo-1511512578047-dfb367046420"),
  },
  {
    title: "Ethical Metrics",
    href: "/products/ethical-metrics",
    description: "DEI, workload and pay-equity monitoring",
    image: unsplash("photo-1551836022-d5d88e9218df"),
  },
]

export const solutionItems: NavItem[] = [
  {
    title: "For Startups",
    href: "/solutions/startups",
    description: "Structure without bureaucracy for fast-moving teams",
    image: unsplash("photo-1559136555-9303baea8ebd"),
  },
  {
    title: "For Enterprise",
    href: "/solutions/enterprise",
    description: "Governance and reporting for large organisations",
    image: unsplash("photo-1486406146926-c627a92ad1ab"),
  },
  {
    title: "For Agencies",
    href: "/solutions/agencies",
    description: "Client work, retainers and capacity in one view",
    image: unsplash("photo-1556761175-5973dc0f32e7"),
  },
  {
    title: "For Remote Teams",
    href: "/solutions/remote-teams",
    description: "Async-first planning across timezones",
    image: unsplash("photo-1528901166007-3784c7dd3653"),
  },
]

export const resourceItems: NavItem[] = [
  {
    title: "Documentation",
    href: "/resources/documentation",
    description: "Guides and API references",
    image: unsplash("photo-1456406644174-8ddd4cd52a06"),
  },
  {
    title: "Blog",
    href: "/resources/blog",
    description: "Notes on AI-native project management",
    image: unsplash("photo-1499750310107-5fef28a66643"),
  },
  {
    title: "Case Studies",
    href: "/resources/case-studies",
    description: "Illustrative deployment scenarios — the settings to turn on, in order",
    image: unsplash("photo-1454165804606-c3d57bc86b40"),
  },
  {
    title: "Templates",
    href: "/templates",
    description: "Sprint, wellbeing and incident playbooks you can copy",
    image: unsplash("photo-1517245386807-bb43f82c33c4"),
  },
  {
    title: "Compare",
    href: "/compare",
    description: "Honest side-by-sides with the tools you already evaluate",
    image: unsplash("photo-1460925895917-afdab827c52f"),
  },
  {
    title: "Migration hub",
    href: "/migration",
    description: "Field mapping, dual-run plans and a downloadable checklist",
    image: unsplash("photo-1552664730-d307ca884978"),
  },
  {
    title: "Roadmap",
    href: "/roadmap",
    description: "Now / next / later, with commitment levels stated plainly",
    image: unsplash("photo-1516321318423-f06f85e504b3"),
  },
  {
    title: "Find your fit",
    href: "/fit-quiz",
    description: "Six questions, published scoring, a verdict that can say no",
    image: unsplash("photo-1438761681033-6461ffad8d80"),
  },
  {
    title: "Webinars",
    href: "/resources/webinars",
    description: "Session outlines you can follow yourself — no unreleased recordings promised",
    image: unsplash("photo-1543269865-cbf427effbad"),
  },
]

export const announcement = {
  label: "NEW",
  text: "AI sprint reports are here",
  href: "/changelog",
}

export interface MenuFeature {
  eyebrow: string
  title: string
  body: string
  cta: string
  href: string
}

// Featured card shown inside each mega-menu (latest changelog / key action).
export const menuFeatures: Record<"Products" | "Solutions" | "Resources", MenuFeature> = {
  Products: {
    eyebrow: "Latest release",
    title: "AI sprint reports",
    body: "Capacity-aware drafts with a written rationale for every suggested item.",
    cta: "Read the changelog",
    href: "/changelog",
  },
  Solutions: {
    eyebrow: "Not sure where to start?",
    title: "Talk to the team",
    body: "Tell us about your setup and we'll map JiraVision to how you already work.",
    cta: "Contact us",
    href: "/contact",
  },
  Resources: {
    eyebrow: "Hands-on",
    title: "Product templates",
    body: "Sprint, roadmap and incident playbooks you can copy or download.",
    cta: "Browse templates",
    href: "/templates",
  },
}

export interface FooterColumn {
  title: string
  links: { label: string; href: string }[]
}
export const footerColumns: FooterColumn[] = [
  {
    title: "Product",
    links: [
      { label: "AI Scrum Master", href: "/products/ai-scrum-master" },
      { label: "Team Wellbeing", href: "/products/team-wellbeing" },
      { label: "Gamification", href: "/products/gamification" },
      { label: "Ethical Metrics", href: "/products/ethical-metrics" },
      { label: "Pricing", href: "/pricing" },
      { label: "Templates", href: "/templates" },
      { label: "Roadmap", href: "/roadmap" },
      { label: "Changelog", href: "/changelog" },
    ],
  },
  {
    title: "Solutions",
    links: [
      { label: "Startups", href: "/solutions/startups" },
      { label: "Enterprise", href: "/solutions/enterprise" },
      { label: "Agencies", href: "/solutions/agencies" },
      { label: "Remote Teams", href: "/solutions/remote-teams" },
      { label: "Compare tools", href: "/compare" },
      { label: "Migration hub", href: "/migration" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Careers", href: "/careers" },
      { label: "Contact", href: "/contact" },
      { label: "Blog", href: "/resources/blog" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Documentation", href: "/resources/documentation" },
      { label: "Case Studies", href: "/resources/case-studies" },
      { label: "Webinars", href: "/resources/webinars" },
      { label: "FAQ", href: "/faq" },
      { label: "Find your fit", href: "/fit-quiz" },
      { label: "Status", href: "/status" },
      { label: "Printable one-pager", href: "/one-pager" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms of Service", href: "/terms" },
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Cookie Policy", href: "/cookies" },
      { label: "Accessibility", href: "/accessibility" },
      { label: "Legal Notice", href: "/legal-notice" },
    ],
  },
]

// TODO(owner): add real profile URLs to enable social links; empty array hides the section.
export const socialLinks: { label: string; href: string; icon: "twitter" | "linkedin" | "github" }[] = []

// Double opt-in: /api/newsletter stores the address as pending and emails a
// confirmation link (lib/email.ts logs the link locally until a provider key is set).
export const newsletter = {
  enabled: true,
  title: "Newsletter",
  description: "Occasional notes on AI-native project management. No spam.",
  endpoint: "/api/newsletter",
  successNotice: "Almost there — check your inbox to confirm your subscription.",
}

export const footerClosing = {
  title: "Plan sprints your team can sustain.",
  body: "Wellbeing-aware capacity planning, explainable AI drafts and fairness metrics — in one calm workspace.",
  cta: { label: "Get started free", href: "/signup" },
}

// Verified contact channels shown on /contact.
// NOTE(PLACEHOLDER): sales@ / partners@ mailboxes and the "PST" hours were inherited
// from the v0 site and are unconfirmed — owner to verify or correct below.
export const contactDetails = {
  phone: "+254 741 140 250",
  phoneHref: "tel:+254741140250",
  whatsapp: "254741140250",
  email: "info@jiravision.com",
  supportEmail: "support@jiravision.com",
  address: { line1: "Likoni", line2: "Mombasa, Kenya" },
  mapQuery: "Likoni, Mombasa, Kenya",
  hours: { days: "Monday – Friday", time: "9:00 AM – 6:00 PM EAT" },
}

export const contactDepartments = [
  {
    title: "Sales",
    body: "Pricing questions, demos and product information.",
    email: "sales@jiravision.com",
  },
  {
    title: "Support",
    body: "Technical help, troubleshooting and account issues.",
    email: "support@jiravision.com",
  },
  {
    title: "Partnerships",
    body: "Integration partners, resellers and collaborations.",
    email: "partners@jiravision.com",
  },
]
