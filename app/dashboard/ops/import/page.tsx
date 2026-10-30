"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SectionCard, EmptyNote } from "@/components/dashboard-kit"
import {
  Upload,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Database,
  Package,
  BookOpen,
  ListTodo,
  RotateCcw,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  ShieldAlert,
} from "lucide-react"
import Link from "next/link"
import type {
  ExtractionResult,
  ExtractionSummary,
  ExtractedLogEntry,
  ExtractedRegisterItem,
  ExtractedPlaybook,
  ExtractedTask,
} from "@/lib/ops/import/extract"
import type { FieldDefinition, LogEntity, OpsConfig } from "@/lib/packs/ops/types"
import {
  declaredFieldNames,
  droppedExtractedKeys,
  fieldValueToString,
  setLogField,
  validateLogEntry,
  readRegisterFieldsFor,
  setRegisterField,
  renameRegisterField,
  addRegisterField,
  setStep,
  addStepAfter,
  removeStep,
  moveStep,
  IMPORT_TASK_STATUSES,
  IMPORT_TASK_PRIORITIES,
} from "@/lib/ops/import/preview"

type Phase = "upload" | "extracting" | "preview" | "committing" | "done"

type CommitTotals = {
  logEntries: number
  registerItems: number
  playbooks: number
  tasks: number
  total: number
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

const NONE = "__none__"

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const base64 = result.split(",")[1] ?? ""
      resolve(base64)
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export default function ImportPage() {
  const [phase, setPhase] = useState<Phase>("upload")
  const [fileName, setFileName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [extraction, setExtraction] = useState<ExtractionResult | null>(null)
  const [summary, setSummary] = useState<ExtractionSummary | null>(null)
  const [packKey, setPackKey] = useState<string | null>(null)
  const [discipline, setDiscipline] = useState<string | null>(null)
  const [packLogs, setPackLogs] = useState<Record<string, LogEntity> | null>(null)

  const [selectedLogEntries, setSelectedLogEntries] = useState<Set<number>>(new Set())
  const [selectedRegisterItems, setSelectedRegisterItems] = useState<Set<number>>(new Set())
  const [selectedPlaybooks, setSelectedPlaybooks] = useState<Set<number>>(new Set())
  const [selectedTasks, setSelectedTasks] = useState<Set<number>>(new Set())

  const [commitResult, setCommitResult] = useState<CommitTotals | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(async (file: File) => {
    setError(null)
    setFileName(file.name)
    setPhase("extracting")

    try {
      const base64 = await fileToBase64(file)

      const res = await fetch("/api/ops/import/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          mimeType: file.type,
          base64,
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.message ?? "Extraction failed.")
        setPhase("upload")
        return
      }

      const data = json.data as {
        extraction: ExtractionResult
        summary: ExtractionSummary
        packKey: string
        discipline: string
      }

      setExtraction(data.extraction)
      setSummary(data.summary)
      setPackKey(data.packKey)
      setDiscipline(data.discipline)

      const allLogEntries = new Set(data.extraction.logEntries.map((_, i) => i))
      const allRegisterItems = new Set(data.extraction.registerItems.map((_, i) => i))
      const allPlaybooks = new Set(data.extraction.playbooks.map((_, i) => i))
      const allTasks = new Set(data.extraction.tasks.map((_, i) => i))

      setSelectedLogEntries(allLogEntries)
      setSelectedRegisterItems(allRegisterItems)
      setSelectedPlaybooks(allPlaybooks)
      setSelectedTasks(allTasks)

      setPhase("preview")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.")
      setPhase("upload")
    }
  }, [])

  // The pack's field schema drives the log editors and the "will this import" checks.
  useEffect(() => {
    if (phase !== "preview" || !extraction || extraction.logEntries.length === 0) return
    let active = true
    fetch("/api/ops/pack")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (active && json?.data?.logs) setPackLogs(json.data.logs as Record<string, LogEntity>)
      })
      .catch(() => {
        /* editors fall back to key/value inputs until the schema arrives */
      })
    return () => {
      active = false
    }
  }, [phase, extraction])

  const updateLog = useCallback((index: number, patch: Partial<ExtractedLogEntry>) => {
    setExtraction((prev) =>
      prev
        ? { ...prev, logEntries: prev.logEntries.map((e, i) => (i === index ? { ...e, ...patch } : e)) }
        : prev,
    )
  }, [])

  const updateRegister = useCallback((index: number, patch: Partial<ExtractedRegisterItem>) => {
    setExtraction((prev) =>
      prev
        ? {
            ...prev,
            registerItems: prev.registerItems.map((it, i) => (i === index ? { ...it, ...patch } : it)),
          }
        : prev,
    )
  }, [])

  const updatePlaybook = useCallback((index: number, patch: Partial<ExtractedPlaybook>) => {
    setExtraction((prev) =>
      prev
        ? { ...prev, playbooks: prev.playbooks.map((p, i) => (i === index ? { ...p, ...patch } : p)) }
        : prev,
    )
  }, [])

  const updateTask = useCallback((index: number, patch: Partial<ExtractedTask>) => {
    setExtraction((prev) =>
      prev
        ? { ...prev, tasks: prev.tasks.map((t, i) => (i === index ? { ...t, ...patch } : t)) }
        : prev,
    )
  }, [])

  const handleCommit = useCallback(async () => {
    if (!extraction) return
    setPhase("committing")
    setError(null)

    try {
      const res = await fetch("/api/ops/import/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          extraction,
          selections: {
            logEntries: Array.from(selectedLogEntries),
            registerItems: Array.from(selectedRegisterItems),
            playbooks: Array.from(selectedPlaybooks),
            tasks: Array.from(selectedTasks),
          },
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.message ?? "Commit failed.")
        setPhase("preview")
        return
      }

      setCommitResult(json.data.totals as CommitTotals)
      setPhase("done")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Commit failed.")
      setPhase("preview")
    }
  }, [extraction, selectedLogEntries, selectedRegisterItems, selectedPlaybooks, selectedTasks])

  const handleReset = useCallback(() => {
    setPhase("upload")
    setFileName(null)
    setError(null)
    setExtraction(null)
    setSummary(null)
    setPackKey(null)
    setDiscipline(null)
    setPackLogs(null)
    setSelectedLogEntries(new Set())
    setSelectedRegisterItems(new Set())
    setSelectedPlaybooks(new Set())
    setSelectedTasks(new Set())
    setCommitResult(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }, [])

  const totalSelected =
    selectedLogEntries.size +
    selectedRegisterItems.size +
    selectedPlaybooks.size +
    selectedTasks.size

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Import from document</h1>
          <p className="text-sm text-muted-foreground">
            Upload a PDF, spreadsheet or text file and AI will extract structured data into your operations.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/ops">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to overview
          </Link>
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        The pasted text or PDF is sent to Google for processing and is not stored. Credential values
        are refused; record where each one is kept instead. AI output is a draft &mdash; review and edit
        each row before importing.
      </p>

      {error && (
        <Card className="border-destructive/50">
          <CardContent className="flex items-center gap-3 pt-4">
            <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="ghost" size="sm" className="ml-auto" onClick={handleReset}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Start over
            </Button>
          </CardContent>
        </Card>
      )}

      {phase === "upload" && <UploadPhase fileInputRef={fileInputRef} onFile={handleFile} />}
      {phase === "extracting" && <ExtractingPhase fileName={fileName} />}
      {phase === "preview" && extraction && summary && (
        <PreviewPhase
          extraction={extraction}
          summary={summary}
          packKey={packKey}
          discipline={discipline}
          packLogs={packLogs}
          selectedLogEntries={selectedLogEntries}
          setSelectedLogEntries={setSelectedLogEntries}
          selectedRegisterItems={selectedRegisterItems}
          setSelectedRegisterItems={setSelectedRegisterItems}
          selectedPlaybooks={selectedPlaybooks}
          setSelectedPlaybooks={setSelectedPlaybooks}
          selectedTasks={selectedTasks}
          setSelectedTasks={setSelectedTasks}
          updateLog={updateLog}
          updateRegister={updateRegister}
          updatePlaybook={updatePlaybook}
          updateTask={updateTask}
          totalSelected={totalSelected}
          onCommit={handleCommit}
          onReset={handleReset}
        />
      )}
      {phase === "committing" && <CommittingPhase />}
      {phase === "done" && commitResult && (
        <DonePhase totals={commitResult} onReset={handleReset} />
      )}
    </div>
  )
}

