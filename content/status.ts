// Service status data for the topbar chip and the /status page.
// NOTE(owner): this is a hand-maintained manifest until automated health checks
// ship (see the "Next" column on /roadmap). Update `status` values here when
// reality changes — and never add a metric (uptime %, response times, incident
// counts) that we are not actually measuring.

export interface ServiceStatus {
  name: string
  status: "operational" | "degraded" | "outage"
  note?: string
}

// Timestamp of the most recent manual review pass over this manifest.
// NOTE(PLACEHOLDER): becomes machine-generated once automated checks exist.
export const statusUpdatedAt = "2026-10-28T08:00:00Z"

export const services: ServiceStatus[] = [
  {
    name: "Marketing website",
    status: "operational",
    note: "This site and its public pages. If you can read this row, the check passed.",
  },
  {
    name: "Auth & dashboard",
    status: "operational",
    note: "Login, signup and the analytics dashboard. Verified by manual sign-in during each release review.",
  },
  {
    name: "Contact & forms API",
    status: "operational",
    note: "Contact, demo, quote, careers and newsletter submissions are validated, rate-limited and stored.",
  },
  {
    name: "Email delivery",
    status: "degraded",
    note: "Outbound team notifications depend on a Resend key the owner configures. A valid key is not confirmed in this environment yet, so submissions are stored but the notification email may not go out. We would rather show this row as degraded than hide it.",
  },
  {
    name: "Jira sync",
    status: "operational",
    note: "Workspace data sync behind the dashboard, as listed in the original manifest.",
  },
]

const nonOperational = services.filter((s) => s.status !== "operational")

export const overallStatus = nonOperational.length === 0
  ? "All systems normal"
  : services.some((s) => s.status === "outage")
    ? "Partial outage"
    : `Core systems normal; ${nonOperational.map((s) => s.name.toLowerCase()).join(", ")} degraded`

// --- Page copy below is consumed by app/(marketing)/status/page.tsx ----------

export const statusHero = {
  eyebrow: "Status",
  title: "How every part of JiraVision is actually doing",
  subtitle:
    "A plain-language manifest for each component of the service, maintained by hand and labelled as such. No uptime theatre, no invented incident history.",
  bullets: [
    "Every component listed — including the one that is currently degraded.",
    "“Operational” means a person verified it recently, not a measured guarantee.",
    "Spotted something? /contact is how problems surface today, and it works.",
  ],
  primary: { label: "Report an issue", href: "/contact" },
  secondary: { label: "Read the changelog", href: "/changelog" },
}

export const reviewRows = {
  eyebrow: "Method",
  title: "How this page is kept honest",
  intro:
    "What backs the claims above, and — just as important — what does not back them yet.",
  rows: [
    {
      label: "What this is",
      detail:
        "A manually maintained manifest, stored in content/status.ts alongside the rest of the site's content. Every row is a sentence we verified, not a dashboard widget.",
    },
    {
      label: "Review cadence",
      detail:
        "Each component gets checked by a human during every release and whenever a report comes in through /contact. The “last reviewed” timestamp above reflects that pass.",
    },
    {
      label: "Automated checks",
      detail:
        "On the roadmap, not shipped. Until real health checks exist this page will keep saying so — the caveat is the deal, not a footnote.",
    },
    {
      label: "What we won't publish",
      detail:
        "Uptime percentages, response-time stats and incident counts. We are not measuring them continuously, so a number here would be decoration.",
    },
  ],
}

export const componentExplainers = {
  eyebrow: "The components",
  title: "What each row covers",
  intro:
    "The table tells you the state. This tells you what the state is about, in the same words we would use on a support call.",
  items: [
    {
      title: "Marketing website",
      body: "Every public page you are reading now — product pages, pricing, changelog, this page. Static content on a hosted deployment; there is no clever about it, and that is why it is nearly always fine.",
    },
    {
      title: "Auth & dashboard",
      body: "Accounts, login, signup and the product dashboard where Jira data renders. The auth logic itself was untouched by the redesign — restyling stopped at the chrome.",
    },
    {
      title: "Contact & forms API",
      body: "The endpoints behind contact, demo, quote, careers and newsletter forms. Submissions are validated, rate-limited and stored even when delivery below is degraded — nothing is silently dropped.",
    },
    {
      title: "Email delivery",
      body: "Outbound notifications to the team when forms arrive, plus newsletter confirmation links. Depends on a provider key the owner configures; without a valid one, messages are logged instead of sent. Degraded until confirmed — not hidden.",
    },
    {
      title: "Jira sync",
      body: "The data pipeline behind the dashboard: workspace connection, board and sprint sync, metric recalculation. The product's core loop, and the row we watch hardest.",
    },
  ],
}

