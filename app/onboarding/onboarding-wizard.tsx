"use client"

import { useMemo, useRef, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  CircleDot,
  FileUp,
  Loader2,
  Sparkles,
} from "lucide-react"
import { GoogleTranslateSelect } from "@/components/layout/google-translate"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ComboboxInput } from "@/components/ui/combobox-input"
import { DEPARTMENTS, getDepartmentByCode, getDepartmentName } from "@/lib/departments"
import { DepartmentSelect } from "@/components/ui/department-select"
import { Input } from "@/components/ui/input"
import { autoPopulateFromJobTitle, type AutoPopulateResult } from "@/lib/auto-populate"
import { getDisciplineForJobTitle } from "@/lib/job-titles"
import { JobTitleSelect } from "@/components/ui/job-title-select"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { allTimezones, languages } from "@/lib/timezones"
import {
  DISCIPLINE_CATEGORIES,
  DISCIPLINE_CATEGORY_LABEL,
  DISCIPLINE_LABEL,
  WORK_DISCIPLINES,
  disciplinesInCategory,
  type WorkDiscipline,
} from "@/lib/roles"
import {
  ONBOARDING_STEPS,
  ONBOARDING_STEP_COUNT,
  stepProblem,
  type OnboardingData,
  type OnboardingStatus,
  type OnboardingStepKey,
} from "@/lib/onboarding/state"
import { sampleForDiscipline } from "@/lib/onboarding/sample-project"

type WizardView = {
  status: OnboardingStatus
  step: number
  completedAt: string | null
  data: OnboardingData
  grandfathered: boolean
  canRenameTeam: boolean
  teamName: string
  pack: { packKey: string; title: string; sections: string[] } | null
}

type Props = {
  initial: WizardView
  inviteToken: string | null
  account: { name: string; email: string; avatar: string | null }
}

const TIMEZONE_VALUES = new Set(allTimezones.flatMap((group) => group.options.map((option) => option.value)))
const FALLBACK_TIMEZONE = "Africa/Nairobi"

const INDUSTRY_SUGGESTIONS = [
  "Education",
  "Healthcare",
  "Financial services",
  "Government",
  "Manufacturing",
  "Construction",
  "Technology",
  "Retail",
  "Logistics",
  "Energy",
  "Agriculture",
  "Non-profit",
]

function detectedTimezone(): string {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
    return zone && TIMEZONE_VALUES.has(zone) ? zone : FALLBACK_TIMEZONE
  } catch {
    return FALLBACK_TIMEZONE
  }
}

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result ?? "")
      const comma = result.indexOf(",")
      resolve(comma >= 0 ? result.slice(comma + 1) : result)
    }
    reader.onerror = () => reject(new Error("Could not read that file"))
    reader.readAsDataURL(file)
  })
}

// Convert department name to code for the UI
function getDepartmentCodeFromName(name: string | null | undefined): string {
  if (!name) return ""
  const dept = DEPARTMENTS.find((d) => d.name.toLowerCase() === name.toLowerCase())
  return dept?.code ?? ""
}

