import { NextResponse } from "next/server"
import { sql } from "drizzle-orm"
import { ListObjectsV2Command } from "@aws-sdk/client-s3"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
import { neonRealtimeEnabled, sealNotificationsQuery } from "@/lib/neon-realtime"
import { AVATAR_BUCKET, getS3Client, neonStorageEnabled } from "@/lib/neon-storage"
import { neonFunctionsEnabled, callHelloFunction } from "@/lib/neon-functions"

export const dynamic = "force-dynamic"

// Authenticated users only — reports service reachability, never env values.
export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const results: Record<string, { ok: boolean; detail?: string }> = {}

  try {
    await db.execute(sql`select 1`)
    results.postgres = { ok: true, detail: "Lakebase Postgres reachable" }
  } catch (error) {
    results.postgres = { ok: false, detail: error instanceof Error ? error.message : "query failed" }
  }

  if (neonRealtimeEnabled()) {
    try {
      const sealed = await sealNotificationsQuery(user.id)
      results.realtime = sealed
        ? { ok: true, detail: `live query sealed (expires ${sealed.expiresAt})` }
        : { ok: false, detail: "seal returned null" }
    } catch (error) {
      results.realtime = { ok: false, detail: error instanceof Error ? error.message : "seal failed" }
    }
  } else {
    results.realtime = { ok: false, detail: "NEON_REALTIME_SECRET not set" }
  }

  if (neonStorageEnabled()) {
    try {
      const s3 = getS3Client()!
      await s3.send(new ListObjectsV2Command({ Bucket: AVATAR_BUCKET, MaxKeys: 1 }))
      results.storage = { ok: true, detail: `bucket "${AVATAR_BUCKET}" reachable, credentials valid` }
    } catch (error) {
      const name = error instanceof Error ? error.name : ""
      if (name === "NoSuchBucket") {
        results.storage = { ok: false, detail: `bucket "${AVATAR_BUCKET}" missing — create it (neon deploy / Neon console > Storage)` }
      } else {
        results.storage = { ok: false, detail: error instanceof Error ? error.message : "s3 probe failed" }
      }
    }
  } else {
    results.storage = { ok: false, detail: "AWS_* storage env not set" }
  }

  const jwks = process.env.NEON_AUTH_JWKS_URL
  if (jwks) {
    try {
      const res = await fetch(jwks, { signal: AbortSignal.timeout(8000) })
      const json = (await res.json()) as { keys?: unknown[] }
      results.auth =
        res.ok && Array.isArray(json.keys)
          ? { ok: true, detail: `Managed Auth JWKS served ${json.keys.length} key(s)` }
          : { ok: false, detail: `JWKS HTTP ${res.status}` }
    } catch (error) {
      results.auth = { ok: false, detail: error instanceof Error ? error.message : "jwks fetch failed" }
    }
  } else {
    results.auth = { ok: false, detail: "NEON_AUTH_JWKS_URL not set" }
  }

  if (neonFunctionsEnabled()) {
    try {
      const hello = await callHelloFunction("/")
      results.functions = {
        ok: hello.ok,
        detail: `hello function responded ${hello.status}`,
      }
    } catch (error) {
      results.functions = { ok: false, detail: error instanceof Error ? error.message : "function call failed" }
    }
  } else {
    results.functions = { ok: false, detail: "NEON_FUNCTION_HELLO_BASE_URL not set (function not deployed on this branch)" }
  }

  const allOk = Object.values(results).every((r) => r.ok)
  return NextResponse.json({ ok: allOk, userId: user.id, services: results })
}
