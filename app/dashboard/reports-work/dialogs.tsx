"use client"

// The report dialogs: a report is created with a period, sent to chosen recipients, and destroyed
// with a confirmed click. All are controlled forms over a draft object rather than uncontrolled
// refs: the values shown are the values sent, and the route's whitelist checks them again anyway.

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { MAX_REPORT_TITLE, type ReportDto } from "@/lib/reports/report-fields"
import { PERIOD_LABEL, PERIOD_TYPES, type PeriodType } from "@/lib/reports/period"
import { MODULE_LABEL } from "@/lib/reports/aggregate"
import {
  MODULE_SECTIONS,
  type ModuleSectionKey,
} from "@/lib/reports/module-sections"
import { type ModuleScope } from "@/lib/reports/scope"

export type NewReportDraft = {
  title: string
  periodType: PeriodType
  scope: ModuleScope
}

export function NewReportDialog({
  open,
  busy,
  defaultTitle,
  defaultPeriodType,
  defaultScope,
  onClose,
  onCreate,
}: {
  open: boolean
  busy: boolean
  defaultTitle: string
  defaultPeriodType: PeriodType
  defaultScope: ModuleScope
  onClose: () => void
  onCreate: (draft: NewReportDraft) => void
}) {
  const allModules = [...MODULE_SECTIONS]
  const [draft, setDraft] = useState<NewReportDraft>({
    title: defaultTitle,
    periodType: defaultPeriodType,
    scope: defaultScope,
  })
  const selectedModules = draft.scope ?? allModules

  const toggleModule = (module: ModuleSectionKey) => {
    const selected = new Set(selectedModules)
    if (selected.has(module)) {
      if (selected.size === 1) return
      selected.delete(module)
    } else {
      selected.add(module)
    }
    const ordered = MODULE_SECTIONS.filter((key) => selected.has(key))
    setDraft((prev) => ({
      ...prev,
      scope: ordered.length === MODULE_SECTIONS.length ? null : ordered,
    }))
  }

  const submit = () => {
    const title = draft.title.trim()
    if (!title) return
    onCreate({ ...draft, title })
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? undefined : onClose())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New report</DialogTitle>
          <DialogDescription>
            Choose the period and data sections to include. Core work-log, task, deliverable and
            planning data is always included; these modules control the additional report cards.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="new-report-title">Title</Label>
            <Input
              id="new-report-title"
              value={draft.title}
              maxLength={MAX_REPORT_TITLE}
              onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-report-type">Period type</Label>
            <Select
              value={draft.periodType}
              onValueChange={(value) =>
                setDraft((prev) => ({ ...prev, periodType: value as PeriodType }))
              }
            >
              <SelectTrigger id="new-report-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {PERIOD_LABEL[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Data sections</Label>
            <div className="max-h-56 space-y-2 overflow-y-auto rounded-lg border border-border/60 p-3">
              {MODULE_SECTIONS.map((module) => (
                <label key={module} className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox
                    checked={selectedModules.includes(module)}
                    onCheckedChange={() => toggleModule(module)}
                  />
                  <span>{MODULE_LABEL[module]}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Select at least one section. You can change this view later from the report builder.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={busy || draft.title.trim() === ""}>
            {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden /> : null}
            Create draft
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function SubmitReportDialog({
  report,
  busy,
  onSubmit,
  onClose,
}: {
  report: ReportDto
  busy: boolean
  onSubmit: (recipientIds: number[]) => void
  onClose: () => void
}) {
  const [members, setMembers] = useState<{ id: number; name: string }[]>([])
  const [recipientIds, setRecipientIds] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const [membersRes, settingsRes] = await Promise.all([
          fetch("/api/team/members"),
          fetch("/api/settings"),
        ])
        const membersJson = await membersRes.json().catch(() => null)
        const settingsJson = await settingsRes.json().catch(() => null)
        if (cancelled) return
        if (membersJson?.success) {
          setMembers(
            (membersJson.teamMembers as { id: number; name: string }[]).map((m) => ({
              id: m.id,
              name: m.name,
            })),
          )
        } else {
          setLoadError(membersJson?.message ?? "Could not load your team")
        }
        if (settingsJson?.success && Array.isArray(settingsJson.settings.defaultReportRecipients)) {
          setRecipientIds(settingsJson.settings.defaultReportRecipients)
        }
      } catch (error) {
        if (!cancelled) setLoadError((error as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <Dialog open onOpenChange={(next) => (next ? undefined : onClose())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Submit report</DialogTitle>
          <DialogDescription>
            Choose who receives &quot;{report.title}&quot;. Once submitted, the report is locked —
            changes go through a revision.
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : loadError ? (
          <p className="text-sm text-destructive">{loadError}</p>
        ) : members.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No team members to send this to yet. Invite someone from the Team page, then submit.
          </p>
        ) : (
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {members.map((member) => (
              <label
                key={member.id}
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-border/60 p-2 hover:bg-muted/50"
              >
                <Checkbox
                  checked={recipientIds.includes(member.id)}
                  onCheckedChange={(checked) =>
                    setRecipientIds((prev) =>
                      checked === true ? [...prev, member.id] : prev.filter((id) => id !== member.id),
                    )
                  }
                />
                <span className="text-sm">{member.name}</span>
              </label>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => onSubmit(recipientIds)}
            disabled={busy || loading || recipientIds.length === 0}
          >
            {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden /> : null}
            Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ConfirmReportDelete({
  report,
  busy,
  onCancel,
  onConfirm,
}: {
  report: ReportDto | null
  busy: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <Dialog open={report !== null} onOpenChange={(next) => (next ? undefined : onCancel())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete this draft?</DialogTitle>
          <DialogDescription>
            {report
              ? `"${report.title}" covers ${report.periodStart} to ${report.periodEnd}. Deleting it does not touch the work log entries behind it.`
              : "This report is gone."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
            Keep it
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirm} disabled={busy}>
            {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden /> : null}
            Delete draft
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