export function OnboardingWizard({ initial, inviteToken, account }: Props) {
  const router = useRouter()
  const headingRef = useRef<HTMLHeadingElement>(null)

  const [step, setStep] = useState(initial.status === "completed" ? 0 : initial.step)
  const [profile, setProfile] = useState({
    name: initial.data.profile.name ?? account.name ?? "",
    jobTitle: initial.data.profile.jobTitle ?? "",
    department: getDepartmentCodeFromName(initial.data.profile.department),
    location: initial.data.profile.location ?? "",
    timezone:
      initial.data.profile.timezone && TIMEZONE_VALUES.has(initial.data.profile.timezone)
        ? initial.data.profile.timezone
        : detectedTimezone(),
    language: initial.data.profile.language ?? "en-US",
  })
  const [autoPopulated, setAutoPopulated] = useState<AutoPopulateResult>(() =>
    autoPopulateFromJobTitle(initial.data.profile.jobTitle, getDepartmentCodeFromName(initial.data.profile.department)),
  )
  const [workspaceKind, setWorkspaceKind] = useState<OnboardingData["workspace"]["kind"]>(initial.data.workspace.kind)
  const [teamName, setTeamName] = useState(initial.teamName)
  const [invite, setInvite] = useState(inviteToken ?? "")
  const [requestNote, setRequestNote] = useState("")
  const [industry, setIndustry] = useState({
    primary: initial.data.industry.primary ?? "",
    secondary: initial.data.industry.secondary,
    unsure: initial.data.industry.unsure,
  })
  const [secondaryDraft, setSecondaryDraft] = useState("")
  const [disciplines, setDisciplines] = useState<WorkDiscipline[]>(
    initial.data.role.disciplines.length > 0
      ? initial.data.role.disciplines
      : autoPopulated.discipline
        ? [autoPopulated.discipline]
        : [...WORK_DISCIPLINES],
  )
  const [disciplinesTouched, setDisciplinesTouched] = useState(false)
  const [prefs, setPrefs] = useState(initial.data.preferences)
  const [projectMode, setProjectMode] = useState<"none" | "created" | "import" | "sample">(
    initial.data.project.mode === "imported" ? "import" : initial.data.project.mode === "created" || initial.data.project.mode === "sample" ? initial.data.project.mode : "none",
  )
  const [projectForm, setProjectForm] = useState({
    title: initial.data.project.title ?? "",
    description: "",
    startDate: "",
    targetDate: "",
  })
  const [importFile, setImportFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [samplePreviewOpen, setSamplePreviewOpen] = useState(false)
  // The sample the member will actually get, derived from the role step's mapped discipline —
  // the same module the server uses, so the preview cannot drift from what is written.
  const sampleDraft = useMemo(() => sampleForDiscipline(autoPopulated.discipline), [autoPopulated.discipline])

  const current = ONBOARDING_STEPS[step]
  const identity: OnboardingData["profile"] = useMemo(
    () => ({
      name: profile.name.trim() || null,
      jobTitle: profile.jobTitle.trim() || null,
      department: getDepartmentName(profile.department) || profile.department.trim() || null,
      location: profile.location.trim() || null,
      timezone: profile.timezone || null,
      language: profile.language || null,
    }),
    [profile],
  )

  function goTo(next: number) {
    const clamped = Math.min(Math.max(next, 0), ONBOARDING_STEP_COUNT - 1)
    setStep(clamped)
    setError("")
    window.setTimeout(() => headingRef.current?.focus(), 0)
  }

  async function saveOnboarding(patch: Record<string, unknown>, extra: Record<string, unknown> = {}) {
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...extra, onboarding: patch }),
    })
    const json = await res.json().catch(() => null)
    if (!res.ok || !json?.success) throw new Error(json?.message ?? "Could not save this step")
    return json
  }

  async function saveProfile() {
    const res = await fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: profile.name.trim(),
        jobTitle: identity.jobTitle,
        department: identity.department,
        location: identity.location,
        timezone: identity.timezone,
        language: identity.language,
      }),
    })
    const json = await res.json().catch(() => null)
    if (!res.ok || json?.error) throw new Error(json?.error ?? "Could not save your profile")
  }

  async function advance() {
    const key = ONBOARDING_STEPS[step].key
    const problem = stepProblem(key, { ...initial.data, profile: identity })
    if (problem) {
      setError(problem)
      return
    }
    setSaving(true)
    setError("")
    setNotice("")
    try {
      if (key === "welcome") {
        await saveOnboarding({ status: "in_progress", step: 1 })
        goTo(1)
        return
      }
      if (key === "profile") {
        await saveProfile()
        await saveOnboarding({ step: 2, data: { profile: identity } })
        goTo(2)
        return
      }
      if (key === "workspace") {
        if (workspaceKind === "joined") {
          if (!invite.trim()) throw new Error("Paste the invitation link or token you were given.")
          const res = await fetch("/api/onboarding/invitation", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: invite.trim() }),
          })
          const json = await res.json().catch(() => null)
          if (!res.ok) throw new Error(json?.error ?? "That invitation could not be accepted.")
          setNotice(`You joined the workspace as ${json?.data?.role ?? "a member"}.`)
        }
        if (workspaceKind === "requested") {
          const res = await fetch("/api/onboarding/request-access", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ note: requestNote }),
          })
          const json = await res.json().catch(() => null)
          if (!res.ok) throw new Error(json?.error ?? "Could not send the request.")
          setNotice("Your request was sent to the workspace admins.")
        }
        if (workspaceKind === "team" && initial.canRenameTeam && teamName.trim() && teamName.trim() !== initial.teamName) {
          const res = await fetch("/api/team/settings", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ teamName: teamName.trim() }),
          })
          const json = await res.json().catch(() => null)
          if (!res.ok || json?.success === false) throw new Error(json?.error ?? "Could not rename the workspace.")
        }
        await saveOnboarding({ step: 3, data: { workspace: { kind: workspaceKind, teamName: teamName.trim() || null } } })
        goTo(3)
        return
      }
      if (key === "industry") {
        await saveOnboarding({
          step: 4,
          data: { industry: { primary: industry.unsure ? null : industry.primary.trim() || null, secondary: industry.unsure ? [] : industry.secondary, unsure: industry.unsure } },
        })
        goTo(4)
        return
      }
      if (key === "role") {
        await saveOnboarding(
          {
            step: 5,
            data: {
              role: {
                jobTitle: identity.jobTitle,
                department: identity.department,
                disciplines,
              },
            },
          },
          { workDisciplines: disciplines },
        )
        goTo(5)
        return
      }
      if (key === "preferences") {
        await saveOnboarding({ step: 6, data: { preferences: prefs } }, { ...prefs })
        goTo(6)
        return
      }
      if (key === "project") {
        let planId: number | null = null
        let mode: OnboardingData["project"]["mode"] = "none"
        let title: string | null = null

        if (projectMode === "created" || projectMode === "sample") {
          const res = await fetch("/api/onboarding/project", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(projectMode === "sample" ? { sample: true, discipline: autoPopulated.discipline } : projectForm),
          })
          const json = await res.json().catch(() => null)
          if (!res.ok || !json?.success) throw new Error(json?.error ?? "Could not create the project.")
          planId = typeof json.data?.planId === "number" ? json.data.planId : null
          title = projectMode === "sample" ? sampleDraft.title : projectForm.title.trim() || null
          setNotice(json.data?.created ? "Draft project created in the planner." : "That project already exists.")
          mode = projectMode
        }

        if (projectMode === "import") {
          if (!importFile) throw new Error("Choose a text or PDF scope document first.")
          const body = importFile.type === "application/pdf"
            ? { pdf: { mimeType: importFile.type, data: await toBase64(importFile) }, sourceName: importFile.name }
            : { text: await importFile.text(), sourceName: importFile.name }
          const res = await fetch("/api/planner/extract", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
          const json = await res.json().catch(() => null)
          if (!res.ok || !json?.success) throw new Error(json?.message ?? "Could not import that document.")
          planId = typeof json.planId === "number" ? json.planId : null
          mode = "imported"
          setNotice("A draft plan was extracted — review it in the planner.")
        }

        await saveOnboarding({ step: 7, data: { project: { mode, planId, title } } })
        goTo(7)
        return
      }
      goTo(7)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function skip() {
    const key = ONBOARDING_STEPS[step].key
    if (key !== "welcome" && key !== "review") {
      setSaving(true)
      setError("")
      setNotice("")
      try {
        const next = Math.min(step + 1, ONBOARDING_STEP_COUNT - 1)
        await saveOnboarding({ status: "in_progress", step: next })
        goTo(next)
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setSaving(false)
      }
    }
  }

  async function finish() {
    setSaving(true)
    setError("")
    try {
      // The account already knows the name the member skipped past; save it before asking
      // the completion rule to judge it, so skipping the profile step is not a trap.
      if (!initial.data.profile.name && identity.name) {
        await saveOnboarding({ data: { profile: identity } })
      }
      await saveOnboarding({ status: "completed", step: 7 })
      router.push("/dashboard")
      router.refresh()
    } catch (err) {
      setError((err as Error).message)
      setSaving(false)
    }
  }

  async function finishLater() {
    setSaving(true)
    setError("")
    try {
      // "Set up later" has to be recorded as a decision on the gate row, or the dashboard
      // gate sends the member straight back here on the next request.
      const res = await fetch("/api/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "skip" }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) throw new Error(json?.message ?? "Could not save that choice")
      router.push("/dashboard")
      router.refresh()
    } catch (err) {
      setError((err as Error).message)
      setSaving(false)
    }
  }

  function toggleDiscipline(id: WorkDiscipline, checked: boolean) {
    setDisciplinesTouched(true)
    setDisciplines((list) => (checked ? [...list, id] : list.filter((entry) => entry !== id)))
  }

  // The mapped discipline is the default filter until the member says otherwise. When the job title
  // changes and they have not touched the checkboxes, follow it; once they have, leave their choice
  // alone. Saving all 75 for someone whose role maps to one discipline filtered them to nothing.
  function defaultDisciplinesFor(discipline: WorkDiscipline | null | undefined): WorkDiscipline[] {
    return discipline ? [discipline] : [...WORK_DISCIPLINES]
  }

  function addSecondary() {
    const value = secondaryDraft.trim()
    if (!value) return
    setIndustry((state) => ({ ...state, secondary: [...new Set([...state.secondary, value])].slice(0, 12) }))
    setSecondaryDraft("")
  }

  const stepKey: OnboardingStepKey = current.key
  const showBack = step > 0
  const showSkip = stepKey !== "welcome" && stepKey !== "review"

  return (
    <div className="container max-w-5xl py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Workspace setup</p>
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="mt-1 text-2xl font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {current.title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground" aria-live="polite">
            Step {step + 1} of {ONBOARDING_STEP_COUNT}
            {initial.status === "completed" ? " — setup is already complete, so you can re-tread any step." : ""}
          </p>
        </div>
        <GoogleTranslateSelect />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav aria-label="Setup steps">
          <ol className="flex flex-wrap gap-2 lg:flex-col lg:gap-1">
            {ONBOARDING_STEPS.map((entry, index) => {
              const isCurrent = index === step
              const isDone = index < step
              return (
                <li key={entry.key}>
                  <button
                    type="button"
                    onClick={() => goTo(index)}
                    aria-current={isCurrent ? "step" : undefined}
                    className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                      isCurrent
                        ? "bg-primary/10 font-medium text-primary"
                        : isDone
                          ? "text-foreground hover:bg-muted"
                          : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] ${
                        isDone ? "border-primary bg-primary text-primary-foreground" : "border-current"
                      }`}
                      aria-hidden="true"
                    >
                      {isDone ? <Check className="h-3 w-3" /> : index + 1}
                    </span>
                    <span className="truncate">{entry.title}</span>
                  </button>
                </li>
              )
            })}
          </ol>
        </nav>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">{current.title}</CardTitle>
            <CardDescription>{stepDescription(stepKey)}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {error ? (
              <Alert variant="destructive" role="alert">
                <AlertTitle>Not saved</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            {notice ? (
              <Alert>
                <Check className="h-4 w-4" />
                <AlertTitle>Saved</AlertTitle>
                <AlertDescription>{notice}</AlertDescription>
              </Alert>
            ) : null}

            {stepKey === "welcome" ? (
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Eight short steps: your profile, how you work, what you keep an eye on, and a first project if you
                  want one. Every step can be skipped, and nothing here is a permission.
                </p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>Your name and email are already filled in.</li>
                  <li>Work disciplines are a display filter over the same list everyone uses.</li>
                  <li>You can come back through Settings any time.</li>
                </ul>
              </div>
            ) : null}

            {stepKey === "profile" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="onb-name">Name</Label>
                  <Input id="onb-name" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} autoComplete="name" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="onb-email">Email</Label>
                  <Input id="onb-email" value={account.email} readOnly aria-readonly="true" className="bg-muted" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="onb-department">Department</Label>
                  <DepartmentSelect
                    id="onb-department"
                    value={profile.department}
                    onValueChange={(value) => {
                      const next = autoPopulateFromJobTitle("", value)
                      setProfile({ ...profile, department: value, jobTitle: "" })
                      setAutoPopulated(next)
                      if (!disciplinesTouched) setDisciplines(defaultDisciplinesFor(next.discipline))
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="onb-role">Job title</Label>
                  <JobTitleSelect
                    id="onb-role"
                    value={profile.jobTitle}
                    onValueChange={(value) => {
                      const next = autoPopulateFromJobTitle(value, profile.department)
                      setProfile({ ...profile, jobTitle: value })
                      setAutoPopulated(next)
                      if (!disciplinesTouched) setDisciplines(defaultDisciplinesFor(next.discipline))
                    }}
                    departmentCode={profile.department || null}
                  />
                  {autoPopulated.discipline && (
                    <div className="space-y-1 rounded-md bg-muted p-2 text-xs">
                      <p className="font-medium">Auto-populated from job title:</p>
                      <p>Discipline: {DISCIPLINE_LABEL[autoPopulated.discipline]}</p>
                      <p>Role pack: {autoPopulated.rolePack}</p>
                      {autoPopulated.careerLadder && <p>Career ladder: {autoPopulated.careerLadder}</p>}
                    </div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="onb-location">Location</Label>
                  <Input id="onb-location" value={profile.location} onChange={(e) => setProfile({ ...profile, location: e.target.value })} autoComplete="address-level2" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="onb-timezone">Timezone</Label>
                  <Select value={profile.timezone} onValueChange={(value) => setProfile({ ...profile, timezone: value })}>
                    <SelectTrigger id="onb-timezone">
                      <SelectValue placeholder="Choose a timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      {allTimezones.map((group) => (
                        <SelectGroup key={group.label}>
                          <SelectLabel>{group.label}</SelectLabel>
                          {group.options.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="onb-language">Language</Label>
                  <Select value={profile.language} onValueChange={(value) => setProfile({ ...profile, language: value })}>
                    <SelectTrigger id="onb-language">
                      <SelectValue placeholder="Choose a language" />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : null}

            {stepKey === "workspace" ? (
              <div className="space-y-4">
                <RadioGroup value={workspaceKind} onValueChange={(value) => setWorkspaceKind(value as typeof workspaceKind)}>
                  <div className="flex items-start gap-3 rounded-md border p-3">
                    <RadioGroupItem value="personal" id="ws-personal" className="mt-0.5" />
                    <div>
                      <Label htmlFor="ws-personal">Just me for now</Label>
                      <p className="text-xs text-muted-foreground">Nothing changes; you work in your own space.</p>
                    </div>
                  </div>
                  {initial.canRenameTeam ? (
                    <div className="flex items-start gap-3 rounded-md border p-3">
                      <RadioGroupItem value="team" id="ws-team" className="mt-0.5" />
                      <div>
                        <Label htmlFor="ws-team">Name the workspace</Label>
                        <p className="text-xs text-muted-foreground">Only a workspace admin can rename it, and this is that control.</p>
                      </div>
                    </div>
                  ) : null}
                  <div className="flex items-start gap-3 rounded-md border p-3">
                    <RadioGroupItem value="joined" id="ws-joined" className="mt-0.5" />
                    <div>
                      <Label htmlFor="ws-joined">Accept an invitation</Label>
                      <p className="text-xs text-muted-foreground">Paste the link or token an admin sent you.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-md border p-3">
                    <RadioGroupItem value="requested" id="ws-requested" className="mt-0.5" />
                    <div>
                      <Label htmlFor="ws-requested">Ask to join</Label>
                      <p className="text-xs text-muted-foreground">Sends a note to the workspace admins; grants nothing by itself.</p>
                    </div>
                  </div>
                </RadioGroup>

                {!initial.canRenameTeam ? (
                  <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                    This workspace is called <span className="font-medium text-foreground">{initial.teamName}</span>.
                    Only a workspace admin can rename it.
                  </p>
                ) : null}

                {workspaceKind === "team" && initial.canRenameTeam ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="ws-name">Workspace name</Label>
                    <Input id="ws-name" value={teamName} onChange={(e) => setTeamName(e.target.value)} />
                  </div>
                ) : null}

                {workspaceKind === "joined" ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="ws-invite">Invitation link or token</Label>
                    <Input id="ws-invite" value={invite} onChange={(e) => setInvite(e.target.value)} placeholder="/onboarding?invite=…" />
                    <p className="text-xs text-muted-foreground">
                      The token is bound to your email address and can be used once.
                    </p>
                  </div>
                ) : null}

                {workspaceKind === "requested" ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="ws-note">Note for the admins (optional)</Label>
                    <Textarea id="ws-note" value={requestNote} onChange={(e) => setRequestNote(e.target.value)} rows={3} maxLength={500} />
                  </div>
                ) : null}
              </div>
            ) : null}

            {stepKey === "industry" ? (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="ind-primary">Primary industry</Label>
                  <ComboboxInput
                    id="ind-primary"
                    value={industry.primary}
                    onValueChange={(value) => setIndustry({ ...industry, primary: value, unsure: false })}
                    options={INDUSTRY_SUGGESTIONS}
                    placeholder="e.g. Education"
                    describedBy="ind-primary-help"
                  />
                  <p id="ind-primary-help" className="text-xs text-muted-foreground">
                    A suggestion, never a restriction.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="ind-secondary">Also relevant</Label>
                  <div className="flex gap-2">
                    <Input
                      id="ind-secondary"
                      value={secondaryDraft}
                      onChange={(e) => setSecondaryDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          addSecondary()
                        }
                      }}
                      placeholder="Add another industry"
                    />
                    <Button type="button" variant="outline" onClick={addSecondary} disabled={!secondaryDraft.trim()}>
                      Add
                    </Button>
                  </div>
                  {industry.secondary.length > 0 ? (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {industry.secondary.map((entry) => (
                        <Badge key={entry} variant="secondary" className="gap-1">
                          {entry}
                          <button
                            type="button"
                            aria-label={`Remove ${entry}`}
                            className="text-muted-foreground hover:text-foreground"
                            onClick={() => setIndustry({ ...industry, secondary: industry.secondary.filter((item) => item !== entry) })}
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="ind-unsure"
                    checked={industry.unsure}
                    onCheckedChange={(checked) =>
                      setIndustry({ ...industry, unsure: checked === true, primary: checked === true ? "" : industry.primary })
                    }
                  />
                  <Label htmlFor="ind-unsure" className="font-normal">
                    Not sure yet
                  </Label>
                </div>
              </div>
            ) : null}

            {stepKey === "role" ? (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="role-department">Department</Label>
                    <DepartmentSelect
                      id="role-department"
                      value={profile.department}
                      onValueChange={(value) => {
                        const next = autoPopulateFromJobTitle("", value)
                        setProfile({ ...profile, department: value, jobTitle: "" })
                        setAutoPopulated(next)
                        if (!disciplinesTouched) setDisciplines(defaultDisciplinesFor(next.discipline))
                      }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="role-title">Job title</Label>
                    <JobTitleSelect
                      id="role-title"
                      value={profile.jobTitle}
                      onValueChange={(value) => {
                        const next = autoPopulateFromJobTitle(value, profile.department)
                        setProfile({ ...profile, jobTitle: value })
                        setAutoPopulated(next)
                        if (!disciplinesTouched) setDisciplines(defaultDisciplinesFor(next.discipline))
                      }}
                      departmentCode={profile.department || null}
                    />
                  </div>
                </div>
                {autoPopulated.discipline && (
                  <div className="rounded-md bg-muted p-3 text-sm">
                    <p className="font-medium mb-1">Auto-populated from job title:</p>
                    <p>Discipline: {DISCIPLINE_LABEL[autoPopulated.discipline]}</p>
                    <p>Role pack: {autoPopulated.rolePack}</p>
                    {autoPopulated.careerLadder && <p>Career ladder: {autoPopulated.careerLadder}</p>}
                    <p>Report template: {autoPopulated.reportTemplate}</p>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    This is a display filter, not a permission. We start with your role&rsquo;s discipline &mdash; add others only if your work spans them.
                  </p>
                  <div className="flex gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => { setDisciplinesTouched(true); setDisciplines([...WORK_DISCIPLINES]) }}>
                      Select all
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => { setDisciplinesTouched(true); setDisciplines([]) }}>
                      Clear
                    </Button>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {DISCIPLINE_CATEGORIES.map((category) => (
                    <fieldset key={category} className="rounded-md border p-3">
                      <legend className="px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {DISCIPLINE_CATEGORY_LABEL[category]}
                      </legend>
                      <div className="space-y-1.5">
                        {disciplinesInCategory(category).map((id) => (
                          <div key={id} className="flex items-center gap-2">
                            <Checkbox
                              id={`disc-${id}`}
                              checked={disciplines.includes(id)}
                              onCheckedChange={(checked) => toggleDiscipline(id, checked === true)}
                            />
                            <Label htmlFor={`disc-${id}`} className="font-normal">
                              {DISCIPLINE_LABEL[id]}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </fieldset>
                  ))}
                </div>
              </div>
            ) : null}

            {stepKey === "preferences" ? (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="pref-view">Default sprint view</Label>
                  <Select value={prefs.sprintView} onValueChange={(value) => setPrefs({ ...prefs, sprintView: value as typeof prefs.sprintView })}>
                    <SelectTrigger id="pref-view">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="board">Board</SelectItem>
                      <SelectItem value="list">List</SelectItem>
                      <SelectItem value="grid">Grid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  {(
                    [
                      ["notifyEmail", "Email notifications"],
                      ["notifyRealtime", "In-app notifications"],
                      ["notifyPush", "Push notifications"],
                    ] as const
                  ).map(([key, label]) => (
                    <div key={key} className="flex items-center gap-2">
                      <Checkbox
                        id={`pref-${key}`}
                        checked={prefs[key]}
                        onCheckedChange={(checked) => setPrefs({ ...prefs, [key]: checked === true })}
                      />
                      <Label htmlFor={`pref-${key}`} className="font-normal">
                        {label}
                      </Label>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  These are saved preferences. What actually arrives still follows what the workspace can deliver.
                </p>
              </div>
            ) : null}

            {stepKey === "project" ? (
              <div className="space-y-4">
                <RadioGroup value={projectMode} onValueChange={(value) => setProjectMode(value as typeof projectMode)}>
                  <div className="flex items-start gap-3 rounded-md border p-3">
                    <RadioGroupItem value="none" id="proj-none" className="mt-0.5" />
                    <div>
                      <Label htmlFor="proj-none">Nothing yet</Label>
                      <p className="text-xs text-muted-foreground">Start from the planner whenever you are ready.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-md border p-3">
                    <RadioGroupItem value="created" id="proj-created" className="mt-0.5" />
                    <div>
                      <Label htmlFor="proj-created">Create an empty draft</Label>
                      <p className="text-xs text-muted-foreground">A draft in the planner. No tasks are created.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-md border p-3">
                    <RadioGroupItem value="import" id="proj-import" className="mt-0.5" />
                    <div>
                      <Label htmlFor="proj-import">Import a scope document</Label>
                      <p className="text-xs text-muted-foreground">Text or PDF. The extracted plan stays a draft for you to review.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-md border p-3">
                    <RadioGroupItem value="sample" id="proj-sample" className="mt-0.5" />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="proj-sample">Use the sample project</Label>
                        <Badge variant="outline">Sample</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        A first-week draft tailored to {sampleDraft.discipline ? DISCIPLINE_LABEL[sampleDraft.discipline].toLowerCase() : "a general role"}. A labelled draft with three starter items. Never tasks.
                      </p>
                    </div>
                  </div>
                </RadioGroup>

                {projectMode === "sample" ? (
                  <Collapsible open={samplePreviewOpen} onOpenChange={setSamplePreviewOpen} className="rounded-md border bg-muted/30">
                    <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm font-medium hover:bg-muted/50">
                      <span className="flex items-center gap-2">
                        <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
                        See what you&apos;ll get
                      </span>
                      <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${samplePreviewOpen ? "rotate-180" : ""}`} />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-3 px-3 pb-3">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">{sampleDraft.title}</p>
                        <p className="text-xs text-muted-foreground">{sampleDraft.summary}</p>
                      </div>
                      <ul className="space-y-2">
                        {sampleDraft.items.map((item) => (
                          <li key={item.title} className="flex gap-2 rounded-md border bg-background p-2.5">
                            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                            <div className="space-y-0.5">
                              <p className="text-sm font-medium">{item.title}</p>
                              <p className="text-xs text-muted-foreground">{item.description}</p>
                            </div>
                          </li>
                        ))}
                      </ul>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        It stays a draft you can rename or delete. Want your own scope? Choose &ldquo;Import a scope document&rdquo; instead.
                      </p>
                    </CollapsibleContent>
                  </Collapsible>
                ) : null}

                {projectMode === "created" ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="proj-title">Project name</Label>
                      <Input id="proj-title" value={projectForm.title} onChange={(e) => setProjectForm({ ...projectForm, title: e.target.value })} />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="proj-desc">Description</Label>
                      <Textarea id="proj-desc" rows={3} value={projectForm.description} onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="proj-start">Start</Label>
                      <Input id="proj-start" type="date" value={projectForm.startDate} onChange={(e) => setProjectForm({ ...projectForm, startDate: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="proj-target">Target</Label>
                      <Input id="proj-target" type="date" value={projectForm.targetDate} onChange={(e) => setProjectForm({ ...projectForm, targetDate: e.target.value })} />
                    </div>
                  </div>
                ) : null}

                {projectMode === "import" ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="proj-file">Scope document</Label>
                    <Input
                      id="proj-file"
                      type="file"
                      accept=".txt,.md,.pdf,text/plain,application/pdf"
                      onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
                    />
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <FileUp className="h-3.5 w-3.5" /> Reads the document and saves a draft plan; nothing is promoted.
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}

            {stepKey === "review" ? (
              <div className="space-y-4">
                <ReviewRow title="Profile" onEdit={() => goTo(1)}>
                  {identity.name ?? "No name yet"}
                  {identity.jobTitle ? ` · ${identity.jobTitle}` : ""}
                  {identity.department ? ` · ${identity.department}` : ""}
                  {identity.timezone ? ` · ${identity.timezone}` : ""}
                </ReviewRow>
                <ReviewRow title="Workspace" onEdit={() => goTo(2)}>
                  {workspaceKind === "personal"
                    ? `Just me for now (workspace: ${initial.teamName})`
                    : workspaceKind === "team"
                      ? `Naming the workspace: ${teamName || initial.teamName}`
                      : workspaceKind === "joined"
                        ? "Accepting an invitation"
                        : "Asked to join the workspace"}
                </ReviewRow>
                <ReviewRow title="Industry" onEdit={() => goTo(3)}>
                  {industry.unsure
                    ? "Not sure yet"
                    : industry.primary
                      ? [industry.primary, ...industry.secondary].join(", ")
                      : "Skipped"}
                </ReviewRow>
                <ReviewRow title="Disciplines" onEdit={() => goTo(4)}>
                  {disciplines.length === WORK_DISCIPLINES.length
                    ? "All work disciplines (nothing filtered)"
                    : `${disciplines.length} selected${disciplinesTouched ? "" : " (matched to your role)"}`}
                </ReviewRow>
                <ReviewRow title="Project management" onEdit={() => goTo(5)}>
                  {prefs.sprintView} view · email {prefs.notifyEmail ? "on" : "off"} · in-app {prefs.notifyRealtime ? "on" : "off"} · push {prefs.notifyPush ? "on" : "off"}
                </ReviewRow>
                <ReviewRow title="First project" onEdit={() => goTo(6)}>
                  {projectMode === "none"
                    ? "Nothing yet"
                    : projectMode === "created"
                      ? projectForm.title || "Unnamed draft"
                      : projectMode === "import"
                        ? importFile?.name ?? "No document chosen"
                        : sampleDraft.title}
                </ReviewRow>
                {initial.pack ? (
                  <p className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                    <Sparkles className="h-3.5 w-3.5" />
                    {initial.pack.title} will order the dashboard for you.
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-2 border-t pt-4">
              {showBack ? (
                <Button type="button" variant="ghost" onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={saving}>
                  <ArrowLeft className="mr-1 h-4 w-4" /> Back
                </Button>
              ) : null}

              <div className="ml-auto flex flex-wrap items-center gap-2">
                <Button type="button" variant="ghost" onClick={finishLater} disabled={saving}>
                  Set up later
                </Button>
                {showSkip ? (
                  <Button type="button" variant="outline" onClick={skip} disabled={saving}>
                    Skip
                  </Button>
                ) : null}
                {stepKey === "review" ? (
                  <Button type="button" onClick={finish} disabled={saving}>
                    {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Check className="mr-1 h-4 w-4" />}
                    Go to My Dashboard
                  </Button>
                ) : (
                  <Button type="button" onClick={advance} disabled={saving}>
                    {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-1 h-4 w-4" />}
                    {stepKey === "welcome" ? "Start" : "Save and continue"}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function ReviewRow({ title, onEdit, children }: { title: string; onEdit: () => void; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-md border p-3">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
        <p className="mt-0.5 text-sm">{children}</p>
      </div>
      <Button type="button" size="sm" variant="ghost" onClick={onEdit}>
        <CircleDot className="mr-1 h-3.5 w-3.5" /> Edit
      </Button>
    </div>
  )
}

function stepDescription(key: OnboardingStepKey): string {
  switch (key) {
    case "welcome":
      return "What setup covers, and how to leave it."
    case "profile":
      return "The name and email already on your account, plus the details colleagues see."
    case "workspace":
      return "Join a workspace with an invitation, ask to join, or keep working on your own."
    case "industry":
      return "What sector you work in. Suggestions only — nothing is enforced."
    case "role":
      return "Your job title and which disciplines you want the workspace filtered to."
    case "preferences":
      return "How sprints are shown to you and what the workspace may notify you about."
    case "project":
      return "Start a draft plan in the planner. Drafts never become tasks without you."
    case "review":
      return "Check the answers, then finish. Everything stays editable in Settings."
  }
}

export default OnboardingWizard