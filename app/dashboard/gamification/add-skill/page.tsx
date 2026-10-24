"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, CheckCircle2, GitBranch, Plus } from "lucide-react"
import { EmptyNote, SectionCard } from "@/components/dashboard-kit"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { jsonFetch, type SkillTree } from "../_kit"

export default function AddSkillPage() {
  const { toast } = useToast()
  const [trees, setTrees] = useState<SkillTree[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [createdName, setCreatedName] = useState<string | null>(null)

  const [name, setName] = useState("")
  const [level, setLevel] = useState("1")
  const [progress, setProgress] = useState("0")
  const [tasksToNextLevel, setTasksToNextLevel] = useState("3")
  const [description, setDescription] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const json = await jsonFetch<{ success: boolean; data: SkillTree[] }>("/api/gamification/skills")
      setTrees(json.data)
    } catch (err) {
      toast({ variant: "destructive", title: "Skill trees", description: (err as Error).message })
      setTrees([])
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    load()
  }, [load])

  const nameTaken =
    !!name.trim() && (trees ?? []).some((t) => t.name.trim().toLowerCase() === name.trim().toLowerCase())

  const validate = (): string | null => {
    const trimmed = name.trim()
    if (!trimmed) return "A skill tree name is required."
    if (trimmed.length > 60) return "Name must be 60 characters or fewer."
    if ((trees ?? []).some((t) => t.name.trim().toLowerCase() === trimmed.toLowerCase())) {
      return `You already have a skill tree named "${trimmed}" — pick a unique name.`
    }
    const lv = Number(level)
    if (!Number.isFinite(lv) || lv < 1 || lv > 99) return "Starting level must be between 1 and 99."
    const pr = Number(progress)
    if (!Number.isFinite(pr) || pr < 0 || pr > 100) return "Initial progress must be between 0 and 100."
    const tk = Number(tasksToNextLevel)
    if (!Number.isFinite(tk) || tk < 0 || tk > 999) return "Tasks to next level must be 0–999."
    return null
  }

  const createTree = async () => {
    const error = validate()
    if (error) {
      toast({ variant: "destructive", title: "Add skill", description: error })
      return
    }
    setSaving(true)
    setCreatedName(null)
    try {
      await jsonFetch("/api/gamification/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          level: Number(level),
          progress: Number(progress),
          tasksToNextLevel: Number(tasksToNextLevel),
          description: description.trim() || undefined,
        }),
      })
      toast({ title: "Skill tree created", description: `“${name.trim()}” is live on your profile — a notification was sent.` })
      setCreatedName(name.trim())
      setName("")
      setLevel("1")
      setProgress("0")
      setTasksToNextLevel("3")
      setDescription("")
      await load()
    } catch (err) {
      toast({ variant: "destructive", title: "Add skill", description: (err as Error).message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Add new skill</h1>
          <p className="text-muted-foreground">Create a skill tree on your own gamification profile.</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1" asChild>
          <Link href="/dashboard/gamification">
            <ArrowLeft className="h-4 w-4" /> Back to hub
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="New skill tree" icon={<Plus className="h-4 w-4" />}>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="skill-name">Name *</Label>
              <Input
                id="skill-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Frontend Craft"
                maxLength={60}
                aria-invalid={nameTaken}
              />
              {nameTaken && (
                <p className="text-[11px] text-destructive">That name is already used on one of your trees.</p>
              )}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="skill-level">Starting level</Label>
                <Input id="skill-level" type="number" min={1} max={99} value={level} onChange={(e) => setLevel(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="skill-progress">Initial progress %</Label>
                <Input
                  id="skill-progress"
                  type="number"
                  min={0}
                  max={100}
                  value={progress}
                  onChange={(e) => setProgress(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="skill-tasks">Tasks to next level</Label>
                <Input
                  id="skill-tasks"
                  type="number"
                  min={0}
                  max={999}
                  value={tasksToNextLevel}
                  onChange={(e) => setTasksToNextLevel(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="skill-description">Description (optional)</Label>
              <Textarea
                id="skill-description"
                rows={3}
                maxLength={300}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What milestones does this tree track?"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={createTree} disabled={saving || nameTaken}>
                {saving ? "Creating…" : "Create skill tree"}
              </Button>
              {createdName && (
                <span className="flex items-center gap-1 text-xs text-[hsl(var(--chart-pine))]">
                  <CheckCircle2 className="h-4 w-4" /> “{createdName}” saved —{" "}
                  <Link className="underline" href="/dashboard/gamification/skill-tree">
                    manage it
                  </Link>
                </span>
              )}
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="My trees"
          icon={<GitBranch className="h-4 w-4" />}
          action={
            <Button asChild size="sm" variant="ghost" className="h-7 text-xs">
              <Link href="/dashboard/gamification/skill-tree">Editor</Link>
            </Button>
          }
        >
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : trees && trees.length > 0 ? (
            <ul className="space-y-3">
              {trees.map((t) => (
                <li key={t.name} className="rounded-lg border p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-xs font-medium">{t.name}</p>
                    <Badge variant="secondary" className="shrink-0 text-[10px]">
                      Lv {t.level} · {t.progress}%
                    </Badge>
                  </div>
                  <Progress value={t.progress} className="mt-1.5 h-1.5" aria-label={`Progress in ${t.name}`} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyNote>You have no skill trees yet — create your first one with the form.</EmptyNote>
          )}
        </SectionCard>
      </div>
    </div>
  )
}
