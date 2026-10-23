"use client"

import { useMemo, useState } from "react"
import { Check, Hammer, Lock, RotateCcw, ShieldCheck, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import { Section, SectionHeading } from "@/components/sections/section"
import {
  behaviorAttribution,
  behaviors,
  branches,
  members,
  skillNodes,
  teamLevels,
} from "@/content/gamification-demo"
import { computeDemo, xpByMembers, type BranchId, type CheckedBehaviors } from "@/lib/gamification/xp"
import { cn } from "@/lib/utils"

const branchIcons: Record<BranchId, typeof Hammer> = {
  craft: Hammer,
  collaboration: Users,
  stewardship: ShieldCheck,
}

const branchNameById: Record<BranchId, string> = {
  craft: "Craft",
  collaboration: "Collaboration",
  stewardship: "Stewardship",
}

export function GamificationDemo() {
  const [checked, setChecked] = useState<CheckedBehaviors>({})
  const [teamLevelOnly, setTeamLevelOnly] = useState(true)
  const [optIn, setOptIn] = useState(true)

  const demo = useMemo(
    () => computeDemo({ behaviors, nodes: skillNodes, levels: teamLevels, checked }),
    [checked],
  )
  const standings = useMemo(
    () => xpByMembers(behaviors, checked, behaviorAttribution, members),
    [checked],
  )

  const toggleBehavior = (id: string, on: boolean) => {
    setChecked((prev) => ({ ...prev, [id]: on }))
  }

  const participationLocked = !optIn

  return (
    <Section id="gamification" bg="shapes">
      <div className="relative z-10">
        <Badge variant="outline" className="mb-3">
          DEMO
        </Badge>
        <SectionHeading
          eyebrow="Gamification playground"
          title="A skill tree that rewards how good teams actually work"
          intro="A toy version of the real thing — you decide what counts, and nobody competes on speed."
        />

        <div className="grid gap-8 lg:grid-cols-12">
          <div
            className={cn(
              "space-y-6 transition-opacity duration-200 lg:col-span-5",
              participationLocked && "opacity-50",
            )}
          >
            <Card>
              <CardHeader>
                <CardTitle>Recognised behaviours</CardTitle>
                <CardDescription>
                  Tick what the team did this week. Every point here was chosen by the team, not by us.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3" role="group" aria-label="Recognised behaviours checklist">
                  {behaviors.map((behavior) => (
                    <div key={behavior.id} className="flex items-start gap-3">
                      <Checkbox
                        id={`beh-${behavior.id}`}
                        className="mt-0.5"
                        checked={checked[behavior.id] === true}
                        disabled={participationLocked}
                        onCheckedChange={(on) => toggleBehavior(behavior.id, on === true)}
                      />
                      <label htmlFor={`beh-${behavior.id}`} className="flex-1 cursor-pointer text-sm leading-snug">
                        <span className={cn("font-medium", checked[behavior.id] === true ? "text-foreground" : "text-foreground/80")}>
                          {behavior.label}
                        </span>
                        <span className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                          <span>+{behavior.points} XP</span>
                          <span aria-hidden="true">·</span>
                          <span>{branchNameById[behavior.branch]}</span>
                        </span>
                      </label>
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="justify-end">
                <Button variant="ghost" size="sm" onClick={() => setChecked({})}>
                  <RotateCcw aria-hidden="true" />
                  Reset
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Guardrails</CardTitle>
                <CardDescription>The two switches the real product ships with. Flip them and watch what changes.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <label htmlFor="guard-team-only" className="text-sm font-medium leading-snug">
                      Team-level recognition only (no individual rankings)
                    </label>
                    <p className="mt-1 text-xs text-muted-foreground">
                      On: the XP UI shows branch totals for the team. Off: you can see exactly why we default this on.
                    </p>
                  </div>
                  <Switch
                    id="guard-team-only"
                    checked={teamLevelOnly}
                    onCheckedChange={setTeamLevelOnly}
                    aria-label="Team-level recognition only"
                  />
                </div>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <label htmlFor="guard-opt-in" className="text-sm font-medium leading-snug">
                      Opt-in participation
                    </label>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Recognition only works when people choose it. The playground respects that.
                    </p>
                  </div>
                  <Switch
                    id="guard-opt-in"
                    checked={optIn}
                    onCheckedChange={setOptIn}
                    aria-label="Opt-in participation"
                  />
                </div>
                {!optIn && (
                  <p className="rounded-md bg-muted px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                    With opt-in off, this is surveillance — we don&apos;t ship that configuration for wellbeing data.
                  </p>
                )}
                {!teamLevelOnly && (
                  <div>
                    <p className="text-xs font-medium">Individual standings (hidden by the shipped default)</p>
                    <ul className="mt-2 space-y-1.5">
                      {standings.length === 0 && (
                        <li className="text-xs text-muted-foreground">Tick a few behaviours to see the view this guardrail hides.</li>
                      )}
                      {standings.map((member, i) => (
                        <li key={member.initials} className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2">
                            <span className="w-4 text-xs tabular-nums text-muted-foreground">{i + 1}.</span>
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                              {member.initials}
                            </span>
                          </span>
                          <span className="text-xs tabular-nums text-muted-foreground">{member.xp} XP</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div
            className={cn(
              "space-y-6 transition-opacity duration-200 lg:col-span-7",
              participationLocked && "opacity-50",
            )}
          >
            <Card>
              <CardHeader>
                <CardTitle>Skill tree</CardTitle>
                <CardDescription>
                  Three branches, three nodes each. Unlocks come from recognised behaviours, never from ticket speed.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-3">
                  {branches.map((branch) => {
                    const BranchIcon = branchIcons[branch.id]
                    const nodes = skillNodes.filter((node) => node.branch === branch.id)
                    return (
                      <div key={branch.id} className="rounded-lg border border-border bg-card p-3">
                        <div className="mb-3 flex items-center justify-between gap-2">
                          <span className="flex items-center gap-1.5 text-sm font-medium">
                            <BranchIcon className="h-4 w-4 text-primary" aria-hidden="true" />
                            {branch.name}
                          </span>
                          {teamLevelOnly && (
                            <span className="text-xs tabular-nums text-muted-foreground">{demo.branchXp[branch.id]} XP</span>
                          )}
                        </div>
                        <ul className="space-y-0">
                          {nodes.map((node, i) => {
                            const unlocked = demo.unlocks[node.id] === true
                            return (
                              <li key={node.id}>
                                {i > 0 && (
                                  <div
                                    className={cn("mx-auto h-4 w-px transition-colors duration-200", unlocked ? "bg-primary/50" : "bg-border")}
                                    aria-hidden="true"
                                  />
                                )}
                                <div
                                  className={cn(
                                    "rounded-md border px-2.5 py-2 transition-colors duration-200",
                                    unlocked ? "border-primary bg-primary/5" : "border-border bg-muted/40",
                                  )}
                                >
                                  <div className="flex items-center gap-1.5">
                                    {unlocked ? (
                                      <Check className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                                    ) : (
                                      <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                                    )}
                                    <span className={cn("text-xs font-medium", unlocked ? "text-foreground" : "text-muted-foreground")}>
                                      {node.name}
                                    </span>
                                  </div>
                                  {unlocked ? (
                                    <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{node.description}</p>
                                  ) : (
                                    <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                                      Locked · unlocks at {node.threshold} {branch.name} XP
                                    </p>
                                  )}
                                </div>
                              </li>
                            )
                          })}
                        </ul>
                        <p className="mt-3 text-[11px] leading-snug text-muted-foreground">{branch.blurb}</p>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2">
                  <span>
                    Level {demo.level.level} · {demo.level.title}
                    {!teamLevelOnly && (
                      <span className="ml-2 align-middle text-[10px] font-semibold uppercase tracking-wide text-clay">
                        Guardrail off
                      </span>
                    )}
                  </span>
                  <span className="text-sm font-normal tabular-nums text-muted-foreground">{demo.totalXp} XP</span>
                </CardTitle>
                <CardDescription>
                  {demo.level.nextMinXp !== null
                    ? `${demo.totalXp} of ${demo.level.nextMinXp} XP toward level ${demo.level.level + 1} — “${demo.level.nextTitle}”.`
                    : "Top team level reached."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Progress value={demo.level.percent} className="h-2" aria-label="Progress toward next team level" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Section>
  )
}
