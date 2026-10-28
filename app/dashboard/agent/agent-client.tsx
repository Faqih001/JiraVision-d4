"use client"

// The agent's one door (design §16 entry 18). Handover is a preview: nothing is saved until
// the member ticks rows and commits, and the refusal panel names the field paths the server
// would not accept. Recommendations are rules first — the AI twin is a separate button, so a
// deployment with no key still gets the whole rule list.

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { AlertTriangle, Bot, FileText, Loader2, Sparkles, Upload } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { EmptyNote, SectionCard } from "@/components/dashboard-kit"
import { useToast } from "@/hooks/use-toast"
import type { HandoverPreview, HandoverPlaybookDraft, HandoverRegisterDraft } from "@/lib/agent/handover"
import type { Recommendation } from "@/lib/recommend/next"
import { cn } from "@/lib/utils"

type Tab = "handover" | "recommendations"

type PackSummary = { packKey: string; title: string }

const MAX_PDF_BYTES = 15 * 1024 * 1024

const tabOf = (raw: string | null): Tab => (raw === "recommendations" ? "recommendations" : "handover")

export function AgentSkeleton() {
  return (
    <div className="space-y-4 p-4 md:p-6">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-40 w-full" />
    </div>
  )
}

export default function AgentClient() {
  const router = useRouter()
  const search = useSearchParams()
  const { toast } = useToast()
  const tab = tabOf(search.get("tab"))

  const [packs, setPacks] = useState<PackSummary[]>([])
  const [packKey, setPackKey] = useState("")
  const [text, setText] = useState("")
  const [pdf, setPdf] = useState<{ name: string; data: string } | null>(null)
  const [preview, setPreview] = useState<HandoverPreview | null>(null)
  const [chosenRegisters, setChosenRegisters] = useState<Set<number>>(new Set())
  const [chosenPlaybooks, setChosenPlaybooks] = useState<Set<number>>(new Set())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [rules, setRules] = useState<Recommendation[]>([])
  const [ai, setAi] = useState<Recommendation[]>([])
  const [aiAvailable, setAiAvailable] = useState(false)
  const [aiBusy, setAiBusy] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [today, setToday] = useState("")

  const setTab = (next: Tab) => {
    router.replace(next === "handover" ? "/dashboard/agent" : "/dashboard/agent?tab=recommendations")
  }

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const result = await fetch("/api/registers?pack=", { cache: "no-store" })
      if (!result.ok || cancelled) return
      const json = await result.json().catch(() => null)
      const list = (json?.data?.packs ?? []) as PackSummary[]
      if (cancelled) return
      setPacks(list)
      setPackKey((current) => current || list[0]?.packKey || "")
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const loadRules = useCallback(async () => {
    setBusy(true)
    setError(null)
    const result = await fetch("/api/agent/recommendations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ai: false }),
    })
    const json = await result.json().catch(() => null)
    setBusy(false)
    if (!result.ok) {
      setError(json?.error ?? "The suggestions could not be loaded.")
      return
    }
    setRules((json?.data?.rules ?? []) as Recommendation[])
    setAiAvailable(Boolean(json?.data?.aiAvailable))
    setToday(String(json?.data?.today ?? ""))
  }, [])

  useEffect(() => {
    if (tab === "recommendations" && rules.length === 0) void loadRules()
  }, [tab, rules.length, loadRules])

  const readPdf = async (file: File | null) => {
    if (!file) {
      setPdf(null)
      return
    }
    if (file.type !== "application/pdf") {
      setError("Choose a PDF file.")
      return
    }
    if (file.size > MAX_PDF_BYTES) {
      setError("The PDF is larger than 15 MB.")
      return
    }
    const buffer = await file.arrayBuffer()
    let binary = ""
    const bytes = new Uint8Array(buffer)
    for (let index = 0; index < bytes.length; index += 1) binary += String.fromCharCode(bytes[index])
    setPdf({ name: file.name, data: btoa(binary) })
  }

  const extract = async () => {
    setBusy(true)
    setError(null)
    setPreview(null)
    const payload: Record<string, unknown> = { packKey }
    if (pdf) payload.pdf = { mimeType: "application/pdf", data: pdf.data }
    else payload.text = text

    const result = await fetch("/api/agent/handover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    const json = await result.json().catch(() => null)
    setBusy(false)
    if (!result.ok) {
      setError(json?.error ?? "The handover could not be read.")
      return
    }
    const data = json.data as HandoverPreview
    setPreview(data)
    setChosenRegisters(new Set(data.registers.map((_, index) => index)))
    setChosenPlaybooks(new Set(data.playbooks.map((_, index) => index)))
  }

  const commit = async () => {
    if (!preview) return
    setBusy(true)
    setError(null)
    const registers = preview.registers.filter((_, index) => chosenRegisters.has(index))
    const playbooks = preview.playbooks.filter((_, index) => chosenPlaybooks.has(index))
    const result = await fetch("/api/agent/handover/commit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packKey, registers, playbooks }),
    })
    const json = await result.json().catch(() => null)
    setBusy(false)
    if (!result.ok) {
      setError(json?.error ?? "The handover could not be saved.")
      return
    }
    const created = json.data.created as { registers: number; playbooks: number }
    const skipped = (json.data.skipped ?? []) as { title: string; reason: string }[]
    toast({
      title: "Saved",
      description: `${created.registers} register row(s), ${created.playbooks} playbook draft(s)${
        skipped.length ? `; ${skipped.length} skipped` : ""
      }.`,
    })
    setPreview(null)
    setText("")
    setPdf(null)
  }

  const askAi = async () => {
    setAiBusy(true)
    setAiError(null)
    const result = await fetch("/api/agent/recommendations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ai: true }),
    })
    const json = await result.json().catch(() => null)
    setAiBusy(false)
    if (!result.ok) {
      setAiError(json?.error ?? "The AI suggestions did not survive grounding.")
      return
    }
    setAi((json?.data?.ai ?? []) as Recommendation[])
  }

  const toggle = (set: Set<number>, index: number, apply: (next: Set<number>) => void) => {
    const next = new Set(set)
    if (next.has(index)) next.delete(index)
    else next.add(index)
    apply(next)
  }

  const chosenCount = chosenRegisters.size + chosenPlaybooks.size
  const sortedRules = useMemo(() => [...rules, ...ai], [rules, ai])

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            <Bot className="h-5 w-5" /> Agent
          </h1>
          <p className="text-sm text-muted-foreground">
            Read a handover into the register and the playbook library, and see what to do next.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant={tab === "handover" ? "secondary" : "ghost"} onClick={() => setTab("handover")}>
            Handover
          </Button>
          <Button
            variant={tab === "recommendations" ? "secondary" : "ghost"}
            onClick={() => setTab("recommendations")}
          >
            What next
          </Button>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {tab === "handover" ? (
        <>
          <SectionCard title="The handover" icon={<Upload className="h-4 w-4" />}>
            <div className="space-y-3">
              <div className="grid gap-2 sm:max-w-sm">
                <Label htmlFor="agent-pack" className="text-xs text-muted-foreground">
                  Which role pack?
                </Label>
                <Select value={packKey} onValueChange={setPackKey}>
                  <SelectTrigger id="agent-pack" className="h-9 text-sm" aria-label="Role pack">
                    <SelectValue placeholder="Choose a role pack" />
                  </SelectTrigger>
                  <SelectContent>
                    {packs.map((pack) => (
                      <SelectItem key={pack.packKey} value={pack.packKey}>
                        {pack.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="agent-text" className="text-xs text-muted-foreground">
                  Paste the brief
                </Label>
                <Textarea
                  id="agent-text"
                  rows={8}
                  value={text}
                  onChange={(event) => {
                    setText(event.target.value)
                    if (event.target.value) setPdf(null)
                  }}
                  placeholder="Infrastructure, accounts, equipment, outstanding work…"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="agent-pdf" className="text-xs text-muted-foreground">
                  …or attach one PDF (15 MB)
                </Label>
                <Input
                  id="agent-pdf"
                  type="file"
                  accept="application/pdf"
                  onChange={(event) => {
                    void readPdf(event.target.files?.[0] ?? null)
                    if (event.target.files?.[0]) setText("")
                  }}
                />
                {pdf ? <p className="text-xs text-muted-foreground">{pdf.name}</p> : null}
              </div>

              <p className="text-xs text-muted-foreground">
                The pasted text or PDF is sent to Google for processing and is not stored. Credential
                values are refused; record where each one is kept instead.
              </p>

              <Button onClick={() => void extract()} disabled={busy || !packKey || (!text.trim() && !pdf)}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Extract preview
              </Button>
            </div>
          </SectionCard>

          {preview ? (
            <>
              {preview.refusals.length > 0 ? (
                <Alert role="alert">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <p className="font-medium">Not included</p>
                    <ul className="mt-1 list-disc pl-4 text-sm">
                      {preview.refusals.map((refusal, index) => (
                        <li key={`${refusal.path}-${index}`}>
                          <span className="font-mono text-xs">{refusal.path}</span> — {refusal.reason}
                        </li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              ) : null}

              <SectionCard title="Register rows" icon={<FileText className="h-4 w-4" />}>
                {preview.registers.length === 0 ? (
                  <EmptyNote>No register rows were found.</EmptyNote>
                ) : (
                  <div className="space-y-2">
                    {preview.registers.map((row: HandoverRegisterDraft, index) => (
                      <label
                        key={`${row.kind}-${row.title}-${index}`}
                        className={cn(
                          "flex cursor-pointer items-start gap-3 rounded-md border p-3",
                          chosenRegisters.has(index) && "border-primary/50 bg-muted/40",
                        )}
                      >
                        <Checkbox
                          checked={chosenRegisters.has(index)}
                          onCheckedChange={() => toggle(chosenRegisters, index, setChosenRegisters)}
                        />
                        <span className="min-w-0">
                          <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
                            {row.title}
                            <Badge variant="outline">{row.kind}</Badge>
                            <Badge variant="secondary">{row.custody}</Badge>
                          </span>
                          <span className="mt-1 block text-xs text-muted-foreground">
                            {Object.entries(row.fields)
                              .map(([key, value]) => `${key}: ${value}`)
                              .join(" · ") || "No fields recorded"}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </SectionCard>

              <SectionCard title="Playbook drafts" icon={<Sparkles className="h-4 w-4" />}>
                {preview.playbooks.length === 0 ? (
                  <EmptyNote>No procedures were found.</EmptyNote>
                ) : (
                  <div className="space-y-2">
                    {preview.playbooks.map((row: HandoverPlaybookDraft, index) => (
                      <label
                        key={`${row.title}-${index}`}
                        className={cn(
                          "flex cursor-pointer items-start gap-3 rounded-md border p-3",
                          chosenPlaybooks.has(index) && "border-primary/50 bg-muted/40",
                        )}
                      >
                        <Checkbox
                          checked={chosenPlaybooks.has(index)}
                          onCheckedChange={() => toggle(chosenPlaybooks, index, setChosenPlaybooks)}
                        />
                        <span className="min-w-0">
                          <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
                            {row.title}
                            <Badge variant="outline">AI draft</Badge>
                          </span>
                          <span className="mt-1 block text-xs text-muted-foreground">
                            {row.steps.length} step(s), {row.precautions.length} precaution(s)
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </SectionCard>

              <div className="flex items-center gap-3">
                <Button onClick={() => void commit()} disabled={busy || chosenCount === 0}>
                  {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save {chosenCount} selected
                </Button>
                <p className="text-xs text-muted-foreground">
                  Model drafts stay marked until a person edits and publishes them.
                </p>
              </div>
            </>
          ) : null}
        </>
      ) : (
        <>
          <SectionCard title="What next" icon={<Sparkles className="h-4 w-4" />}>
            <div className="space-y-2">
              {busy && rules.length === 0 ? <Skeleton className="h-24 w-full" /> : null}
              {!busy && sortedRules.length === 0 ? (
                <EmptyNote>Nothing to suggest right now.{today ? ` Checked ${today}.` : ""}</EmptyNote>
              ) : null}
              {sortedRules.map((entry) => (
                <div key={entry.id} className="rounded-md border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={entry.kind === "ai" ? "secondary" : "outline"}>
                      {entry.kind === "ai" ? "AI suggestion" : entry.kind.replaceAll("_", " ")}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {Math.round(entry.confidence * 100)}% confidence
                    </span>
                  </div>
                  <p className="mt-1 text-sm">{entry.why}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link href={entry.href}>{entry.action}</Link>
                    </Button>
                    {entry.refs.length > 0 ? (
                      <span className="text-xs text-muted-foreground">
                        from {entry.refs.map((ref) => `${ref.table} #${ref.id}`).join(", ")}
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" onClick={() => void askAi()} disabled={aiBusy || !aiAvailable}>
              {aiBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Add AI suggestions
            </Button>
            <p className="text-xs text-muted-foreground">
              {aiAvailable
                ? "A suggestion is kept only if the rows it names exist and every number it writes is already in your data."
                : "AI suggestions are not configured; the rules above work without a key."}
            </p>
          </div>

          {aiError ? (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{aiError}</AlertDescription>
            </Alert>
          ) : null}
        </>
      )}
    </div>
  )
}
