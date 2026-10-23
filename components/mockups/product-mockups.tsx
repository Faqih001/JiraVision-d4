// Product UI mockups built in code (no screenshots, no stock photos).
// Decorative by design: aria-hidden, colors only from design tokens.

const card = "rounded-md border bg-card px-3 py-2 shadow-soft"
const chip = "inline-block rounded-sm px-1.5 py-0.5 text-[10px] font-medium"

function MockFrame({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div aria-hidden="true" className="select-none">
      <div className="rounded-lg border bg-surface p-3 shadow-soft-md">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
          <span className="flex gap-1.5">
            <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />
            <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />
            <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />
          </span>
        </div>
        <div className="rounded-md bg-card p-3">{children}</div>
      </div>
    </div>
  )
}

export function SprintBoardMock() {
  return (
    <MockFrame label="Sprint 24 · draft plan">
      <div className="grid grid-cols-3 gap-2 text-xs">
        {[
          {
            col: "To do",
            items: [
              { t: "Auth token refresh", who: "AK", load: "M" },
              { t: "Export CSV endpoint", who: "JM", load: "S" },
            ],
          },
          {
            col: "In progress",
            items: [
              { t: "Billing webhooks", who: "RS", load: "L" },
              { t: "Onboarding empty states", who: "AK", load: "S" },
            ],
          },
          {
            col: "In review",
            items: [
              { t: "Search ranking fix", who: "JM", load: "M" },
              { t: "Docs: API v2", who: "TP", load: "S" },
            ],
          },
        ].map((c) => (
          <div key={c.col} className="space-y-2">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{c.col}</div>
            {c.items.map((i) => (
              <div key={i.t} className={card}>
                <div className="mb-1.5 leading-snug text-foreground">{i.t}</div>
                <div className="flex items-center justify-between">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[9px] font-semibold text-primary">
                    {i.who}
                  </span>
                  <span className={`${chip} bg-muted text-muted-foreground`}>{i.load}</span>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="mt-2 rounded-md border border-dashed border-primary/40 bg-primary/5 px-3 py-2 text-xs text-primary">
        AI draft · 3 rationale notes · awaiting your approval
      </div>
    </MockFrame>
  )
}

export function WellbeingMock() {
  const bars = [
    { name: "Ada", h: 42, tone: "bg-chart-moss" },
    { name: "Bo", h: 58, tone: "bg-chart-moss" },
    { name: "Cy", h: 76, tone: "bg-chart-stone" },
    { name: "Di", h: 94, tone: "bg-chart-clay" },
    { name: "El", h: 50, tone: "bg-chart-moss" },
  ]
  return (
    <MockFrame label="Team load · this week">
      <div className="flex h-32 items-end gap-3 px-1">
        {bars.map((b) => (
          <div key={b.name} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
            <div className={`w-full rounded-t-sm ${b.tone}`} style={{ height: `${b.h}%` }} />
            <span className="text-[10px] text-muted-foreground">{b.name}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between rounded-md bg-muted/60 px-3 py-2 text-xs">
        <span className="text-muted-foreground">1 member above threshold</span>
        <span className="font-medium text-primary">Suggest rebalance</span>
      </div>
    </MockFrame>
  )
}

export function SkillTreeMock() {
  return (
    <MockFrame label="Skill path · Backend">
      <svg viewBox="0 0 280 120" className="w-full" role="presentation">
        <line x1="40" y1="95" x2="120" y2="60" stroke="currentColor" className="text-border" strokeWidth="2" />
        <line x1="120" y1="60" x2="200" y2="90" stroke="currentColor" className="text-border" strokeWidth="2" />
        <line x1="120" y1="60" x2="210" y2="30" stroke="currentColor" className="text-primary" strokeWidth="2" strokeDasharray="4 3" />
        <circle cx="40" cy="95" r="14" className="fill-primary" />
        <text x="40" y="98" textAnchor="middle" className="fill-primary-foreground" fontSize="9">
          API
        </text>
        <circle cx="120" cy="60" r="14" className="fill-primary" />
        <text x="120" y="63" textAnchor="middle" className="fill-primary-foreground" fontSize="9">
          Events
        </text>
        <circle cx="200" cy="90" r="14" className="fill-card stroke-border" strokeWidth="2" />
        <text x="200" y="93" textAnchor="middle" className="fill-muted-foreground" fontSize="9">
          Queue
        </text>
        <circle cx="210" cy="30" r="14" className="fill-card stroke-primary" strokeWidth="2" />
        <text x="210" y="33" textAnchor="middle" className="fill-primary" fontSize="9">
          Sharding
        </text>
      </svg>
      <div className="mt-1 text-center text-xs text-muted-foreground">2 of 4 mastered · reviewing counts too</div>
    </MockFrame>
  )
}

export function EquityMock() {
  const rows = [
    { label: "Feature work", a: 62, b: 38 },
    { label: "Review & QA", a: 44, b: 56 },
    { label: "Mentoring", a: 28, b: 72 },
  ]
  return (
    <MockFrame label="Work distribution · quarter">
      <div className="space-y-3 text-xs">
        {rows.map((r) => (
          <div key={r.label}>
            <div className="mb-1 flex justify-between text-muted-foreground">
              <span>{r.label}</span>
              <span>{r.a}/{r.b}</span>
            </div>
            <div className="flex h-2 overflow-hidden rounded-full bg-muted">
              <div className="bg-chart-pine" style={{ width: `${r.a}%` }} />
              <div className="bg-chart-stone" style={{ width: `${r.b}%` }} />
            </div>
          </div>
        ))}
        <div className="rounded-md bg-muted/60 px-3 py-2 text-[11px] text-muted-foreground">
          Method: hours logged per category, team-level only · view formula
        </div>
      </div>
    </MockFrame>
  )
}

export const mockups = {
  sprint: SprintBoardMock,
  wellbeing: WellbeingMock,
  skill: SkillTreeMock,
  equity: EquityMock,
} as const

export type MockupKind = keyof typeof mockups