function UploadPhase({
  fileInputRef,
  onFile,
}: {
  fileInputRef: React.RefObject<HTMLInputElement | null>
  onFile: (file: File) => void
}) {
  const [dragOver, setDragOver] = useState(false)

  return (
    <SectionCard title="Upload a document" icon={<Upload className="h-4 w-4" />}>
      <div
        className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors ${
          dragOver
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50"
        }`}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          const file = e.dataTransfer.files[0]
          if (file) onFile(file)
        }}
      >
        <Upload className="mb-4 h-10 w-10 text-muted-foreground" />
        <p className="mb-2 text-sm font-medium">
          Drag and drop a file here, or click to browse
        </p>
        <p className="mb-4 text-xs text-muted-foreground">
          PDF, text, CSV, XLSX, JPEG, PNG or WebP. Max 10 MB.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT_STRING}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) onFile(file)
          }}
        />
        <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
          Choose file
        </Button>
      </div>
    </SectionCard>
  )
}

function ExtractingPhase({ fileName }: { fileName: string | null }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16">
        <Loader2 className="mb-4 h-10 w-10 animate-spin text-primary" />
        <p className="text-sm font-medium">Analysing document...</p>
        {fileName && <p className="mt-1 text-xs text-muted-foreground">{fileName}</p>}
        <p className="mt-4 max-w-md text-center text-xs text-muted-foreground">
          AI is reading the document and extracting structured data. This may take up to 30 seconds for
          large files.
        </p>
      </CardContent>
    </Card>
  )
}

function PreviewPhase({
  extraction,
  summary,
  packKey,
  discipline,
  packLogs,
  selectedLogEntries,
  setSelectedLogEntries,
  selectedRegisterItems,
  setSelectedRegisterItems,
  selectedPlaybooks,
  setSelectedPlaybooks,
  selectedTasks,
  setSelectedTasks,
  updateLog,
  updateRegister,
  updatePlaybook,
  updateTask,
  totalSelected,
  onCommit,
  onReset,
}: {
  extraction: ExtractionResult
  summary: ExtractionSummary
  packKey: string | null
  discipline: string | null
  packLogs: Record<string, LogEntity> | null
  selectedLogEntries: Set<number>
  setSelectedLogEntries: (s: Set<number>) => void
  selectedRegisterItems: Set<number>
  setSelectedRegisterItems: (s: Set<number>) => void
  selectedPlaybooks: Set<number>
  setSelectedPlaybooks: (s: Set<number>) => void
  selectedTasks: Set<number>
  setSelectedTasks: (s: Set<number>) => void
  updateLog: (i: number, patch: Partial<ExtractedLogEntry>) => void
  updateRegister: (i: number, patch: Partial<ExtractedRegisterItem>) => void
  updatePlaybook: (i: number, patch: Partial<ExtractedPlaybook>) => void
  updateTask: (i: number, patch: Partial<ExtractedTask>) => void
  totalSelected: number
  onCommit: () => void
  onReset: () => void
}) {
  const validationConfig = useMemo<OpsConfig | null>(
    () => (packLogs ? { logs: packLogs, kpis: [] } : null),
    [packLogs],
  )

  const totalRecords =
    extraction.logEntries.length +
    extraction.registerItems.length +
    extraction.playbooks.length +
    extraction.tasks.length

  const defaultTab =
    extraction.logEntries.length > 0
      ? "logEntries"
      : extraction.registerItems.length > 0
        ? "registerItems"
        : extraction.playbooks.length > 0
          ? "playbooks"
          : "tasks"

  // Selected rows that the server will refuse — surfaced here so the preview matches the commit.
  const blocked = useMemo(() => {
    const notes: string[] = []
    if (validationConfig) {
      for (const i of selectedLogEntries) {
        const entry = extraction.logEntries[i]
        if (!entry) continue
        const v = validateLogEntry(validationConfig, entry.entityKey, entry.fields)
        if (!v.ok) notes.push(`Log entry (${entry.entityKey}): ${v.error}`)
      }
    }
    for (const i of selectedRegisterItems) {
      const item = extraction.registerItems[i]
      if (!item) continue
      const r = readRegisterFieldsFor(item.fields)
      if (!r.ok) notes.push(`Register item (${item.title}): ${r.error}`)
    }
    return notes
  }, [extraction, selectedLogEntries, selectedRegisterItems, validationConfig])

  const logEntityKeys = Object.keys(summary.logEntries)

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Extraction summary</CardTitle>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {discipline && <Badge variant="outline">{discipline}</Badge>}
              {packKey && <Badge variant="secondary">{packKey}</Badge>}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-4">
            <SummaryCard
              icon={<Database className="h-4 w-4" />}
              label="Log entries"
              count={extraction.logEntries.length}
              selected={selectedLogEntries.size}
            />
            <SummaryCard
              icon={<Package className="h-4 w-4" />}
              label="Register items"
              count={extraction.registerItems.length}
              selected={selectedRegisterItems.size}
            />
            <SummaryCard
              icon={<BookOpen className="h-4 w-4" />}
              label="Playbooks"
              count={extraction.playbooks.length}
              selected={selectedPlaybooks.size}
            />
            <SummaryCard
              icon={<ListTodo className="h-4 w-4" />}
              label="Tasks"
              count={extraction.tasks.length}
              selected={selectedTasks.size}
            />
          </div>
          {logEntityKeys.length > 0 && (
            <p className="mt-3 text-xs text-muted-foreground">
              Counts by entity:{" "}
              {logEntityKeys.map((key) => `${key.replace(/_/g, " ")} (${summary.logEntries[key]})`).join(", ")}
            </p>
          )}
        </CardContent>
      </Card>

      {totalRecords === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <EmptyNote>
              No data was found in this document. Try a different file or check that it contains operational records.
            </EmptyNote>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Review &amp; edit extracted data</CardTitle>
              <span className="text-xs text-muted-foreground">
                {totalSelected} of {totalRecords} selected &middot; edits are what gets imported
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={defaultTab}>
              <TabsList className="flex-wrap">
                {extraction.logEntries.length > 0 && (
                  <TabsTrigger value="logEntries">
                    <Database className="mr-1.5 h-3.5 w-3.5" />
                    Log entries ({extraction.logEntries.length})
                  </TabsTrigger>
                )}
                {extraction.registerItems.length > 0 && (
                  <TabsTrigger value="registerItems">
                    <Package className="mr-1.5 h-3.5 w-3.5" />
                    Register ({extraction.registerItems.length})
                  </TabsTrigger>
                )}
                {extraction.playbooks.length > 0 && (
                  <TabsTrigger value="playbooks">
                    <BookOpen className="mr-1.5 h-3.5 w-3.5" />
                    Playbooks ({extraction.playbooks.length})
                  </TabsTrigger>
                )}
                {extraction.tasks.length > 0 && (
                  <TabsTrigger value="tasks">
                    <ListTodo className="mr-1.5 h-3.5 w-3.5" />
                    Tasks ({extraction.tasks.length})
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="logEntries" className="mt-4 space-y-3">
                {validationConfig ? (
                  <LogEntriesEditor
                    entries={extraction.logEntries}
                    config={validationConfig}
                    selected={selectedLogEntries}
                    setSelected={setSelectedLogEntries}
                    update={updateLog}
                  />
                ) : (
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-24 w-full" />
                    <p className="text-xs text-muted-foreground">Loading your field schema...</p>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="registerItems" className="mt-4 space-y-3">
                <RegisterItemsEditor
                  items={extraction.registerItems}
                  selected={selectedRegisterItems}
                  setSelected={setSelectedRegisterItems}
                  update={updateRegister}
                />
              </TabsContent>
              <TabsContent value="playbooks" className="mt-4 space-y-3">
                <PlaybooksEditor
                  items={extraction.playbooks}
                  selected={selectedPlaybooks}
                  setSelected={setSelectedPlaybooks}
                  update={updatePlaybook}
                />
              </TabsContent>
              <TabsContent value="tasks" className="mt-4 space-y-3">
                <TasksEditor
                  items={extraction.tasks}
                  selected={selectedTasks}
                  setSelected={setSelectedTasks}
                  update={updateTask}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {blocked.length > 0 && (
        <Card className="border-destructive/40">
          <CardContent className="space-y-2 pt-4">
            <div className="flex items-center gap-2 text-sm font-medium text-destructive">
              <ShieldAlert className="h-4 w-4" />
              {blocked.length} selected row{blocked.length === 1 ? "" : "s"} won&apos;t import as-is
            </div>
            <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
              {blocked.map((note, i) => (
                <li key={i}>{note}</li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">
              Fix the values above or uncheck the row. These are skipped on import.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onReset}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Discard and start over
        </Button>
        <Button onClick={onCommit} disabled={totalSelected === 0}>
          Import {totalSelected} item{totalSelected === 1 ? "" : "s"}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </>
  )
}

function SummaryCard({
  icon,
  label,
  count,
  selected,
}: {
  icon: React.ReactNode
  label: string
  count: number
  selected: number
}) {
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-xl font-semibold tabular-nums">{count}</span>
        {selected !== count && (
          <span className="text-xs text-muted-foreground">({selected} selected)</span>
        )}
      </div>
    </div>
  )
}

function SelectionHeader({
  label,
  detail,
  selected,
  onToggleAll,
  blocked,
}: {
  label: string
  detail?: string
  selected: boolean
  onToggleAll: () => void
  blocked?: string | null
}) {
  return (
    <div className="flex items-center gap-2">
      <Checkbox checked={selected} onCheckedChange={onToggleAll} aria-label={`Include ${label}`} />
      <span className="font-medium">{label}</span>
      {detail && <span className="text-xs text-muted-foreground">&middot; {detail}</span>}
      {blocked && (
        <Badge variant="outline" className="ml-auto border-destructive/40 text-destructive">
          {blocked}
        </Badge>
      )}
    </div>
  )
}

function RowCard({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border p-4 space-y-3">{children}</div>
}

function FieldWidget({
  name,
  def,
  value,
  idPrefix,
  onChange,
}: {
  name: string
  def: FieldDefinition
  value: string
  idPrefix: string
  onChange: (raw: string) => void
}) {
  const id = `${idPrefix}-field-${name}`
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs">
        {def.label}
        {def.required ? <span className="text-destructive"> *</span> : null}
      </Label>
      {def.type === "text" ? (
        <Textarea id={id} rows={2} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : def.type === "enum" ? (
        <Select value={value || NONE} onValueChange={(next) => onChange(next === NONE ? "" : next)}>
          <SelectTrigger id={id}>
            <SelectValue placeholder="Choose" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>— none —</SelectItem>
            {(def.values ?? []).map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : def.type === "number" ? (
        <Input id={id} type="number" step="any" value={value} onChange={(e) => onChange(e.target.value)} />
      ) : def.type === "date" ? (
        <Input id={id} type="date" value={value} onChange={(e) => onChange(e.target.value)} />
      ) : def.type === "datetime" ? (
        <Input id={id} type="datetime-local" value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <Input id={id} value={value} maxLength={200} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  )
}

function LogEntriesEditor({
  entries,
  config,
  selected,
  setSelected,
  update,
}: {
  entries: ExtractedLogEntry[]
  config: OpsConfig
  selected: Set<number>
  setSelected: (s: Set<number>) => void
  update: (i: number, patch: Partial<ExtractedLogEntry>) => void
}) {
  const toggle = (index: number) => {
    const next = new Set(selected)
    if (next.has(index)) next.delete(index)
    else next.add(index)
    setSelected(next)
  }
  const toggleAll = () =>
    setSelected(selected.size === entries.length ? new Set() : new Set(entries.map((_, i) => i)))

  if (entries.length === 0) return <EmptyNote>No log entries were found in this document.</EmptyNote>

  return (
    <>
      <div className="flex items-center justify-between px-1">
        <span className="text-xs text-muted-foreground">{entries.length} entries</span>
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={toggleAll}>
          {selected.size === entries.length ? "Uncheck all" : "Check all"}
        </Button>
      </div>
      {entries.map((entry, i) => {
        const def = config.logs[entry.entityKey]
        const declared = def ? declaredFieldNames(config, entry.entityKey) : []
        const dropped = def ? droppedExtractedKeys(config, entry.entityKey, entry.fields) : []
        const validation = def
          ? validateLogEntry(config, entry.entityKey, entry.fields)
          : { ok: false, error: "This entity isn't part of your pack." }
        const label = def?.label ?? entry.entityKey.replace(/_/g, " ")

        return (
          <RowCard key={i}>
            <SelectionHeader
              label={label}
              detail={`${declared.length} field${declared.length === 1 ? "" : "s"}`}
              selected={selected.has(i)}
              onToggleAll={() => toggle(i)}
              blocked={validation.ok ? null : "Won't import"}
            />

            {!def && (
              <p className="text-xs text-destructive">
                This entity isn&apos;t part of your pack, so it will be skipped on import.
              </p>
            )}

            {declared.length > 0 && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor={`imp-when-${i}`} className="text-xs">
                    When
                  </Label>
                  <Input
                    id={`imp-when-${i}`}
                    type="date"
                    value={entry.occurredAt ?? ""}
                    onChange={(e) => update(i, { occurredAt: e.target.value || null })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`imp-status-${i}`} className="text-xs">
                    State (optional)
                  </Label>
                  <Input
                    id={`imp-status-${i}`}
                    value={entry.status ?? ""}
                    placeholder="e.g. Resolved"
                    onChange={(e) => update(i, { status: e.target.value.trim() || null })}
                  />
                </div>
                {Object.entries(config.logs[entry.entityKey]?.fields ?? {}).map(([name, fdef]) => (
                  <FieldWidget
                    key={name}
                    name={name}
                    def={fdef}
                    idPrefix={`log-${i}`}
                    value={fieldValueToString(entry.fields[name])}
                    onChange={(raw) =>
                      update(i, { fields: setLogField(entry.fields, name, raw, fdef) })
                    }
                  />
                ))}
              </div>
            )}

            {dropped.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Dropped {dropped.length} field{dropped.length === 1 ? "" : "s"} not in your pack:{" "}
                {dropped.join(", ")}.
              </p>
            )}

            {!validation.ok && validation.error && (
              <p className="text-xs text-destructive">{validation.error}</p>
            )}
          </RowCard>
        )
      })}
    </>
  )
}

function RegisterItemsEditor({
  items,
  selected,
  setSelected,
  update,
}: {
  items: ExtractedRegisterItem[]
  selected: Set<number>
  setSelected: (s: Set<number>) => void
  update: (i: number, patch: Partial<ExtractedRegisterItem>) => void
}) {
  const toggle = (index: number) => {
    const next = new Set(selected)
    if (next.has(index)) next.delete(index)
    else next.add(index)
    setSelected(next)
  }
  const toggleAll = () =>
    setSelected(selected.size === items.length ? new Set() : new Set(items.map((_, i) => i)))

  if (items.length === 0) return <EmptyNote>No register items were found in this document.</EmptyNote>

  return (
    <>
      <div className="flex items-center justify-between px-1">
        <span className="text-xs text-muted-foreground">{items.length} items</span>
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={toggleAll}>
          {selected.size === items.length ? "Uncheck all" : "Check all"}
        </Button>
      </div>
      {items.map((item, i) => (
        <RegisterCard
          key={i}
          index={i}
          item={item}
          included={selected.has(i)}
          onToggle={() => toggle(i)}
          update={update}
        />
      ))}
    </>
  )
}

function RegisterCard({
  index,
  item,
  included,
  onToggle,
  update,
}: {
  index: number
  item: ExtractedRegisterItem
  included: boolean
  onToggle: () => void
  update: (i: number, patch: Partial<ExtractedRegisterItem>) => void
}) {
  const [newName, setNewName] = useState("")
  const read = readRegisterFieldsFor(item.fields)
  const entries = Object.entries(item.fields)

  return (
    <RowCard>
      <SelectionHeader
        label={item.title || "Untitled item"}
        detail={item.kind}
        selected={included}
        onToggleAll={onToggle}
        blocked={read.ok ? null : "Won't import"}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor={`reg-kind-${index}`} className="text-xs">
            Kind
          </Label>
          <Input
            id={`reg-kind-${index}`}
            value={item.kind}
            onChange={(e) => update(index, { kind: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`reg-title-${index}`} className="text-xs">
            Title
          </Label>
          <Input
            id={`reg-title-${index}`}
            value={item.title}
            onChange={(e) => update(index, { title: e.target.value })}
          />
        </div>
      </div>

      {entries.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Fields</Label>
          {entries.map(([name, value]) => (
            <div key={name} className="flex items-start gap-2">
              <Input
                className="max-w-[12rem]"
                value={name}
                onChange={(e) => update(index, { fields: renameRegisterField(item.fields, name, e.target.value) })}
              />
              <Input
                className="flex-1"
                value={fieldValueToString(value)}
                onChange={(e) => update(index, { fields: setRegisterField(item.fields, name, e.target.value) })}
              />
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 shrink-0 text-muted-foreground"
                onClick={() => update(index, { fields: setRegisterField(item.fields, name, "") })}
                aria-label={`Remove ${name}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <Input
          placeholder="new field name"
          className="max-w-[12rem]"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <Button
          variant="outline"
          size="sm"
          disabled={!newName.trim()}
          onClick={() => {
            update(index, { fields: addRegisterField(item.fields, newName) })
            setNewName("")
          }}
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          Add field
        </Button>
      </div>

      {!read.ok && (
        <p className="text-xs text-destructive">{read.error}</p>
      )}
    </RowCard>
  )
}

