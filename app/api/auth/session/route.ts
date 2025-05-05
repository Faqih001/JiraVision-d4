import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth-actions"

export async function GET() {
  try {
    console.log("Session API: Fetching user session");
    const user = await getSession();
    console.log(`Session API: Session found: ${user ? 'yes' : 'no'}`);
    return NextResponse.json({ user });
  } catch (error) {
    console.error("Session API error:", error);
    // Return a successful response with null user instead of an error status
    return NextResponse.json({ user: null });
  }
}
