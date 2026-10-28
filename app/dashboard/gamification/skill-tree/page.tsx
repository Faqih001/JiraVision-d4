"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, GitBranch, Pencil, Plus, Trash2 } from "lucide-react"
import { EmptyNote, SectionCard } from "@/components/dashboard-kit"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { LIVE_REFRESH_MS, useLiveRefresh } from "@/hooks/use-live-refresh"
import { useToast } from "@/hooks/use-toast"
import { jsonFetch, type SkillTree } from "../_kit"

interface TreeDraft {
  name: string
  level: string
  progress: string
  tasksToNextLevel: string
  description: string
}

const emptyDraft: TreeDraft = { name: "", level: "1", progress: "0", tasksToNextLevel: "0", description: "" }

export default function SkillTreeEditorPage() {
  const { toast } = useToast()
  const [trees, setTrees] = useState<SkillTree[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [originalName, setOriginalName] = useState<string | null>(null)
  const [draft, setDraft] = useState<TreeDraft>(emptyDraft)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true)
    try {
      const json = await jsonFetch<{ success: boolean; data: SkillTree[] }>("/api/gamification/skills")
      setTrees(json.data)
    } catch (err) {
      if (quiet) return
      toast({ variant: "destructive", title: "Skill trees", description: (err as Error).message })
      setTrees([])
    } finally {
      if (!quiet) setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    void load()
  }, [load])

  useLiveRefresh(() => load(true), { intervalMs: LIVE_REFRESH_MS })

  const openCreate = () => {
    setOriginalName(null)
    setDraft(emptyDraft)
    setEditorOpen(true)
  }

  const openEdit = (tree: SkillTree) => {
    setOriginalName(tree.name)
    setDraft({
      name: tree.name,
      level: String(tree.level),
      progress: String(tree.progress),
      tasksToNextLevel: String(tree.tasksToNextLevel),
      description: tree.description ?? "",
    })
    setEditorOpen(true)
  }

  const validate = (): string | null => {
    const name = draft.name.trim()
    if (!name) return "A tree name is required."
    if (name.length > 60) return "Name must be 60 characters or fewer."
    if (originalName === null && trees?.some((t) => t.name.toLowerCase() === name.toLowerCase())) {
      return `A skill tree named "${name}" already exists.`
    }
    const level = Number(draft.level)
    if (!Number.isFinite(level) || level < 1 || level > 99) return "Level must be between 1 and 99."
    const progress = Number(draft.progress)
    if (!Number.isFinite(progress) || progress < 0 || progress > 100) return "Progress must be between 0 and 100."
    const tasks = Number(draft.tasksToNextLevel)
    if (!Number.isFinite(tasks) || tasks < 0 || tasks > 999) return "Tasks to next level must be 0–999."
    return null
  }

  const save = async () => {
    const error = validate()
    if (error) {
      toast({ variant: "destructive", title: "Skill tree", description: error })
      return
    }
    setSaving(true)
    try {
      const payload = {
        name: originalName ?? draft.name.trim(),
        newName: draft.name.trim(),
        level: Number(draft.level),
        progress: Number(draft.progress),
        tasksToNextLevel: Number(draft.tasksToNextLevel),
        description: draft.description.trim(),
      }
      if (originalName === null) {
        await jsonFetch("/api/gamification/skills", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        toast({ title: "Skill tree created", description: payload.newName })
      } else {
        await jsonFetch("/api/gamification/skills", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        toast({ title: "Skill tree updated", description: payload.newName })
      }
      setEditorOpen(false)
      await load()
    } catch (err) {
      toast({ variant: "destructive", title: "Skill tree", description: (err as Error).message })
    } finally {
      setSaving(false)
    }
  }

  const remove = async (name: string) => {
    setDeleting(true)
    try {
      await jsonFetch("/api/gamification/skills", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })
      toast({ title: "Skill tree deleted", description: name })
      setConfirmDelete(null)
      await load()
    } catch (err) {
      toast({ variant: "destructive", title: "Skill tree", description: (err as Error).message })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Skill trees</h1>
          <p className="text-muted-foreground">
            Edit your own skill trees — every change writes straight into the skillTrees jsonb on your gamification row.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1" asChild>
            <Link href="/dashboard/gamification">
              <ArrowLeft className="h-4 w-4" /> Hub
            </Link>
          </Button>
          <Button size="sm" className="gap-1" onClick={openCreate}>
            <Plus className="h-4 w-4" /> New tree
          </Button>
        </div>
      </div>

      <SectionCard title="My trees" icon={<GitBranch className="h-4 w-4" />}>
        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-36 w-full" />
            ))}
          </div>
        ) : trees && trees.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {trees.map((t) => (
              <Card key={t.name} className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold">{t.name}</p>
                  <Badge variant="secondary" className="shrink-0 text-[10px]">
                    Lv {t.level}
                  </Badge>
                </div>
                {t.description && <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{t.description}</p>}
                <Progress value={t.progress} className="mt-2 h-1.5" aria-label={`Progress in ${t.name}`} />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {t.progress}% complete
                  {t.tasksToNextLevel > 0 ? ` · ${t.tasksToNextLevel} tasks to level ${t.level + 1}` : ""}
                </p>
                <div className="mt-2 flex gap-1">
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px] gap-1" onClick={() => openEdit(t)}>
                    <Pencil className="h-3 w-3" /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-[11px] gap-1 text-destructive"
                    onClick={() => setConfirmDelete(t.name)}
                  >
                    <Trash2 className="h-3 w-3" /> Delete
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyNote>
            No skill trees yet. Create one here or use the{" "}
            <Link className="underline" href="/dashboard/gamification/add-skill">
              Add skill
            </Link>{" "}
            page.
          </EmptyNote>
        )}
      </SectionCard>

      {/* create/edit dialog */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{originalName === null ? "Create skill tree" : `Edit “${originalName}”`}</DialogTitle>
            <DialogDescription>Name, level, progress (0–100%) and tasks-to-next-level are validated and persisted.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="tree-name">Name</Label>
              <Input
                id="tree-name"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="e.g. Frontend Craft"
                maxLength={60}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="tree-level">Level</Label>
                <Input
                  id="tree-level"
                  type="number"
                  min={1}
                  max={99}
                  value={draft.level}
                  onChange={(e) => setDraft({ ...draft, level: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="tree-progress">Progress %</Label>
                <Input
                  id="tree-progress"
                  type="number"
                  min={0}
                  max={100}
                  value={draft.progress}
                  onChange={(e) => setDraft({ ...draft, progress: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="tree-tasks">Tasks to next</Label>
                <Input
                  id="tree-tasks"
                  type="number"
                  min={0}
                  max={999}
                  value={draft.tasksToNextLevel}
                  onChange={(e) => setDraft({ ...draft, tasksToNextLevel: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="tree-description">Description (optional)</Label>
              <Textarea
                id="tree-description"
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                rows={3}
                maxLength={300}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving…" : originalName === null ? "Create tree" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* delete confirm */}
      <Dialog open={confirmDelete !== null} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        {confirmDelete && (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete “{confirmDelete}”?</DialogTitle>
              <DialogDescription>
                This removes the tree from your gamification row&apos;s skillTrees jsonb. This cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmDelete(null)} disabled={deleting}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={() => remove(confirmDelete)} disabled={deleting}>
                {deleting ? "Deleting…" : "Delete tree"}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}
