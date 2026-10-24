import type { Metadata } from "next"
import Link from "next/link"
import { Check, ShieldCheck, X } from "lucide-react"
import { Section, SectionHeading } from "@/components/sections/section"
import { FaqAccordion } from "@/components/sections/faq-accordion"
import {
  PageHero,
  ProblemSection,
  StepsSection,
  HonestFitSection,
  AudienceSection,
  RelatedSection,
  CtaSection,
} from "@/components/sections/page-kit"
import {
  fitQuizAnchorNav,
  fitQuizCta,
  fitQuizFaq,
  fitQuizHero,
  fitQuizMaxScore,
  fitQuizMethod,
  fitQuizPrivacy,
  fitQuizQuestions,
  fitQuizRelated,
  fitQuizVerdictLegend,
} from "@/content/fit-quiz"
import { FitQuiz } from "./fit-quiz"

export function generateMetadata(): Metadata {
  return {
    title: "Find Your Fit — Six-Question Honest Check | JiraVision",
    description:
      "Half the teams that ask for a demo don't need one. Score your situation against what JiraVision actually ships — every point value visible, answers never leave your browser.",
    alternates: { canonical: "/fit-quiz" },
  }
}

function AnchorNav() {
  return (
    <nav aria-label="On this page" className="border-b bg-surface">
      <div className="container flex flex-wrap items-center gap-x-6 gap-y-2 py-3">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {fitQuizAnchorNav.title}
        </span>
        {fitQuizAnchorNav.links.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            {link.label}
          </a>
        ))}
      </div>
    </nav>
  )
}

