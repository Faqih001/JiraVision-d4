"use client"

// The approve-and-apply door on the pack config page (PR 11d).
//
// Everything above this card on the page is what the pack's rules currently are. This card is the only
// way on the whole site to change them: hand the engine an SOP, workbook or checklist, read what it
// proposes, and tick the items you are willing to make real for everyone on the discipline.
//
// Three things the screen must never do:
//   - apply a conflict nobody read — conflicts and duplicates start unchecked (see lib/ops/config/review.ts);
//   - let the AI invent — the refusals the server made are listed here with their reasons, not swallowed;
//   - pretend the document stays private — it goes to Google, so the disclosure is in the same card as
//     the button that sends it.

import { useCallback, useRef, useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { SectionCard, EmptyNote } from "@/components/dashboard-kit"
import { FileUp, Loader2, RotateCcw, ShieldCheck, TriangleAlert } from "lucide-react"
import {
  SECTION_LABELS,
  defaultSelection,
  itemsInSection,
  selectionSummary,
  sectionsPresent,
  selectAllInSection,
  toggleRef,
} from "@/lib/ops/config/review"
import type { ProposalItem, ProposalSection, ProposalStatus, RejectedEntry } from "@/lib/ops/config/diff"

type DiffView = {
  items: ProposalItem[]
  rejected: RejectedEntry[]
  counts: Record<ProposalStatus, number>
}

type ProposalResponse = {
  packKey: string
  discipline: string
  proposal: unknown
  diff: DiffView
}

type ApplyResponse = {
  packKey: string
  applied: ProposalItem[]
  counts: DiffView["counts"]
  rejected: RejectedEntry[]
}

const ACCEPTED_TYPES: Record<string, string> = {
  "application/pdf": ".pdf",
  "text/plain": ".txt",
  "text/csv": ".csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
}

const ACCEPT_STRING = Object.keys(ACCEPTED_TYPES).join(",")

const DISCLOSURE =
  "The pasted text or PDF is sent to Google for processing and is not stored. Credential values are refused; record where each one is kept instead. AI output is a draft — the rules below are not in force until you apply them."

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(",")[1] ?? "")
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function textToBase64(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ""
  for (let index = 0; index < bytes.length; index += 8192) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 8192))
  }
  return btoa(binary)
}

function StatusBadge({ status }: { status: ProposalStatus }) {
  if (status === "new") return <Badge>adds</Badge>
  if (status === "conflict") return <Badge variant="destructive">replaces</Badge>
  return <Badge variant="outline">no change</Badge>
}

function ItemRow({
  item,
  checked,
  onToggle,
}: {
  item: ProposalItem
  checked: boolean
  onToggle: (ref: string) => void
}) {
  const id = `propose-${item.ref}`
  return (
    <li className="space-y-1 border-b border-dashed py-2 last:border-0">
      <div className="flex items-start gap-2">
        <Checkbox
          id={id}
          checked={checked}
          onCheckedChange={() => onToggle(item.ref)}
          className="mt-0.5"
        />
        <label htmlFor={id} className="flex-1 cursor-pointer space-y-1">
          <span className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium">{item.label}</span>
            <span className="font-mono text-xs text-muted-foreground">{item.key}</span>
            <StatusBadge status={item.status} />
          </span>
          {item.differences.length > 0 && (
            <span className="block space-y-0.5 pt-1">
              {item.differences.map((line) => (
                <span key={line} className="block font-mono text-[11px] text-muted-foreground">
                  {line}
                </span>
              ))}
            </span>
          )}
        </label>
      </div>
    </li>
  )
}

