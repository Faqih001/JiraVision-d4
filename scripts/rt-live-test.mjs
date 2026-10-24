import fs from "node:fs"
import { createRealtimeClient } from "@neon/realtime/client"
import { drizzleParsers } from "@neon/realtime-drizzle/client"

const lines = fs.readFileSync("/tmp/jv-cookies.txt", "utf8").split("\n")
const ck = (name) => {
  const l = lines.find((x) => { const p = x.split("\t"); return p.length >= 7 && p[5] === name })
  return l ? l.split("\t")[6].trim() : ""
}
const cookie = `user_id=${ck("user_id")}; session_id=${ck("session_id")}`

const live = await (await fetch("http://localhost:3000/api/notifications/live", { headers: { cookie } })).json()
if (!live.sealed) { console.error("no sealed query:", live); process.exit(1) }
console.log("sealed fingerprint:", live.sealed.queryFingerprint)

const client = createRealtimeClient({ url: live.realtimeUrl, parsers: { ...drizzleParsers } })
const sub = client.subscribe(live.sealed)

sub.onChange((snap) => console.log("snapshot:", snap.status, "rows:", snap.data?.length, "| top:", snap.data?.[0]?.title))

const start = await sub.getSnapshot()
console.log("initial:", start.status, start.data?.length, "row(s), top:", start.data?.[0]?.title)

const stamp = Date.now()
const created = await (await fetch("http://localhost:3000/api/notifications", {
  method: "POST",
  headers: { "content-type": "application/json", cookie },
  body: JSON.stringify({ type: "system", title: `REALTIME PUSH PROOF ${stamp}` }),
})).json()
console.log("inserted notification id:", created.notification?.id)

await sub.awaitRows((rows) => rows.some((r) => r.title === `REALTIME PUSH PROOF ${stamp}`), 15000)
console.log("PUSHED: new row arrived over the websocket without polling")
const after = await sub.getSnapshot()
console.log("final rows:", after.data.length)
client.close()
process.exit(0)
