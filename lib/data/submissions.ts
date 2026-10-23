import { createJsonCollection } from "@/lib/data/json-store"

export type SubmissionKind = "contact" | "demo" | "quote" | "careers"

export interface SubmissionRecord {
  id: string
  kind: SubmissionKind
  createdAt: string
  payload: Record<string, string>
}

const submissions = createJsonCollection<SubmissionRecord>("submissions")

export const submissionStore = {
  add: (kind: SubmissionKind, payload: Record<string, string>) =>
    submissions.add({ kind, createdAt: new Date().toISOString(), payload }),
  list: () => submissions.list(),
}