export const incidentProcess = {
  eyebrow: "Incident process",
  title: "What happens if something breaks",
  intro:
    "This is our process, not a history. There is no archive of past incidents below, because there have been none worth archiving — and we will not invent some to make this section look experienced.",
  steps: [
    {
      title: "Someone notices",
      body: "Usually you, sometimes the manual review pass. Automated detection is on the roadmap, and until it ships we will not claim to catch everything first.",
    },
    {
      title: "The row changes first",
      body: "The affected component moves to degraded or outage on this page, with a plain-language note, before any wider announcement. Changing the page is the first fix, not the last.",
    },
    {
      title: "Updates in the thread you opened",
      body: "If you reported it via /contact or email, follow-ups come back through that channel. There is no status-subscribe system yet and we will not fake one.",
    },
    {
      title: "It ends in the changelog",
      body: "Any user-visible fix or behaviour change gets a dated changelog entry, so the record of what happened lives somewhere durable rather than only in this page's history.",
    },
  ],
}

export const honestGaps = {
  eyebrow: "Plainly stated",
  title: "What this page does not do yet",
  intro:
    "A status page earns trust by naming its own gaps. Here are ours, before you find them:",
  items: [
    {
      title: "No uptime percentage",
      body: "We do not measure continuously, so we do not publish a number. When health checks ship, the honest history comes first and the pretty stats can follow.",
    },
    {
      title: "No incident archive",
      body: "This section describes process. Publishing a fabricated incident log to look battle-tested would defeat the point of the page.",
    },
    {
      title: "No per-region detail",
      body: "There is one global deployment; pretending otherwise would be theatre. Regional breakdowns arrive the day real regions do.",
    },
  ],
}

export const commitments = {
  eyebrow: "Commitments",
  title: "What we promise about this page itself",
  rows: [
    {
      label: "The manifest says what it is",
      detail: "Manual review, labelled manual. If automated checks ever ship, this page will say so — and link to the code that says so.",
    },
    {
      label: "Degraded stays visible",
      detail: "While email delivery depends on an owner-configured key that is not confirmed working, that row stays degraded. Hiding it would be the actual incident.",
    },
    {
      label: "No invented numbers",
      detail: "No uptime %, no “99.99%”, no response-time promises. This is the same no-fabrication rule the rest of the site runs on — see how we operate it on /about.",
    },
    {
      label: "Corrections get context",
      detail: "If a status here turns out to be wrong, we fix the page and say what changed rather than editing quietly.",
    },
  ],
}

export const whereToHear = {
  eyebrow: "Staying informed",
  title: "Where changes get announced",
  items: [
    {
      title: "The changelog",
      href: "/changelog",
      summary:
        "The durable record. Shipped features, improvements and fixes, dated and newest first — including whatever eventually replaces parts of this manual process.",
    },
    {
      title: "About JiraVision",
      href: "/about",
      summary:
        "Who operates this service and how — the transparency commitments this status page is one expression of.",
    },
    {
      title: "Contact",
      href: "/contact",
      summary:
        "Something looks wrong here? Tell us through the form — it stores and reaches a human, which makes it the most reliable incident report line you have today.",
    },
  ],
}

export const statusCta = {
  title: "See something we should know?",
  body:
    "A report from a real user outranks any dashboard we could build. Forms on this site are stored even when email delivery is degraded, so nothing you send is silently dropped.",
  primary: { label: "Report an issue", href: "/contact" },
  secondary: { label: "How we operate", href: "/about" },
}
