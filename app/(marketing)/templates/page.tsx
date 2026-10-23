import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import {
  PageHero,
  ProblemSection,
  FeatureGridSection,
  SplitFeature,
  PhotoCard,
  StepsSection,
  MethodSection,
  AudienceSection,
  HonestFitSection,
  FaqSection,
  RelatedSection,
  CtaSection,
} from "@/components/sections/page-kit"
import { Section, SectionHeading } from "@/components/sections/section"
import { Button } from "@/components/ui/button"
import { TemplatesLibrary } from "./templates-library"
import { TemplateRequestForm } from "./template-request-form"

export function generateMetadata(): Metadata {
  return {
    title: "Template Library — JiraVision",
    description:
      "Twelve starter routines for calmer delivery — planning, rituals, wellbeing, metrics and docs. Browse every card, copy the checklist, download the markdown. No signup wall.",
    alternates: { canonical: "/templates" },
  }
}

// Template-specific FAQ (the /faq page owns the product-wide set).
const templateFaq = [
  {
    q: "Are these templates live features inside JiraVision?",
    a: "Not as a click-to-apply feature yet. Every template here is a real checklist you can copy or download today, written from playbooks already documented on the product pages; the in-product preview-and-claim flow is still being finalised. Until then delivery is deliberately low-tech: clipboard, markdown file, or a note to a human.",
  },
  {
    q: "Why can I copy and download them for free?",
    a: "The checklists are the small piece — making them stick is the product's job. Capacity worksheets get easier with the AI Scrum Master's drafts, pulses get safer with team-level aggregation, and metric cards get their formulas from Ethical Metrics. Nothing on this page is locked behind a signup wall.",
  },
  {
    q: "Does the ethical metrics starter menu match what the product ships?",
    a: "It's the same rulebook in worksheet form: the product documents nine metrics, each with the formula printed on the card, plus a published refusal list (lines of code, per-person velocity, activity and keyboard-time scores). The template gets you the thinking; the dashboard gets you the live data.",
  },
  {
    q: "Can you adapt a template to our workflow?",
    a: "Yes — use the request form on this page; it posts straight to the team inbox like any other contact message. Small adaptations get an honest answer; routines that would rank people by output or surveil individuals won't be adapted into existence, in a template or in the product.",
  },
  {
    q: "What exactly do I get when I download a .md file?",
    a: "A plain markdown file with the template's title, summary, who it's for, and its includes as checkbox lines — readable in any editor, pasteable into your wiki or a Jira ticket. It's a static file generated in your browser; nothing is sent anywhere when you download.",
  },
]

const categoryGuide = [
  {
    title: "Planning",
    body: "Capacity-first commits and a 25-minute triage routine — for teams that consistently over-commit and product + eng pairs who need priorities kept honest.",
  },
  {
    title: "Rituals",
    body: "Rotating retro formats, a demo day that isn't a status meeting, and staged WIP-limit rollouts with the team's veto kept real.",
  },
  {
    title: "Wellbeing",
    body: "Anonymous mid-sprint pulses, after-hours recovery protocols and a rebalance playbook — spot the overloaded person before standup #20.",
  },
  {
    title: "Metrics",
    body: "The ethical starter menu — formulas, anti-patterns and the question each metric answers — plus a predictability review for planning prep.",
  },
  {
    title: "Docs",
    body: "Runbook kits with owners and expiry dates, and an AI suggestions review log that tracks what you accepted, edited or rejected — and why.",
  },
]

