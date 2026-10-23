// NOTE(PLACEHOLDER): competitor feature positions in this file were checked against
// public marketing materials at authoring time only. Never state competitor prices,
// market share or review scores here — they rot. Re-verify each row on the vendor's
// own site before any public push. Quotes below are example early-access conversations,
// NOT permissioned testimonials — replace before launch (same policy as content/products.ts).
// Honesty rules (REDESIGN_PLAN): acknowledge what each tool does well, muted editorial
// tone, no competitor logos, and our own claims must match content/products.ts capabilities.

export interface CompareCta {
  label: string
  href: string
}

export interface CompareRow {
  /** Evaluation dimension, e.g. "AI sprint planning". */
  dimension: string
  /** Qualitative position of the competitor — no prices, scores or market stats. */
  them: string
  /** What JiraVision does here — must match content/products.ts capabilities. */
  us: string
}

export type CompareDemo = "sandbox" | "gamification" | "equity" | "calculators"

export interface CompareContent {
  slug: string
  /** Display name of the other side of the comparison. Styled text only — never a logo. */
  competitor: string
  /** One-liner used on the hub cards and RelatedSection items. */
  positioning: string
  hero: {
    eyebrow: string
    title: string
    subtitle: string
    bullets: string[]
    primary: CompareCta
    secondary: CompareCta
    badge: string
  }
  problem: { title: string; intro: string; items: { title: string; body: string }[] }
  features: { eyebrow: string; title: string; intro: string; items: { title: string; body: string }[] }
  deepDives: { title: string; body: string; bullets: string[]; photoId: string; photoAlt: string }[]
  demo: CompareDemo
  table: { title: string; intro: string; caption: string; note: string; rows: CompareRow[] }
  workflow: { title: string; intro: string; steps: { title: string; body: string }[] }
  audience: { title: string; intro: string; items: { who: string; body: string; wins: string[] }[] }
  fit: { title: string; good: string[]; bad: string[] }
  method: { title: string; intro: string; rows: { label: string; detail: string }[] }
  quotes: { quote: string; name: string; role: string }[]
  faq: { q: string; a: string }[]
  cta: { title: string; body: string; primary: CompareCta; secondary: CompareCta }
}

const TABLE_NOTE =
  "Feature positions checked against public materials; verify current details on their site."