function WeightsSection() {
  return (
    <Section id="weights" bg="band-sage">
      <SectionHeading
        eyebrow="No hidden scoring"
        title="Every point, printed before you answer"
        intro={`Scores run 0–${fitQuizMaxScore}. The verdict bands and vetoes below use exactly these numbers — nothing else is measured, weighted, or tuned by a model.`}
      />
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <caption className="sr-only">
            Fit quiz scoring weights: every question, option and its point value
          </caption>
          <thead>
            <tr className="border-b bg-muted/40 text-left">
              <th className="px-4 py-3 font-semibold">Question</th>
              <th className="px-4 py-3 font-semibold">Answer</th>
              <th className="px-4 py-3 text-right font-semibold">Pts</th>
              <th className="px-4 py-3 font-semibold">Why</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {fitQuizQuestions.map((question) =>
              question.options.map((option, i) => (
                <tr key={`${question.id}-${option.id}`}>
                  <td className="px-4 py-3 align-top text-muted-foreground">
                    {i === 0 ? <span className="font-medium text-foreground">{question.title}</span> : null}
                  </td>
                  <td className="px-4 py-3 align-top">{option.label}</td>
                  <td className="px-4 py-3 text-right align-top font-mono">+{option.points}</td>
                  <td className="px-4 py-3 align-top text-muted-foreground">{option.why}</td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      </div>
    </Section>
  )
}

function VerdictsSection() {
  return (
    <Section id="verdicts" bg="hatch">
      <SectionHeading eyebrow="What a result means" title={fitQuizVerdictLegend.title} />
      <dl className="divide-y divide-border rounded-lg border bg-card">
        {fitQuizVerdictLegend.rows.map((row) => (
          <div key={row.badge} className="grid gap-1 px-6 py-4 sm:grid-cols-[14rem_1fr] sm:gap-6">
            <dt className="text-sm font-semibold text-primary">{row.badge}</dt>
            <dd className="text-sm leading-relaxed text-muted-foreground">{row.meaning}</dd>
          </div>
        ))}
      </dl>
    </Section>
  )
}

function PrivacySection() {
  return (
    <Section id="privacy" bg="stacked">
      <div className="mx-auto max-w-2xl rounded-xl border bg-card p-8 shadow-soft">
        <ShieldCheck className="h-8 w-8 text-primary" aria-hidden />
        <h2 className="mt-4 font-display text-2xl font-medium tracking-tight">{fitQuizPrivacy.title}</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{fitQuizPrivacy.body}</p>
      </div>
    </Section>
  )
}

function RefusalsSection() {
  const refusals = [
    "Per-person productivity rankings or activity surveillance.",
    "Copying your attachments out of any tool — Jira stays the store.",
    "Auto-applying AI sprint plans without a human approving them.",
    "Selling, shipping or “anonymising” individual-level data upward.",
  ]
  return (
    <Section bg="contour">
      <SectionHeading
        eyebrow="The never-list"
        title="Answers the quiz can't negotiate"
        intro="Some verdict conditions aren't score inputs — they're standing decisions. If your requirement lives here, no answer changes the result."
      />
      <ul className="grid gap-4 md:grid-cols-2">
        {refusals.map((item) => (
          <li key={item} className="flex items-start gap-3 rounded-lg border bg-card p-5 text-sm shadow-soft">
            <X className="mt-0.5 h-4 w-4 shrink-0 text-clay" aria-hidden />
            {item}
          </li>
        ))}
      </ul>
      <Link
        href="/roadmap"
        className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
      >
        The refusal list on the public roadmap
        <Check className="h-4 w-4" aria-hidden />
      </Link>
    </Section>
  )
}

function QuizFaqSection() {
  return (
    <Section id="faq" bg="dots">
      <SectionHeading eyebrow="FAQ" title="Questions about the quiz itself" />
      <FaqAccordion items={fitQuizFaq} />
      <Link
        href="/faq"
        className="mt-8 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
      >
        All product questions
      </Link>
    </Section>
  )
}

export default function FitQuizPage() {
  return (
    <>
      <PageHero
        eyebrow={fitQuizHero.eyebrow}
        title={fitQuizHero.title}
        subtitle={fitQuizHero.lead}
        badge="Answers stay in your browser"
        primary={{ label: "Take the quiz", href: "#quiz" }}
        secondary={{ label: "See the weights first", href: "#weights" }}
        bullets={[
          "Six questions, ~90 seconds",
          "Every point value published on this page",
          "Two honest veto answers — including one where we refuse the sale",
        ]}
      />
      <AnchorNav />
      <FitQuiz />
      <ProblemSection
        title="Why we ship a quiz that can say no"
        intro="Vendor quizzes exist to flatter you into a demo call. Ours exists to catch the mismatch before a pilot does — a bad fit hurts both sides for a year."
        items={[
          {
            title: "Shelfware is the real cost",
            body: "The expensive outcome isn't a lost trial — it's a team that adopts a planning layer with no pain to solve, churns in six months, and distrusts every tool that follows.",
          },
          {
            title: "Our limits are public",
            body: "We sit on Jira, never copy attachments, and refuse per-person rankings. If any of that is disqualifying, the quiz surfaces it in ninety seconds instead of a month of pilots.",
          },
          {
            title: "A verdict you can audit",
            body: `The scoring table below this quiz is the whole model: ${fitQuizMaxScore} possible points, two vetoes, three bands. Unit-tested, deterministic, and readable in the source.`,
          },
        ]}
      />
      <StepsSection
        id="method"
        eyebrow="The maths"
        title={fitQuizMethod.title}
        steps={fitQuizMethod.steps.map((s) => ({ title: s.label, body: s.detail }))}
        bg="grain"
      />
      <WeightsSection />
      <VerdictsSection />
      <HonestFitSection
        title="The quiz is just this section, pre-filled"
        good={[
          "Teams running Scrum or hybrid cycles in Jira",
          "Leads who want planning arguments settled with evidence",
          "Teams recovering from a bad over-commitment streak",
          "Orgs that want a recognition map, not a scoreboard",
        ]}
        bad={[
          "Managers wanting per-person activity reports (we won't build them)",
          "Teams needing attachments moved between tools",
          "Non-Jira boards today without a plan for the Jira base",
          "Anyone expecting auto-pilot sprint management — approval stays human",
        ]}
        bg="shapes"
      />
      <AudienceSection
        eyebrow="Who should bother"
        title="Three profiles that usually get a useful result"
        items={[
          {
            who: "Engineering leads",
            body: "You feel over-commitment first. The quiz scores whether our planning loop matches how your sprints actually derail.",
            wins: ["Sprint sandbox verdict", "Capacity caveats up front"],
          },
          {
            who: "People ops / skip-levels",
            body: "You see burnout before the retro does. We check whether team-level signals are enough for your leadership's appetite.",
            wins: ["Wellbeing-pulse framing", "The rankings veto, early"],
          },
          {
            who: "Tooling owners",
            body: "You're evaluating a move. The base-tenancy and attachment caveats decide your verdict more than any score.",
            wins: ["Migration honesty", "Comparison links when it's 'not us'"],
          },
        ]}
      />
      <PrivacySection />
      <RefusalsSection />
      <QuizFaqSection />
      <RelatedSection
        title="If the verdict wasn't what you hoped"
        items={fitQuizRelated.map((r) => ({ title: r.label, href: r.href, summary: r.note })).slice(0, 3)}
      />
      <CtaSection
        title={fitQuizCta.title}
        body={fitQuizCta.body}
        primary={fitQuizCta.primary}
        secondary={fitQuizCta.secondary}
        watermark="Fit?"
      />
    </>
  )
}
