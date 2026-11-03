import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import path from "node:path"
import { loggedDays } from "@/lib/worklog/instance-capture"

// The owner's ask: "we need to create instances for logged entries". The rule that makes that
// safe is that the log is evidence, not an editor — it may mark the day's row done and give it
// back, and it may never overwrite what a person typed on that row or undo a deliberate skip.

const repo = path.resolve(__dirname, "..", "..")
const src = (relative: string) => readFileSync(path.join(repo, relative), "utf8")
const code = () => src("lib/worklog/instance-capture.ts")

describe("loggedDays", () => {
  it("keeps the pairs that name a task", () => {
    expect(
      loggedDays([
        { taskId: 4, workedOn: "2026-11-03" },
        { taskId: null, workedOn: "2026-11-03" },
        { taskId: 7, workedOn: "2026-11-02" },
      ]),
    ).toEqual([
      { taskId: 4, workedOn: "2026-11-03" },
      { taskId: 7, workedOn: "2026-11-02" },
    ])
  })

  it("materialises nothing for a log with no task", () => {
    expect(loggedDays([{ taskId: null, workedOn: "2026-11-03" }])).toEqual([])
    expect(loggedDays([])).toEqual([])
  })
})

describe("marking the day logged", () => {
  it("upserts on the task+day key, not on an id it does not have yet", () => {
    expect(code()).toMatch(/onConflictDoUpdate/u)
    expect(code()).toMatch(/target: \[taskInstances\.taskId, taskInstances\.instanceDate\]/u)
  })

  it("writes only the completion columns, never the notes or the checklist", () => {
    const set = code().match(/set: \{ status: "done", completedAt: at, completedBy: userId \}/u)
    expect(set).not.toBeNull()
    expect(code()).not.toMatch(/set:[^}]*notes/u)
    expect(code()).not.toMatch(/set:[^}]*checklistResponses/u)
  })

  it("leaves a one-off task out of the grid", () => {
    expect(code()).toMatch(/tasks\.cadence/u)
    expect(code()).toMatch(/=== "one-off"/u)
  })
})

describe("releasing the day", () => {
  it("keeps the instance done while any log still covers that task and day", () => {
    expect(code()).toMatch(/eq\(workLogEntries\.taskId, row\.taskId\)/u)
    expect(code()).toMatch(/eq\(workLogEntries\.workedOn, row\.workedOn\)/u)
    expect(code()).toMatch(/\(still\?\.n \?\? 0\) > 0/u)
  })

  it("reverts only what it marked, so a manual skip survives", () => {
    expect(code()).toMatch(/eq\(taskInstances\.status, "done"\)/u)
    expect(code()).toMatch(/\.set\(\{ status: "todo", completedAt: null, completedBy: null \}\)/u)
  })

  it("deletes no instance row", () => {
    expect(code()).not.toMatch(/\.delete\(/u)
  })
})

describe("the entry routes record the day", () => {
  const create = () => src("app/api/worklog/entries/route.ts")
  const row = () => src("app/api/worklog/entries/[id]/route.ts")
  const bulk = () => src("app/api/worklog/entries/bulk/route.ts")

  it("commits a new log and its instance in one transaction", () => {
    expect(create()).toMatch(/db\.transaction/u)
    expect(create()).toMatch(/markInstancesLogged\(tx, session\.id, \[value\]\)/u)
  })

  it("moves the instance with the row, releasing the day it leaves first", () => {
    const source = row()
    expect(source).toMatch(/releaseInstancesUnlogged\(tx, \[before\]\)/u)
    expect(source).toMatch(/markInstancesLogged\(tx, session\.id, \[after\]\)/u)
    expect(source.indexOf("releaseInstancesUnlogged(tx, [before])")).toBeLessThan(
      source.indexOf("markInstancesLogged(tx, session.id, [after])"),
    )
    // A row is gone once deleted, so which instance to hand back is read before it goes.
    expect(source).toMatch(/\.select\(\{ taskId: workLogEntries\.taskId, workedOn: workLogEntries\.workedOn \}\)/u)
    expect(source).toMatch(/releaseInstancesUnlogged\(tx, \[row\]\)/u)
  })

  it("re-reads the selection's days before a bulk write moves or deletes them", () => {
    const source = bulk()
    expect(source).toMatch(/async function dayPairs\(client: WorklogClient/u)
    expect(source).toMatch(/const days = await dayPairs\(tx, body\.ids, session\.id\)/u)
    expect(source.match(/releaseInstancesUnlogged\(tx, days\)/gu)?.length).toBe(3)
    expect(source.match(/markInstancesLogged\(tx, session\.id, days\.map/gu)?.length).toBe(2)
  })

  it("never reaches for the pool outside the caller's transaction", () => {
    for (const source of [create(), row(), bulk()]) {
      expect(source).not.toMatch(/markInstancesLogged\(db/u)
      expect(source).not.toMatch(/releaseInstancesUnlogged\(db/u)
    }
  })
})
