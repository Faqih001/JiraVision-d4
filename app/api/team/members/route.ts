import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/drizzle/schema";
import { sql } from "drizzle-orm";
import { eq, ne } from "drizzle-orm";
import { getSession } from "@/lib/auth-actions";
import { type TeamMember } from "@/types/team";

export async function GET(request: Request) {
  try {
    // Get authenticated session
    const session = await getSession();
    if (!session || !session.id) {
      console.error("Team Members API: No valid session found");
      return NextResponse.json(
        { success: false, error: "Unauthorized", details: "No valid session found" },
        { status: 401 }
      );
    }

    // Fetch team members from database with all required fields
    const teamMembers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.jobTitle,  // Using jobTitle as role
        department: users.department,
        status: users.status,
        avatar: users.avatar,
        // Default values for fields that might be null or undefined
        skills: sql<string[]>`COALESCE(ARRAY[]::text[], ARRAY[]::text[])`, // Ensure skills is always an array
        // Currently hardcoded - implement properly based on your sprint/tasks data model
        currentSprint: sql<{ name: string; tasks: number } | null>`NULL`,
        utilization: sql<number>`100` // Default utilization to 100%
      })
      .from(users)
      .where(ne(users.role, 'admin')); // Exclude admin users from team list
      
    if (!teamMembers) {
      throw new Error("Failed to fetch team members");
    }

    // Transform and validate the data to match TeamMember type
    const formattedTeamMembers = teamMembers.map(member => ({
      id: member.id,
      name: member.name || 'Unknown User',
      email: member.email || '',
      role: member.role || 'Team Member',
      department: member.department || 'General',
      status: member.status || 'offline',
      avatar: member.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name || 'U')}&background=random`,
      currentSprint: member.currentSprint || null,
      skills: member.skills || [],
      utilization: member.utilization || 100
    })) as TeamMember[];

    // Log success
    console.log(`Successfully fetched ${formattedTeamMembers.length} team members`);

    return NextResponse.json({ 
      success: true,
      teamMembers: formattedTeamMembers 
    });
  } catch (error) {
    console.error("Error fetching team members:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch team members" },
      { status: 500 }
    );
  }
}
