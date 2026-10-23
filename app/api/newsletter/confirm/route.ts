import { NextResponse } from "next/server"
import { subscriberStore } from "@/lib/data/subscribers"

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token")
  const confirmed = token ? await subscriberStore.confirm(token) : undefined
  return NextResponse.redirect(new URL(`/newsletter/confirm?status=${confirmed ? "ok" : "invalid"}`, request.url))
}
