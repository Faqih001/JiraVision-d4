"use client"

import { useCallback, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { SectionCard, EmptyNote } from "@/components/dashboard-kit"
import {
  Upload,
  FileText,
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
} from "lucide-react"
import Link from "next/link"
import type {
  ExtractionResult,
  ExtractionSummary,
} from "@/lib/ops/import/extract"

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
          selectedLogEntries={selectedLogEntries}
          setSelectedLogEntries={setSelectedLogEntries}
          selectedRegisterItems={selectedRegisterItems}
          setSelectedRegisterItems={setSelectedRegisterItems}
          selectedPlaybooks={selectedPlaybooks}
          setSelectedPlaybooks={setSelectedPlaybooks}
          selectedTasks={selectedTasks}
          setSelectedTasks={setSelectedTasks}
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
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
        >
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
        {fileName && (
          <p className="mt-1 text-xs text-muted-foreground">{fileName}</p>
        )}
        <p className="mt-4 max-w-md text-center text-xs text-muted-foreground">
          AI is reading the document and extracting structured data. This may take up to 30 seconds for large files.
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
  selectedLogEntries,
  setSelectedLogEntries,
  selectedRegisterItems,
  setSelectedRegisterItems,
  selectedPlaybooks,
  setSelectedPlaybooks,
  selectedTasks,
  setSelectedTasks,
  totalSelected,
  onCommit,
  onReset,
}: {
  extraction: ExtractionResult
  summary: ExtractionSummary
  packKey: string | null
  discipline: string | null
  selectedLogEntries: Set<number>
  setSelectedLogEntries: (s: Set<number>) => void
  selectedRegisterItems: Set<number>
  setSelectedRegisterItems: (s: Set<number>) => void
  selectedPlaybooks: Set<number>
  setSelectedPlaybooks: (s: Set<number>) => void
  selectedTasks: Set<number>
  setSelectedTasks: (s: Set<number>) => void
  totalSelected: number
  onCommit: () => void
  onReset: () => void
}) {
  const logEntityKeys = Object.keys(summary.logEntries)
  const defaultTab =
    extraction.logEntries.length > 0
      ? "logEntries"
      : extraction.registerItems.length > 0
        ? "registerItems"
        : extraction.playbooks.length > 0
          ? "playbooks"
          : "tasks"

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
        </CardContent>
      </Card>

      {extraction.logEntries.length + extraction.registerItems.length + extraction.playbooks.length + extraction.tasks.length === 0 ? (
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
              <CardTitle className="text-base">Review extracted data</CardTitle>
              <span className="text-xs text-muted-foreground">
                {totalSelected} of {extraction.logEntries.length + extraction.registerItems.length + extraction.playbooks.length + extraction.tasks.length} selected
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

              <TabsContent value="logEntries">
                <LogEntriesTable
                  entries={extraction.logEntries}
                  selected={selectedLogEntries}
                  setSelected={setSelectedLogEntries}
                />
              </TabsContent>
              <TabsContent value="registerItems">
                <RegisterItemsTable
                  items={extraction.registerItems}
                  selected={selectedRegisterItems}
                  setSelected={setSelectedRegisterItems}
                />
              </TabsContent>
              <TabsContent value="playbooks">
                <PlaybooksTable
                  items={extraction.playbooks}
                  selected={selectedPlaybooks}
                  setSelected={setSelectedPlaybooks}
                />
              </TabsContent>
              <TabsContent value="tasks">
                <TasksTable
                  items={extraction.tasks}
                  selected={selectedTasks}
                  setSelected={setSelectedTasks}
                />
              </TabsContent>
            </Tabs>
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

function LogEntriesTable({
  entries,
  selected,
  setSelected,
}: {
  entries: ExtractionResult["logEntries"]
  selected: Set<number>
  setSelected: (s: Set<number>) => void
}) {
  const toggle = (index: number) => {
    const next = new Set(selected)
    if (next.has(index)) next.delete(index)
    else next.add(index)
    setSelected(next)
  }

  const toggleAll = () => {
    if (selected.size === entries.length) setSelected(new Set())
    else setSelected(new Set(entries.map((_, i) => i)))
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">
            <Checkbox
              checked={selected.size === entries.length && entries.length > 0}
              onCheckedChange={toggleAll}
            />
          </TableHead>
          <TableHead>Entity</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Fields</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((entry, i) => (
          <TableRow key={i}>
            <TableCell>
              <Checkbox checked={selected.has(i)} onCheckedChange={() => toggle(i)} />
            </TableCell>
            <TableCell className="font-medium">{entry.entityKey.replace(/_/g, " ")}</TableCell>
            <TableCell className="text-muted-foreground">{entry.occurredAt ?? "—"}</TableCell>
            <TableCell>
              {entry.status ? <Badge variant="outline">{entry.status}</Badge> : "—"}
            </TableCell>
            <TableCell>
              <span className="text-xs text-muted-foreground">
                {Object.entries(entry.fields)
                  .slice(0, 3)
                  .map(([k, v]) => `${k}: ${String(v)}`)
                  .join(", ")}
                {Object.keys(entry.fields).length > 3 && " ..."}
              </span>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function RegisterItemsTable({
  items,
  selected,
  setSelected,
}: {
  items: ExtractionResult["registerItems"]
  selected: Set<number>
  setSelected: (s: Set<number>) => void
}) {
  const toggle = (index: number) => {
    const next = new Set(selected)
    if (next.has(index)) next.delete(index)
    else next.add(index)
    setSelected(next)
  }

  const toggleAll = () => {
    if (selected.size === items.length) setSelected(new Set())
    else setSelected(new Set(items.map((_, i) => i)))
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">
            <Checkbox
              checked={selected.size === items.length && items.length > 0}
              onCheckedChange={toggleAll}
            />
          </TableHead>
          <TableHead>Kind</TableHead>
          <TableHead>Title</TableHead>
          <TableHead>Fields</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item, i) => (
          <TableRow key={i}>
            <TableCell>
              <Checkbox checked={selected.has(i)} onCheckedChange={() => toggle(i)} />
            </TableCell>
            <TableCell>
              <Badge variant="outline">{item.kind}</Badge>
            </TableCell>
            <TableCell className="font-medium">{item.title}</TableCell>
            <TableCell>
              <span className="text-xs text-muted-foreground">
                {Object.entries(item.fields)
                  .slice(0, 3)
                  .map(([k, v]) => `${k}: ${String(v)}`)
                  .join(", ")}
                {Object.keys(item.fields).length > 3 && " ..."}
              </span>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function PlaybooksTable({
  items,
  selected,
  setSelected,
}: {
  items: ExtractionResult["playbooks"]
  selected: Set<number>
  setSelected: (s: Set<number>) => void
}) {
  const toggle = (index: number) => {
    const next = new Set(selected)
    if (next.has(index)) next.delete(index)
    else next.add(index)
    setSelected(next)
  }

  const toggleAll = () => {
    if (selected.size === items.length) setSelected(new Set())
    else setSelected(new Set(items.map((_, i) => i)))
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">
            <Checkbox
              checked={selected.size === items.length && items.length > 0}
              onCheckedChange={toggleAll}
            />
          </TableHead>
          <TableHead>Title</TableHead>
          <TableHead>Summary</TableHead>
          <TableHead>Steps</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((pb, i) => (
          <TableRow key={i}>
            <TableCell>
              <Checkbox checked={selected.has(i)} onCheckedChange={() => toggle(i)} />
            </TableCell>
            <TableCell className="font-medium">{pb.title}</TableCell>
            <TableCell className="max-w-xs truncate text-muted-foreground">{pb.summary}</TableCell>
            <TableCell>
              <Badge variant="secondary">{pb.steps.length} steps</Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function TasksTable({
  items,
  selected,
  setSelected,
}: {
  items: ExtractionResult["tasks"]
  selected: Set<number>
  setSelected: (s: Set<number>) => void
}) {
  const toggle = (index: number) => {
    const next = new Set(selected)
    if (next.has(index)) next.delete(index)
    else next.add(index)
    setSelected(next)
  }

  const toggleAll = () => {
    if (selected.size === items.length) setSelected(new Set())
    else setSelected(new Set(items.map((_, i) => i)))
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">
            <Checkbox
              checked={selected.size === items.length && items.length > 0}
              onCheckedChange={toggleAll}
            />
          </TableHead>
          <TableHead>Title</TableHead>
          <TableHead>Description</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((task, i) => (
          <TableRow key={i}>
            <TableCell>
              <Checkbox checked={selected.has(i)} onCheckedChange={() => toggle(i)} />
            </TableCell>
            <TableCell className="font-medium">{task.title}</TableCell>
            <TableCell className="max-w-md truncate text-muted-foreground">{task.description}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
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

function DonePhase({
  totals,
  onReset,
}: {
  totals: CommitTotals
  onReset: () => void
}) {
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