export const compares: CompareContent[] = [
  // ─────────────────────────────────────────────────────────────────────────────
  {
    slug: "generic-jira",
    competitor: "Plain Jira",
    positioning:
      "Not a replacement — an intelligence layer on the Jira you already run, read-only until you approve.",
    hero: {
      eyebrow: "Compare · Jira alone vs Jira plus JiraVision",
      title: "Keep Jira. Add the part that reads it",
      subtitle:
        "Your boards, workflows and history stay exactly where they are. JiraVision connects read-only, drafts sprints against real capacity, surfaces overload signals, and hands every decision back to a human.",
      bullets: [
        "Capacity-aware sprint drafts with a written rationale per item",
        "Wellbeing and workload signals aggregated at team level",
        "Every metric opens to show its formula and source events",
      ],
      primary: { label: "Start free trial", href: "/signup" },
      secondary: { label: "See how the draft is built", href: "/products/ai-scrum-master" },
      badge: "Additive, not a migration",
    },
    problem: {
      title: "Why people ask before adding anything to Jira",
      intro:
        "Jira already has more configuration than most teams touch. The question isn't whether Jira can do these things in principle — it's who has time to make them happen before Thursday.",
      items: [
        {
          title: "The board shows what, not what-next",
          body: "Jira is an outstanding record of work. Turning that record into a defensible sprint plan is still a manual, in-your-head exercise done the night before planning.",
        },
        {
          title: "Overload hides in plain data",
          body: "After-hours activity, concentrated review load, three spikes on one person — the evidence exists in transitions and timestamps. Nobody collates it into a signal anyone acts on.",
        },
        {
          title: "Reports argue, receipts settle",
          body: "When a number appears without its formula, half the team assumes it's wrong and the other half assumes it's a weapon. That's a tooling gap, not a people problem.",
        },
      ],
    },
    features: {
      eyebrow: "What the layer adds",
      title: "The judgement your Jira data is one connect away from",
      intro:
        "Nothing here replaces a Jira feature. Each capability reads what your Jira already produces and turns it into something you can review, edit and approve.",
      items: [
        { title: "Capacity-aware drafts", body: "Time off, on-call and historical commit-versus-deliver feed one explainable pass before planning. Deterministic: same inputs, same draft." },
        { title: "Rationale per item", body: "Each suggestion carries a plain-English reason (generated with IBM Granite) naming the fit, the slack and the risk." },
        { title: "Wellbeing early warning", body: "Anonymous check-ins plus workload trends, aggregated to team level before anyone sees them. Small groups merge, never split." },
        { title: "Metrics that show working", body: "Predictability, load spread, review equity — numerator, denominator, exclusions and source events printed on the card." },
        { title: "Recognition for care work", body: "Skill trees the team designs by vote, counting reviews, mentoring and runbooks. Team-level by default, opt-in participation." },
        { title: "Approval-gated writes", body: "JiraVision proposes; nothing lands on your board until a human approves, and every applied change is logged and reversible." },
      ],
    },
    deepDives: [
      {
        title: "Jira stays the system of record",
        body: "There is no second database of work. Issues, comments and history live in Jira; JiraVision holds proposals and aggregates. If you cancel tomorrow, your board is exactly the board it always was.",
        bullets: ["Read-only connection, scoped to projects you pick", "No issue data duplicated into another silo", "Applied changes are ordinary Jira edits, attributed"],
        photoId: "photo-1517245386807-bb43f82c33c4",
        photoAlt: "A developer working at a familiar-looking issue board",
      },
      {
        title: "The signals were always there",
        body: "Sprint velocity, transition timestamps, calendar meeting load — Jira has been quietly recording all of it. The layer's job is to make those readings legible: a draft that accounts for the leave calendar, a drift alert that fires on slope before the drama.",
        bullets: ["After-hours trend tracked at team level", "Review concentration named as a number, not a league table", "Thresholds set by the team, changeable and logged"],
        photoId: "photo-1506784983877-45594efa4cbe",
        photoAlt: "A planner week laid out beside a morning coffee",
      },
      {
        title: "The approval gate is the contract",
        body: "Every comparison with plain Jira comes down to one question: what may the software do on its own? Our answer is nothing. Drafts expire, approvals are attributed, and one click reverts a whole applied plan.",
        bullets: ["Read-only until a named human approves", "Predicted-vs-actual accuracy is displayed, not asserted", "One-click revert for the entire draft"],
        photoId: "photo-1531482615713-2afd69097998",
        photoAlt: "Two colleagues approving items on a shared screen",
      },
    ],
    demo: "sandbox",
    table: {
      title: "Jira alone, side by side with Jira plus JiraVision",
      intro:
        "The friendliest comparison on this site, because there is no side to leave. Same column, first row: your Jira. Second row: what the layer changes.",
      caption:
        "Qualitative comparison between an unlayered Jira project and the same project running with JiraVision connected.",
      note: TABLE_NOTE,
      rows: [
        {
          dimension: "AI sprint planning",
          them: "Jira's own assistants and Advanced Insights focus on describing work and reporting the past; building a capacity-aware forward plan is still a human-all-nighter task.",
          us: "A capacity-aware draft arrives before the meeting, with a written rationale on every suggested item and a human approval gate.",
        },
        {
          dimension: "Workload visibility",
          them: "Dashboards and gadgets can show assignee counts if your admin builds them; the real picture — holidays, on-call, review load — stays distributed across tools.",
          us: "Load read from history plus availability into a team-level distribution, over-capacity flagged before the sprint breaks.",
        },
        {
          dimension: "Wellbeing signals",
          them: "Not a native Jira concern; pulse tools and HR systems live somewhere else, disconnected from the work that causes the strain.",
          us: "Anonymous 30-second check-ins plus after-hours and meeting-load trends, aggregated before display, thresholds the team owns.",
        },
        {
          dimension: "Gamification ethics",
          them: "Jira itself doesn't rank people; third-party leaderboard apps on the marketplace vary widely in how carefully they measure humans.",
          us: "Skill trees and team totals by default; individual rankings only behind an explicit guardrail switch that previews the consequence.",
        },
        {
          dimension: "Metric transparency",
          them: "Custom fields and JQL give you any number you want and no formula with it — two teams can calculate 'velocity' differently and both be 'right'.",
          us: "Every metric card expands to numerator, denominator, exclusions, source events and last recalculation.",
        },
        {
          dimension: "Jira-native integration",
          them: "It is Jira — nothing to integrate, everything to configure.",
          us: "Two-way sync with your existing boards and projects; read-only until approved, writes appear as attributed Jira changes.",
        },
        {
          dimension: "Pricing model",
          them: "Your current Atlassian plan, per seat, tiered — unchanged. Details on Atlassian's site.",
          us: "One additional per-seat platform price across Starter, Professional and Enterprise; annual billing saves 20%. See /pricing.",
        },
        {
          dimension: "Learning curve",
          them: "Jira's curve is famously steep for admins and gentle for users. Nothing here changes that on-ramp.",
          us: "No new tracker to teach anyone. Setup is a scoped read-only connect plus team rituals — the draft explains itself in plain English.",
        },
      ],
    },
    workflow: {
      title: "Adding the layer without losing Jira history",
      intro:
        "This is not a migration. It's a connect. Your projects, permissions and full issue history stay in Jira the entire time.",
      steps: [
        { title: "Connect, read-only", body: "Point JiraVision at the projects you choose, via a scoped connection. Nothing writes, nothing syncs back, nothing changes on the board." },
        { title: "Baseline your history", body: "Past sprints, cycle lengths and completion patterns are read in, so the first draft already knows your team — not a generic average." },
        { title: "Dual-run one cycle", body: "Plan as you always do in Jira, and keep the draft open beside it. Compare suggested vs committed; dispute anything, in writing, against the rationale." },
        { title: "Turn on approvals", body: "When the team trusts the reading, enable approval-gated writes. Every applied change is an ordinary, attributed, reversible Jira edit." },
      ],
    },
    audience: {
      title: "Who asks for this layer",
      intro: "Same teams that already run Jira well — and are tired of the parts Jira leaves to memory.",
      items: [
        { who: "Engineering managers", body: "Stop rebuilding the capacity picture by hand before planning. Walk in with a draft every number of which traces to a source you can open.", wins: ["Defensible commitments", "Overload flagged mid-sprint", "Evidence for headcount cases"] },
        { who: "Scrum masters", body: "Facilitate from a proposal instead of a blank board. When someone argues with the plan, the argument is with a written reason.", wins: ["Shorter planning meetings", "Rationale-first disputes", "Mid-sprint re-drafts"] },
        { who: "Jira admins", body: "Nothing about your configuration is endangered. The layer reads; humans approve; your workflow rules remain the only workflow rules.", wins: ["Scoped read-only access", "No duplicate data store", "Audit trail on every write"] },
      ],
    },
    fit: {
      title: "Be honest about the fit",
      good: ["Teams happy with Jira as their tracker but tired of manual planning maths", "Leads who want workload and predictability evidence their team can inspect", "Orgs that will keep their own Jira administration exactly as-is"],
      bad: ["Teams looking to leave Jira — JiraVision needs Jira as the system of record today", "Anyone wanting autopilot sprint management; the approval gate is not optional", "Orgs hoping for per-person productivity rankings; that view is on our refusal list"],
    },
    method: {
      title: "How we compare, even with ourselves",
      intro: "This page is the easiest one to fudge, so here is the discipline we hold it to.",
      rows: [
        { label: "Baseline honesty", detail: "The 'Jira alone' column describes Jira at its configured best, not at its worst. If your admin has built these reports by hand, they've done our job for us — with more upkeep." },
        { label: "Claims checked at source", detail: "Jira behaviour statements are drawn from Atlassian's public documentation, and none of it claims Jira 'can't' do anything — configuration can get far. The difference is upkeep, not capability." },
        { label: "Our side verified the same way", detail: "Every JiraVision cell maps to a shipped capability documented on the product pages — drafts with rationale, aggregated pulses, formula-on-card metrics." },
        { label: "Nothing time-sensitive", detail: "No prices, market share or review scores in either column. Pricing rows describe the model, not the number." },
      ],
    },
    // NOTE(PLACEHOLDER): example early-access conversations, not permissioned testimonials
    quotes: [
      { quote: "We didn't migrate anything. We connected, dual-ran a sprint, and the planning meeting stopped being a memory contest.", name: "Early-access participant — Engineering manager", role: "Series B fintech" },
      { quote: "The formula-on-card thing settled the 'your numbers are wrong' argument in Jira review for the first time in years.", name: "Early-access participant — Scrum master", role: "Health-tech startup" },
    ],
    faq: [
      { q: "Does this replace any Jira feature?", a: "No. JiraVision reads your boards, history and calendars, then drafts plans and surfaces signals. Jira remains the system of record; you keep every workflow, permission and automation you configured." },
      { q: "Can Jira do some of this with plugins or Automation?", a: "Often, yes — with admin time and upkeep for every rule. The comparison is about who has to build and maintain the judgement, not whether the data exists. Atlassian's own assistants focus on describing work; we draft the next cycle forward and wait for approval." },
      { q: "What writes does JiraVision ever make?", a: "Only ones a human approves, logged and attributed in Jira. Until you enable approvals, the connection is read-only, and any applied draft reverts in one action." },
      { q: "What happens to our data if we stop?", a: "Your Jira is untouched — it always was. Aggregates and check-in text in JiraVision can be exported or deleted; raw individual check-ins are deleted after aggregation on a schedule you set." },
      { q: "Is Atlassian competition or foundation?", a: "Foundation. We're an add-on to Jira, not a rival to it — which is why this comparison page reads more like a pairing guide than a fight card." },
    ],
    cta: {
      title: "Connect the layer, keep the board",
      body: "One scoped read-only connect and your first capacity-aware draft arrives before the next planning meeting. 14-day trial, no card.",
      primary: { label: "Start free trial", href: "/signup" },
      secondary: { label: "Questions first?", href: "/contact" },
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  {
    slug: "asana",
    competitor: "Asana",
    positioning:
      "Asana organises company-wide work beautifully. JiraVision makes engineering delivery judgement — on top of Jira.",
    hero: {
      eyebrow: "Compare · JiraVision vs Asana",
      title: "Broad and deep are different virtues",
      subtitle:
        "Asana is very good at a lot of work. JiraVision is pointed at one thing: turning your Jira history into sprint drafts, workload truth and metrics the team can audit. Teams that run both usually run them in different rooms.",
      bullets: [
        "Where Asana spans company workflows, we go one level down into delivery",
        "Jira-native: two-way sync, read-only until you approve",
        "Wellbeing signals and formula-on-card metrics aren't side projects here — they're the product",
      ],
      primary: { label: "Start free trial", href: "/signup" },
      secondary: { label: "Compare across dimensions", href: "#comparison" },
      badge: "Honest comparison",
    },
    problem: {
      title: "Why people ask about Asana anyway",
      intro:
        "Engineering usually lives in Jira while the rest of the company lives somewhere friendlier. So someone asks 'why not just use Asana for everything?' — a fair question with a contextual answer.",
      items: [
        {
          title: "Generalists optimise for everyone",
          body: "A tool that serves marketing, ops and engineering well must stay broad. The delivery-specific work — capacity modelling against a leave calendar, commit-versus-deliver tracking — is where a specialist earns its seat.",
        },
        {
          title: "Dashboards need a builder",
          body: "Rich reporting in any work-management platform is available to whoever maintains it. In engineering, the definitions behind a number matter as much as the chart — and someone has to own them.",
        },
        {
          title: "People metrics are a design choice",
          body: "Any tracker can be pointed at individuals. Whether it should — and what guardrails ship by default when it is — is a product-values question most broad platforms never had to answer.",
        },
      ],
    },
    features: {
      eyebrow: "Our angle",
      title: "One job, done with receipts",
      intro:
        "JiraVision deliberately does fewer things than Asana. Here's what those fewer things are.",
      items: [
        { title: "Forward-looking drafts", body: "Sprint proposals sized to real availability, each item carrying a plain-English rationale you can argue with." },
        { title: "Workload as a shape", body: "Load, reviews and after-hours drift shown as a team distribution, flagged past thresholds the team set." },
        { title: "Anonymous pulse built in", body: "30-second check-ins aggregated before display. Wellbeing isn't a third-party power-up bolted on." },
        { title: "Metric methodology on card", body: "Every figure opens to its formula, source events and exclusions. Cross-tool comparison isn't our pitch; inspectable numbers are." },
        { title: "Recognition with guardrails", body: "Team-designed skill trees that count the quiet work; rankings only behind an explicit, logged guardrail switch." },
        { title: "Jira-native both ways", body: "Reads boards, cycles and calendars; writes only approved changes, attributed, into the Jira you keep." },
      ],
    },
    deepDives: [
      {
        title: "Where Asana focuses wide, we focus one level down",
        body: "Asana's strengths are real: cross-team requests, campaigns, tidy templates. JiraVision isn't trying to own the marketing calendar. It tries to own the question 'what can this team actually commit to next cycle' — with the leave calendar, on-call rota and three sprints of history in the answer.",
        bullets: ["Delivery judgement, not work organisation", "Built around Jira, where engineering already lives", "Complements a company-wide tool instead of replacing it"],
        photoId: "photo-1522071820081-009f0129c71c",
        photoAlt: "Engineers gathered around a delivery plan on screen",
      },
      {
        title: "The workload picture nobody maintains",
        body: "Portfolio dashboards in broad platforms show status. The engineering-shaped gaps — who's quietly carrying three spikes, where review load concentrated, whose evenings are shrinking — need history plus anonymous self-report, which is exactly the data model JiraVision ships.",
        bullets: ["Load spread flagged before the sprint breaks", "Pulse answers aggregated to team level, small groups merged", "Every alert links to the aggregate and its formula"],
        photoId: "photo-1519389950473-47ba0277781c",
        photoAlt: "An overhead view of a team's shared laptops and desks",
      },
      {
        title: "Recognition is a values decision, not a sticker",
        body: "Points and badges are buildable in almost any tool. The question is what defaults ship: opt-in participation, team-level views, behaviours chosen by team vote, and a visible warning before anyone turns a map of growth into a race of humans.",
        bullets: ["Skill trees by default; rankings behind a guardrail preview", "Points attach to verifiable Jira events, not self-reports", "Quarterly config review so nobody games a dead behaviour"],
        photoId: "photo-1531403009284-440f080d1e12",
        photoAlt: "A branching skill-tree diagram drawn on paper",
      },
    ],
    demo: "equity",
    table: {
      title: "Asana and JiraVision, dimension by dimension",
      intro:
        "Two tools with different centres of gravity. Read the Asana column fairly — it does many things deliberately; the difference is where the depth lives.",
      caption:
        "Qualitative positioning comparison between Asana and JiraVision across eight evaluation dimensions.",
      note: TABLE_NOTE,
      rows: [
        {
          dimension: "AI sprint planning",
          them: "Asana's AI features focus on summarising and drafting content inside tasks and projects; cycle planning against capacity history is the team's craft.",
          us: "A capacity-aware sprint draft before the meeting, with a written rationale on every suggested item and human approval required.",
        },
        {
          dimension: "Workload visibility",
          them: "Workload views show who's booked and how, maintained by whoever builds them.",
          us: "History plus availability plus anonymous pulses roll into a team-level distribution with thresholds the team owns.",
        },
        {
          dimension: "Gamification ethics",
          them: "Recognition features live in Asana's broader toolkit — badges and celebration are easy to turn on; guardrails are yours to configure.",
          us: "Team-voted behaviours and skill trees ship as defaults; individual rankings only exist behind an explicit guardrail switch.",
        },
        {
          dimension: "Metric transparency",
          them: "Dashboards and reporting are powerful and configurable; the definition behind a chart is something your admins own and maintain.",
          us: "Formula, source events, exclusions and last recalculation print on every metric card, by default.",
        },
        {
          dimension: "Jira-native integration",
          them: "Asana connects to Jira through integrations that sync selected fields and keep two records of the work.",
          us: "Jira is the base we sit on — two-way sync, read-only until approval, no second source of truth.",
        },
        {
          dimension: "Pricing model",
          them: "Seat-based tiers with feature depth gated by edition; current structure on Asana's site.",
          us: "One per-seat platform price across three plans, annual billing saves 20%, 14-day trial without a card. See /pricing.",
        },
        {
          dimension: "Learning curve",
          them: "Approachable for non-technical teams — a genuine strength. Engineering-specific depth arrives with setup effort.",
          us: "Nothing new for your team to migrate into; connect Jira, read the draft, approve. The rationale text is the onboarding.",
        },
        {
          dimension: "Reporting",
          them: "Breadth first: portfolios, goals and cross-team status for the whole company.",
          us: "Depth where it counts for delivery: predictability, load balance, review equity, drift — nine documented metrics, each with an action attached.",
        },
      ],
    },
    workflow: {
      title: "Moving over without losing Jira history",
      intro:
        "Most Asana-adjacent teams don't move anything. Engineering keeps Jira; the layer connects to it. Work that genuinely belongs in Asana stays there.",
      steps: [
        { title: "Draw the line honestly", body: "Decide which work is delivery planning (Jira's home) and which is company-wide coordination (where Asana shines). Most teams already know; writing it down is the step." },
        { title: "Connect Jira read-only", body: "Scope JiraVision to the engineering projects you pick. Nothing writes, nothing duplicates; Asana keeps running for everyone else." },
        { title: "Import the record you already have", body: "Sprint history and calendars are read in, so predictability baselines start from your real data — full Jira history is untouched and un-migrated." },
        { title: "Run one cycle in parallel", body: "Keep existing rituals, compare draft against committed, then switch on approval-gated writes only where the team asks for them." },
      ],
    },
    audience: {
      title: "Teams that keep both on purpose",
      intro: "The honest answer to 'Asana or JiraVision' is usually 'different rooms, different tools'. Here's who we serve in that arrangement.",
      items: [
        { who: "Heads of engineering", body: "Delivery evidence for planning reviews and headcount cases, without policing the company's choice of coordination tool.", wins: ["Predictability per team", "Drift alerts with context", "Definitions the team agreed"] },
        { who: "Ops leads adjacent to dev", body: "Stop translating between the Asana status and the Jira board; both keep doing what they do, one shared draft ends the guesswork.", wins: ["Sprint drafts before planning", "Load visible without interrogation", "Fewer cross-tool reconciliation calls"] },
        { who: "ICs in mixed-tool orgs", body: "See why work landed on you, in writing — and answer the wellbeing pulse without your name attached to it.", wins: ["Rationale per item", "Anonymous by design", "Care work counted on the tree"] },
      ],
    },
    fit: {
      title: "Be honest about the fit",
      good: ["Orgs where Asana genuinely works for company-wide work and Jira owns engineering", "Leads who want delivery judgement, not another tracker", "Teams that read metric formulas before trusting them"],
      bad: ["Companies without Jira looking for a general work manager — Asana remains the better broad answer", "Teams wanting portfolio reporting for marketing and ops — not our product, not our pitch", "Anyone expecting JiraVision to replace their coordination layer; it sits under the engineering one"],
    },
    method: {
      title: "How we compare",
      intro: "The rules we wrote for this page, published so you can hold us to them.",
      rows: [
        { label: "Charitable reading", detail: "Asana's column describes the product at its intended best, including its widely praised usability and template culture. 'Different focus' never means 'worse'." },
        { label: "Sources", detail: "Competitor positions come from Asana's public product pages at authoring time. We do not cite prices, market share or review scores — they rot; you can verify what we do claim in one click on their site." },
        { label: "Update policy", detail: "Pages are re-checked before major releases and on reader correction. If a row goes stale, tell us via /contact and we'll fix the row, not rewrite the story." },
        { label: "Tone", detail: "No strawmen, no logos, no superlatives we can't point at a shipped capability for. Our column matches the product pages exactly." },
      ],
    },
    // NOTE(PLACEHOLDER): example early-access conversations, not permissioned testimonials
    quotes: [
      { quote: "We kept Asana for the company and stopped pretending spreadsheets were our capacity plan. The draft simply reads better than the guess.", name: "Early-access participant — Head of engineering", role: "Product studio" },
      { quote: "Opening a metric and reading its formula is the meeting tool our Asana dashboards never were, because nobody could say how the number was made.", name: "Early-access participant — Engineering manager", role: "Devtools startup" },
    ],
    faq: [
      { q: "Should we migrate from Asana to Jira?", a: "Probably not — and that isn't our product. If Asana works for company-wide coordination, keep it. JiraVision connects to the Jira engineering already runs; we're the delivery layer, not the replacement layer." },
      { q: "Does Asana have AI too?", a: "It does — the honest difference is focus. Asana's AI assists content and summaries across general work; JiraVision's draft plans the next engineering cycle against capacity and history, shows its reasoning per item, and requires human approval." },
      { q: "Can JiraVision see work living outside Jira?", a: "Jira is live today. GitHub and GitLab signals are on the roadmap and labelled planned, not available. Non-tracker tools like Asana stay where they are." },
      { q: "What about reporting for the rest of the company?", a: "We deliberately don't do that. Nine documented delivery metrics, each with a move attached, is the whole reporting story — portfolios for marketing belong to the broad tools." },
      { q: "Is your pricing cheaper?", a: "We won't answer that with a number war, because ours would be stale on day one. Our model is one per-seat price across three plans with annual discount; theirs is tiered by edition. Compare the models on /pricing and their site." },
    ],
    cta: {
      title: "Depth where your delivery decisions happen",
      body: "Leave the coordination tool alone. Connect one Jira project and see the draft, the load picture and the formulas. 14-day trial, no card.",
      primary: { label: "Start free trial", href: "/signup" },
      secondary: { label: "Talk to a human first", href: "/contact" },
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  {
    slug: "linear",
    competitor: "Linear",
    positioning:
      "Linear is the fastest way to run issues. JiraVision is the deepest way to plan the cycle that contains them.",
    hero: {
      eyebrow: "Compare · JiraVision vs Linear",
      title: "Fast issues. Slower, better judgement.",
      subtitle:
        "Linear is genuinely excellent at issue tracking — keyboard-first, opinionated, quick. JiraVision plays a different position: capacity-aware sprint drafts, wellbeing signals and auditable metrics, built on top of Jira. This page is partly 'why not', including the honest one: if you're not on Jira, we're not for you.",
      bullets: [
        "Planning drafts with per-item rationale — a different muscle than fast triage",
        "Anonymous wellbeing pulses and team-level load, not issue analytics",
        "Requires Jira as the base; if that's a dealbreaker, say so up front",
      ],
      primary: { label: "Start free trial", href: "/signup" },
      secondary: { label: "See the comparison table", href: "#comparison" },
      badge: "Different position, same pitch",
    },
    problem: {
      title: "Why engineering teams ask this one hardest",
      intro:
        "Linear has won the developer-experience argument for a lot of product teams. The comparison questions come from the other side of the table — the EMs and leads whose problem isn't issue speed.",
      items: [
        {
          title: "Cycles still get planned by memory",
          body: "A fast tracker doesn't remove the Thursday-night question: who's on leave, who's carrying the ugly spike, what did we actually finish last cycle. Someone still drafts the plan; it's just in their head.",
        },
        {
          title: "The human layer isn't the tracker's job",
          body: "Workload strain, review concentration, after-hours creep — issue tools generally treat these as out of scope. That's a design decision, not a flaw; it just leaves the question unanswered.",
        },
        {
          title: "Jira gravity pulls teams back",
          body: "Plenty of orgs tried a lighter tracker and returned to Jira for enterprise workflows, reporting or customer-tooling integrations. The layer question then gets urgent.",
        },
      ],
    },
    features: {
      eyebrow: "Our angle",
      title: "The judgement layer, not a faster board",
      intro:
        "We're not competing on keystroke speed. Everything below reads from Jira history and produces something a human reviews.",
      items: [
        { title: "Drafts before planning", body: "A greedy, deterministic pass ranks backlog against real capacity — holidays, on-call, past completion — and arrives before the meeting." },
        { title: "Rationale as interface", body: "Each suggestion names its reason in plain English, generated with IBM Granite. The draft is there to be argued with." },
        { title: "Wellbeing signals", body: "A 30-second anonymous pulse per cycle plus team-level after-hours trends. Aggregation happens before display." },
        { title: "Auditable metrics", body: "Predictability and load balance with the formula printed on the card and a published refusal list." },
        { title: "Ethical recognition", body: "Skill trees the team votes into existence, counting reviews and mentoring; rankings stay behind a guardrail." },
        { title: "Approval-gated Jira writes", body: "Read-only until a human approves; every applied change attributed and one-click reversible." },
      ],
    },
    deepDives: [
      {
        title: "Speed and judgement are different products",
        body: "Linear optimises the seconds between seeing and doing. JiraVision optimises the one decision a week that decides whether those seconds add up: what the team commits to. A fast issue list next to an overcommitted plan is still an overcommitted plan.",
        bullets: ["We never touch your issue workflow or keyboard shortcuts", "Our output is a proposal you read, not a screen you drive", "Cycle planning gets a written answer for 'why this, why them'"],
        photoId: "photo-1522071820081-009f0129c71c",
        photoAlt: "Engineers reviewing the sprint plan together at one table",
      },
      {
        title: "The human layer, designed with guardrails",
        body: "Linear's minimalism sensibly excludes people-analytics. If you need that layer anyway, the real question is who builds it carelessly. JiraVision's pulses are anonymous by architecture, its views team-level by default, and per-person rankings permanently on our refusal list.",
        bullets: ["Individual answers never displayed raw; small groups merge", "Thresholds set, changed and seen by the team", "No activity scores, no keystrokes, no surveillance we'd be ashamed of"],
        photoId: "photo-1543269865-cbf427effbad",
        photoAlt: "A small team checking in calmly around a table",
      },
      {
        title: "Metrics that end arguments, not start them",
        body: "Insights in any tracker tell you what happened to issues. The delivery fights are about what numbers mean: predictability, load spread, review equity. Ours open to show numerator, denominator, exclusions and source events — disputes become edits to a definition.",
        bullets: ["Formula on every card, always", "Seasonality and release-week context shown on drift alerts", "Alert history auditable, including the dismissed ones"],
        photoId: "photo-1460925895917-afdab827c52f",
        photoAlt: "A dashboard of delivery figures on a laptop",
      },
    ],
    demo: "sandbox",
    table: {
      title: "Linear and JiraVision, dimension by dimension",
      intro:
        "A fair reading of Linear starts from what it's for: the best issue experience in the category. The comparison is about which questions each product is built to answer.",
      caption:
        "Qualitative positioning comparison between Linear and JiraVision across eight evaluation dimensions.",
      note: TABLE_NOTE,
      rows: [
        {
          dimension: "AI sprint planning",
          them: "Linear's AI features assist issue content and understanding; cycle planning remains a deliberate, manual team ritual.",
          us: "Capacity-aware draft with per-item written rationale, arriving before the planning meeting, approved by a human before anything moves.",
        },
        {
          dimension: "Workload visibility",
          them: "Assignee views show open work per person; the capacity picture (leave, on-call, history) is out of the tracker's scope by design.",
          us: "Team-level load distribution combining availability, history and anonymous check-ins, flagged past team-set thresholds.",
        },
        {
          dimension: "Gamification ethics",
          them: "No native recognition system — a consistent minimalism. Third-party options bring whatever guardrails their builders chose.",
          us: "Team-voted skill trees with rankings gated behind an explicit guardrail preview. Participation is opt-in, permanently.",
        },
        {
          dimension: "Metric transparency",
          them: "Cycle and issue analytics are clear and well-designed; how a figure is computed is the product's internal definition.",
          us: "Formula, source events, exclusions and recalculation time expand on the card. Plus a published list of metrics we refuse to build.",
        },
        {
          dimension: "Jira-native integration",
          them: "Two-way sync with Jira exists — Linear and Jira can mirror issues. The planning judgement, though, lives wherever the history is.",
          us: "Jira is the base itself; no mirroring, no second system, drafts read the full history you already keep.",
        },
        {
          dimension: "Pricing model",
          them: "Seat-based plans with editions; current structure on Linear's site.",
          us: "One per-seat price across Starter/Professional/Enterprise, 20% annual saving, 14-day trial without a card. See /pricing.",
        },
        {
          dimension: "Learning curve",
          them: "Among the lowest in the category — opinionated defaults carry you. That's a real, widely-liked strength.",
          us: "On-ramps only where you already have Jira muscle memory: connect, read the draft, approve. No new tracker for anyone to learn.",
        },
        {
          dimension: "Reporting",
          them: "Issue and cycle reporting focused on velocity and progress of work.",
          us: "Delivery-health reporting: predictability, load balance, review equity, after-hours drift — each metric shipping with a concrete move attached.",
        },
      ],
    },
    workflow: {
      title: "Moving over without losing Jira history",
      intro:
        "For most teams this isn't a migration off Linear — it's deciding where Jira is staying and layering there. When teams do consolidate on Jira, their issue history travels; then we connect.",
      steps: [
        { title: "Decide the base honestly", body: "If engineering is leaving Jira for good, we're the wrong product — say it plainly. If Jira is staying for enterprise workflows, the layer question is live." },
        { title: "Bring history with you", body: "Teams consolidating onto Jira keep full issue history there (imports and the Jira/Linear sync are their tools' job, not ours). Our read-only connect then baselines from that record." },
        { title: "Dual-run a cycle", body: "Plan your way; keep the draft beside it. The predicted-vs-actual chart starts its own honest track record from cycle one." },
        { title: "Approvals on, lights optional", body: "Enable approval-gated writes only where asked for. Drafts can be advisory forever — plenty of teams keep it that way." },
      ],
    },
    audience: {
      title: "Who picks us alongside Linear",
      intro: "Rarely 'instead of'. Usually: the seat that owns the commitment, not the keystrokes.",
      items: [
        { who: "Engineering managers on hybrid estates", body: "Half your story lives in Jira enterprise workflows. You get drafts and signals computed where the history actually is.", wins: ["One defensible plan per cycle", "Load evidence without snooping", "Formula-backed reviews"] },
        { who: "Leads inheriting a Jira org", body: "The company runs Jira; your team wishes it felt lighter. We don't fix the tracker — we remove the dread of planning it.", wins: ["Draft before the meeting", "Rationale-first disputes", "Revert anytime, everything logged"] },
        { who: "Founding EMs choosing a stack", body: "If you're choosing today and will need board-level predictability and wellbeing evidence later, Jira plus the layer is a path that survives growth.", wins: ["Start small, connect one project", "Refusal list published upfront", "Pricing model scales with seats, not surprises"] },
      ],
    },
    fit: {
      title: "Be honest about the fit",
      good: ["Teams whose Jira is non-negotiable but whose planning is chaotic", "Leads who want written rationale and auditable numbers, not a faster board", "Orgs comparing after a failed lightweight-tracker experiment"],
      bad: ["Linear-first teams with no Jira anywhere — we require Jira today, full stop", "Anyone optimising issue-capture speed; nothing here competes with that craft", "Managers wanting per-person scoreboards; those views are permanently refused"],
    },
    method: {
      title: "How we compare",
      intro: "The same rules we ask every competitor page to live by, stated on the page.",
      rows: [
        { label: "Charitable reading", detail: "Linear's column is written the way its fans would write it: fast, opinionated, best-in-class developer experience. Our disagreement is about which problem deserves focus, not whether theirs is solved well." },
        { label: "Sources", detail: "Positions drawn from Linear's public documentation at authoring time, including its Jira sync and AI features. No prices, market share or review scores anywhere in either column." },
        { label: "Our own bar", detail: "Every JiraVision cell matches a capability documented on our product pages — drafts, pulses, formula cards, guardrails — with roadmap items labelled planned, never promised." },
        { label: "Corrections", detail: "If a row misstates their product, /contact gets it fixed. Stale competitor claims are a failure we treat like a bug." },
      ],
    },
    // NOTE(PLACEHOLDER): example early-access conversations, not permissioned testimonials
    quotes: [
      { quote: "We kept arguing about whether the sprint was overcommitted until the draft started showing its maths. Now the argument is with a document.", name: "Early-access participant — Tech lead", role: "Agency" },
      { quote: "I liked the wellbeing piece because it refuses to name names. The one competitor scoreboard tool felt like the thing we deleted it for.", name: "Early-access participant — Engineering manager", role: "Fintech scale-up" },
    ],
    faq: [
      { q: "We love Linear. Is this page telling us to leave?", a: "No. If you're Linear-only, JiraVision isn't your product — the honest-fit box says so. If Jira stays in your estate regardless, the layer reads where your history already lives." },
      { q: "Doesn't Linear's Jira sync cover this?", a: "Sync keeps two trackers mirroring each other; it doesn't answer what next cycle should contain. Our drafts read the Jira history directly — no second system, no mirror drift to babysit." },
      { q: "Linear is so much faster to use — doesn't that matter more?", a: "For daily issue work, absolutely — we don't compete there and say so. The planning meeting is weekly and high-stakes; speed of triage and quality of commitment are different assets." },
      { q: "Would you build per-person productivity scores if we asked?", a: "No. Activity scores, per-person velocity and keyboard-time metrics are on our published refusal list; individual rankings live behind a guardrail most teams never open." },
    ],
    cta: {
      title: "Keep the speed. Add the receipts.",
      body: "Wherever Jira is staying in your org, connect it read-only and let the first draft argue for itself. 14-day trial, no card.",
      primary: { label: "Start free trial", href: "/signup" },
      secondary: { label: "Ask the awkward questions", href: "/contact" },
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  {
    slug: "trello",
    competitor: "Trello",
    positioning:
      "Trello makes work visible to everyone. JiraVision makes engineering load honest — on top of Jira.",
    hero: {
      eyebrow: "Compare · JiraVision vs Trello",
      title: "Cards you can see. Judgement you can audit.",
      subtitle:
        "Trello's genius is that anyone can read a board at a glance. JiraVision's is that your existing Jira history can now speak up — capacity-aware drafts, anonymous wellbeing signals, recognition the team designed. The two answer different questions: 'where is it?' versus 'what can we commit?'",
      bullets: [
        "Where Trello optimises visibility, we optimise the commitment decision",
        "Recognition with ethics built in — skill trees, not leaderboards",
        "Jira-native layer; your board's job is safe with us",
      ],
      primary: { label: "Start free trial", href: "/signup" },
      secondary: { label: "Play with the recognition demo", href: "#gamification" },
      badge: "Honest comparison",
    },
    problem: {
      title: "Why the question gets asked",
      intro:
        "A lot of engineering teams grew up on Trello boards and outgrew them quietly — not because the boards stopped working, but because the questions got harder than cards can answer.",
      items: [
        {
          title: "Cards don't know capacity",
          body: "A tidy board shows what's on fire. It doesn't know who's back from leave on Wednesday, who already has the awkward migration, or what last three cycles actually delivered.",
        },
        {
          title: "Simple systems hide the strain",
          body: "After-hours work and review pile-up are visible nowhere on a kanban board and everywhere in its aftermath. Measuring them needs timestamps, calendars and courage — plus guardrails so the measuring never becomes surveillance.",
        },
        {
          title: "The upgrade moment is awkward",
          body: "Moving to Jira (or staying in it) brings a configuration mountain. Teams sense the layer between the two — planning judgement without a rebuild — is exactly what nobody has time to handcraft.",
        },
      ],
    },
    features: {
      eyebrow: "Our angle",
      title: "The questions boards can't answer",
      intro: "Trello answers 'where is this task' better than almost anything. Here's what sits next to that.",
      items: [
        { title: "What can we commit?", body: "A draft sized to real availability — leave, on-call, historical completion — with a written reason on every suggested item." },
        { title: "Who's carrying too much?", body: "Team-level load distribution over points, reviews and after-hours drift. Flagged past thresholds the team itself set." },
        { title: "Recognition that counts care", body: "Reviews, mentoring, runbook work earn their place on a skill tree — behaviours chosen by team vote, never imposed." },
        { title: "Guardrails before glory", body: "Team-level by default, opt-in participation, rankings behind an explicit warning screen. The ethical design is the feature." },
        { title: "Pulse without the poke", body: "Anonymous 30-second check-ins, aggregated before display, small groups merged. Wellbeing evidence without surveillance theatre." },
        { title: "Numbers with receipts", body: "Every metric opens to its formula and source events. 'Predictable' becomes a definition the team agreed, not a vibe." },
      ],
    },
    deepDives: [
      {
        title: "Visibility was the first job. It's not the last.",
        body: "Trello earned its place by making work legible to non-engineers. The delivery questions that followed — cycle commitments, load balance, prediction accuracy — are a different legibility: one that reads history and shows its working. That's the layer we build.",
        bullets: ["Drafts replace the memory-based planning meeting", "Every suggestion names its reason, fit and risk", "Board-level simplicity preserved; the maths happens off-stage"],
        photoId: "photo-1551288049-bebda4e38f71",
        photoAlt: "Unequal bars on a chart being compared side by side",
      },
      {
        title: "Gamification, done with the brakes on",
        body: "Stickers and points are easy; the history of engineering leaderboards is a warning. Our recognition ships team-designed behaviours, points attached to verifiable Jira events instead of self-reports, and a guardrail screen that shows you exactly what ranking humans looks like before you turn it on.",
        bullets: ["Behaviour catalogue voted in at setup, retired quarterly", "Volume spikes trigger a config review, not a reward", "Opt-out is clean: no points tracked, all work still visible"],
        photoId: "photo-1600880292203-757bb62b4baf",
        photoAlt: "Teammates celebrating a small win together",
      },
      {
        title: "Outgrowing a board shouldn't mean drowning in one",
        body: "The classic fear: simple tool now, 40-field workflow later. Because JiraVision sits on top of whatever Jira project exists, teams arriving from Trello bring their cards' clarity forward — the draft's rationale text reads like a human wrote it, because it's built for humans to argue with.",
        bullets: ["No tracker rebuild on our side — connect the Jira you chose", "Read-only until approval keeps every tool change human", "Predicted-vs-actual chart earns trust in the open, cycle by cycle"],
        photoId: "photo-1552664730-d307ca884978",
        photoAlt: "A team agreeing on rules around a shared table",
      },
    ],
    demo: "gamification",
    table: {
      title: "Trello and JiraVision, dimension by dimension",
      intro:
        "Trello's column gives full credit for the easiest adoption in the category. The dimensions where they differ are exactly the ones that got heavy once cycles got real.",
      caption:
        "Qualitative positioning comparison between Trello and JiraVision across eight evaluation dimensions.",
      note: TABLE_NOTE,
      rows: [
        {
          dimension: "AI sprint planning",
          them: "Boards and lists stay manually arranged; Trello's assistive features lean toward content, not cycle commitments.",
          us: "A capacity-aware sprint draft before planning, with per-item rationale and a mandatory human approval before anything writes.",
        },
        {
          dimension: "Workload visibility",
          them: "Members-on-cards show who has what; total load across cycles, leave and interruption patterns isn't the board's job to know.",
          us: "Load distribution from history plus availability plus pulse, over-capacity flagged mid-cycle at team level.",
        },
        {
          dimension: "Gamification ethics",
          them: "Butler rules and power-ups make stickers and celebration easy to turn on — guardrails depend on which power-up you pick.",
          us: "Skill trees by team vote, points only from verifiable events, rankings behind an explicit logged guardrail switch.",
        },
        {
          dimension: "Metric transparency",
          them: "Viewing progress is the strength; metric definitions and computation are largely outside the product's surface.",
          us: "Numerator, denominator, exclusions and source events printed on every metric card, with a published refusal list.",
        },
        {
          dimension: "Jira-native integration",
          them: "Trello-to-Jira conversion paths exist via the wider Atlassian family; the two products run separate records.",
          us: "Two-way sync where Jira is the base itself — read-only until approval, writes attributed, no duplicate tracker to reconcile.",
        },
        {
          dimension: "Pricing model",
          them: "Seat-based editions with a well-known free entry point; current structure on Trello's site.",
          us: "Per-seat platform pricing across three plans; annual billing saves 20%; 14-day trial with no card. See /pricing.",
        },
        {
          dimension: "Learning curve",
          them: "The lowest in the category — famously so. New teammates read a board in minutes.",
          us: "You keep whatever Jira comfort your team has; the layer adds reading a draft, not learning a tracker. Rationale text is the manual.",
        },
        {
          dimension: "Reporting",
          them: "Board-level progress and simple summaries; deeper reporting generally arrives via the Atlassian suite.",
          us: "Delivery reporting with an opinion: predictability, review equity, drift alerts — nine metrics, each with a concrete move attached.",
        },
      ],
    },
    workflow: {
      title: "Moving over without losing Jira history",
      intro:
        "Teams growing out of Trello usually land in Jira first — that's Atlassian's own migration path, and a good one. This page is what happens after, without a second project rebuild.",
      steps: [
        { title: "Land the history once", body: "Cards and their context move into Jira using the suite's own import paths. That step belongs to your team and your admins — not to us." },
        { title: "Connect, don't rebuild", body: "JiraVision scopes read-only to the migrated projects and baselines cycle history from day one of the first real sprint in Jira." },
        { title: "Keep the board's clarity", body: "The draft's written rationale preserves the at-a-glance spirit the team liked about Trello — plain language per item, no dashboard literacy required." },
        { title: "Switch on the human gates", body: "Approval-gated writes, the first anonymous pulse, and recognition behaviours voted in at a retro. Nothing lands without a name attached." },
      ],
    },
    audience: {
      title: "Who arrives from a board",
      intro: "Not the whole company — the engineering island inside a board-friendly org.",
      items: [
        { who: "The team that outgrew the columns", body: "'In progress' started meaning six things at once. You want cycle commitments with a written basis, not more lists.", wins: ["Drafts sized to reality", "Scope-creep named mid-sprint", "One-click revert on anything applied"] },
        { who: "Leads who like the simplicity", body: "You're protective of the low-ceremony culture. The layer adds reading and approving — not admin.", wins: ["No workflow engineering", "Team-voted recognition config", "Thresholds your team owns"] },
        { who: "Mixed orgs (boards elsewhere)", body: "Marketing keeps its boards; engineering's Jira gets the planning layer. Nobody's tool changes except the people who asked for it.", wins: ["Jira-native where Jira lives", "Company tools untouched", "Signals aggregate-only, names never attached"] },
      ],
    },
    fit: {
      title: "Be honest about the fit",
      good: ["Engineering teams whose work outgrew columns but not the love of simplicity", "Orgs keeping Trello elsewhere while layering where Jira runs", "Teams wanting recognition for quiet work without a leaderboard"],
      bad: ["Non-engineering teams living happily in boards — Trello remains the better answer, genuinely", "Any org without Jira anywhere: the layer has nothing to sit on yet", "People wanting the board rebuilt inside our tool — we're a read-and-propose layer, not a tracker"],
    },
    method: {
      title: "How we compare",
      intro: "Rules stated on the page so readers can check our motives as easily as our math.",
      rows: [
        { label: "Charitable reading", detail: "Trello's column describes its deliberate strengths — simplicity, speed to value, universal legibility. Nothing here pretends boards are shallow; they're shallow by design and that design is good." },
        { label: "Sources", detail: "Competitor positions from Trello's public product pages at authoring time. We cite no prices, no market share, no review scores — check current details on their site." },
        { label: "Our own bar", detail: "Every claim about JiraVision appears identically on our product pages: drafts, guardrails, formula-on-card metrics, refusal list." },
        { label: "Corrections welcome", detail: "A misread row is a bug. /contact opens the issue; we fix the row and keep the tone." },
      ],
    },
    // NOTE(PLACEHOLDER): example early-access conversations, not permissioned testimonials
    quotes: [
      { quote: "The guardrail preview made the decision for us — we looked at the ranking screen once and closed it. Team trees only, forever.", name: "Early-access participant — Tech lead", role: "Agency" },
      { quote: "We came from a board and kept the board's spirit: everything the system says, it says in words the whole team can read.", name: "Early-access participant — Engineering manager", role: "Product studio" },
    ],
    faq: [
      { q: "Should my whole company move?", a: "No — and nothing we sell works that way. Marketing stays on boards if boards work. JiraVision connects to the Jira engineering already runs or has chosen to run." },
      { q: "Isn't gamification just a leaderboard with stickers?", a: "That version exists, and it's why we ship the opposite default: skill trees, team totals, opt-in participation, and an explicit warning screen before individual rankings can turn on." },
      { q: "We're not on Jira — can you just be our tracker?", a: "No. We're an intelligence layer on Jira; without it there's nothing to read. If you're choosing a tracker today, that decision belongs between you and the trackers." },
      { q: "What do you see that a board didn't?", a: "Cycle history, transitions and timestamps, calendars, and the team's own anonymous check-ins. Same work, more signal — because the signal was always in the record." },
    ],
    cta: {
      title: "Keep the clarity. Get the judgement.",
      body: "Wherever Jira runs, connect it read-only and let the first draft and the first team-voted tree do the persuading. 14-day trial, no card.",
      primary: { label: "Start free trial", href: "/signup" },
      secondary: { label: "Compare something else", href: "/compare" },
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  {
    slug: "notion",
    competitor: "Notion",
    positioning:
      "Notion lets you build any system you want. JiraVision ships the delivery system already built — on top of Jira.",
    hero: {
      eyebrow: "Compare · JiraVision vs Notion",
      title: "Build-your-own vs shipped-with-receipts",
      subtitle:
        "Notion's flexibility is real and useful — plenty of teams have built a fine sprint tracker inside it. JiraVision starts where that build ends: capacity-aware drafts from your Jira history, formulas visible on every card, and metrics that don't rot when someone renames a database column.",
      bullets: [
        "Where Notion hands you a blank database, we ship the methodology",
        "Metrics that show their formula, source events and exclusions",
        "Jira-native: reads the system of record, not a mirror of it",
      ],
      primary: { label: "Start free trial", href: "/signup" },
      secondary: { label: "Try the models live", href: "#calculators" },
      badge: "Honest comparison",
    },
    problem: {
      title: "Why builders reach for Notion — and where it stops",
      intro:
        "Teams with strong opinions often try to build planning in a flexible workspace first. That path teaches three expensive lessons.",
      items: [
        {
          title: "The tracker becomes a project", body: "Someone owns the schema, the relations, the rollups. When they change jobs, the system becomes archaeology — and the numbers nobody can defend.",
        },
        {
          title: "Manual updates lie slowly", body: "A beautiful sprint page that's refreshed by hand drifts from reality a little every day. By retro it's a story, not a measurement.",
        },
        {
          title: "The source of truth was elsewhere", body: "Issues, transitions and history lived in Jira all along; the workspace was a painting of them. The gap between painting and record is where planning arguments go to die.",
        },
      ],
    },
    features: {
      eyebrow: "Our angle",
      title: "Shipped methodology, not an empty canvas",
      intro:
        "Everything below is built so nobody on your team has to design the measurement system, then maintain it forever.",
      items: [
        { title: "Definitions pre-written", body: "Predictability, load spread, review equity: formulas public on the card, disputes become edits to definitions, not vibes." },
        { title: "Drafts from live records", body: "Reads Jira directly — no status column someone updates at 6pm Friday. Capacity-aware proposal before planning, rationale per item." },
        { title: "Workload without a rollup", body: "The cross-database aggregation you'd hand-build is the default view: who's over, which skill bottlenecks, where next sprint pinches." },
        { title: "Anonymous by architecture", body: "Pulse answers aggregated before display, small groups merged. A DIY survey page can't promise what your own schema forbids." },
        { title: "Recognition that survives turnover", body: "Team-voted behaviours attached to verifiable events — not a badge property someone invented in a template." },
        { title: "Approval gates, audit trails", body: "Every write attributed; alert history includes the dismissed ones. Built-in provenance, not build-your-own provenance." },
      ],
    },
    deepDives: [
      {
        title: "Flexibility is a project you fund forever",
        body: "A Notion sprint system reflects exactly its builder's mental model — which is either the team's best tool or its latest dependency. JiraVision's model is fixed and documented on purpose: nine metrics with published methodology, so the system keeps working when the person who'd have maintained yours leaves.",
        bullets: ["No schema to steward, no rollups to re-create", "Metric definitions versioned and visible", "Setup is connection plus choices, not construction"],
        photoId: "photo-1551288049-bebda4e38f71",
        photoAlt: "A clean chart on a screen, formula panel expanded below it",
      },
      {
        title: "Painting the record vs reading it",
        body: "The sprint page synced by hand and the board it describe diverge at the speed of human diligence. Our drafts read the system of record directly — transitions, timestamps, calendars — and write back only through logged approvals.",
        bullets: ["Zero manual status upkeep feeding the plan", "Two-way Jira sync, read-only until you approve", "Predicted-vs-actual accuracy displayed each cycle"],
        photoId: "photo-1552664730-d307ca884978",
        photoAlt: "A team reviewing their plan on a sticky-note wall",
      },
      {
        title: "The models you'd have to build, already run",
        body: "Burnout pressure and a delivery ROI projection are slider-and-formula work any analyst could recreate in a workspace — on a spreadsheet, from memory, updated never. Here they run on your inputs with every assumption visible, in the browser, today.",
        bullets: ["Two live calculators, no signup, assumptions on screen", "Formulas documented in the product's own method pages", "Same numbers your manager sees and your team sees"],
        photoId: "photo-1522202176988-66273c2fd55f",
        photoAlt: "Teammates smiling around a shared laptop during a pulse check",
      },
    ],
    demo: "calculators",
    table: {
      title: "Notion and JiraVision, dimension by dimension",
      intro:
        "Notion's column credits the one thing we'll never replicate: making any system imaginable. Our argument is that delivery planning shouldn't be imaginable forty different ways.",
      caption:
        "Qualitative positioning comparison between Notion and JiraVision across eight evaluation dimensions.",
      note: TABLE_NOTE,
      rows: [
        {
          dimension: "AI sprint planning",
          them: "Notion's AI assists writing and databases generally; a sprint planner is whatever your team builds inside it.",
          us: "A purpose-built, capacity-aware draft from Jira history with per-item rationale and a human approval gate.",
        },
        {
          dimension: "Workload visibility",
          them: "As rich as the rollups you build — and they're yours to build and maintain.",
          us: "Load distribution across points, reviews and after-hours work is a shipped default view, flagged past team-set thresholds.",
        },
        {
          dimension: "Gamification ethics",
          them: "Recognition is template-shaped: teams can build badges that do exactly what they decide, guardrails included.",
          us: "Ethics ship as product defaults: opt-in participation, team-level trees, rankings behind a logged guardrail switch.",
        },
        {
          dimension: "Metric transparency",
          them: "Formulas are literally visible — but visible formulas depend on visible diligence; hand-maintained numbers drift from the record.",
          us: "Visible formula computed from source events at query time, with exclusions and recalculation time printed alongside.",
        },
        {
          dimension: "Jira-native integration",
          them: "Embeds and syncs bring Jira into pages; the page's truth is as current as the sync.",
          us: "Jira is the base itself — read directly, write only through approval. No mirrored copy, no sync staleness.",
        },
        {
          dimension: "Pricing model",
          them: "Seat-based editions with blocks or usage features by plan; current structure on Notion's site.",
          us: "One per-seat platform price across three plans, 20% annual saving, 14-day trial without a card. See /pricing.",
        },
        {
          dimension: "Learning curve",
          them: "Easy to start, steep to systematise — the maintenance cost of a home-built process is the honest caveat.",
          us: "Setup is scoped connection plus team choices (thresholds, behaviours). Nothing to design first.",
        },
        {
          dimension: "Reporting",
          them: "Unlimited in principle: if you can model it, you can chart it.",
          us: "Deliberately bounded: nine documented delivery metrics, each with a concrete move attached, plus a published refusal list.",
        },
      ],
    },
    workflow: {
      title: "Moving over without losing Jira history",
      intro:
        "For teams with planning pages in Notion and records in Jira, this isn't a migration — it's the retirement of a manual sync step. Nothing in your workspace gets deleted; nothing gets maintained by hand anymore.",
      steps: [
        { title: "Inventory the pages, honestly", body: "List what the built tracker does for you: drafts, status, retro notes. Most lists split into 'the record already has it' and 'the meeting still needs a human'." },
        { title: "Connect the real record", body: "JiraVision reads the Jira projects those pages painted — full history intact, read-only, scoped." },
        { title: "Keep pages where pages shine", body: "Retro notes, decision docs and specs stay in Notion. Planning arithmetic stops living there; the draft with rationale replaces it." },
        { title: "Archive the rollups", body: "Retire the hand-kept status database, or leave it as a museum piece. Either way, the numbers your cycle runs on now show their formula and their source." },
      ],
    },
    audience: {
      title: "Who arrives from a build",
      intro: "Teams that built the system once and have been paying the maintenance bill since.",
      items: [
        { who: "The exhausted builder", body: "You made the perfect sprint database. You also became the person on call for its relations. Hand the arithmetic over.", wins: ["Schema you don't steward", "Definitions with versions", "No Friday-evening status pass"] },
        { who: "Ops-literate leads", body: "You trust a number only as far as its formula. Ours expand on the card, and the refusal list says upfront what we won't compute.", wins: ["Formula-on-card culture", "Source events listed", "Audit trail including dismissals"] },
        { who: "New managers inheriting the wiki", body: "The team's process lives in pages written by people who left. The layer's draft arrives with the reasons in plain language — the tribal knowledge made current.", wins: ["Rationale every cycle", "Live from history, not lore", "Thresholds re-set by the team, visibly"] },
      ],
    },
    fit: {
      title: "Be honest about the fit",
      good: ["Teams already running Jira as the record, with a Notion layer they maintain by hand", "Sceptics who read formulas before trusting figures", "Builders who'd rather fund a product than a maintenance habit"],
      bad: ["Companies without Jira: there is nothing for us to read — a Notion-built tracker may genuinely be right for you", "Teams who love building systems as a craft — our deliberate narrowness will feel restrictive", "Anyone wanting docs and wikis from us; those are Notion's actual product and we don't do them at all"],
    },
    method: {
      title: "How we compare",
      intro: "The same transparency we demand of our own metrics, applied to this page.",
      rows: [
        { label: "Charitable reading", detail: "Notion's column credits its genuine superpower — building any system you can imagine. Our claim is narrow: for delivery planning, the imaginary-again-and-again version costs more than it looks." },
        { label: "Sources", detail: "Competitor positions from Notion's public pages at authoring time; no prices, market share or review scores. Verify current details on their site." },
        { label: "Our own bar", detail: "Every row maps to documented product pages: formula-on-card metrics, refusal list, approval-gated sync, live calculators." },
        { label: "Corrections", detail: "Reader corrections are treated as bugs: /contact, fix the row, keep the tone." },
      ],
    },
    // NOTE(PLACEHOLDER): example early-access conversations, not permissioned testimonials
    quotes: [
      { quote: "Our sprint page in Notion was beautiful and wrong about 40% of Fridays. Now the draft reads the board instead of the vibes.", name: "Early-access participant — Engineering manager", role: "Series B fintech" },
      { quote: "The refusal list convinced me a metrics vendor understands metrics. Ours used to measure whatever whoever built the database thought of.", name: "Early-access participant — VP Engineering", role: "Health-tech startup" },
    ],
    faq: [
      { q: "We already built a good sprint tracker in Notion. Why layer?", a: "Maybe you shouldn't — if it reads from your real records and survives its builder leaving, keep it. Most don't. The layer removes the maintenance habit, not your ownership of the process." },
      { q: "Can't Notion's formulas show their working too?", a: "Yes — on the arithmetic. What a workspace can't show is provenance: which Jira events fed the number, when it was computed, and what changed since. Ours prints source events and recalculation time with the formula." },
      { q: "Do you replace our docs and wikis?", a: "Not remotely. Keep decision records, specs and retro notes wherever they live happily. We take over exactly one thing: the planning arithmetic done on top of Jira records." },
      { q: "What if we're Notion-only, no Jira anywhere?", a: "Then there is nothing for JiraVision to read, and this comparison should end with 'not the right tool today'. We say that on our own honest-fit box." },
    ],
    cta: {
      title: "Retire the rollups, keep the workspace",
      body: "Connect the Jira your pages were painting, and read the draft that updates itself. Run both calculators on the page above, free, no signup.",
      primary: { label: "Start free trial", href: "/signup" },
      secondary: { label: "See another comparison", href: "/compare" },
    },
  },
];

export const compareBySlug = (slug: string) => compares.find((c) => c.slug === slug);

/** The other four comparisons plus the hub, for RelatedSection on every compare page. */
export const compareRelated = (self: string) => [
  ...compares
    .filter((c) => c.slug !== self)
    .map((c) => ({
      title: `JiraVision vs ${c.competitor}`,
      href: `/compare/${c.slug}`,
      summary: c.positioning,
    })),
  {
    title: "All comparisons",
    href: "/compare",
    summary:
      "Every pairing on one page, with the method we hold each table to and the rules we refuse to break.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Hub page (/compare) content.

export const compareHub = {
  hero: {
    eyebrow: "Compare",
    title: "JiraVision, compared honestly",
    subtitle:
      "Five pairings, written to the same rules: qualitative positions, no price wars, competitors credited for what they're genuinely good at, and a visible note wherever public materials need re-checking.",
    bullets: [
      "Jira alone, Asana, Linear, Trello, Notion — one page each",
      "Every table built on the method stated on the page",
      "Our own claims identical to our product pages",
    ],
    primary: { label: "Start free trial", href: "/signup" },
    secondary: { label: "How to read our tables", href: "#reading" },
    badge: "No strawmen",
  },
  cards: {
    eyebrow: "The five pages",
    title: "Pick your matchup",
    intro:
      "One friendly page about Jira itself, four honest ones about tools teams weigh us against. Every table follows the house rules further down.",
  },
  problem: {
    title: "Why we publish our own comparisons",
    intro:
      "Most vendors let a fan-made Reddit thread answer 'how are you different from X'. We'd rather write it ourselves and hold the pen to a published standard.",
    items: [
      {
        title: "The questions were going to get answered anyway",
        body: "Prospects arrive with a named alternative in mind. The useful answer is specific and charitable, not a features checklist with one column highlighted.",
      },
      {
        title: "Numbers rot; positions don't (as fast)",
        body: "We deliberately publish no competitor prices, market share or review scores. Those change quarterly and any static page claiming them is wrong on a delay.",
      },
      {
        title: "The honest-fit answer matters most",
        body: "Some teams genuinely shouldn't buy from us — teams without Jira, teams wanting surveillance views. Those exclusions are on every page, in their own boxes.",
      },
    ],
  },
  /** The "how to read our tables" band on the hub. */
  reading: {
    title: "How to read any table here",
    intro:
      "Three conventions, applied on every comparison page, so rows from different pages are comparable.",
    items: [
      {
        title: "Positions, not checklists",
        body: "Each cell says where the product aims its effort — 'where X focuses on breadth, JiraVision…'. A missing feature in someone's roadmap is not a missing feature in their product.",
      },
      {
        title: "No time-sensitive numbers",
        body: "Pricing rows describe the model, never the amount. The note under each table asks you to verify current details on the vendor's own site — because we can't responsibly freeze-frame theirs.",
      },
      {
        title: "Our column is auditable",
        body: "Every JiraVision cell maps to a capability documented on our product pages. If a row ever overstates what we ship, that's a bug report and a fix, in that order.",
      },
    ],
  },
  /** MethodSection on the hub — the meta version of each page's method. */
  method: {
    title: "How we compare — the house rules",
    intro:
      "The same four rules bind all five comparison pages. They live here so you can audit us from one place.",
    rows: [
      { label: "Charitable reading", detail: "Each competitor column is written as its best advocates would write it. Breadth, speed and flexibility are credited where they exist; our argument is always about focus, not quality." },
      { label: "Public materials only", detail: "Positions are checked against vendor documentation and product pages at authoring time. No screenshots from private demos, no paraphrased sales decks, no review-site scores." },
      { label: "Nothing perishable", detail: "No prices, market share or review scores in any table. Pricing rows describe models (seat-based, tiered) and point to each site for current figures." },
      { label: "Corrections treated as bugs", detail: "If a row misstates a competitor's product, email /contact — we fix the row, keep the tone, and the page says so. Stale competitor claims are a failure state, not a marketing choice." },
    ],
  },
  /** HonestFitSection on the hub — what these pages are not. */
  fit: {
    title: "What these pages are not",
    good: [
      "A starting point for teams whose engineering already lives in Jira",
      "A transparent method you can hold us to, page by page",
      "An honest exit for readers we shouldn't sell to — every page says so in its own box",
    ],
    bad: [
      "Up-to-the-minute fact sheets on competitor products — verify current details on their sites",
      "Price comparisons — we deliberately publish none, ours or theirs",
      "A verdict that any of these tools is bad; several of them are excellent at jobs we don't do",
    ],
  },
  /** SplitFeature band on the hub — the one-paragraph thesis behind all five pages. */
  angle: {
    title: "One sentence about what JiraVision is",
    body: "It is an intelligence layer that sits on top of Atlassian Jira — drafting sprints against real capacity, surfacing workload and wellbeing signals, and printing the formula next to every number — plus standalone planning models you can run before signing anything. It is not a tracker, not a wiki, and not a replacement for the tools compared on these pages.",
    bullets: [
      "Reads your Jira; writes nothing without a human approval",
      "Wellbeing pulses aggregated before anyone sees them",
      "Refusal list published: no activity scores, no per-person rankings by default",
    ],
  },
  /** Where each comparison naturally continues, after the five tables. */
  nextSteps: {
    title: "After the comparisons",
    eyebrow: "Keep reading",
    items: [
      {
        title: "What JiraVision actually is",
        href: "/about",
        summary: "The layer, the guardrails and the refusals, written for sceptics of vendor self-descriptions.",
      },
      {
        title: "AI Scrum Master, in detail",
        href: "/products/ai-scrum-master",
        summary: "The draft engine every comparison references — capacity model, rationale format, approval gates.",
      },
      {
        title: "Ethical Metrics",
        href: "/products/ethical-metrics",
        summary: "The formula-on-card discipline behind every 'metric transparency' row on this site.",
      },
      {
        title: "Pricing, stated plainly",
        href: "/pricing",
        summary: "Our own model in maintained numbers: per seat, three plans, 20% annual saving — no calculator ambush.",
      },
    ],
  },
  faq: [
    {
      q: "Are these comparisons even-handed?",
      a: "We try to be — the method section above is the standard we write to, and every page credits what the other tool genuinely does well. Readers should still verify: feature positions were checked against public materials at authoring time, and their sites move.",
    },
    {
      q: "Why is there no pricing column?",
      a: "Because a static number on our site is a stale number on your screen. Each table describes pricing models instead; our own figures live on /pricing, where they're maintained.",
    },
    {
      q: "We use a tool that isn't listed here.",
      a: "That's likely fine — the honest answer for teams without Jira anywhere is that JiraVision has no base to sit on. If your tool matters to you, /contact will hear a serious comparison request.",
    },
    {
      q: "How often are these pages updated?",
      a: "Before major releases and whenever a reader flags a stale row. The note under every table exists because we'd rather hand you the verification step than pretend we froze the market.",
    },
    {
      q: "Does 'not a focus' mean 'bad at it'?",
      a: "Never. It means the product's effort goes somewhere else — and for many teams, somewhere else is the right place. The honest-fit box on each page names the teams we shouldn't win.",
    },
  ],
  cta: {
    title: "Seen enough comparisons?",
    body: "The shortest way to test any of this: connect one Jira project read-only and let the first draft be argued with, edited and rejected. 14-day trial, no card.",
    primary: { label: "Start free trial", href: "/signup" },
    secondary: { label: "Ask us a hard question", href: "/contact" },
  },
};
