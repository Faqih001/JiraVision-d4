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
    }

    // Fetch team members from database with all required fields
    let teamMembers: TeamMemberDbResult[] = [];
    
    try {
      // First, let's test the database connection
      const testQuery = await db.select({ count: sql<number>`count(*)` }).from(users);
      console.log("DB connection test successful, users count:", testQuery[0]?.count);
      
      // If connection is good, fetch team members
      const result = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          jobTitle: users.jobTitle,
          department: users.department,
          status: users.status,
          avatar: users.avatar,
          // Use COALESCE to ensure we get a valid empty array if skills is null
          skills: sql`COALESCE(${users.skills}, '[]'::jsonb)`,
          // Currently hardcoded - implement properly based on your sprint/tasks data model
          currentSprint: sql<{ name: string; tasks: number } | null>`NULL`,
          utilization: sql<number>`FLOOR(RANDOM() * 30 + 70)` // Random utilization between 70-100
        })
        .from(users)
        .where(ne(users.role, 'admin')); // Exclude admin users from team list
      
      // Ensure result is an array and assign it to teamMembers
      teamMembers = Array.isArray(result) ? result : [];
      console.log(`Successfully queried ${teamMembers.length} team members`);
      
    } catch (dbError: any) {
      console.error("Database error fetching team members:", dbError);
      throw new Error(`Database error: ${dbError.message}`);
    }

    // Transform and validate the data to match TeamMember type
    const formattedTeamMembers = teamMembers.map((member: TeamMemberDbResult) => {
      // Handle skills safely
      let skills: string[] = [];
      
      try {
        console.log(`Skills for user ${member.id}:`, typeof member.skills, member.skills);
        
        if (member.skills) {
          if (typeof member.skills === 'string') {
            // Parse JSON string safely
            try {
              const parsed = JSON.parse(member.skills);
              skills = Array.isArray(parsed) ? parsed : [];
              console.log('Parsed skills from string:', skills);
            } catch (e) {
              console.warn(`Failed to parse skills string for user ${member.id}`);
            }
          } else if (Array.isArray(member.skills)) {
            // Use array directly but ensure all elements are strings
            skills = member.skills.map(skill => String(skill));
            console.log('Using skills array directly (converted to strings):', skills);
          } else if (typeof member.skills === 'object' && member.skills !== null) {
            // Try to safely extract values from object
            try {
              const values = Object.values(member.skills);
              skills = Array.isArray(values) ? values : [];
              console.log('Extracted skills from object:', skills);
            } catch (e) {
              console.warn(`Failed to extract skills from object for user ${member.id}`);
            }
          }
        }
      } catch (e) {
        console.warn(`Exception processing skills for user ${member.id}:`, e);
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
    console.log(`Successfully formatted ${formattedTeamMembers.length} team members`);

    return NextResponse.json({ 
      success: true,
      teamMembers: formattedTeamMembers 
    });
  } catch (error: any) {
    console.error("Error fetching team members:", error);
    // Return a more informative error response with an empty team members array
    return NextResponse.json(
      { 
        success: false, 
        error: error?.message || "Unknown error fetching team members",
        details: error?.stack?.toString() || "",
        teamMembers: [] 
      },
      { status: 500 }
    );
  }
}
