"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Save, Trash2, Rocket, Plus, ArrowLeft, Loader2, List, GanttChart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { SectionCard } from "@/components/dashboard-kit"
import { useToast } from "@/hooks/use-toast"
import Gantt from "@/components/planner/gantt"
import type { GanttItem, GanttZoom, GanttGroupBy } from "@/lib/planner/gantt-data"

type PlanItem = {
  id: number
  title: string
  description: string | null
  discipline: string | null
  estimatePoints: number
  startDate: string | null
  dueDate: string | null
  status: string
  dependsOn: number[]
  milestone: boolean
  cadence: string | null
  sortOrder: number
  deliverable: { name: string; type: string } | null
}

type Plan = {
  id: number
  title: string
  summary: string | null
  status: string
  horizonStart: string | null
  horizonEnd: string | null
  sourceKind: string
  sourceName: string | null
  createdAt: string
  promotedAt: string | null
}

const DISCIPLINES = [
  "civil",
  "electrical",
  "mechanical",
  "structural",
  "geotechnical",
  "environmental",
  "planning",
  "management",
  "other",
]

const CADENCES = ["daily", "weekly", "monthly", "quarterly", "yearly"]

export default function PlanEditorClient({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const [planId, setPlanId] = useState<number | null>(null)
  const [plan, setPlan] = useState<Plan | null>(null)
  const [items, setItems] = useState<PlanItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [promoting, setPromoting] = useState(false)
  const [viewMode, setViewMode] = useState<"list" | "gantt">(
    (searchParams.get("view") as "list" | "gantt") || "list",
  )
  const [ganttZoom] = useState<GanttZoom>(
    (searchParams.get("zoom") as GanttZoom) || "week",
  )
  const [ganttGroupBy, setGanttGroupBy] = useState<GanttGroupBy>(
    (searchParams.get("groupBy") as GanttGroupBy) || "discipline",
  )

  useEffect(() => {
    params.then(({ id }) => setPlanId(Number.parseInt(id)))
  }, [params])

  const refresh = useCallback(async () => {
    if (!planId) return
    try {
      const res = await fetch(`/api/planner/${planId}`)
      const json = await res.json()
      if (json.success) {
        setPlan(json.plan)
        setItems(json.items)
      } else {
        toast({ title: "Failed to load plan", description: json.message, variant: "destructive" })
      }
    } catch {
      toast({ title: "Network error", description: "Could not load plan", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [planId, toast])

  useEffect(() => {
    if (planId) refresh()
  }, [planId, refresh])

  const updatePlanField = (field: keyof Plan, value: string | null) => {
    if (!plan) return
    setPlan({ ...plan, [field]: value })
  }

  const updateItem = (itemId: number, updates: Partial<PlanItem>) => {
    setItems(items.map((item) => (item.id === itemId ? { ...item, ...updates } : item)))
  }

  const savePlanMetadata = async () => {
    if (!plan) return
    setSaving(true)
    try {
      const res = await fetch(`/api/planner/${plan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: plan.title, summary: plan.summary }),
      })
      const json = await res.json()
      if (json.success) {
        toast({ title: "Plan updated" })
      } else {
        toast({ title: "Failed to update", description: json.message, variant: "destructive" })
      }
    } catch {
      toast({ title: "Network error", description: "Could not update plan", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const saveItem = async (item: PlanItem) => {
    try {
      const res = await fetch(`/api/planner/${planId}/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: item.title,
          description: item.description,
          discipline: item.discipline,
          estimatePoints: item.estimatePoints,
          startDate: item.startDate,
          dueDate: item.dueDate,
          dependsOn: item.dependsOn,
          milestone: item.milestone,
          cadence: item.cadence,
          deliverable: item.deliverable,
        }),
      })
      const json = await res.json()
      if (!json.success) {
        toast({ title: "Failed to save item", description: json.message, variant: "destructive" })
      }
    } catch {
      toast({ title: "Network error", description: "Could not save item", variant: "destructive" })
    }
  }

  const addItem = async () => {
    try {
      const res = await fetch(`/api/planner/${planId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New item" }),
      })
      const json = await res.json()
      if (json.success) {
        setItems([...items, json.item])
        toast({ title: "Item added" })
      } else {
        toast({ title: "Failed to add item", description: json.message, variant: "destructive" })
      }
    } catch {
      toast({ title: "Network error", description: "Could not add item", variant: "destructive" })
    }
  }

  const deleteItem = async (itemId: number) => {
    if (!confirm("Delete this item?")) return
    try {
      const res = await fetch(`/api/planner/${planId}/items/${itemId}`, { method: "DELETE" })
      const json = await res.json()
      if (json.success) {
        setItems(items.filter((item) => item.id !== itemId))
        toast({ title: "Item deleted" })
      } else {
        toast({ title: "Failed to delete item", description: json.message, variant: "destructive" })
      }
    } catch {
      toast({ title: "Network error", description: "Could not delete item", variant: "destructive" })
    }
  }

  const promote = async () => {
    if (!confirm("Promote this plan to tasks? This cannot be undone.")) return
    setPromoting(true)
    try {
      const res = await fetch(`/api/planner/${planId}/promote`, { method: "POST" })
      const json = await res.json()
      if (json.success) {
        toast({ title: "Plan promoted", description: `${json.count} tasks created` })
        router.push("/dashboard/planner")
      } else {
        toast({ title: "Failed to promote", description: json.message, variant: "destructive" })
      }
    } catch {
      toast({ title: "Network error", description: "Could not promote plan", variant: "destructive" })
    } finally {
      setPromoting(false)
    }
  }

  const discard = async () => {
    if (!confirm("Discard this draft plan? This cannot be undone.")) return
    try {
      const res = await fetch(`/api/planner/${planId}`, { method: "DELETE" })
      const json = await res.json()
      if (json.success) {
        toast({ title: "Plan discarded" })
        router.push("/dashboard/planner")
      } else {
        toast({ title: "Failed to discard", description: json.message, variant: "destructive" })
      }
    } catch {
      toast({ title: "Network error", description: "Could not discard plan", variant: "destructive" })
    }
  }

  const handleItemMove = async (itemId: number, dayDelta: number) => {
    const item = items.find((i) => i.id === itemId)
    if (!item) return

    const newStart = item.startDate
      ? new Date(new Date(item.startDate).getTime() + dayDelta * 86400000)
          .toISOString()
          .split("T")[0]
      : null
    const newDue = item.dueDate
      ? new Date(new Date(item.dueDate).getTime() + dayDelta * 86400000)
          .toISOString()
          .split("T")[0]
      : null

    try {
      const res = await fetch(`/api/planner/${planId}/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startDate: newStart, dueDate: newDue }),
      })
      const json = await res.json()
      if (json.success) {
        setItems(items.map((i) => (i.id === itemId ? { ...i, startDate: newStart, dueDate: newDue } : i)))
        toast({ title: "Item moved" })
      } else {
        toast({ title: "Failed to move item", description: json.message, variant: "destructive" })
      }
    } catch {
      toast({ title: "Network error", description: "Could not move item", variant: "destructive" })
    }
  }

  const ganttItems: GanttItem[] = items.map((item, index) => ({
    id: item.id,
    title: item.title,
    startDate: item.startDate,
    dueDate: item.dueDate,
    status: item.status,
    discipline: item.discipline,
    assigneeId: null,
    milestone: item.milestone,
    dependsOn: item.dependsOn || [],
  }))

  if (loading || !plan) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  const isDraft = plan.status === "draft"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.push("/dashboard/planner")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Plans
        </Button>
        <div className="flex gap-2">
          <div className="flex border rounded-md overflow-hidden">
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
            >
              <List className="mr-2 h-4 w-4" />
              List
            </Button>
            <Button
              variant={viewMode === "gantt" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("gantt")}
            >
              <GanttChart className="mr-2 h-4 w-4" />
              Gantt
            </Button>
          </div>
          {isDraft && (
            <>
              <Button variant="outline" onClick={savePlanMetadata} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Metadata
              </Button>
              <Button variant="outline" onClick={discard}>
                <Trash2 className="mr-2 h-4 w-4" />
                Discard
              </Button>
              <Button onClick={promote} disabled={promoting || items.length === 0}>
                {promoting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Rocket className="mr-2 h-4 w-4" />
                )}
                Promote to Tasks
              </Button>
            </>
          )}
        </div>
      </div>

      <SectionCard title="Plan Details" icon={<Save className="h-4 w-4" />}>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={plan.title}
              onChange={(e) => updatePlanField("title", e.target.value)}
              disabled={!isDraft}
              maxLength={200}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="summary">Summary</Label>
            <Textarea
              id="summary"
              value={plan.summary || ""}
              onChange={(e) => updatePlanField("summary", e.target.value)}
              disabled={!isDraft}
              rows={3}
              maxLength={2000}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="horizonStart">Horizon Start</Label>
              <Input
                id="horizonStart"
                type="date"
                value={plan.horizonStart || ""}
                disabled
                readOnly
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="horizonEnd">Horizon End</Label>
              <Input
                id="horizonEnd"
                type="date"
                value={plan.horizonEnd || ""}
                disabled
                readOnly
              />
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            Status: <span className="font-medium">{plan.status}</span> · Source: {plan.sourceKind}
            {plan.sourceName && ` (${plan.sourceName})`}
          </div>
        </div>
      </SectionCard>

      {viewMode === "gantt" && items.length > 0 && (
        <SectionCard title="Gantt View" icon={<GanttChart className="h-4 w-4" />}>
          <Gantt
            items={ganttItems}
            zoom={ganttZoom}
            groupBy={ganttGroupBy}
            onItemMove={isDraft ? handleItemMove : undefined}
            onItemClick={(item) => {
              const planItem = items.find((i) => i.id === item.id)
              if (planItem) {
                const element = document.getElementById(`item-${item.id}`)
                element?.scrollIntoView({ behavior: "smooth", block: "center" })
              }
            }}
          />
        </SectionCard>
      )}

      <SectionCard
        title={`Items (${items.length})`}
        icon={<Plus className="h-4 w-4" />}
        action={
          isDraft ? (
            <Button variant="outline" size="sm" onClick={addItem}>
              <Plus className="mr-2 h-4 w-4" />
              Add Item
            </Button>
          ) : undefined
        }
      >
        <div className="space-y-4">
          {items.map((item, index) => (
            <div key={item.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-3">
                  <div className="space-y-2">
                    <Label>#{index + 1} Title</Label>
                    <Input
                      value={item.title}
                      onChange={(e) => updateItem(item.id, { title: e.target.value })}
                      onBlur={() => saveItem(item)}
                      disabled={!isDraft}
                      maxLength={200}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={item.description || ""}
                      onChange={(e) => updateItem(item.id, { description: e.target.value })}
                      onBlur={() => saveItem(item)}
                      disabled={!isDraft}
                      rows={2}
                      maxLength={2000}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label>Discipline</Label>
                      <Select
                        value={item.discipline || "none"}
                        onValueChange={(v) => {
                          const discipline = v === "none" ? null : v
                          updateItem(item.id, { discipline })
                          saveItem({ ...item, discipline })
                        }}
                        disabled={!isDraft}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {DISCIPLINES.map((d) => (
                            <SelectItem key={d} value={d}>
                              {d}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Estimate (pts)</Label>
                      <Input
                        type="number"
                        value={item.estimatePoints}
                        onChange={(e) => updateItem(item.id, { estimatePoints: Number(e.target.value) })}
                        onBlur={() => saveItem(item)}
                        disabled={!isDraft}
                        min={0}
                        max={100}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Cadence</Label>
                      <Select
                        value={item.cadence || "none"}
                        onValueChange={(v) => {
                          const cadence = v === "none" ? null : v
                          updateItem(item.id, { cadence })
                          saveItem({ ...item, cadence })
                        }}
                        disabled={!isDraft}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {CADENCES.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <Input
                        type="date"
                        value={item.startDate || ""}
                        onChange={(e) => updateItem(item.id, { startDate: e.target.value || null })}
                        onBlur={() => saveItem(item)}
                        disabled={!isDraft}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Due Date</Label>
                      <Input
                        type="date"
                        value={item.dueDate || ""}
                        onChange={(e) => updateItem(item.id, { dueDate: e.target.value || null })}
                        onBlur={() => saveItem(item)}
                        disabled={!isDraft}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Milestone</Label>
                      <div className="flex items-center h-9">
                        <input
                          type="checkbox"
                          checked={item.milestone}
                          onChange={(e) => {
                            updateItem(item.id, { milestone: e.target.checked })
                            saveItem({ ...item, milestone: e.target.checked })
                          }}
                          disabled={!isDraft}
                          className="h-4 w-4"
                        />
                      </div>
                    </div>
                  </div>
                  {item.deliverable && (
                    <div className="text-sm bg-muted p-2 rounded">
                      <strong>Deliverable:</strong> {item.deliverable.name} ({item.deliverable.type})
                    </div>
                  )}
                </div>
                {isDraft && (
                  <Button variant="outline" size="sm" onClick={() => deleteItem(item.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}