export default function ConfigPropose({
  packKey,
  discipline,
  onApplied,
}: {
  packKey: string
  discipline: string
  onApplied: () => void
}) {
  const [phase, setPhase] = useState<"upload" | "reading" | "review" | "applying">("upload")
  const [result, setResult] = useState<ProposalResponse | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [applied, setApplied] = useState<ApplyResponse | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [pasted, setPasted] = useState("")
  const [acknowledged, setAcknowledged] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const reset = useCallback(() => {
    setResult(null)
    setSelected([])
    setApplied(null)
    setErrors([])
    setAcknowledged(false)
    setConfirmReset(false)
    setPhase("upload")
  }, [])

  const propose = useCallback(
    async (payload: { fileName: string; mimeType: string; base64: string }) => {
      setPhase("reading")
      setErrors([])
      try {
        const res = await fetch("/api/ops/config/propose", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        const json = await res.json().catch(() => null)
        if (!res.ok || !json?.success) {
          const detail = Array.isArray(json?.errors) ? json.errors : [json?.message ?? json?.error ?? `Request failed (${res.status})`]
          setErrors(detail.map(String))
          setPhase("upload")
          return
        }
        const data = json.data as ProposalResponse
        setResult(data)
        setSelected(defaultSelection(data.diff.items))
        setPhase("review")
      } catch (err) {
        setErrors([err instanceof Error ? err.message : "Could not reach the server."])
        setPhase("upload")
      }
    },
    [],
  )

  const handleFile = useCallback(
    async (file: File) => {
      const mimeType = file.type in ACCEPTED_TYPES ? file.type : ""
      if (!mimeType) {
        setErrors([`Unsupported file type. Allowed: ${Object.values(ACCEPTED_TYPES).join(", ")}.`])
        return
      }
      const base64 = await fileToBase64(file)
      void propose({ fileName: file.name, mimeType, base64 })
    },
    [propose],
  )

  const apply = useCallback(async () => {
    if (!result) return
    setPhase("applying")
    setErrors([])
    try {
      const res = await fetch("/api/ops/config/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposal: result.proposal, selectedRefs: selected }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) {
        const detail = Array.isArray(json?.errors) && json.errors.length
          ? json.errors
          : [json?.message ?? json?.error ?? `Request failed (${res.status})`]
        setErrors(detail.map(String))
        setPhase("review")
        return
      }
      setApplied(json.data as ApplyResponse)
      setResult(null)
      setSelected([])
      setAcknowledged(false)
      setPhase("upload")
      onApplied()
    } catch (err) {
      setErrors([err instanceof Error ? err.message : "Could not reach the server."])
      setPhase("review")
    }
  }, [result, selected, onApplied])

  const undo = useCallback(async () => {
    setErrors([])
    const res = await fetch("/api/ops/config/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: true }),
    })
    const json = await res.json().catch(() => null)
    if (!res.ok || !json?.success) {
      setErrors([json?.message ?? `Request failed (${res.status})`])
    }
    setConfirmReset(false)
    setApplied(null)
    onApplied()
  }, [onApplied])

  const items = result?.diff.items ?? []
  const rejected = result?.diff.rejected ?? []

  return (
    <SectionCard
      title="Propose rules from a document"
      icon={<FileUp className="h-4 w-4" />}
      action={
        phase !== "upload" ? (
          <Button size="sm" variant="ghost" onClick={reset}>
            <RotateCcw className="mr-2 h-4 w-4" aria-hidden />
            Start over
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          An SOP, workbook or checklist for <span className="font-medium">{discipline}</span> can define
          what this discipline logs and how it is measured. The document is read by AI and turned into a
          proposal; it becomes a rule only when you apply it to pack{" "}
          <span className="font-mono text-xs">{packKey}</span>.
        </p>

        {phase === "upload" || phase === "reading" ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileInput}
                type="file"
                accept={ACCEPT_STRING}
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) void handleFile(file)
                  event.target.value = ""
                }}
              />
              <Button size="sm" onClick={() => fileInput.current?.click()} disabled={phase === "reading"}>
                {phase === "reading" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <FileUp className="mr-2 h-4 w-4" aria-hidden />
                )}
                {phase === "reading" ? "Reading the document…" : "Choose a document"}
              </Button>
              {applied && (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" aria-hidden />
                  Applied {applied.applied.length} item{applied.applied.length === 1 ? "" : "s"} to this pack.
                </p>
              )}
            </div>

            {applied && (
              <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/20 p-3">
                <div className="flex-1 text-xs text-muted-foreground">
                  Undo every item a document has added by putting the pack back on the config its code
                  declares.
                </div>
                {confirmReset ? (
                  <>
                    <Button size="sm" variant="destructive" onClick={() => void undo()}>
                      Confirm reset
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setConfirmReset(false)}>
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => setConfirmReset(true)}>
                    <RotateCcw className="mr-2 h-4 w-4" aria-hidden />
                    Reset to code-authored config
                  </Button>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="propose-paste" className="text-xs text-muted-foreground">
                Or paste the text of the document
              </Label>
              <Textarea
                id="propose-paste"
                value={pasted}
                onChange={(event) => setPasted(event.target.value)}
                rows={4}
                placeholder="Retention policy, escalation triggers, the columns a log must carry…"
                disabled={phase === "reading"}
              />
              <Button
                size="sm"
                variant="outline"
                disabled={phase === "reading" || pasted.trim().length < 20}
                onClick={() =>
                  void propose({
                    fileName: "pasted-document.txt",
                    mimeType: "text/plain",
                    base64: textToBase64(pasted),
                  })
                }
              >
                {phase === "reading" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <FileUp className="mr-2 h-4 w-4" aria-hidden />
                )}
                Read the pasted text
              </Button>
            </div>
          </>
        ) : null}

        {errors.length > 0 && (
          <Alert variant="destructive">
            <AlertDescription>
              <ul className="list-disc space-y-1 pl-4">
                {errors.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {(phase === "review" || phase === "applying") && result && (
          <div className="space-y-4">
            <p className="text-sm">
              {items.length > 0
                ? `This document defines ${items.length} item${items.length === 1 ? "" : "s"} for the pack:`
                : "This document did not define anything this pack does not already have."}
              {rejected.length > 0 && (
                <span className="text-muted-foreground">
                  {" "}
                  {rejected.length} more were refused.
                </span>
              )}
            </p>

            {sectionsPresent(items).map((section: ProposalSection) => {
              const rows = itemsInSection(items, section)
              return (
                <div key={section} className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold">{SECTION_LABELS[section]}</h3>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={() => setSelected((prev) => selectAllInSection(items, section, prev))}
                    >
                      Toggle all
                    </Button>
                  </div>
                  <ul>
                    {rows.map((item) => (
                      <ItemRow
                        key={item.ref}
                        item={item}
                        checked={selected.includes(item.ref)}
                        onToggle={(ref) => setSelected((prev) => toggleRef(prev, ref))}
                      />
                    ))}
                  </ul>
                </div>
              )
            })}

            {rejected.length > 0 && (
              <div className="space-y-1 rounded-md border bg-muted/20 p-3">
                <h3 className="flex items-center gap-2 text-sm font-medium">
                  <TriangleAlert className="h-4 w-4 text-amber-600" aria-hidden />
                  Refused before you had to decide
                </h3>
                <ul className="space-y-1">
                  {rejected.map((entry) => (
                    <li key={`${entry.section}:${entry.key}`} className="text-xs text-muted-foreground">
                      <span className="font-mono">{entry.key}</span> &mdash; {entry.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 border-t pt-3">
              <div className="flex flex-1 items-center gap-2">
                <Checkbox
                  id="propose-ack"
                  checked={acknowledged}
                  onCheckedChange={() => setAcknowledged((prev) => !prev)}
                />
                <Label htmlFor="propose-ack" className="cursor-pointer text-xs text-muted-foreground">
                  I have read the items I selected and understand this changes the rules everyone on{" "}
                  {discipline} logs against.
                </Label>
              </div>
              <Button
                size="sm"
                disabled={selected.length === 0 || !acknowledged || phase === "applying"}
                onClick={() => void apply()}
              >
                {phase === "applying" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <ShieldCheck className="mr-2 h-4 w-4" aria-hidden />
                )}
                Apply ({selectionSummary(items, selected)})
              </Button>
            </div>
          </div>
        )}

        {phase === "upload" && !result && (
          <EmptyNote>No proposal on the table yet. The approval list appears here after a document is read.</EmptyNote>
        )}

        <p className="text-xs text-muted-foreground">{DISCLOSURE}</p>
      </div>
    </SectionCard>
  )
}
