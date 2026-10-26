"use client"

// The form behind one work-log row, and the confirmation that removes one. This is the polite half
// of `lib/worklog/entry-fields.ts`: it catches the mistakes a member can see before posting. The
// server still decides everything else — length caps, the kind invariants, ownership — and its
// message arrives as a toast, so nothing here pretends to be the authority.

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
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
import { Textarea } from "@/components/ui/textarea"
import { isIsoDate } from "@/lib/worklog/local-day"
import { DISCIPLINE_LABEL, WORK_DISCIPLINES, type WorkDiscipline } from "@/lib/roles"
import {
  DELIVERABLE_LABEL,
  DELIVERABLE_LABEL_STATUS,
  DELIVERABLE_STATUSES,
  DELIVERABLE_TYPES,
  KIND_LABEL,
  WORK_LOG_KINDS,
  canMoveDeliverable,
  type DeliverableDto,
  type DeliverableStatus,
  type DeliverableType,
  type EntryDto,
  type WorkLogKind,
} from "@/lib/worklog/entries"
import type { ViewState } from "@/lib/worklog/view-state"
import { DisciplinePicker } from "./sections"
import type { TaskOption } from "./worklog-client"

// Every string, because a form field that holds a number cannot show you the half-typed "9".
export type EntryDraft = {
  id: number | null
  title: string
  body: string
  workedOn: string
  minutes: string
  kind: WorkLogKind
  discipline: WorkDiscipline | "all"
  taskId: string
  deliverableId: string
}

type FieldErrors = { title?: string; day?: string; minutes?: string; deliverable?: string }

// The same sentinel the quick-add line uses: "none" is a form answer, "all" is a filter answer.
const NONE = "none"
const MAX_MINUTES = 1440

export function toDraft(entry: EntryDto | null, workedOn: string): EntryDraft {
  if (!entry) {
    return {
      id: null,
      title: "",
      body: "",
      workedOn,
      minutes: "",
      kind: "action",
      discipline: "all",
      taskId: NONE,
      deliverableId: NONE,
    }
  }
  return {
    id: entry.id,
    title: entry.title,
    body: entry.body ?? "",
    workedOn: entry.workedOn,
    minutes: entry.minutes === null ? "" : String(entry.minutes),
    kind: entry.kind,
    discipline: entry.discipline ?? "all",
    taskId: entry.taskId === null ? NONE : String(entry.taskId),
    deliverableId: entry.deliverableId === null ? NONE : String(entry.deliverableId),
  }
}

