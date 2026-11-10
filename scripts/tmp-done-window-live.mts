// READ-ONLY verification of the Done-window read against production. Calls the same
// getPaginatedTasks the kanban uses, for each window, and prints what the board would receive.
// No writes, no DDL.
import { getPaginatedTasks } from "@/lib/data-access"
import { doneWindowInstants } from "@/lib/tasks/completed-on"

const TZ = "Africa/Nairobi"
const DAY = "2026-11-10"

for (const window of ["all", "week", "day"] as const) {
  const bounds = doneWindowInstants(window, DAY, TZ)
  const result = await getPaginatedTasks(1, 200, { memberUserId: 1, doneWindow: bounds })
  const statuses = new Map<string, number>()
  for (const task of result.tasks) statuses.set(task.status, (statuses.get(task.status) ?? 0) + 1)
  console.log(
    `${window.padEnd(5)} rows=${String(result.tasks.length).padStart(3)}`,
    `total=${result.pagination.total}`,
    `earlier=${result.doneEarlier}`,
    [...statuses.entries()].sort().map(([s, c]) => `${s}:${c}`).join(" "),
  )
}
await process.exit(0)
