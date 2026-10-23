// DEMO DATA — illustrative sample used by the sandbox; no real customer data.

import type { Teammate, Ticket } from "@/lib/sandbox/plan"

export const demoBacklog: Ticket[] = [
  { id: "JV-101", title: "Auth token refresh flow", points: 5, skill: "backend" },
  { id: "JV-104", title: "Sprint retro summary view", points: 3, skill: "frontend" },
  { id: "JV-108", title: "Export CSV endpoint", points: 2, skill: "backend" },
  { id: "JV-112", title: "CI pipeline speedup", points: 3, skill: "infra" },
  { id: "JV-115", title: "Onboarding empty states", points: 4, skill: "frontend" },
  { id: "JV-118", title: "Regression pack for billing", points: 3, skill: "qa" },
  { id: "JV-121", title: "Search ranking fix", points: 5, skill: "backend" },
  { id: "JV-124", title: "Staging environment rebuild", points: 5, skill: "infra" },
  { id: "JV-127", title: "Wellbeing check-in modal", points: 3, skill: "frontend" },
]

export const demoTeam: Teammate[] = [
  { name: "Ada Kwarteng", initials: "AK", capacityPoints: 8, skills: ["frontend", "qa"] },
  { name: "Jonas Meier", initials: "JM", capacityPoints: 14, skills: ["backend"] },
  { name: "Tessa Pham", initials: "TP", capacityPoints: 8, skills: ["infra"] },
  { name: "Rin Sato", initials: "RS", capacityPoints: 12, skills: ["frontend"] },
]
