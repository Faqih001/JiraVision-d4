"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Upload, FileText, Loader2, Trash2, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { SectionCard } from "@/components/dashboard-kit"
import { useToast } from "@/hooks/use-toast"
import { LIVE_REFRESH_MS, useLiveRefresh } from "@/hooks/use-live-refresh"

type PlanSummary = {
  id: number
  title: string
  summary: string | null
  status: string
  horizonStart: string | null
  horizonEnd: string | null
  createdAt: string
  promotedAt: string | null
}

type InputMode = "text" | "pdf"

export default function PlannerClient() {
  const router = useRouter()
  const { toast } = useToast()

  const [plans, setPlans] = useState<PlanSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [extracting, setExtracting] = useState(false)

  const [inputMode, setInputMode] = useState<InputMode>("text")
  const [text, setText] = useState("")
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [sourceName, setSourceName] = useState("")

  const refresh = useCallback(async (quiet = false) => {
    try {
      const res = await fetch("/api/planner")
      const json = await res.json()
      if (json.success) {
        setPlans(json.plans)
      } else if (!quiet) {
        toast({ title: "Failed to load plans", description: json.message, variant: "destructive" })
      }
    } catch {
      if (!quiet) toast({ title: "Network error", description: "Could not load plans", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    refresh()
  }, [refresh])

  useLiveRefresh(() => refresh(true), { intervalMs: LIVE_REFRESH_MS })

  const handleExtract = async () => {
    if (inputMode === "text" && !text.trim()) {
      toast({ title: "No text provided", description: "Paste text or upload a PDF", variant: "destructive" })
      return
    }
    if (inputMode === "pdf" && !pdfFile) {
      toast({ title: "No PDF provided", description: "Upload a PDF file", variant: "destructive" })
      return
    }

    setExtracting(true)
    try {
      let body: Record<string, unknown>
      if (inputMode === "text") {
        body = { text: text.trim(), sourceName: sourceName || undefined }
      } else {
        const buffer = await pdfFile!.arrayBuffer()
        const bytes = new Uint8Array(buffer)
        let binary = ""
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i])
        }
        const base64 = btoa(binary)
        body = {
          pdf: { mimeType: pdfFile!.type || "application/pdf", data: base64 },
          sourceName: sourceName || pdfFile!.name,
        }
      }

      const res = await fetch("/api/planner/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const json = await res.json()
      if (json.success) {
        toast({ title: "Plan extracted", description: "Redirecting to editor..." })
        router.push(`/dashboard/planner/${json.planId}`)
      } else {
        toast({
          title: "Extraction failed",
          description: json.message || "Unknown error",
          variant: "destructive",
        })
      }
    } catch {
      toast({ title: "Network error", description: "Could not extract plan", variant: "destructive" })
    } finally {
      setExtracting(false)
    }
  }

  const handleDelete = async (planId: number) => {
    if (!confirm("Discard this draft plan?")) return

    try {
      const res = await fetch(`/api/planner/${planId}`, { method: "DELETE" })
      const json = await res.json()
      if (json.success) {
        toast({ title: "Plan discarded" })
        refresh()
      } else {
        toast({ title: "Failed to discard", description: json.message, variant: "destructive" })
      }
    } catch {
      toast({ title: "Network error", description: "Could not discard plan", variant: "destructive" })
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.type === "application/pdf") {
      setPdfFile(file)
      setInputMode("pdf")
      if (!sourceName) setSourceName(file.name)
    } else {
      toast({ title: "Invalid file", description: "Only PDF files are accepted", variant: "destructive" })
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPdfFile(file)
      setInputMode("pdf")
      if (!sourceName) setSourceName(file.name)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <SectionCard title="Extract a Plan" icon={<Upload className="h-4 w-4" />}>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button
              variant={inputMode === "text" ? "default" : "outline"}
              onClick={() => setInputMode("text")}
            >
              <FileText className="mr-2 h-4 w-4" />
              Paste Text
            </Button>
            <Button
              variant={inputMode === "pdf" ? "default" : "outline"}
              onClick={() => setInputMode("pdf")}
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload PDF
            </Button>
          </div>

          {inputMode === "text" ? (
            <div className="space-y-2">
              <Label htmlFor="text">Paste your project brief, scope of work, or job description</Label>
              <Textarea
                id="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="The project involves three phases: site survey, structural assessment, and remediation design. Phase 1 runs from 2026-11-01 to 2026-11-15..."
                rows={8}
                className="font-mono text-sm"
              />
            </div>
          ) : (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed rounded-lg p-8 text-center space-y-2"
            >
              <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Drag and drop a PDF here, or click to browse
              </p>
              <Input
                type="file"
                accept="application/pdf"
                onChange={handleFileInput}
                className="max-w-xs mx-auto"
              />
              {pdfFile && (
                <p className="text-sm font-medium">
                  Selected: {pdfFile.name} ({(pdfFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="sourceName">Source name (optional)</Label>
            <Input
              id="sourceName"
              value={sourceName}
              onChange={(e) => setSourceName(e.target.value)}
              placeholder="e.g., Bridge Rehabilitation Contract 2026"
            />
          </div>

          <Button onClick={handleExtract} disabled={extracting} className="w-full">
            {extracting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Extracting plan...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Extract Plan with AI
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Gemini will analyze your source and propose a structured plan. You can edit it before promoting to tasks.
          </p>
        </div>
      </SectionCard>

      <SectionCard title="Your Plans" icon={<FileText className="h-4 w-4" />}>
        {plans.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No plans yet. Extract one from a project brief or PDF above.
          </p>
        ) : (
          <div className="space-y-3">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className="border rounded-lg p-4 space-y-2 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{plan.title}</h3>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          plan.status === "draft"
                            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100"
                            : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                        }`}
                      >
                        {plan.status}
                      </span>
                    </div>
                    {plan.summary && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{plan.summary}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {plan.horizonStart && plan.horizonEnd && (
                        <span>
                          {plan.horizonStart} → {plan.horizonEnd}
                        </span>
                      )}
                      <span>Created {new Date(plan.createdAt).toLocaleDateString()}</span>
                      {plan.promotedAt && (
                        <span>Promoted {new Date(plan.promotedAt).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/dashboard/planner/${plan.id}`)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {plan.status === "draft" && (
                      <Button variant="outline" size="sm" onClick={() => handleDelete(plan.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  )
}