function PlaybooksEditor({
  items,
  selected,
  setSelected,
  update,
}: {
  items: ExtractedPlaybook[]
  selected: Set<number>
  setSelected: (s: Set<number>) => void
  update: (i: number, patch: Partial<ExtractedPlaybook>) => void
}) {
  const toggle = (index: number) => {
    const next = new Set(selected)
    if (next.has(index)) next.delete(index)
    else next.add(index)
    setSelected(next)
  }
  const toggleAll = () =>
    setSelected(selected.size === items.length ? new Set() : new Set(items.map((_, i) => i)))

  if (items.length === 0) return <EmptyNote>No playbooks were found in this document.</EmptyNote>

  return (
    <>
      <div className="flex items-center justify-between px-1">
        <span className="text-xs text-muted-foreground">{items.length} playbooks</span>
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={toggleAll}>
          {selected.size === items.length ? "Uncheck all" : "Check all"}
        </Button>
      </div>
      {items.map((pb, i) => (
        <RowCard key={i}>
          <SelectionHeader
            label={pb.title || "Untitled procedure"}
            detail={`${pb.steps.length} step${pb.steps.length === 1 ? "" : "s"}`}
            selected={selected.has(i)}
            onToggleAll={() => toggle(i)}
          />
          <Input
            value={pb.title}
            onChange={(e) => update(i, { title: e.target.value })}
            placeholder="Title"
          />
          <Textarea
            rows={2}
            value={pb.summary}
            onChange={(e) => update(i, { summary: e.target.value })}
            placeholder="Summary"
          />

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Steps</Label>
            {pb.steps.length === 0 && (
              <p className="text-xs text-muted-foreground">No steps yet — add one below.</p>
            )}
            {pb.steps.map((step, sIdx) => (
              <div key={sIdx} className="flex items-start gap-2">
                <span className="mt-2 text-xs text-muted-foreground tabular-nums">{sIdx + 1}.</span>
                <Input
                  className="flex-1"
                  value={step}
                  onChange={(e) => update(i, { steps: setStep(pb.steps, sIdx, e.target.value) })}
                />
                <div className="flex shrink-0 items-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9"
                    disabled={sIdx === 0}
                    onClick={() => update(i, { steps: moveStep(pb.steps, sIdx, -1) })}
                    aria-label="Move step up"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9"
                    disabled={sIdx === pb.steps.length - 1}
                    onClick={() => update(i, { steps: moveStep(pb.steps, sIdx, 1) })}
                    aria-label="Move step down"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 text-muted-foreground"
                    onClick={() => update(i, { steps: removeStep(pb.steps, sIdx) })}
                    aria-label="Remove step"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => update(i, { steps: addStepAfter(pb.steps, pb.steps.length - 1) })}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add step
            </Button>
          </div>
        </RowCard>
      ))}
    </>
  )
}

function TasksEditor({
  items,
  selected,
  setSelected,
  update,
}: {
  items: ExtractedTask[]
  selected: Set<number>
  setSelected: (s: Set<number>) => void
  update: (i: number, patch: Partial<ExtractedTask>) => void
}) {
  const toggle = (index: number) => {
    const next = new Set(selected)
    if (next.has(index)) next.delete(index)
    else next.add(index)
    setSelected(next)
  }
  const toggleAll = () =>
    setSelected(selected.size === items.length ? new Set() : new Set(items.map((_, i) => i)))

  if (items.length === 0) return <EmptyNote>No tasks were found in this document.</EmptyNote>

  return (
    <>
      <div className="flex items-center justify-between px-1">
        <span className="text-xs text-muted-foreground">{items.length} tasks</span>
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={toggleAll}>
          {selected.size === items.length ? "Uncheck all" : "Check all"}
        </Button>
      </div>
      {items.map((task, i) => (
        <RowCard key={i}>
          <SelectionHeader
            label={task.title || "Untitled task"}
            selected={selected.has(i)}
            onToggleAll={() => toggle(i)}
          />
          <Input
            value={task.title}
            onChange={(e) => update(i, { title: e.target.value })}
            placeholder="Title"
          />
          <Textarea
            rows={2}
            value={task.description}
            onChange={(e) => update(i, { description: e.target.value })}
            placeholder="Description"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor={`task-status-${i}`} className="text-xs">
                Status
              </Label>
              <Select value={task.status} onValueChange={(next) => update(i, { status: next as ExtractedTask["status"] })}>
                <SelectTrigger id={`task-status-${i}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {IMPORT_TASK_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor={`task-priority-${i}`} className="text-xs">
                Priority
              </Label>
              <Select
                value={task.priority}
                onValueChange={(next) => update(i, { priority: next as ExtractedTask["priority"] })}
              >
                <SelectTrigger id={`task-priority-${i}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {IMPORT_TASK_PRIORITIES.map((priority) => (
                    <SelectItem key={priority} value={priority}>
                      {priority}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </RowCard>
      ))}
    </>
  )
}

function CommittingPhase() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16">
        <Loader2 className="mb-4 h-10 w-10 animate-spin text-primary" />
        <p className="text-sm font-medium">Writing to database...</p>
        <p className="mt-2 text-xs text-muted-foreground">
          Each record is validated before insertion. This usually takes a few seconds.
        </p>
      </CardContent>
    </Card>
  )
}

function DonePhase({ totals, onReset }: { totals: CommitTotals; onReset: () => void }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16">
        <CheckCircle2 className="mb-4 h-12 w-12 text-green-600" />
        <p className="text-lg font-semibold">Import complete</p>
        <p className="mt-2 text-sm text-muted-foreground">
          {totals.total} item{totals.total === 1 ? "" : "s"} imported successfully.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-4">
          {totals.logEntries > 0 && (
            <div className="rounded-lg border p-3 text-center">
              <Database className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
              <p className="text-lg font-semibold">{totals.logEntries}</p>
              <p className="text-xs text-muted-foreground">Log entries</p>
            </div>
          )}
          {totals.registerItems > 0 && (
            <div className="rounded-lg border p-3 text-center">
              <Package className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
              <p className="text-lg font-semibold">{totals.registerItems}</p>
              <p className="text-xs text-muted-foreground">Register items</p>
            </div>
          )}
          {totals.playbooks > 0 && (
            <div className="rounded-lg border p-3 text-center">
              <BookOpen className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
              <p className="text-lg font-semibold">{totals.playbooks}</p>
              <p className="text-xs text-muted-foreground">Playbooks</p>
            </div>
          )}
          {totals.tasks > 0 && (
            <div className="rounded-lg border p-3 text-center">
              <ListTodo className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
              <p className="text-lg font-semibold">{totals.tasks}</p>
              <p className="text-xs text-muted-foreground">Tasks</p>
            </div>
          )}
        </div>
        <div className="mt-8 flex gap-3">
          <Button variant="outline" onClick={onReset}>
            Import another document
          </Button>
          <Button asChild>
            <Link href="/dashboard/ops">
              View operations overview
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