export function EntryDialog({
  draft,
  todayIso,
  tasks,
  deliverables,
  saving,
  onOpenChange,
  onSubmit,
}: {
  draft: EntryDraft
  todayIso: string
  tasks: TaskOption[]
  deliverables: DeliverableDto[]
  saving: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (draft: EntryDraft) => Promise<void>
}) {
  // The client mounts this with a key per row, so the draft is a starting value rather than a
  // prop to keep in sync — and a keystroke re-renders this dialog, not the grid behind it.
  const [form, setForm] = useState<EntryDraft>(draft)
  const [errors, setErrors] = useState<FieldErrors>({})

  const set = (patch: Partial<EntryDraft>) => setForm((prev) => ({ ...prev, ...patch }))

  const validate = () => {
    const next: FieldErrors = {}
    if (!form.title.trim()) next.title = "Say what you did."
    if (!form.workedOn) next.day = "Pick the day you did it."
    else if (form.workedOn > todayIso) next.day = "The day cannot be after today."
    const minutes = form.minutes.trim()
    if (minutes !== "") {
      const parsed = Number(minutes)
      if (!Number.isInteger(parsed) || parsed < 0 || parsed > MAX_MINUTES) {
        next.minutes = `Minutes are a whole number from 0 to ${MAX_MINUTES}.`
      }
    } else if (form.kind === "time") {
      next.minutes = "A time entry needs minutes."
    }
    if (form.kind === "deliverable" && form.deliverableId === NONE) {
      next.deliverable = "A deliverable entry needs a deliverable — use To deliverable on the row."
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="pr-8 text-base">{form.id === null ? "Log an entry" : "Edit entry"}</DialogTitle>
          <DialogDescription className="text-xs">
            The day you choose is the day the report uses. Moving an entry to another day is
            recorded on the row, not done silently.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault()
            if (validate()) void onSubmit(form)
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="entry-title">What did you do?</Label>
            <Input
              id="entry-title"
              value={form.title}
              aria-invalid={errors.title ? true : undefined}
              aria-describedby={errors.title ? "entry-title-error" : undefined}
              onChange={(event) => set({ title: event.target.value })}
              placeholder="Replaced the failing pump seal on line 2"
            />
            {errors.title ? (
              <p id="entry-title-error" className="text-xs text-destructive">
                {errors.title}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="entry-body">Detail (optional)</Label>
            <Textarea
              id="entry-body"
              rows={3}
              value={form.body}
              onChange={(event) => set({ body: event.target.value })}
              placeholder="Anything a report or a reviewer would need"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="entry-day">Day</Label>
              <Input
                id="entry-day"
                type="date"
                max={todayIso}
                value={form.workedOn}
                aria-invalid={errors.day ? true : undefined}
                aria-describedby={errors.day ? "entry-day-error" : undefined}
                onChange={(event) => set({ workedOn: event.target.value })}
              />
              {errors.day ? (
                <p id="entry-day-error" className="text-xs text-destructive">
                  {errors.day}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="entry-minutes">Minutes</Label>
              <Input
                id="entry-minutes"
                inputMode="numeric"
                value={form.minutes}
                aria-invalid={errors.minutes ? true : undefined}
                aria-describedby={errors.minutes ? "entry-minutes-error" : undefined}
                onChange={(event) => set({ minutes: event.target.value })}
                placeholder="90"
              />
              {errors.minutes ? (
                <p id="entry-minutes-error" className="text-xs text-destructive">
                  {errors.minutes}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="entry-kind">Kind</Label>
              <Select value={form.kind} onValueChange={(v) => set({ kind: v as WorkLogKind })}>
                <SelectTrigger id="entry-kind" className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WORK_LOG_KINDS.map((kind) => (
                    <SelectItem key={kind} value={kind}>
                      {KIND_LABEL[kind]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-sm font-medium leading-none">Work discipline</span>
            <DisciplinePicker compact value={form.discipline} onChange={(discipline) => set({ discipline })} />
            <p className="text-[11px] text-muted-foreground">
              {form.discipline === "all"
                ? `Unclassified — pick a group to classify it (${WORK_DISCIPLINES.length} disciplines)`
                : DISCIPLINE_LABEL[form.discipline]}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="entry-task">Task</Label>
              <Select value={form.taskId} onValueChange={(v) => set({ taskId: v })}>
                <SelectTrigger id="entry-task" className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>No task (unlinked)</SelectItem>
                  {tasks.map((task) => (
                    <SelectItem key={task.id} value={String(task.id)}>
                      {task.title.slice(0, 48)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="entry-deliverable">Deliverable</Label>
              <Select value={form.deliverableId} onValueChange={(v) => set({ deliverableId: v })}>
                <SelectTrigger
                  id="entry-deliverable"
                  className="h-9"
                  aria-invalid={errors.deliverable ? true : undefined}
                  aria-describedby={errors.deliverable ? "entry-deliverable-error" : undefined}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>No deliverable</SelectItem>
                  {deliverables.map((item) => (
                    <SelectItem key={item.id} value={String(item.id)}>
                      {item.name.slice(0, 48)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.deliverable ? (
                <p id="entry-deliverable-error" className="text-xs text-destructive">
                  {errors.deliverable}
                </p>
              ) : null}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? "Saving…" : form.id === null ? "Log it" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function ConfirmDelete({
  entry,
  busy,
  onOpenChange,
  onConfirm,
}: {
  entry: EntryDto | null
  busy: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (entry: EntryDto) => void
}) {
  return (
    <AlertDialog open={entry !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-base">Delete entry</AlertDialogTitle>
          <AlertDialogDescription className="text-xs">
            {entry
              ? `"${entry.title}" (${entry.workedOn}) leaves the log. A task's own history is not touched, and nothing else can point at this row.`
              : ""}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel disabled={busy}>Keep it</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={busy || entry === null}
            onClick={(event) => {
              event.preventDefault()
              if (entry) onConfirm(entry)
            }}
          >
            {busy ? "Deleting…" : "Delete entry"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// Deleting a batch is the one action in this phase with no undo and no per-row confirm, so it gets
// its own dialog. The row-level `ConfirmDelete` above cannot serve it: that one names a title.
export function ConfirmBulkDelete({
  count,
  busy,
  open,
  onOpenChange,
  onConfirm,
}: {
  count: number
  busy: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-base">
            Delete {count} {count === 1 ? "entry" : "entries"}?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs">
            These rows leave your work log. A task&apos;s own change history is recorded separately
            and is not touched. This cannot be undone from the page.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel disabled={busy}>Keep them</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={busy || count === 0}
            onClick={(event) => {
              event.preventDefault()
              onConfirm()
            }}
          >
            {busy ? "Deleting…" : `Delete ${count}`}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// A deliverable is the report's unit of proof, so the form asks for the link and the evidence in the
// same breath as the name.
export type DeliverableDraft = {
  id: number | null
  name: string
  type: DeliverableType
  status: DeliverableStatus
  producedOn: string
  link: string
  evidence: string
  taskId: string
  discipline: ViewState["discipline"]
}

type DeliverableErrors = { name?: string; producedOn?: string; link?: string }

export const EMPTY_DELIVERABLE: DeliverableDraft = {
  id: null,
  name: "",
  type: "document",
  status: "draft",
  producedOn: "",
  link: "",
  evidence: "",
  taskId: NONE,
  discipline: "all",
}

export function toDeliverableDraft(d: DeliverableDto, todayIso: string): DeliverableDraft {
  return {
    id: d.id,
    name: d.name,
    type: d.type,
    status: d.status,
    producedOn: d.producedOn ?? todayIso,
    link: d.link ?? "",
    evidence: d.evidence ?? "",
    taskId: d.taskId === null ? NONE : String(d.taskId),
    discipline: d.discipline ?? "all",
  }
}

export function DeliverableDialog({
  draft,
  tasks,
  saving,
  onOpenChange,
  onSubmit,
}: {
  draft: DeliverableDraft
  tasks: TaskOption[]
  saving: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (draft: DeliverableDraft) => Promise<void>
}) {
  const [form, setForm] = useState<DeliverableDraft>(draft)
  const [errors, setErrors] = useState<DeliverableErrors>({})

  const set = (patch: Partial<DeliverableDraft>) => setForm((prev) => ({ ...prev, ...patch }))

  // pickDeliverableUpdates refuses a jump the lifecycle forbids, so an edit dialog offering all
  // four states is a control that fails on save. A new record may start anywhere: readDeliverable
  // Create takes any valid status, because plenty of work is logged after it was already accepted.
  const statusOptions = DELIVERABLE_STATUSES.filter(
    (option) => form.id === null || option === draft.status || canMoveDeliverable(draft.status, option),
  )

  const validate = () => {
    const next: DeliverableErrors = {}
    if (form.name.trim().length < 2) next.name = "Name the thing that was handed over."
    if (form.producedOn && !isIsoDate(form.producedOn)) next.producedOn = "Use the date picker."
    const link = form.link.trim()
    if (link && !/^https?:\/\//iu.test(link) && !link.startsWith("/")) {
      next.link = "link must be an http(s) address or a path"
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="pr-8 text-base">
            {form.id === null ? "New deliverable" : "Edit deliverable"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            A deliverable is the item itself — the rule set, the report, the working switch. The log
            rows that describe getting it here stay in the log either way.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault()
            if (validate()) void onSubmit(form)
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="deliverable-name">Name</Label>
            <Input
              id="deliverable-name"
              value={form.name}
              aria-invalid={errors.name ? true : undefined}
              aria-describedby={errors.name ? "deliverable-name-error" : undefined}
              onChange={(event) => set({ name: event.target.value })}
              placeholder="Firewall rule set v3"
            />
            {errors.name ? (
              <p id="deliverable-name-error" className="text-[11px] text-destructive">
                {errors.name}
              </p>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="deliverable-type">Type</Label>
              <Select value={form.type} onValueChange={(value) => set({ type: value as DeliverableType })}>
                <SelectTrigger id="deliverable-type" className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DELIVERABLE_TYPES.map((option) => (
                    <SelectItem key={option} value={option}>
                      {DELIVERABLE_LABEL[option]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="deliverable-status">State</Label>
              <Select
                value={form.status}
                onValueChange={(value) => set({ status: value as DeliverableStatus })}
              >
                <SelectTrigger id="deliverable-status" className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {DELIVERABLE_LABEL_STATUS[option]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="deliverable-produced">Produced on</Label>
              <Input
                id="deliverable-produced"
                type="date"
                value={form.producedOn}
                aria-invalid={errors.producedOn ? true : undefined}
                aria-describedby={errors.producedOn ? "deliverable-produced-error" : undefined}
                onChange={(event) => set({ producedOn: event.target.value })}
              />
              {errors.producedOn ? (
                <p id="deliverable-produced-error" className="text-[11px] text-destructive">
                  {errors.producedOn}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="deliverable-task">Task</Label>
              <Select value={form.taskId} onValueChange={(value) => set({ taskId: value })}>
                <SelectTrigger id="deliverable-task" className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>No task</SelectItem>
                  {tasks.map((task) => (
                    <SelectItem key={task.id} value={String(task.id)}>
                      {task.title.slice(0, 44)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="deliverable-link">Link</Label>
            <Input
              id="deliverable-link"
              value={form.link}
              aria-invalid={errors.link ? true : undefined}
              aria-describedby={errors.link ? "deliverable-link-error" : undefined}
              onChange={(event) => set({ link: event.target.value })}
              placeholder="https://… or /dashboard/tasks"
            />
            {errors.link ? (
              <p id="deliverable-link-error" className="text-[11px] text-destructive">
                {errors.link}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="deliverable-evidence">Evidence note</Label>
            <Textarea
              id="deliverable-evidence"
              rows={2}
              value={form.evidence}
              onChange={(event) => set({ evidence: event.target.value })}
              placeholder="Where a reviewer would find it, and what proves it is the current version."
            />
          </div>

          <div className="space-y-1.5">
            <DisciplinePicker compact value={form.discipline} onChange={(discipline) => set({ discipline })} />
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? "Saving…" : form.id === null ? "Create deliverable" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function ConfirmDeliverableDelete({
  id,
  name,
  busy,
  onOpenChange,
  onConfirm,
}: {
  id: number | null
  name: string | null
  busy: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (id: number) => void
}) {
  return (
    <AlertDialog open={id !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-base">
            {name ? `Delete "${name}"?` : "Delete this deliverable?"}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs">
            The record of a handed-over item is removed. The log entries that describe the work stay
            in your log — they are yours either way.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel disabled={busy}>Keep it</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={busy || id === null}
            onClick={(event) => {
              event.preventDefault()
              if (id !== null) onConfirm(id)
            }}
          >
            {busy ? "Deleting…" : "Delete deliverable"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
