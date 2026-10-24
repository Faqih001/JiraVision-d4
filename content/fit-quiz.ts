// Copy + question data for the /fit-quiz "find your fit" checker.
// The scoring rules themselves live in app/(marketing)/fit-quiz/fit-model.ts —
// everything printed here is displayed next to the maths so visitors can
// disagree with it.

export type FitQuestionId =
  | "team-size"
  | "current-tool"
  | "planning-life"
  | "what-hurts"
  | "visibility"
  | "history"

export interface FitOption {
  id: string
  label: string
  /** Contribution to the fit score. Printed in the weights table below the quiz. */
  points: number
  /** Shown in the result breakdown so each answer can be checked. */
  why: string
}

export interface FitQuestion {
  id: FitQuestionId
  title: string
  helper: string
  options: FitOption[]
}

export const fitQuizQuestions: FitQuestion[] = [
  {
    id: "team-size",
    title: "How big is the team you run?",
    helper: "One delivery team, not the whole org.",
    options: [
      {
        id: "5-10",
        label: "5–10 people",
        points: 2,
        why: "Small teams get the planning signals, but seat pricing is built for 5+.",
      },
      {
        id: "11-30",
        label: "11–30 people",
        points: 3,
        why: "The capacity model and wellbeing pulses are tuned for one-to-a-few squads.",
      },
      {
        id: "31-75",
        label: "31–75 people",
        points: 3,
        why: "Multiple boards with cross-team overload is exactly the mess we plan for.",
      },
      {
        id: "76+",
        label: "76+ people",
        points: 2,
        why: "Works, but expect a security and procurement conversation first (Enterprise).",
      },
    ],
  },
  {
    id: "current-tool",
    title: "Where does your delivery work live today?",
    helper: "JiraVision sits on Atlassian Jira — this answer decides how much moving you'd do.",
    options: [
      {
        id: "jira",
        label: "Jira — we run it already",
        points: 3,
        why: "Zero data move: Jira stays authoritative and we read from it.",
      },
      {
        id: "trello-notion",
        label: "Trello or Notion",
        points: 2,
        why: "A clean import, but you'd need a Jira site underneath — that's the honest part.",
      },
      {
        id: "asana-linear",
        label: "Asana or Linear",
        points: 2,
        why: "Mappable fields and statuses, with a real migration phase plan.",
      },
      {
        id: "other",
        label: "Something else (or nothing yet)",
        points: 0,
        why: "If it isn't Jira-compatible, the base tenancy comes first — we won't pretend otherwise.",
      },
    ],
  },
  {
    id: "planning-life",
    title: "What does sprint planning feel like right now?",
    helper: "Be honest. Nobody sees this answer but your browser.",
    options: [
      {
        id: "derails",
        label: "Sprints regularly derail mid-flight",
        points: 3,
        why: "Over-commitment detection is the first thing that pays for itself.",
      },
      {
        id: "drifts",
        label: "It works, but scope drifts every cycle",
        points: 3,
        why: "Evidence-based replanning beats tribal memory about who's swamped.",
      },
      {
        id: "slow",
        label: "Smooth, but slower than it should be",
        points: 2,
        why: "Estimation churn is where the AI draft + approval loop helps most.",
      },
      {
        id: "fine",
        label: "Smooth and fast",
        points: 0,
        why: "If planning is healthy, another tool is probably not your missing piece.",
      },
    ],
  },
  {
    id: "what-hurts",
    title: "What hurts most, week to week?",
    helper: "This answer picks which product we recommend first.",
    options: [
      {
        id: "estimation",
        label: "Estimation arguments and surprise over-commitment",
        points: 3,
        why: "AI Scrum Master drafts sprints against measured capacity; a human approves.",
      },
      {
        id: "burnout",
        label: "After-hours creep and quiet burnout",
        points: 3,
        why: "Team Wellbeing Radar surfaces the pattern before it shows up in attrition.",
      },
      {
        id: "fairness",
        label: "Invisible work and unfair load distribution",
        points: 3,
        why: "The Equity Explorer is built for exactly this conversation.",
      },
      {
        id: "recognition",
        label: "Good work goes unnoticed",
        points: 2,
        why: "Gamification rewards recognised behaviours — with guardrails against scoreboards.",
      },
      {
        id: "nothing",
        label: "Honestly? Nothing right now",
        points: 0,
        why: "We'd rather talk you out of buying than sell you a dashboard.",
      },
    ],
  },
  {
    id: "visibility",
    title: "How much visibility into people does leadership want?",
    helper: "This is the one answer that can disqualify us. We'd rather find out now.",
    options: [
      {
        id: "aggregate",
        label: "Team-level aggregates, nothing personal",
        points: 3,
        why: "That is precisely the design line we ship on.",
      },
      {
        id: "context",
        label: "Some individual detail, with context and consent",
        points: 2,
        why: "Possible — opt-in recognition and self-reported pulses only, never activity surveillance.",
      },
      {
        id: "rankings",
        label: "Per-person productivity rankings",
        points: 0,
        why: "We refuse to build this, full stop — no configuration unlocks it.",
      },
      {
        id: "less",
        label: "Fewer dashboards, not more",
        points: 1,
        why: "Respectable. Our signal-dense views would still need to earn their place.",
      },
    ],
  },
  {
    id: "history",
    title: "What about your data history?",
    helper: "Attachment handling is the one migration promise we deliberately don't make.",
    options: [
      {
        id: "fresh",
        label: "Starting fresh — no legacy to carry",
        points: 3,
        why: "Simplest possible onboarding; day one, no import.",
      },
      {
        id: "some",
        label: "Some history we want readable, not moved",
        points: 2,
        why: "With Jira underneath, history stays where it is and we read it as-is.",
      },
      {
        id: "attachments",
        label: "A mountain of attachments we'd need copied",
        points: 1,
        why: "JiraVision never copies attachments. That scope needs a written agreement before you commit.",
      },
    ],
  },
]

