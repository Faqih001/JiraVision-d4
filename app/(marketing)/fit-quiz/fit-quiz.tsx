"use client"

// Client island for /fit-quiz: six single-choice questions, deterministic
// scoring from fit-model.ts, and a personalised verdict with visible maths.
//
// Same store pattern as /migration's planner: answers + step live in
// localStorage read through useSyncExternalStore, so there is no React state
// for the quiz itself and no setState in effects. Restart clears the store.

import { useSyncExternalStore } from "react"
import Link from "next/link"
import { ArrowLeft, ArrowRight, RotateCcw, ShieldCheck } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Section, SectionHeading } from "@/components/sections/section"
import { cn } from "@/lib/utils"
import { track } from "@/lib/analytics"
import { fitQuizQuestions, fitQuizMaxScore, type FitQuestionId } from "@/content/fit-quiz"
import { buildFitResult, scoreFit, type FitAnswers } from "./fit-model"

const STORE_KEY = "jv-fit-quiz-v1"
const STORE_EVENT = "jv-fit-quiz-change"

interface QuizStore {
  answers: FitAnswers
  /** Index of the question being answered; equals question count once done. */
  step: number
}

const emptyStore: QuizStore = { answers: {}, step: 0 }

function parseStore(raw: string | null): QuizStore | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown> | null
    if (!parsed || typeof parsed !== "object") return null
    const answersRaw = parsed.answers
    const answers: Record<string, string> = {}
    if (answersRaw && typeof answersRaw === "object") {
      for (const q of fitQuizQuestions) {
        const value = (answersRaw as Record<string, unknown>)[q.id]
        if (typeof value === "string" && q.options.some((o) => o.id === value)) {
          answers[q.id] = value
        }
      }
    }
    const answeredCount = Object.keys(answers).length
    const stepRaw = parsed.step
    const step =
      typeof stepRaw === "number" && stepRaw >= 0 && stepRaw <= fitQuizQuestions.length
        ? stepRaw
        : Math.min(answeredCount, fitQuizQuestions.length)
    return { answers, step }
  } catch {
    return null
  }
}

let cache: { raw: string | null; value: QuizStore | null } = { raw: null, value: null }

function subscribe(callback: () => void) {
  window.addEventListener(STORE_EVENT, callback)
  window.addEventListener("storage", callback)
  return () => {
    window.removeEventListener(STORE_EVENT, callback)
    window.removeEventListener("storage", callback)
  }
}

function getSnapshot(): QuizStore | null {
  const raw = window.localStorage.getItem(STORE_KEY)
  if (raw !== cache.raw) cache = { raw, value: parseStore(raw) }
  return cache.value
}

function getServerSnapshot(): QuizStore | null {
  return null
}

function writeStore(next: QuizStore) {
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(next))
  } catch {
    // Private mode / quota: the quiz still works, it just won't persist.
  }
  cache = { raw: null, value: null }
  window.dispatchEvent(new Event(STORE_EVENT))
}

function OptionButton({
  label,
  points,
  selected,
  onSelect,
}: {
  label: string
  points: number
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "flex min-h-[44px] w-full items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors",
        selected
          ? "border-primary bg-primary/5 font-medium text-foreground"
          : "bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground",
      )}
    >
      <span>{label}</span>
      <span className="shrink-0 font-mono text-xs text-muted-foreground">+{points}</span>
    </button>
  )
}