export default function TemplatesPage() {
  return (
    <>
      <PageHero
        eyebrow="Template library"
        title="Steal our playbooks before the next sprint breaks"
        subtitle="Twelve starter routines across planning, rituals, wellbeing, metrics and docs. Browse every card, copy the checklist, download the markdown — no email wall, no signup."
        bullets={[
          "All twelve templates, filterable by category and searchable",
          "Copy checklist or download .md on every card",
          "Adaptation requests land in a real human's inbox",
        ]}
        primary={{ label: "Browse the library", href: "#library" }}
        secondary={{ label: "Request a template", href: "#request" }}
        badge="Free to copy"
      />

      <Section bg="grid">
        <div className="max-w-3xl rounded-lg border bg-card p-6 shadow-soft">
          <h2 className="font-display text-xl font-medium tracking-tight">
            What this library is — and what it isn't
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            These are proposed starter templates — the same twelve shown on the homepage —
            published here in full so you can use them today. What they are: real checklists,
            worksheets and prompts you can copy or download right now. What they aren't yet:
            a click-to-apply feature inside the product. The in-product claim flow is still
            being confirmed, so until it ships, delivery is old-fashioned — clipboard,
            markdown file, or a message to{" "}
            <Link href="/contact" className="font-medium text-primary underline-offset-4 hover:underline">
              a human
            </Link>
            .
          </p>
        </div>
      </Section>

      <ProblemSection
        eyebrow="How to use it"
        title="Three moves per template, no account needed"
        items={[
          {
            title: "Copy the checklist",
            body: "One click puts the template's full checklist on your clipboard — paste it into your retro notes, team wiki or a first Jira ticket. If your browser blocks the clipboard, the same text appears in a box ready to select manually.",
          },
          {
            title: "Download the .md",
            body: "Take the markdown file and commit it where your team already works. It's generated in your browser from the card's content — a static file, nothing phoned home.",
          },
          {
            title: "Request an adaptation",
            body: "Tell us what to bend to your workflow using the form further down this page. It posts to the same contact inbox everything else uses — a human who builds the product reads it.",
          },
        ]}
        bg="grain"
      />

      <TemplatesLibrary />

      <FeatureGridSection
        eyebrow="Orientation"
        title="Five categories, one lens each"
        intro="The shelf is organised by the kind of trouble each template is meant to catch early."
        items={categoryGuide}
        bg="contour"
      />

      <SplitFeature
        index="01"
        title="Wellbeing templates: catch the overload before it's an exit interview"
        body="Three of the twelve exist because burnout doesn't announce itself in standup — it shows up as quiet overtime and shrinking review quality. The pulse, the recovery plan and the rebalance playbook are the paper version of what the Team Wellbeing product does with thresholds, aggregation and formulas."
        bullets={[
          "Check-in pulse — 5 questions, team-level-only reporting from day one",
          "After-hours recovery — load-drop schedule and a meeting blackout block",
          "Mid-sprint rebalance — signal list, moves menu, and a script for how to say it",
        ]}
        visual={<PhotoCard photoId="photo-1600880292203-757bb62b4baf" alt="Teammates celebrating a win over a shared laptop" />}
      />

      <StepsSection
        eyebrow="From page to habit"
        title="Adopting a template in one cycle"
        intro="A checklist nobody schedules is a screenshot nobody opens. Four moves, one sprint."
        steps={[
          { title: "Pick by stage, not ambition", body: "Every card names the trouble it fits — 'teams that consistently over-commit', 'Kanban-ish teams'. Choose the one that sounds like your Tuesday." },
          { title: "Copy or download it", body: "Put the checklist where your team already looks: the retro board, the repo, the wiki. Plain markdown on purpose." },
          { title: "Run it once, as written", body: "One cycle without edits. The point is the ritual, not the formatting — note what fought reality." },
          { title: "Make it stick with evidence", body: "Signals without moves make things worse: the product's drafts, thresholds and formulas are what turn a routine into a habit that survives deadlines." },
        ]}
        bg="grid"
      />

      <MethodSection
        eyebrow="Same honesty rules"
        title="How these templates are built"
        intro="Each one mirrors a playbook already documented on the product pages — no methodology invented for the shelf."
        rows={[
          { label: "From the product", detail: "The recovery-week sheet, the setup-vote ritual, the metric cards with anti-patterns: every template is the paper version of something the product already does and says publicly." },
          { label: "Checklist-first", detail: "No philosophy essays. Each template ships as concrete includes — worksheets, prompts, decision logs — you can run this cycle." },
          { label: "Written by the small team", detail: "Engineers, designers and researchers who all talk directly to the teams using the product — the same people who read the request form below." },
          { label: "Bound by the refusal list", detail: "Templates carry the product's guardrails: nothing here ranks people by output, watches keyboards, or reports individual check-ins raw." },
        ]}
        bg="grain"
      />

      <SplitFeature
        index="02"
        title="Docs & metrics: the receipts your rituals generate"
        body="A runbook nobody updates and a dashboard nobody trusts fail the same way — silently. These templates attach owners, expiry dates, formulas and decision logs to the paperwork, so the artefacts argue for themselves in the next planning meeting."
        bullets={[
          "Team runbook kit — skeleton, review cadence and searchability rules",
          "AI suggestions review log — decision log, reason codes, monthly digest",
          "Predictability review — commit vs finish sheet, drift chart spec, agenda",
        ]}
        visual={<PhotoCard photoId="photo-1460925895917-afdab827c52f" alt="A dashboard of figures on a laptop screen" />}
        flip
        bg="hatch"
      />

      <HonestFitSection
        title="Templates vs. bringing in a consultant"
        good={[
          "You want a routine running this week — copying is faster than scheduling discovery",
          "The gap is structure, not strategy: retro formats, triage lanes, recovery weeks",
          "A cheap, honest test of whether any process change would help at all",
        ]
        }
        bad={[
          "Org-level change — a playbook can't restructure a comp band or survive a reorg freeze",
          "Self-enforcing habits — nothing here automates; someone still has to run the ritual",
          "Audit artefacts — these are starter checklists, not compliance evidence",
        ]}
        bg="band-clay"
      />

      <AudienceSection
        eyebrow="Who grabs what first"
        title="Which cards get copied earliest"
        intro="Straight from the twelve on the shelf — match your Tuesday, not your ambitions."
        items={[
          {
            who: "Scrum masters and EMs",
            body: "The mid-sprint rebalance playbook is the one people say they needed before they had the word for it — move work, not blame.",
            wins: ["Mid-sprint rebalance playbook", "Rotating retro formats", "WIP-limit rollout"],
          },
          {
            who: "Leads who suspect, don't know",
            body: "Start with the pulse: five anonymous questions, team-level aggregation and act-on thresholds from day one.",
            wins: ["Wellbeing check-in pulse", "After-hours recovery plan", "Capacity-first sprint plan"],
          },
          {
            who: "First-dashboard builders",
            body: "The starter menu carries the formulas and the do-not-ranking list before any chart exists — the thinking, without the tooling.",
            wins: ["Ethical metrics starter menu", "Predictability review", "AI suggestions review log"],
          },
        ]}
        bg="dots"
      />

      <TemplateRequestForm />

      <FaqSection title="Questions about the templates" items={templateFaq} moreHref="/faq" moreLabel="All site questions" bg="band-sage" />

      <RelatedSection
        title="Templates are the start — this is the engine"
        items={[
          {
            title: "AI Scrum Master",
            href: "/products/ai-scrum-master",
            summary: "Capacity-aware sprint drafts with a written rationale on every item — the capacity worksheet, automated and auditable.",
          },
          {
            title: "Team Wellbeing",
            href: "/products/team-wellbeing",
            summary: "Anonymous pulses and load signals aggregated before anyone sees them — plus the recovery-week playbook that ships with it.",
          },
          {
            title: "Ethical Metrics",
            href: "/products/ethical-metrics",
            summary: "Nine documented metrics with the formula on the card — the starter menu, wired to your live Jira events.",
          },
          {
            title: "Pricing",
            href: "/pricing",
            summary: "If a template clicked, the trial is the cheap next test: 14 days, no card, decide after one real sprint.",
          },
        ]}
        bg="shapes"
      />

      <CtaSection
        title="Run a routine this week, not a philosophy"
        body="Copy a checklist, download the markdown, or ask us to adapt one to your workflow — the form on this page lands with the people who build the product. And when you want the ritual wired to live data, the 14-day trial needs no card."
        primary={{ label: "Start free trial", href: "/signup" }}
        secondary={{ label: "Request a template", href: "#request" }}
        bg="inverse"
        watermark="T"
      />
    </>
  )
}