export const fitQuizMaxScore = fitQuizQuestions.reduce(
  (sum, q) => sum + Math.max(...q.options.map((o) => o.points)),
  0,
)

export type FitVerdictKey = "rankings-refusal" | "no-pain" | "strong" | "conditional" | "not-now"

export interface FitVerdictCopy {
  key: FitVerdictKey
  badge: string
  title: string
  body: string
  ctas: { label: string; href: string; note: string }[]
}

// NOTE(PLACEHOLDER): verdict CTAs are product decisions, not claims — revisit
// if the owner changes plan gating (trial, enterprise-only features).
export const fitVerdictCopy: Record<FitVerdictKey, FitVerdictCopy> = {
  "rankings-refusal": {
    key: "rankings-refusal",
    badge: "Not a fit — and we won't change to suit",
    title: "We build the opposite of a productivity scoreboard.",
    body: "You asked for per-person rankings. That is the one request our ethical-metrics stance refuses by design — guardrails exist to keep recognition from turning into surveillance. If leadership's requirement is non-negotiable, we are the wrong vendor and a demo would waste everyone's time.",
    ctas: [
      {
        label: "Read why we refuse",
        href: "/products/ethical-metrics",
        note: "The refusal list is public, not a trial limitation.",
      },
      {
        label: "See what we ship instead",
        href: "/products/team-wellbeing",
        note: "Team-level signals that still let you act early.",
      },
    ],
  },
  "no-pain": {
    key: "no-pain",
    badge: "Not yet — and we'll say so",
    title: "Nothing hurts. Buying a planning layer won't fix a healthy process.",
    body: "Your answers say planning runs smoothly and nothing week-to-week needs a signal. We'd rather keep your trust than your seat-price for a year you don't need us. When scope drift, burnout or invisible work shows up, the quiz result will probably look different.",
    ctas: [
      {
        label: "Compare against keeping the status quo",
        href: "/compare/generic-jira",
        note: "Plain Jira stays a legitimate choice.",
      },
      {
        label: "Follow the changelog instead",
        href: "/changelog",
        note: "Ping us when something hurts enough to fix.",
      },
    ],
  },
  strong: {
    key: "strong",
    badge: "Strong fit",
    title: "Your answers line up with what we actually ship.",
    body: "Capacity-aware planning, team-level wellbeing signals and an approval-first AI draft match the problems you described — on a footprint we're built for. Start on the trial and run one real sprint through the sandbox before you decide anything.",
    ctas: [
      { label: "Start the 14-day trial", href: "/pricing", note: "No card. Full feature set during the trial." },
      {
        label: "Re-check pricing for your team size",
        href: "/pricing",
        note: "The seat slider uses the same team size you answered.",
      },
    ],
  },
  conditional: {
    key: "conditional",
    badge: "Fit — with conditions",
    title: "A real match, once the caveats below are handled.",
    body: "The core problems you described are what JiraVision is for, but at least one of your answers adds a condition — team scale, tooling underneath, or the attachment promise we deliberately don't make. Read the caveats first; several are things we'd put in writing before you commit.",
    ctas: [
      {
        label: "See the recommended product",
        href: "/products/ai-scrum-master",
        note: "Chosen from your “what hurts” answer.",
      },
      { label: "Plan the scope honestly", href: "/migration", note: "Caveats like attachments are priced in the planner." },
    ],
  },
  "not-now": {
    key: "not-now",
    badge: "Probably not a fit",
    title: "The gaps in your answers are bigger than what we close.",
    body: "Between the base-tooling requirement, the visibility you'd need, and the health of your current process, a JiraVision layer would mostly add ceremony. That's a legitimate result — the quiz exists to catch it before a pilot does.",
    ctas: [
      {
        label: "Compare tools instead",
        href: "/compare",
        note: "Our honest take on five other options.",
      },
      {
        label: "Check what we refuse to build",
        href: "/roadmap",
        note: "The never-list, in case your needs evolve toward what we do ship.",
      },
    ],
  },
}