export function FitQuiz() {
  const stored = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const state = stored ?? emptyStore
  const { answers, step } = state
  const { score, answered } = scoreFit(answers)
  const result = buildFitResult(answers)

  function select(questionId: FitQuestionId, optionId: string) {
    const nextAnswers: Record<string, string> = { ...answers, [questionId]: optionId }
    const nextStep = Math.min(step + 1, fitQuizQuestions.length)
    writeStore({ answers: nextAnswers, step: nextStep })
    if (nextStep === fitQuizQuestions.length) track("fit_quiz_completed")
  }

  function goTo(stepIndex: number) {
    writeStore({ answers, step: Math.max(0, Math.min(stepIndex, fitQuizQuestions.length)) })
  }

  function restart() {
    try {
      window.localStorage.removeItem(STORE_KEY)
    } catch {
      // ignore — see writeStore
    }
    cache = { raw: null, value: null }
    window.dispatchEvent(new Event(STORE_EVENT))
  }

  const question = step < fitQuizQuestions.length ? fitQuizQuestions[step] : null
  const percent = Math.round((answered / fitQuizQuestions.length) * 100)

  return (
    <Section id="quiz" bg="grid">
      <SectionHeading
        eyebrow="The quiz"
        title="Six questions, six answers deep"
        intro="Pick an option to continue. Your progress saves in this browser only — nothing is submitted anywhere."
      />

      <div className="mx-auto max-w-2xl">
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {answered} of {fitQuizQuestions.length} answered
          </span>
          <span className="font-mono">
            {score}/{fitQuizMaxScore} pts so far
          </span>
        </div>
        <Progress value={percent} aria-label="Quiz progress" className="mb-6" />

        {question && (
          <div className="rounded-xl border bg-surface p-6 shadow-soft">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-clay">
              Question {step + 1} / {fitQuizQuestions.length}
            </p>
            <h3 className="mt-2 font-display text-xl font-medium">{question.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{question.helper}</p>
            <div role="radiogroup" aria-label={question.title} className="mt-4 space-y-2">
              {question.options.map((option) => (
                <OptionButton
                  key={option.id}
                  label={option.label}
                  points={option.points}
                  selected={answers[question.id] === option.id}
                  onSelect={() => select(question.id, option.id)}
                />
              ))}
            </div>
            <div className="mt-5 flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={() => goTo(step - 1)} disabled={step === 0}>
                <ArrowLeft className="h-4 w-4" aria-hidden />
                Back
              </Button>
              {answered > 0 && (
                <Button variant="ghost" size="sm" onClick={restart}>
                  <RotateCcw className="h-4 w-4" aria-hidden />
                  Restart
                </Button>
              )}
            </div>
          </div>
        )}

        {!question && result && (
          <div className="space-y-6">
            <div className="rounded-xl border-2 border-primary/40 bg-surface p-6 shadow-soft-md">
              <Badge className="bg-primary text-primary-foreground">{result.copy.badge}</Badge>
              <h3 className="mt-3 font-display text-2xl font-medium leading-snug">
                {result.copy.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{result.copy.body}</p>
              <p className="mt-4 font-mono text-sm">
                Score: {result.score} / {result.maxScore}
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                {result.ctas.map((cta, i) => (
                  <Button key={cta.href + cta.label} variant={i === 0 ? "default" : "outline"} asChild>
                    <Link href={cta.href} className="inline-flex items-center gap-2">
                      {cta.label}
                      <ArrowRight className="h-4 w-4" aria-hidden />
                    </Link>
                  </Button>
                ))}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                {result.ctas[0]?.note} {result.ctas[1] && `· ${result.ctas[1].label}: ${result.ctas[1].note}`}
              </p>
            </div>

            <div className="rounded-xl border bg-card p-6">
              <h4 className="text-sm font-semibold uppercase tracking-wide text-primary">
                Show the maths
              </h4>
              <ul className="mt-4 space-y-3">
                {result.details.map((detail) => (
                  <li key={detail.questionId} className="flex items-start gap-3 text-sm">
                    <span className="mt-0.5 shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                      +{detail.points}
                    </span>
                    <span>
                      <span className="font-medium">{detail.optionLabel}</span>
                      <span className="block text-xs text-muted-foreground">
                        {detail.questionTitle} — {detail.why}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {result.caveats.length > 0 && (
              <div className="rounded-xl border border-clay/40 bg-clay/5 p-6">
                <h4 className="text-sm font-semibold uppercase tracking-wide text-clay">
                  Conditions attached to that verdict
                </h4>
                <ul className="mt-4 space-y-3 text-sm">
                  {result.caveats.map((caveat) => (
                    <li key={caveat.href + caveat.linkLabel}>
                      {caveat.text}{" "}
                      <Link
                        href={caveat.href}
                        className="font-medium text-primary underline underline-offset-4"
                      >
                        {caveat.linkLabel}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 text-sm">
              <Button variant="outline" size="sm" onClick={() => goTo(0)}>
                <ArrowLeft className="h-4 w-4" aria-hidden />
                Change an answer
              </Button>
              <Button variant="outline" size="sm" onClick={restart}>
                <RotateCcw className="h-4 w-4" aria-hidden />
                Restart the quiz
              </Button>
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <ShieldCheck className="h-4 w-4" aria-hidden />
                Deterministic: same six answers, same verdict.
              </span>
            </div>
          </div>
        )}
      </div>
    </Section>
  )
}
