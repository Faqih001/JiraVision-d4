"use client"

// The pack authoring form (design §12 item 1). A pack is data — kinds, sections, the method
// it asks for and what onboarding should mention — so an admin can publish a new role
// without a deploy. Every field here is re-read by `readPackInput` on the server.

import { useState } from "react"
import { Plus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { DASHBOARD_SECTIONS, sectionLabel } from "@/lib/packs/types"
import { DISCIPLINE_LABEL, WORK_DISCIPLINES, isWorkDiscipline } from "@/lib/roles"

export type AdminPack = {
  packKey: string
  title: string
  disciplines: string[]
  registerKinds: { key: string; label: string }[]
  sections: string[]
  reportTemplate: string | null
  ladderDiscipline: string | null
  onboarding: string[]
  method: string[]
  isActive: boolean
}

export type PackPayload = {
  packKey: string
  title: string
  disciplines: string[]
  registerKinds: { key: string; label: string }[]
  sections: string[]
  reportTemplate: string | null
  ladderDiscipline: string | null
  onboarding: string[]
  method: string[]
  isActive: boolean
}

export type PackDraft = {
  packKey: string
  title: string
  disciplines: string[]
  kinds: { key: string; label: string }[]
  sections: string[]
  reportTemplate: string
  ladderDiscipline: string
  onboarding: string
  method: string
  isActive: boolean
}

const lines = (text: string): string[] =>
  text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)

function toDraft(pack: AdminPack | null): PackDraft {
  if (!pack) {
    return {
      packKey: "",
      title: "",
      disciplines: [],
      kinds: [{ key: "accounts", label: "Accounts" }],
      sections: ["registers"],
      reportTemplate: "",
      ladderDiscipline: "",
      onboarding: "",
      method: "Plan\nDo\nCheck\nAct",
      isActive: true,
    }
  }
  return {
    packKey: pack.packKey,
    title: pack.title,
    disciplines: pack.disciplines.filter(isWorkDiscipline),
    kinds: pack.registerKinds.map((kind) => ({ ...kind })),
    sections: [...pack.sections],
    reportTemplate: pack.reportTemplate ?? "",
    ladderDiscipline: pack.ladderDiscipline ?? "",
    onboarding: pack.onboarding.join("\n"),
    method: pack.method.join("\n"),
    isActive: pack.isActive,
  }
}

export function toPayload(draft: PackDraft): PackPayload {
  return {
    packKey: draft.packKey.trim(),
    title: draft.title.trim(),
    disciplines: draft.disciplines,
    registerKinds: draft.kinds
      .map((kind) => ({ key: kind.key.trim(), label: kind.label.trim() }))
      .filter((kind) => kind.key && kind.label),
    sections: draft.sections,
    reportTemplate: draft.reportTemplate.trim() || null,
    ladderDiscipline: draft.ladderDiscipline === "" ? null : draft.ladderDiscipline,
    onboarding: lines(draft.onboarding),
    method: lines(draft.method),
    isActive: draft.isActive,
  }
}

