import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth-actions"

export async function GET() {
  try {
    const user = await getSession()
    return NextResponse.json({ user })
  } catch (error) {
    console.error("Session error:", error)
    // Return a successful response with null user instead of an error status
    return NextResponse.json({ user: null })
  }
}
