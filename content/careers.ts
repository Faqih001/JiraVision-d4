// Careers data — single source for /careers.
// NOTE(PLACEHOLDER): the openings below were inherited from the v0 site and are
// illustrative. Owner must confirm which roles are genuinely open (and add real
// descriptions) before this page goes live publicly.

export interface JobOpening {
  id: string
  title: string
  department: "Engineering" | "Design" | "Product" | "Customer Success"
  location: string
  type: "Full-time" | "Contract"
  summary: string
}

export const jobOpenings: JobOpening[] = [
  {
    id: "sr-frontend",
    title: "Senior Frontend Engineer",
    department: "Engineering",
    location: "Remote (Africa / EU time zones)",
    type: "Full-time",
    summary: "Own our Next.js marketing site and product surfaces; care about accessibility and calm UI.",
  },
  {
    id: "product-designer",
    title: "Product Designer",
    department: "Design",
    location: "Remote",
    type: "Full-time",
    summary: "Shape wellbeing-aware planning flows with research, prototypes and a light design touch.",
  },
  {
    id: "ai-research",
    title: "AI Research Scientist",
    department: "Engineering",
    location: "Remote",
    type: "Full-time",
    summary: "Make sprint suggestions explainable and fair; publish our evaluation methods.",
  },
  {
    id: "csm",
    title: "Customer Success Manager",
    department: "Customer Success",
    location: "Nairobi or Remote",
    type: "Full-time",
    summary: "Guide teams from trial to habit — onboarding, health checks, and honest feedback loops.",
  },
]

export const careersValues = [
  {
    title: "Humane by design",
    body: "We build software that protects focus, rest and fairness — and we hold ourselves to the same cadence.",
  },
  {
    title: "Write it down",
    body: "Async-first documentation, decisions and rationale. Your work speaks while you sleep.",
  },
  {
    title: "Remote-first, Kenya-rooted",
    body: "Distributed across time zones with an anchor team around Nairobi. Overlap beats overtime.",
  },
]

export const careersBenefits = [
  { title: "Competitive compensation", body: "Salary benchmarked to remote-market ranges, reviewed twice a year." },
  { title: "Health cover", body: "Medical stipend for you and dependents, whichever plan suits you best." },
  { title: "Flexible time off", body: "Unlimited vacation with a real minimum — we ask you to actually rest." },
  { title: "Learning budget", body: "Courses, conferences and tools to keep your craft sharp." },
]

// General applications always welcome even when no role fits.
export const careersContactNote = {
  body: "Don't see a role that fits? Send a general application — we keep every one on file.",
  email: "careers@jiravision.com",
}
