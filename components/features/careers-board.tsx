"use client"

import { useMemo, useState } from "react"
import { Briefcase, Globe, Search } from "lucide-react"

import type { JobOpening } from "@/content/careers"
import { careersContactNote } from "@/content/careers"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ApplyForm } from "@/components/forms/apply-form"

const GENERAL_ROLE = "General application"

export function CareersBoard({ jobs }: { jobs: JobOpening[] }) {
  const [query, setQuery] = useState("")
  const [dept, setDept] = useState("all")
  const [applyingFor, setApplyingFor] = useState<string | null>(null)

  const departments = useMemo(() => Array.from(new Set(jobs.map((j) => j.department))), [jobs])
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return jobs.filter((j) => {
      if (dept !== "all" && j.department !== dept) return false
      if (!q) return true
      return `${j.title} ${j.summary} ${j.location} ${j.department}`.toLowerCase().includes(q)
    })
  }, [jobs, query, dept])

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search roles, skills, locations…"
            aria-label="Search open roles"
            className="pl-9"
          />
        </div>
        <Select value={dept} onValueChange={setDept}>
          <SelectTrigger className="w-full sm:w-52" aria-label="Filter by department">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All departments</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ul className="mt-6 space-y-4" aria-live="polite">
        {filtered.map((job) => (
          <li
            key={job.id}
            className="flex flex-col gap-4 rounded-2xl border border-border bg-background p-6 transition-colors duration-150 hover:border-primary/40 md:flex-row md:items-center md:justify-between"
          >
            <div>
              <h3 className="font-display text-xl font-medium">{job.title}</h3>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">{job.summary}</p>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Briefcase className="h-3.5 w-3.5" aria-hidden="true" />
                  {job.department}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5" aria-hidden="true" />
                  {job.location}
                </span>
                <span>{job.type}</span>
              </div>
            </div>
            <Button onClick={() => setApplyingFor(job.title)} className="shrink-0 rounded-full">
              Apply now
            </Button>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="rounded-2xl border border-dashed border-border p-8 text-center">
            <p className="font-medium">No roles match that search.</p>
            <p className="mt-1 text-sm text-muted-foreground">{careersContactNote.body}</p>
            <Button
              variant="outline"
              className="mt-4 rounded-full"
              onClick={() => setApplyingFor(GENERAL_ROLE)}
            >
              Send a general application
            </Button>
          </li>
        )}
      </ul>

      {filtered.length > 0 && (
        <p className="mt-8 text-sm text-muted-foreground">
          {careersContactNote.body}{" "}
          <a href={`mailto:${careersContactNote.email}`} className="font-medium text-primary hover:underline">
            {careersContactNote.email}
          </a>{" "}
          or{" "}
          <button
            type="button"
            className="font-medium text-primary underline underline-offset-4"
            onClick={() => setApplyingFor(GENERAL_ROLE)}
          >
            send a general application
          </button>
          .
        </p>
      )}

      <Dialog open={applyingFor !== null} onOpenChange={(open) => !open && setApplyingFor(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Apply to JiraVision</DialogTitle>
            <DialogDescription>
              Tell us about yourself. We read every application and reply within a week.
            </DialogDescription>
          </DialogHeader>
          {applyingFor && <ApplyForm key={applyingFor} role={applyingFor} onDone={() => setApplyingFor(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  )
}
