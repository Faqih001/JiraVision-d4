import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-actions";
import { db } from "@/lib/db";
import { sprints } from "@/drizzle/schema";
import { desc, sql } from "drizzle-orm";

// GET handler for /api/sprints - Returns all sprints
export async function GET(request: Request) {
  try {
    // Check if user is authenticated
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get distinct sprints by name to handle duplicate entries
    // Using the lowest ID when duplicates exist
    const results = await db.execute(sql`
      SELECT DISTINCT ON (name) 
        id, name, description, start_date, end_date, 
        status, capacity, completed, created_at, updated_at
      FROM sprints
      ORDER BY name, id ASC
    `);
    
    // Convert snake_case to camelCase
    const formattedResults = results.map((sprint: any) => ({
      id: sprint.id,
      name: sprint.name,
      description: sprint.description,
      startDate: sprint.start_date,
      endDate: sprint.end_date,
      status: sprint.status,
      capacity: sprint.capacity,
      completed: sprint.completed,
      createdAt: sprint.created_at,
      updatedAt: sprint.updated_at
    }));
    
    // Sort by start date (newest first)
    formattedResults.sort((a: any, b: any) => 
      new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
    );

    // Return the sprints
    return NextResponse.json({
      success: true,
      data: formattedResults
    });
  } catch (error) {
    console.error("Error fetching sprints:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch sprints",
        error: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
