"use client"

// The ladder editor (design §11). One card per rung: the words a member reads, the nine
// targets, the checklist and the band. Every save goes through PATCH
// /api/career/levels/[id], which re-validates each field; an error is shown exactly as
// the server wrote it rather than guessed at in the browser.

import { useState } from "react"
import { ListChecks, Loader2, Plus, Save, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { EmptyNote, SectionCard } from "@/components/dashboard-kit"
import { CAREER_SIGNALS, type CareerSignalKey } from "@/lib/career/signals"
import { DISCIPLINE_LABEL, isWorkDiscipline } from "@/lib/roles"

export type AdminLevel = {
  id: number
  discipline: string
  level: number
  title: string
  summary: string | null
  expectations: string | null
  bandMin: number | null
  bandMax: number | null
  bandCurrency: string | null
  signals: Partial<Record<CareerSignalKey, number>>
  checklist: Array<{ key: string; label: string; hint: string }>
  isActive: boolean
}

type Draft = {
  title: string
  summary: string
  expectations: string
  bandMin: string
  bandMax: string
  bandCurrency: string
  targets: Record<string, string>
  checklist: Array<{ key: string; label: string; hint: string }>
  isActive: boolean
}

const disciplineLabel = (value: string): string =>
  isWorkDiscipline(value) ? DISCIPLINE_LABEL[value] : value

function draftFrom(level: AdminLevel): Draft {
  const targets: Record<string, string> = {}
  for (const signal of CAREER_SIGNALS) {
    const value = level.signals[signal.key]
    targets[signal.key] = typeof value === "number" ? String(value) : ""
  }
  return {
    title: level.title,
    summary: level.summary ?? "",
    expectations: level.expectations ?? "",
    bandMin: level.bandMin === null ? "" : String(level.bandMin),
    bandMax: level.bandMax === null ? "" : String(level.bandMax),
    bandCurrency: level.bandCurrency ?? "",
    targets,
    checklist: level.checklist.map((item) => ({ ...item })),
    isActive: level.isActive,
  }
}

type Flash = { kind: "ok" | "err"; text: string } | null

function RungEditor({
  rung,
  onSaved,
}: {
  rung: AdminLevel
  onSaved: (level: AdminLevel) => void
}) {
  const [draft, setDraft] = useState<Draft>(() => draftFrom(rung))
  const [busy, setBusy] = useState(false)
  const [flash, setFlash] = useState<Flash>(null)

  const patch = (next: Partial<Draft>) => setDraft((prev) => ({ ...prev, ...next }))

  const setTarget = (key: CareerSignalKey, value: string) =>
    setDraft((prev) => ({ ...prev, targets: { ...prev.targets, [key]: value } }))

  const setChecklistField = (index: number, field: "key" | "label" | "hint", value: string) =>
    setDraft((prev) => ({
      ...prev,
      checklist: prev.checklist.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    }))

  const addChecklistItem = () =>
    setDraft((prev) => ({
      ...prev,
      checklist: [...prev.checklist, { key: "", label: "", hint: "" }],
    }))

  const removeChecklistItem = (index: number) =>
    setDraft((prev) => ({
      ...prev,
      checklist: prev.checklist.filter((_, i) => i !== index),
    }))

  const save = async () => {
    setBusy(true)
    setFlash(null)
    try {
      const signals: Record<string, number> = {}
      for (const signal of CAREER_SIGNALS) {
        const raw = (draft.targets[signal.key] ?? "").trim()
        if (raw) signals[signal.key] = Number(raw)
      }

      const res = await fetch(`/api/career/levels/${rung.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draft.title,
          summary: draft.summary,
          expectations: draft.expectations,
          band: {
            min: draft.bandMin.trim() === "" ? null : Number(draft.bandMin),
            max: draft.bandMax.trim() === "" ? null : Number(draft.bandMax),
            currency: draft.bandCurrency.trim() === "" ? null : draft.bandCurrency,
          },
          signals,
          checklist: draft.checklist,
          isActive: draft.isActive,
        }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) {
        throw new Error(json?.error ?? json?.message ?? `Request failed (${res.status})`)
      }
      const saved = json.data.level as AdminLevel
      setDraft(draftFrom(saved))
      onSaved(saved)
      setFlash({ kind: "ok", text: "Saved." })
    } catch (err) {
      setFlash({ kind: "err", text: (err as Error).message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <SectionCard
      title={`Level ${rung.level} · ${rung.title}`}
      icon={<ListChecks className="h-4 w-4" />}
      action={
        <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
          {draft.isActive ? "Active" : "Retired"}
          <Switch
            checked={draft.isActive}
            onCheckedChange={(checked) => patch({ isActive: checked })}
            aria-label={`Level ${rung.level} is active`}
          />
        </label>
      }
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor={`rung-${rung.id}-title`}>Title</Label>
          <Input
            id={`rung-${rung.id}-title`}
            value={draft.title}
            onChange={(event) => patch({ title: event.target.value })}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`rung-${rung.id}-summary`}>Summary</Label>
          <Textarea
            id={`rung-${rung.id}-summary`}
            rows={3}
            value={draft.summary}
            onChange={(event) => patch({ summary: event.target.value })}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`rung-${rung.id}-expectations`}>Expectations</Label>
          <Textarea
            id={`rung-${rung.id}-expectations`}
            rows={3}
            value={draft.expectations}
            onChange={(event) => patch({ expectations: event.target.value })}
          />
        </div>

        <fieldset className="space-y-2 rounded-lg border border-border/70 p-3">
          <legend className="px-1 text-xs font-semibold">Band</legend>
          <p className="text-[11px] text-muted-foreground">
            Blank means unpublished. Publish both ends and a three-letter currency, or leave
            all three blank — no range is ever invented.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor={`rung-${rung.id}-band-min`}>Minimum</Label>
              <Input
                id={`rung-${rung.id}-band-min`}
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                value={draft.bandMin}
                onChange={(event) => patch({ bandMin: event.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`rung-${rung.id}-band-max`}>Maximum</Label>
              <Input
                id={`rung-${rung.id}-band-max`}
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                value={draft.bandMax}
                onChange={(event) => patch({ bandMax: event.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`rung-${rung.id}-band-currency`}>Currency</Label>
              <Input
                id={`rung-${rung.id}-band-currency`}
                maxLength={3}
                placeholder="USD"
                value={draft.bandCurrency}
                onChange={(event) => patch({ bandCurrency: event.target.value })}
              />
            </div>
          </div>
        </fieldset>

        <fieldset className="space-y-2 rounded-lg border border-border/70 p-3">
          <legend className="px-1 text-xs font-semibold">Targets</legend>
          <p className="text-[11px] text-muted-foreground">
            Counted over the last 90 days. Leave a field blank for no target on that signal.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {CAREER_SIGNALS.map((signal) => (
              <div key={signal.key} className="space-y-1.5">
                <Label htmlFor={`rung-${rung.id}-${signal.key}`}>{signal.label}</Label>
                <Input
                  id={`rung-${rung.id}-${signal.key}`}
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  placeholder="No target"
                  value={draft.targets[signal.key] ?? ""}
                  onChange={(event) => setTarget(signal.key, event.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">{signal.hint}</p>
              </div>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-2 rounded-lg border border-border/70 p-3">
          <legend className="px-1 text-xs font-semibold">Checklist</legend>
          <p className="text-[11px] text-muted-foreground">
            An admin ticks these against a member; the member cannot tick their own.
          </p>
          {draft.checklist.length === 0 ? (
            <EmptyNote>No checklist items on this rung.</EmptyNote>
          ) : (
            <div className="space-y-2">
              {draft.checklist.map((item, index) => (
                <div
                  key={index}
                  className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1.4fr)_auto]"
                >
                  <Input
                    aria-label={`Checklist item ${index + 1} key`}
                    placeholder="key"
                    value={item.key}
                    onChange={(event) => setChecklistField(index, "key", event.target.value)}
                  />
                  <Input
                    aria-label={`Checklist item ${index + 1} label`}
                    placeholder="What is certified"
                    value={item.label}
                    onChange={(event) => setChecklistField(index, "label", event.target.value)}
                  />
                  <Input
                    aria-label={`Checklist item ${index + 1} hint`}
                    placeholder="Hint (optional)"
                    value={item.hint}
                    onChange={(event) => setChecklistField(index, "hint", event.target.value)}
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={`Remove checklist item ${index + 1}`}
                    onClick={() => removeChecklistItem(index)}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </Button>
                </div>
              ))}
            </div>
          )}
          <Button type="button" size="sm" variant="outline" onClick={addChecklistItem}>
            <Plus className="mr-1.5 h-4 w-4" aria-hidden />
            Add item
          </Button>
        </fieldset>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => void save()} disabled={busy}>
            {busy ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Save className="mr-1.5 h-4 w-4" aria-hidden />
            )}
            {busy ? "Saving…" : "Save rung"}
          </Button>
          {flash ? (
            <span
              className={
                flash.kind === "err"
                  ? "text-xs text-destructive"
                  : "text-xs text-muted-foreground"
              }
              role={flash.kind === "err" ? "alert" : "status"}
            >
              {flash.text}
            </span>
          ) : null}
        </div>
      </div>
    </SectionCard>
  )
}

export function LadderEditor({
  levels,
  onSaved,
}: {
  levels: AdminLevel[]
  onSaved: (level: AdminLevel) => void
}) {
  const disciplines = [...new Set(levels.map((level) => level.discipline))]
  const [discipline, setDiscipline] = useState(disciplines[0] ?? "")
  const activeDiscipline = disciplines.includes(discipline) ? discipline : (disciplines[0] ?? "")
  const rungs = levels
    .filter((level) => level.discipline === activeDiscipline)
    .sort((a, b) => a.level - b.level)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3 rounded-xl border bg-card p-4">
        <div className="space-y-1.5">
          <Label htmlFor="ladder-discipline">Discipline</Label>
          <Select value={activeDiscipline} onValueChange={setDiscipline}>
            <SelectTrigger id="ladder-discipline" className="w-64">
              <SelectValue placeholder="Choose a discipline" />
            </SelectTrigger>
            <SelectContent>
              {disciplines.map((value) => (
                <SelectItem key={value} value={value}>
                  {disciplineLabel(value)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="max-w-md text-[11px] text-muted-foreground">
          Saving a rung changes what it asks for. It never moves a placement, ticks a checklist
          or decides a request — those are separate actions with their own records.
        </p>
      </div>

      {rungs.length === 0 ? (
        <EmptyNote>
          The ladder has no rows yet. Run the ladder seed before editing rungs.
        </EmptyNote>
      ) : (
        <div className="space-y-4">
          {rungs.map((rung) => (
            <RungEditor key={rung.id} rung={rung} onSaved={onSaved} />
          ))}
        </div>
      )}
    </div>
  )
}