export function PackEditor({
  pack,
  saving,
  onSave,
}: {
  pack: AdminPack | null
  saving: boolean
  onSave: (payload: PackPayload) => void
}) {
  const [draft, setDraft] = useState<PackDraft>(() => toDraft(pack))
  const [disciplineFilter, setDisciplineFilter] = useState("")
  const editing = pack !== null

  const patch = (next: Partial<PackDraft>) => setDraft((prev) => ({ ...prev, ...next }))

  const toggleDiscipline = (discipline: string) => {
    setDraft((prev) => ({
      ...prev,
      disciplines: prev.disciplines.includes(discipline)
        ? prev.disciplines.filter((entry) => entry !== discipline)
        : [...prev.disciplines, discipline],
    }))
  }

  const toggleSection = (key: string) => {
    setDraft((prev) => ({
      ...prev,
      sections: prev.sections.includes(key)
        ? prev.sections.filter((entry) => entry !== key)
        : [...prev.sections, key],
    }))
  }

  const visibleDisciplines = WORK_DISCIPLINES.filter((discipline) => {
    const query = disciplineFilter.trim().toLowerCase()
    if (!query) return true
    return `${discipline} ${DISCIPLINE_LABEL[discipline]}`.toLowerCase().includes(query)
  })

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Label htmlFor="pack-key">Pack key</Label>
          <Input
            id="pack-key"
            value={draft.packKey}
            onChange={(event) => patch({ packKey: event.target.value })}
            placeholder="field-service"
            disabled={editing}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Lowercase letters, digits and dashes. It cannot change once created.
          </p>
        </div>
        <div>
          <Label htmlFor="pack-title">Title</Label>
          <Input
            id="pack-title"
            value={draft.title}
            onChange={(event) => patch({ title: event.target.value })}
            placeholder="Field service technician"
          />
        </div>
      </div>

      <div className="flex items-center justify-between rounded-md border px-3 py-2">
        <div>
          <Label htmlFor="pack-active">Published</Label>
          <p className="text-xs text-muted-foreground">
            Inactive packs keep their rows but stop being offered as a default.
          </p>
        </div>
        <Switch
          id="pack-active"
          checked={draft.isActive}
          onCheckedChange={(checked) => patch({ isActive: checked })}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Label htmlFor="pack-ladder">Career ladder discipline</Label>
          <Select
            value={draft.ladderDiscipline === "" ? "none" : draft.ladderDiscipline}
            onValueChange={(value) => patch({ ladderDiscipline: value === "none" ? "" : value })}
          >
            <SelectTrigger id="pack-ladder">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No ladder</SelectItem>
              {WORK_DISCIPLINES.map((discipline) => (
                <SelectItem key={discipline} value={discipline}>
                  {DISCIPLINE_LABEL[discipline]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="pack-template">Report template</Label>
          <Input
            id="pack-template"
            value={draft.reportTemplate}
            onChange={(event) => patch({ reportTemplate: event.target.value })}
            placeholder="technical"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            The builder template this role starts from. Blank leaves the default.
          </p>
        </div>
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label>Disciplines this pack claims</Label>
          <span className="text-xs text-muted-foreground tabular-nums">
            {draft.disciplines.length} selected
          </span>
        </div>
        <Input
          value={disciplineFilter}
          onChange={(event) => setDisciplineFilter(event.target.value)}
          placeholder="Filter disciplines"
          className="mt-1 h-8"
        />
        <div className="mt-2 grid max-h-56 gap-1 overflow-y-auto rounded-md border p-2 sm:grid-cols-2 lg:grid-cols-3">
          {visibleDisciplines.map((discipline) => (
            <label key={discipline} className="flex items-center gap-2 text-xs">
              <Checkbox
                checked={draft.disciplines.includes(discipline)}
                onCheckedChange={() => toggleDiscipline(discipline)}
              />
              {DISCIPLINE_LABEL[discipline]}
            </label>
          ))}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          A discipline claimed by two packs is ambiguous; the seed test keeps the defaults
          disjoint. A discipline nobody claims resolves to the general pack.
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Register kinds</Label>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={() => patch({ kinds: [...draft.kinds, { key: "", label: "" }] })}
          >
            <Plus className="mr-1 h-3.5 w-3.5" aria-hidden />
            Add kind
          </Button>
        </div>
        {draft.kinds.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No kinds yet. A register row must choose one, so add at least one before publishing.
          </p>
        ) : (
          <div className="space-y-2">
            {draft.kinds.map((kind, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  aria-label="Kind key"
                  value={kind.key}
                  onChange={(event) => {
                    const next = [...draft.kinds]
                    next[index] = { ...next[index], key: event.target.value }
                    patch({ kinds: next })
                  }}
                  placeholder="accounts"
                  className="w-2/5"
                />
                <Input
                  aria-label="Kind label"
                  value={kind.label}
                  onChange={(event) => {
                    const next = [...draft.kinds]
                    next[index] = { ...next[index], label: event.target.value }
                    patch({ kinds: next })
                  }}
                  placeholder="Accounts"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-9 px-2 text-xs"
                  onClick={() => patch({ kinds: draft.kinds.filter((_, position) => position !== index) })}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <Label>Dashboard sections</Label>
        <div className="mt-2 flex flex-wrap gap-3">
          {DASHBOARD_SECTIONS.map((section) => (
            <label key={section.key} className="flex items-center gap-2 text-xs">
              <Checkbox
                checked={draft.sections.includes(section.key)}
                onCheckedChange={() => toggleSection(section.key)}
              />
              {sectionLabel(section.key)}
            </label>
          ))}
        </div>
        {draft.sections.some((key) => !DASHBOARD_SECTIONS.some((section) => section.key === key)) ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {draft.sections
              .filter((key) => !DASHBOARD_SECTIONS.some((section) => section.key === key))
              .map((key) => (
                <Badge key={key} variant="outline">
                  {key}
                </Badge>
              ))}
          </div>
        ) : null}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Label htmlFor="pack-method">Method — one step per line</Label>
          <Textarea
            id="pack-method"
            value={draft.method}
            onChange={(event) => patch({ method: event.target.value })}
            rows={6}
            placeholder={"Identify\nReproduce\nDiagnose\nFix\nTest\nDocument"}
          />
        </div>
        <div>
          <Label htmlFor="pack-onboarding">Onboarding — one line per note</Label>
          <Textarea
            id="pack-onboarding"
            value={draft.onboarding}
            onChange={(event) => patch({ onboarding: event.target.value })}
            rows={6}
            placeholder={"Read the runbook before your first on-call shift."}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => onSave(toPayload(draft))} disabled={saving}>
          {editing ? "Save pack" : "Create pack"}
        </Button>
      </div>
    </div>
  )
}