export const fitQuizHero = {
  eyebrow: "Find your fit",
  title: "Six questions. Show the maths. Reach an honest verdict.",
  lead: "Half the teams that ask for a demo don't need one. This quiz scores your situation against what JiraVision actually ships — including the parts we refuse to build — and every point in the score is visible next to the answer that earned it.",
  photoId: "photo-1552664730-d307ca884978",
  alt: "Two teammates comparing notes at a whiteboard during planning",
}

export const fitQuizPrivacy = {
  title: "Your answers stay in this browser tab.",
  body: "The quiz has no account, no submission, and no analytics event with your answers in it. Progress persists in localStorage only, so you can close the tab and come back; restart clears it. If you take a screenshot of a verdict and argue with it internally, that part is on you.",
}

export const fitQuizMethod = {
  title: "How the verdict is computed",
  steps: [
    {
      label: "Each option carries a point value",
      detail:
        "Every answer maps to 0–3 points toward “JiraVision solves problems you actually have”. The full weight table is printed below the quiz — no hidden scoring.",
    },
    {
      label: "Two answers can veto the score",
      detail:
        "Per-person rankings triggers our standing refusal regardless of points. “Nothing hurts right now” caps the verdict at “not yet”, because tooling without pain is shelfware.",
    },
    {
      label: "Points set the band, caveats set the conditions",
      detail:
        "13+ of 18 is a strong fit, 9–12 is fit-with-conditions, 8 or less probably isn't a fit. Answers like team size or attachment scope never veto — they add caveats to the result instead.",
    },
    {
      label: "The CTA adapts, the maths doesn't",
      detail:
        "Your “what hurts” answer selects which product page we recommend. Reload the quiz with different answers and the same rules apply — it's deterministic by contract, and unit-tested.",
    },
  ],
}

export const fitQuizVerdictLegend = {
  title: "The five verdicts, in plain words",
  rows: [
    { badge: "Not a fit — by refusal", meaning: "You need per-person rankings. We won't build them. This never changes with plan or pricing." },
    { badge: "Not yet", meaning: "Nothing hurts. We talk you out of it and keep the door open." },
    { badge: "Strong fit", meaning: "13+ points, no vetoes. Trial it on one real sprint before deciding anything bigger." },
    { badge: "Fit — with conditions", meaning: "9–12 points. The mismatch is a caveat (scale, base tooling, attachments), not a dealbreaker." },
    { badge: "Probably not a fit", meaning: "8 points or less. A layer here would add ceremony, not relief." },
  ],
}

export const fitQuizFaq = [
  {
    q: "Why publish the scoring weights before I take the quiz?",
    a: "Because an opaque “you're a 74% match!” badge is marketing theatre. Every point value is in the table on this page, the model is deterministic, and the source file is readable. If you'd score differently, tell us and we'll argue honestly.",
  },
  {
    q: "Does anyone at JiraVision see my answers?",
    a: "No. There is no submission endpoint. Answers persist only in your browser's localStorage until you restart the quiz, and no analytics event carries answer content.",
  },
  {
    q: "Can I game the quiz to get the “strong fit” verdict?",
    a: "Sure — but the verdict is a mirror, not a gate. Nothing you answer here changes pricing, trials, or what sales says to you. The only answer with real consequences is the rankings one, and that reflects our limits, not yours.",
  },
  {
    q: "I got “fit — with conditions”. What happens on the call?",
    a: "The caveats from your result are the agenda. Attachment scope and non-Jira base tenancy are exactly the items we'd put in writing before a pilot, so a conditional verdict is the healthiest kind of conversation to have.",
  },
]

export const fitQuizRelated = [
  { href: "/compare", label: "Compare pages", note: "Our honest take when the answer is “not us”." },
  { href: "/migration", label: "Migration hub", note: "If the base-tooling caveat was yours." },
  { href: "/pricing", label: "Pricing with the seat slider", note: "Same team-size input, real numbers." },
  { href: "/roadmap", label: "Public roadmap", note: "Including the things we refuse to build." },
] as const

export const fitQuizCta = {
  eyebrow: "Still deciding",
  title: "Take the verdict to a human.",
  body: "Quiz results are a starting point, not a contract. Bring the screenshot to the contact form and we'll respond to the caveats specifically — including the ones where our answer is no.",
  primary: { label: "Talk to us", href: "/contact" },
  secondary: { label: "Read the refusals first", href: "/roadmap" },
}

export const fitQuizAnchorNav = {
  title: "On this page",
  links: [
    { href: "#quiz", label: "The quiz" },
    { href: "#method", label: "The maths" },
    { href: "#weights", label: "Weights table" },
    { href: "#verdicts", label: "Verdicts" },
    { href: "#privacy", label: "Privacy" },
    { href: "#faq", label: "FAQ" },
  ],
}
