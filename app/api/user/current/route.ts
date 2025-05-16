import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth-actions"
import { getUserProfile } from "@/lib/data-access"
import type { User } from "@/lib/db"

interface UserProfile {
  id: number;
  name: string;
  email: string;
  avatar?: string;
  role?: string;
  department?: string;
  status?: 'online' | 'offline' | 'away' | 'busy' | 'active';
}

export async function GET() {
  try {
    // Get session with error handling and timeout
    const sessionPromise = getSession() as Promise<User>;
    const timeoutPromise = new Promise<User>((_, reject) => 
      setTimeout(() => reject(new Error('Session fetch timeout')), 5000)
    );

    const session = await Promise.race([sessionPromise, timeoutPromise])
      .catch(error => {
        console.error("Session error:", error);
        return null;
      });
    
    if (!session?.id) {
      console.log("Current User API: No valid session found");
      return NextResponse.json(
        { error: "Unauthorized", details: "No valid session found" },
        { status: 401 }
      );
    }

    // Get user profile with timeout and error handling
    const userProfilePromise = getUserProfile(session.id) as Promise<UserProfile>;
    const profileTimeoutPromise = new Promise<UserProfile>((_, reject) => 
      setTimeout(() => reject(new Error('Profile fetch timeout')), 5000)
    );

    const userProfile = await Promise.race([userProfilePromise, profileTimeoutPromise])
      .catch(error => {
        console.error(`Error fetching user profile for ${session.id}:`, error);
        return null;
      });
    
    if (!userProfile) {
      return NextResponse.json(
        { error: "User profile not found", details: "Unable to retrieve user profile" },
        { status: 404 }
      );
    }

    // Validate and extract fields with type safety
    const { id, name, email } = userProfile;
    if (!id || !name || !email) {
      console.error("Invalid user profile data:", userProfile);
      return NextResponse.json(
        { error: "Invalid user data", details: "User profile missing required fields" },
        { status: 500 }
      );
    }

    // Return validated user profile with defaults for optional fields
    return NextResponse.json({
      success: true,
      user: {
        id,
        name,
        email,
        role: userProfile.role || 'user',
        avatar: userProfile.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`,
        department: userProfile.department || 'General',
        status: userProfile.status || 'offline',
        preferences: userProfile.preferences || {},
      }
    });
  } catch (error) {
    console.error("Unexpected error in current user API:", error);
    return NextResponse.json(
      { error: "Server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}