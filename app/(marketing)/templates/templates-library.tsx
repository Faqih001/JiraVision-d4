"use client"

// Client island for /templates: category chips, live search, sort, the full
// 12-card grid and the detail dialog with working copy/download. Clipboard
// writes fall back to a hidden-textarea execCommand copy, and if even that
// fails the raw checklist is shown in a selectable textarea — so the promise
// "copy this checklist" holds without the async clipboard API.

import { useMemo, useState } from "react"
import { Check, Copy, Download, FileText, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Section, SectionHeading } from "@/components/sections/section"
import { templateCategories, templates, type TemplateCategory, type TemplateDef } from "@/content/templates"
import { cn } from "@/lib/utils"

type CatFilter = TemplateCategory | "All"
type SortMode = "category" | "title"
type CopyState = { id: string; mode: "copied" | "manual" } | null

function checklistMarkdown(t: TemplateDef): string {
  return [
    `# ${t.title}`,
    "",
    `Category: ${t.category} · For: ${t.forStage}`,
    "",
    t.summary,
    "",
    "## Includes",
    ...t.includes.map((item) => `- [ ] ${item}`),
    "",
    "— From the JiraVision template library (/templates)",
    "",
  ].join("\n")
}

async function copyText(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // permission denied / insecure context — fall through to the legacy path
    }
  }
  try {
    const ta = document.createElement("textarea")
    ta.value = text
    ta.setAttribute("readonly", "")
    ta.style.position = "fixed"
    ta.style.left = "-9999px"
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand("copy")
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

function downloadMarkdown(t: TemplateDef) {
  const blob = new Blob([checklistMarkdown(t)], { type: "text/markdown;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${t.id}.md`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const categoryOrder: TemplateCategory[] = templateCategories

function sortTemplates(list: TemplateDef[], mode: SortMode): TemplateDef[] {
  const sorted = [...list]
  if (mode === "title") {
    return sorted.sort((a, b) => a.title.localeCompare(b.title))
  }
  return sorted.sort(
    (a, b) =>
      categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category) ||
      a.title.localeCompare(b.title),
  )
}

function ChecklistActions({
  template,
  copyState,
  onCopy,
}: {
  template: TemplateDef
  copyState: CopyState
  onCopy: (t: TemplateDef) => void
}) {
  const copying = copyState?.id === template.id
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={copying && copyState?.mode === "copied" ? "default" : "outline"}
          className="rounded-full"
          onClick={() => onCopy(template)}
          aria-label={`Copy the ${template.title} checklist`}
        >
          {copying && copyState?.mode === "copied" ? (
            <>
              <Check className="h-4 w-4" aria-hidden />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" aria-hidden />
              Copy checklist
            </>
          )}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="rounded-full"
          onClick={() => downloadMarkdown(template)}
          aria-label={`Download the ${template.title} checklist as a markdown file`}
        >
          <Download className="h-4 w-4" aria-hidden />
          Download .md
        </Button>
      </div>
      {copying && copyState?.mode === "manual" && (
        <div className="mt-3">
          <p className="text-xs text-muted-foreground">
            Automatic copy didn't go through — select everything in the box and copy
            manually (⌘/Ctrl+C):
          </p>
          <textarea
            readOnly
            value={checklistMarkdown(template)}
            rows={8}
            onFocus={(e) => e.currentTarget.select()}
            className="mt-2 w-full rounded-md border bg-background p-3 font-mono text-xs"
            aria-label={`${template.title} checklist text for manual copying`}
          />
        </div>
      )}
    </div>
  )
}

export function TemplatesLibrary() {
  const [filter, setFilter] = useState<CatFilter>("All")
  const [query, setQuery] = useState("")
  const [sort, setSort] = useState<SortMode>("category")
  const [openId, setOpenId] = useState<string | null>(null)
  const [copyState, setCopyState] = useState<CopyState>(null)

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = templates.filter((t) => {
      if (filter !== "All" && t.category !== filter) return false
      if (!q) return true
      return `${t.title} ${t.summary} ${t.forStage} ${t.includes.join(" ")}`
        .toLowerCase()
        .includes(q)
    })
    return sortTemplates(filtered, sort)
  }, [filter, query, sort])

  const handleCopy = (t: TemplateDef) => {
    void copyText(checklistMarkdown(t)).then((ok) => {
      setCopyState({ id: t.id, mode: ok ? "copied" : "manual" })
      if (ok) {
        window.setTimeout(
          () => setCopyState((s) => (s && s.id === t.id && s.mode === "copied" ? null : s)),
          2500,
        )
      }
    })
  }

  return (
    <Section id="library" bg="band-sage">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <SectionHeading
          className="mb-0"
          eyebrow="The full shelf"
          title="All twelve templates"
          intro="Filter by category, search across every card, open one for the full includes list — then copy or download it."
        />
        <p className="font-mono text-xs text-muted-foreground" aria-live="polite">
          {visible.length} of {templates.length} shown
        </p>
      </div>

      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <label htmlFor="template-search" className="sr-only">
            Search templates by name, summary or what's inside
          </label>
          <input
            id="template-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search templates — try “retro”, “after-hours”, “runbook”…"
            className="w-full rounded-full border border-input bg-background py-2.5 pl-10 pr-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="template-sort" className="text-xs font-medium text-muted-foreground">
            Sort
          </label>
          <select
            id="template-sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortMode)}
            className="min-h-[40px] rounded-full border border-input bg-background px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="category">By category</option>
            <option value="title">A–Z by name</option>
          </select>
        </div>
      </div>

      <div className="mb-10 flex flex-wrap gap-2" role="group" aria-label="Filter templates by category">
        {(["All", ...templateCategories] as const).map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setFilter(cat)}
            aria-pressed={filter === cat}
            className={cn(
              "min-h-[40px] rounded-full border px-4 text-sm transition-colors",
              filter === cat
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background hover:border-foreground/30",
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground shadow-soft">
          Nothing matches “{query.trim()}”.{" "}
          <button
            type="button"
            className="font-medium text-primary underline-offset-4 hover:underline"
            onClick={() => {
              setQuery("")
              setFilter("All")
            }}
          >
            Clear the search
          </button>{" "}
          to see all twelve.
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((tpl) => (
            <article key={tpl.id} className="flex h-full flex-col rounded-lg border border-border bg-card p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <Badge variant="outline" className="text-xs">{tpl.category}</Badge>
                <span className="font-mono text-[11px] text-muted-foreground">{tpl.id}</span>
              </div>
              <h3 className="font-display text-lg font-medium tracking-tight">{tpl.title}</h3>
              <p className="prose-body mt-2 text-sm">{tpl.summary}</p>
              <ul className="mt-4 space-y-1 border-t border-border pt-4 text-xs text-muted-foreground">
                {tpl.includes.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="mt-auto pt-4 text-xs text-muted-foreground">
                For: <span className="text-foreground">{tpl.forStage}</span>
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
                <Dialog open={openId === tpl.id} onOpenChange={(v) => setOpenId(v ? tpl.id : null)}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="rounded-full" aria-label={`View details for ${tpl.title}`}>
                      <FileText className="h-4 w-4" aria-hidden />
                      Details
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <Badge variant="outline" className="w-fit text-xs">{tpl.category}</Badge>
                      <DialogTitle className="font-display tracking-tight">{tpl.title}</DialogTitle>
                      <DialogDescription>{tpl.summary}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          What's inside
                        </h4>
                        <ul className="mt-2 space-y-1.5 text-sm">
                          {tpl.includes.map((item) => (
                            <li key={item} className="flex items-start gap-2">
                              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Built for: <span className="text-foreground">{tpl.forStage}</span>
                      </p>
                      <ChecklistActions template={tpl} copyState={copyState} onCopy={handleCopy} />
                    </div>
                  </DialogContent>
                </Dialog>
                <ChecklistActions template={tpl} copyState={copyState} onCopy={handleCopy} />
              </div>
            </article>
          ))}
        </div>
      )}
    </Section>
  )
}
