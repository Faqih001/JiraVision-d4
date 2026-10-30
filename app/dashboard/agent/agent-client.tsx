"use client"

// The agent's one door (design §16 entry 18). Import is a preview: nothing is saved until
// the member ticks rows and commits, and the refusal panel names the field paths the server
// would not accept. Cards here mirror the destination pages' cards, and every row is editable,
// removable or addable before commit — but the commit route still re-runs the same validators
// the manual forms use, so the preview is a nicer form, not a bypass. Recommendations stay
// rules first with the AI twin behind a separate button, so a deployment with no key still
// gets the whole rule list.

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  AlertTriangle,
  Bot,
  FileText,
  Loader2,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { EmptyNote, SectionCard } from "@/components/dashboard-kit"
import { useToast } from "@/hooks/use-toast"
import type { HandoverPreview, HandoverPlaybookDraft, HandoverRegisterDraft } from "@/lib/agent/handover"
import {
  blankPlaybook,
  blankRegister,
  fieldsFromPairs,
  pairsFromFields,
  playbookDraftIssues,
  registerDraftIssues,
  renumberSteps,
  stepFor,
  type FieldPair,
} from "@/lib/agent/handover-edit"
import { CREDENTIAL_KEY, CREDENTIAL_PLACEHOLDER } from "@/lib/registers/fields"
import {
  CUSTODY_LABEL,
  REGISTER_CUSTODY,
  REGISTER_STATUS_LABEL,
  type RegisterCustody,
} from "@/lib/registers/rules"
import { defaultMethod, type PlaybookStep } from "@/lib/playbooks/method"
import { DISCIPLINE_LABEL, WORK_DISCIPLINES, type WorkDiscipline } from "@/lib/roles"
import type { Recommendation } from "@/lib/recommend/next"
import { cn } from "@/lib/utils"

type Tab = "handover" | "recommendations"

type PackSummary = {
  packKey: string
  title: string
  registerKinds: { key: string; label: string }[]
  method?: string[]
}

const MAX_PDF_BYTES = 15 * 1024 * 1024
const NO_DISCIPLINE = "__none__"

const tabOf = (raw: string | null): Tab => (raw === "recommendations" ? "recommendations" : "handover")

type EditableRegister = { kind: string; title: string; custody: RegisterCustody; fields: FieldPair[] }
type EditablePlaybook = {
  index: number | null
  title: string
  summary: string
  discipline: string
  tagsText: string
  method: string[]
  steps: PlaybookStep[]
  source: HandoverPlaybookDraft
}

export function AgentSkeleton() {
  return (
    <div className="space-y-4 p-4 md:p-6">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-40 w-full" />
    </div>
  )
}

const toEditableRegister = (row: HandoverRegisterDraft): EditableRegister => ({
  kind: row.kind,
  title: row.title,
  custody: row.custody,
  fields: pairsFromFields(row.fields),
})

const toDraftRegister = (editor: EditableRegister): HandoverRegisterDraft => ({
  kind: editor.kind,
  title: editor.title.trim(),
  custody: editor.custody,
  fields: fieldsFromPairs(editor.fields),
})

const toEditablePlaybook = (row: HandoverPlaybookDraft, index: number | null): EditablePlaybook => ({
  index,
  title: row.title,
  summary: row.summary ?? "",
  discipline: row.discipline ?? NO_DISCIPLINE,
  tagsText: row.tags.join(", "),
  method: row.method.length > 0 ? row.method : [...defaultMethod([])],
  steps: row.steps.map((step) => ({ ...step })),
  source: row,
})

