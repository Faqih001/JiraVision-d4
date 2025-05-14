import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth-actions"
import { getUserProfile } from "@/lib/data-access"

export async function GET() {
  try {
    console.log("Current User API: Fetching user session");
    const session = await getSession()
    
    console.log("Current User API: Session check result:", {
      hasSession: !!session,
      hasId: session ? !!session.id : false,
      userId: session?.id
    });
    
    if (!session || !session.id) {
      console.log("Current User API: No valid session found");
      return NextResponse.json(
        { error: "Unauthorized", details: "No valid session found" },
        { status: 401 }
      )
    }

    const userId = session.id
    console.log(`Current User API: Fetching profile for user ${userId}`);
    
    // Get user profile
    const userProfile = await getUserProfile(userId)
    
    if (!userProfile) {
      console.log(`Current User API: No profile found for user ${userId}`);
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }
    
    console.log(`Current User API: Successfully fetched profile for user ${userId}`);
    return NextResponse.json({
      success: true,
      user: {
        id: userProfile.id,
        name: userProfile.name,
        email: userProfile.email,
        avatar: userProfile.avatar,
        role: userProfile.role
      }
    })
    
  } catch (error) {
    console.error("Current User API: Failed to fetch current user:", error)
    return NextResponse.json(
      { error: "Failed to fetch current user", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
} 