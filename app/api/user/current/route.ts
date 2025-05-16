import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth-actions"
import { getUserProfile } from "@/lib/data-access"

export async function GET() {
  try {
    // Get session with error handling
    const session = await getSession().catch(error => {
      console.error("Failed to get session:", error);
      return null;
    });
    
    if (!session || !session.id) {
      console.log("Current User API: No valid session found");
      return NextResponse.json(
        { error: "Unauthorized", details: "No valid session found" },
        { status: 401 }
      );
    }

    // Get user profile with timeout and error handling
    const userProfilePromise = getUserProfile(session.id);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Profile fetch timeout')), 5000)
    );

    const userProfile = await Promise.race([userProfilePromise, timeoutPromise])
      .catch(error => {
        console.error(`Error fetching user profile for ${session.id}:`, error);
        return null;
      });
    
    if (!userProfile) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 }
      );
    }

    // Validate required fields
    const { id, name, email, avatar, role } = userProfile;
    if (!id || !name || !email) {
      console.error("Invalid user profile data:", userProfile);
      return NextResponse.json(
        { error: "Invalid user profile data" },
        { status: 500 }
      );
    }

    // Return only necessary user data
    return NextResponse.json({
      success: true,
      user: {
        id,
        name,
        email,
        avatar: avatar || null,
        role: role || 'user'
      }
    });
    
  } catch (error) {
    console.error("Current User API: Failed to fetch current user:", error)
    return NextResponse.json(
      { error: "Failed to fetch current user", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
} 