const toDraftPlaybook = (editor: EditablePlaybook): HandoverPlaybookDraft => {
  const tags = editor.tagsText
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
  return {
    ...editor.source,
    title: editor.title.trim(),
    summary: editor.summary.trim() || null,
    discipline: editor.discipline === NO_DISCIPLINE ? null : (editor.discipline as WorkDiscipline),
    tags,
    method: editor.method,
    steps: renumberSteps(editor.steps),
  }
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
  const [regSel, setRegSel] = useState<boolean[]>([])
  const [pbSel, setPbSel] = useState<boolean[]>([])
  const [registerEditor, setRegisterEditor] = useState<EditableRegister | null>(null)
  const [registerIndex, setRegisterIndex] = useState<number | null>(null)
  const [playbookEditor, setPlaybookEditor] = useState<EditablePlaybook | null>(null)
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

  const selectedPack = useMemo(() => packs.find((pack) => pack.packKey === packKey) ?? null, [packs, packKey])
  const kindKeys = useMemo(() => selectedPack?.registerKinds.map((entry) => entry.key) ?? [], [selectedPack])
  const kindLabel = useCallback(
    (key: string) => selectedPack?.registerKinds.find((entry) => entry.key === key)?.label ?? key,
    [selectedPack],
  )

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
    setRegSel([])
    setPbSel([])
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
    setRegSel(data.registers.map(() => true))
    setPbSel(data.playbooks.map(() => true))
  }

  const commit = async () => {
    if (!preview) return
    setBusy(true)
    setError(null)
    const registers = preview.registers.filter((_, index) => regSel[index])
    const playbooks = preview.playbooks.filter((_, index) => pbSel[index])
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
    setRegSel([])
    setPbSel([])
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

  const toggleSelection = (setter: React.Dispatch<React.SetStateAction<boolean[]>>, index: number) => {
    setter((prev) => {
      const next = [...prev]
      next[index] = !next[index]
      return next
    })
  }

  // Deletions shift indices, so any editor open at the same time has to follow the row it edits.
  const shiftEditorIndex = (removed: number, current: number | null): number | null => {
    if (current === null) return null
    if (current === removed) return null
    return current > removed ? current - 1 : current
  }

  const removeRegister = (index: number) => {
    setPreview((prev) => {
      if (!prev) return prev
      return { ...prev, registers: prev.registers.filter((_, position) => position !== index) }
    })
    setRegSel((prev) => prev.filter((_, position) => position !== index))
    setRegisterIndex((current) => shiftEditorIndex(index, current))
    if (registerIndex === index) setRegisterEditor(null)
  }

  const removePlaybook = (index: number) => {
    setPreview((prev) => {
      if (!prev) return prev
      return { ...prev, playbooks: prev.playbooks.filter((_, position) => position !== index) }
    })
    setPbSel((prev) => prev.filter((_, position) => position !== index))
    setPlaybookEditor((current) => {
      if (!current) return null
      if (current.index === index) return null
      if (current.index !== null && current.index > index) return { ...current, index: current.index - 1 }
      return current
    })
  }

  const openRegisterEditor = (index: number | null) => {
    setError(null)
    if (index === null) {
      const draft = blankRegister(kindKeys)
      if (draft.kind === "") {
        setError("Publish a role pack before adding a register row.")
        return
      }
      setRegisterIndex(null)
      setRegisterEditor(toEditableRegister(draft))
      return
    }
    const row = preview?.registers[index]
    if (!row) return
    setRegisterIndex(index)
    setRegisterEditor(toEditableRegister(row))
  }

  const openPlaybookEditor = (index: number | null) => {
    setError(null)
    if (index === null) {
      const draft = blankPlaybook(selectedPack?.method ?? [])
      setPlaybookEditor(toEditablePlaybook(draft, null))
      return
    }
    const row = preview?.playbooks[index]
    if (!row) return
    setPlaybookEditor(toEditablePlaybook(row, index))
  }

  const saveRegister = () => {
    if (!registerEditor || !preview) return
    const draft = toDraftRegister(registerEditor)
    const issues = registerDraftIssues(draft, kindKeys)
    if (issues.length > 0) {
      setError(issues[0])
      return
    }
    const registers = [...preview.registers]
    if (registerIndex === null) {
      registers.push(draft)
      setRegSel((prev) => [...prev, true])
    } else {
      registers[registerIndex] = draft
    }
    setPreview({ ...preview, registers })
    setRegisterEditor(null)
    setRegisterIndex(null)
  }

  const savePlaybook = () => {
    if (!playbookEditor || !preview) return
    const draft = toDraftPlaybook(playbookEditor)
    const issues = playbookDraftIssues(draft)
    if (issues.length > 0) {
      setError(issues[0])
      return
    }
    const playbooks = [...preview.playbooks]
    if (playbookEditor.index === null) {
      playbooks.push(draft)
      setPbSel((prev) => [...prev, true])
    } else {
      playbooks[playbookEditor.index] = draft
    }
    setPreview({ ...preview, playbooks })
    setPlaybookEditor(null)
  }

  const chosenCount = regSel.filter(Boolean).length + pbSel.filter(Boolean).length
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
            Import
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

              <SectionCard
                title="Register rows"
                icon={<FileText className="h-4 w-4" />}
                action={
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openRegisterEditor(null)}>
                    <Plus className="mr-1 h-3.5 w-3.5" aria-hidden />
                    Add row
                  </Button>
                }
              >
                {preview.registers.length === 0 ? (
                  <EmptyNote>No register rows yet. Add one or extract from a handover.</EmptyNote>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {preview.registers.map((row, index) => {
                      const entries = Object.entries(row.fields)
                      const shown = entries.slice(0, 2)
                      const hidden = entries.length - shown.length
                      return (
                        <div key={`${row.kind}-${row.title}-${index}`} className="rounded-lg border bg-card p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex min-w-0 items-start gap-2">
                              <Checkbox
                                className="mt-0.5"
                                checked={regSel[index] ?? false}
                                onCheckedChange={() => toggleSelection(setRegSel, index)}
                                aria-label={`Save ${row.title}`}
                              />
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium">{row.title}</p>
                                {shown.length > 0 ? (
                                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                    {shown.map(([key, value]) => `${key}: ${value || "—"}`).join(" · ")}
                                    {hidden > 0 ? ` · ${hidden} more` : ""}
                                  </p>
                                ) : (
                                  <p className="mt-0.5 text-xs text-muted-foreground">No fields recorded</p>
                                )}
                              </div>
                            </div>
                            <Badge variant="outline">{kindLabel(row.kind)}</Badge>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            <Badge>{REGISTER_STATUS_LABEL.in_service}</Badge>
                            <Badge variant="secondary">{CUSTODY_LABEL[row.custody]}</Badge>
                            <Badge variant="outline">
                              <Sparkles className="mr-1 h-3 w-3" aria-hidden />
                              AI import
                            </Badge>
                          </div>
                          <div className="mt-3 flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => openRegisterEditor(index)}
                            >
                              <Pencil className="mr-1 h-3 w-3" aria-hidden />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs"
                              onClick={() => removeRegister(index)}
                            >
                              <Trash2 className="mr-1 h-3 w-3" aria-hidden />
                              Remove
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </SectionCard>

              <SectionCard
                title="Playbook drafts"
                icon={<Sparkles className="h-4 w-4" />}
                action={
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openPlaybookEditor(null)}>
                    <Plus className="mr-1 h-3.5 w-3.5" aria-hidden />
                    Add draft
                  </Button>
                }
              >
                {preview.playbooks.length === 0 ? (
                  <EmptyNote>No procedures yet. Add one or extract from a handover.</EmptyNote>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {preview.playbooks.map((row, index) => (
                      <div
                        key={`${row.title}-${index}`}
                        className="flex flex-col rounded-lg border bg-card p-4"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex min-w-0 items-start gap-2">
                            <Checkbox
                              className="mt-0.5"
                              checked={pbSel[index] ?? false}
                              onCheckedChange={() => toggleSelection(setPbSel, index)}
                              aria-label={`Save ${row.title}`}
                            />
                            <p className="min-w-0 truncate text-sm font-semibold">{row.title}</p>
                          </div>
                          <Badge variant="secondary">Draft</Badge>
                        </div>
                        {row.summary ? (
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{row.summary}</p>
                        ) : null}
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          <Badge variant="outline">v1</Badge>
                          <Badge variant="outline">
                            {row.steps.length} {row.steps.length === 1 ? "step" : "steps"}
                          </Badge>
                          {selectedPack ? <Badge variant="outline">{selectedPack.title}</Badge> : null}
                          <Badge variant="secondary">
                            <Sparkles className="mr-1 h-3 w-3" aria-hidden />
                            Model draft
                          </Badge>
                        </div>
                        {row.tags.length > 0 ? (
                          <p className="mt-2 truncate text-[11px] text-muted-foreground">
                            {row.tags.map((tag) => `#${tag}`).join(" ")}
                          </p>
                        ) : null}
                        <div className="mt-auto flex gap-1 pt-3">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => openPlaybookEditor(index)}
                          >
                            <Pencil className="mr-1 h-3 w-3" aria-hidden />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            onClick={() => removePlaybook(index)}
                          >
                            <Trash2 className="mr-1 h-3 w-3" aria-hidden />
                            Remove
                          </Button>
                        </div>
                      </div>
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
                  Model drafts stay marked until a person edits and publishes them. Saved rows go
                  through the same validators the manual forms use.
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

      <Dialog open={registerEditor !== null} onOpenChange={(open) => (!open ? setRegisterEditor(null) : undefined)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{registerIndex === null ? "New register row" : "Edit register row"}</DialogTitle>
            <DialogDescription>
              This row is a preview — nothing is written until you commit. Record where a credential
              is kept and who can authorise it, never the credential itself.
            </DialogDescription>
          </DialogHeader>

          {registerEditor ? (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="preview-kind">Kind</Label>
                  <Select
                    value={registerEditor.kind}
                    onValueChange={(value) => setRegisterEditor({ ...registerEditor, kind: value })}
                  >
                    <SelectTrigger id="preview-kind">
                      <SelectValue placeholder="Choose a kind" />
                    </SelectTrigger>
                    <SelectContent>
                      {(selectedPack?.registerKinds ?? []).map((entry) => (
                        <SelectItem key={entry.key} value={entry.key}>
                          {entry.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="preview-custody">Who can see it</Label>
                  <Select
                    value={registerEditor.custody}
                    onValueChange={(value) =>
                      setRegisterEditor({ ...registerEditor, custody: value as RegisterCustody })
                    }
                  >
                    <SelectTrigger id="preview-custody">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REGISTER_CUSTODY.map((custody) => (
                        <SelectItem key={custody} value={custody}>
                          {CUSTODY_LABEL[custody]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="preview-title">Title</Label>
                <Input
                  id="preview-title"
                  value={registerEditor.title}
                  onChange={(event) => setRegisterEditor({ ...registerEditor, title: event.target.value })}
                  placeholder="Production database — primary"
                  maxLength={200}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Fields</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() =>
                      setRegisterEditor({ ...registerEditor, fields: [...registerEditor.fields, { key: "", value: "" }] })
                    }
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" aria-hidden />
                    Add field
                  </Button>
                </div>
                {registerEditor.fields.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No fields yet. Add where it is kept, who authorised it, or its serial number.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {registerEditor.fields.map((pair, position) => {
                      const flagged = CREDENTIAL_KEY.test(pair.key.trim())
                      return (
                        <div key={position} className="flex gap-2">
                          <Input
                            aria-label="Field name"
                            value={pair.key}
                            onChange={(event) => {
                              const next = [...registerEditor.fields]
                              next[position] = { ...next[position], key: event.target.value }
                              setRegisterEditor({ ...registerEditor, fields: next })
                            }}
                            placeholder="Field name"
                            className={cn("w-2/5", flagged && "border-destructive")}
                          />
                          <Input
                            aria-label="Field value"
                            value={pair.value}
                            onChange={(event) => {
                              const next = [...registerEditor.fields]
                              next[position] = { ...next[position], value: event.target.value }
                              setRegisterEditor({ ...registerEditor, fields: next })
                            }}
                            placeholder={CREDENTIAL_PLACEHOLDER}
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-9 px-2 text-xs"
                            onClick={() =>
                              setRegisterEditor({
                                ...registerEditor,
                                fields: registerEditor.fields.filter((_, pos) => pos !== position),
                              })
                            }
                          >
                            Remove
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setRegisterEditor(null)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={saveRegister} disabled={busy}>
              {registerIndex === null ? "Add row" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={playbookEditor !== null}
        onOpenChange={(open) => (!open ? setPlaybookEditor(null) : undefined)}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {playbookEditor?.index === null || playbookEditor?.index === undefined
                ? "New playbook draft"
                : "Edit playbook draft"}
            </DialogTitle>
            <DialogDescription>
              Nothing is written until commit, and every draft lands as a model-marked draft. A
              person has to publish it before others can run it.
            </DialogDescription>
          </DialogHeader>

          {playbookEditor ? (
            <div className="space-y-3">
              <div>
                <Label htmlFor="pb-title">Title</Label>
                <Input
                  id="pb-title"
                  value={playbookEditor.title}
                  onChange={(event) => setPlaybookEditor({ ...playbookEditor, title: event.target.value })}
                  placeholder="Replace a failed drive in the rack"
                  maxLength={200}
                />
              </div>

              <div>
                <Label htmlFor="pb-summary">Summary</Label>
                <Textarea
                  id="pb-summary"
                  rows={2}
                  value={playbookEditor.summary}
                  onChange={(event) => setPlaybookEditor({ ...playbookEditor, summary: event.target.value })}
                  placeholder="When this applies and what it produces."
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="pb-discipline">Discipline</Label>
                  <Select
                    value={playbookEditor.discipline}
                    onValueChange={(value) => setPlaybookEditor({ ...playbookEditor, discipline: value })}
                  >
                    <SelectTrigger id="pb-discipline">
                      <SelectValue placeholder="No discipline" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_DISCIPLINE}>No discipline</SelectItem>
                      {WORK_DISCIPLINES.map((discipline) => (
                        <SelectItem key={discipline} value={discipline}>
                          {DISCIPLINE_LABEL[discipline]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="pb-tags">Tags — comma separated</Label>
                  <Input
                    id="pb-tags"
                    value={playbookEditor.tagsText}
                    onChange={(event) => setPlaybookEditor({ ...playbookEditor, tagsText: event.target.value })}
                    placeholder="hardware, networking"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Steps</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() =>
                      setPlaybookEditor({
                        ...playbookEditor,
                        steps: [
                          ...playbookEditor.steps,
                          stepFor(playbookEditor.method, playbookEditor.steps.length + 1),
                        ],
                      })
                    }
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" aria-hidden />
                    Add step
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Method: {playbookEditor.method.join(" → ")}
                </p>
                {playbookEditor.steps.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No steps yet. Add the action a person takes.</p>
                ) : (
                  <div className="space-y-3">
                    {playbookEditor.steps.map((step, position) => (
                      <div key={position} className="space-y-2 rounded-md border p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-medium text-muted-foreground">Step {position + 1}</span>
                          <Select
                            value={step.phase}
                            onValueChange={(value) => {
                              const next = [...playbookEditor.steps]
                              next[position] = { ...next[position], phase: value }
                              setPlaybookEditor({ ...playbookEditor, steps: next })
                            }}
                          >
                            <SelectTrigger className="h-8 w-[10rem] text-xs" aria-label={`Step ${position + 1} phase`}>
                              <SelectValue placeholder="Phase" />
                            </SelectTrigger>
                            <SelectContent>
                              {playbookEditor.method.map((phase) => (
                                <SelectItem key={phase} value={phase}>
                                  {phase}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="ml-auto h-7 text-xs"
                            onClick={() =>
                              setPlaybookEditor({
                                ...playbookEditor,
                                steps: renumberSteps(playbookEditor.steps.filter((_, pos) => pos !== position)),
                              })
                            }
                          >
                            <Trash2 className="mr-1 h-3 w-3" aria-hidden />
                            Remove step
                          </Button>
                        </div>
                        <Input
                          aria-label={`Step ${position + 1} action`}
                          value={step.action}
                          onChange={(event) => {
                            const next = [...playbookEditor.steps]
                            next[position] = { ...next[position], action: event.target.value }
                            setPlaybookEditor({ ...playbookEditor, steps: next })
                          }}
                          placeholder="What the person actually does."
                        />
                        <div className="grid gap-2 sm:grid-cols-2">
                          <Input
                            aria-label={`Step ${position + 1} expected`}
                            value={step.expected}
                            onChange={(event) => {
                              const next = [...playbookEditor.steps]
                              next[position] = { ...next[position], expected: event.target.value }
                              setPlaybookEditor({ ...playbookEditor, steps: next })
                            }}
                            placeholder="Expected result"
                          />
                          <Input
                            aria-label={`Step ${position + 1} time`}
                            value={step.time_estimate}
                            onChange={(event) => {
                              const next = [...playbookEditor.steps]
                              next[position] = { ...next[position], time_estimate: event.target.value }
                              setPlaybookEditor({ ...playbookEditor, steps: next })
                            }}
                            placeholder="Time estimate"
                          />
                          <Input
                            aria-label={`Step ${position + 1} stop condition`}
                            value={step.stop_condition}
                            onChange={(event) => {
                              const next = [...playbookEditor.steps]
                              next[position] = { ...next[position], stop_condition: event.target.value }
                              setPlaybookEditor({ ...playbookEditor, steps: next })
                            }}
                            placeholder="Stop condition"
                          />
                          <Input
                            aria-label={`Step ${position + 1} escalation`}
                            value={step.escalation}
                            onChange={(event) => {
                              const next = [...playbookEditor.steps]
                              next[position] = { ...next[position], escalation: event.target.value }
                              setPlaybookEditor({ ...playbookEditor, steps: next })
                            }}
                            placeholder="Escalation"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPlaybookEditor(null)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={savePlaybook} disabled={busy}>
              {playbookEditor?.index === null || playbookEditor?.index === undefined ? "Add draft" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
