import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/drizzle/schema";
import { sql } from "drizzle-orm";
import { eq, ne } from "drizzle-orm";
import { getSession } from "@/lib/auth-actions";
import { type TeamMember } from "@/types/team";

// Define the type for the database query result
type TeamMemberDbResult = {
  id: number;
  name: string | null;
  email: string | null;
  role: string | null;
  jobTitle: string | null;
  department: string | null;
  status: string | null;
  avatar: string | null;
  skills: any; // JSONB field can be string or object
  currentSprint: { name: string; tasks: number } | null;
  utilization: number;
}

export async function GET(request: Request) {
  try {
    // Get authenticated session
    const session = await getSession();
    if (!session || !session.id) {
      console.log("Team Members API: No valid session found, but proceeding for development");
      
      // For development only - comment this out in production
      // In production, uncomment the following lines to enforce authentication:
      // return NextResponse.json(
      //   { success: false, error: "Unauthorized", details: "No valid session found" },
      //   { status: 401 }
      // );
    }

    // Fetch team members from database with all required fields
    const teamMembers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        jobTitle: users.jobTitle,
        department: users.department,
        status: users.status,
        avatar: users.avatar,
        // Parse skills from JSONB to array of strings
        skills: users.skills,
        // Currently hardcoded - implement properly based on your sprint/tasks data model
        currentSprint: sql<{ name: string; tasks: number } | null>`NULL`,
        utilization: sql<number>`FLOOR(RANDOM() * 30 + 70)` // Random utilization between 70-100
      })
      .from(users)
      .where(ne(users.role, 'admin')); // Exclude admin users from team list
      
    if (!teamMembers) {
      throw new Error("Failed to fetch team members");
    }

    // Transform and validate the data to match TeamMember type
    const formattedTeamMembers = teamMembers.map((member: TeamMemberDbResult) => {
      // Parse skills from JSON string if needed
      let skills: string[] = [];
      if (member.skills) {
        try {
          skills = typeof member.skills === 'string' 
            ? JSON.parse(member.skills) 
            : Array.isArray(member.skills) 
              ? member.skills 
              : [];
        } catch (e) {
          console.warn(`Failed to parse skills for user ${member.id}:`, e);
        }
      }
      
      return {
        id: member.id,
        name: member.name || 'Unknown User',
        email: member.email || '',
        role: member.jobTitle || 'Team Member', // Use job title as displayed role
        department: member.department || 'General',
        status: member.status || 'offline',
        avatar: member.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name || 'U')}&background=random`,
        currentSprint: member.currentSprint || null,
        skills: skills,
        utilization: member.utilization || 80
      };
    }) as TeamMember[];

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
