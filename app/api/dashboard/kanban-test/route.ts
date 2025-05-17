// Simplified kanban API for testing database connectivity
import { NextRequest, NextResponse } from "next/server";
import postgres from 'postgres';

export async function GET(request: NextRequest) {
  try {
    console.log("Kanban test API: Starting request handling");
    
    // Use direct database connection instead of Drizzle ORM
    const connectionString = process.env.DATABASE_URL!;
    console.log(`Kanban test API: Using database URL: ${connectionString.slice(0, 15)}...`);
    
    if (!connectionString) {
      console.error("Kanban test API: DATABASE_URL environment variable is not set");
      return NextResponse.json(
        { success: false, error: "Database URL not configured" },
        { status: 500 }
      );
    }
    
    const sql = postgres(connectionString, {
      ssl: { rejectUnauthorized: false },
      max: 1,
      debug: true,
      idle_timeout: 20,
      connect_timeout: 30,
      onnotice: msg => console.log('DB Notice:', msg)
    });
    
    try {
      console.log("Kanban test API: Testing database connection");
      
      // Try a simple query first
      const testResult = await sql`SELECT 1 as test`;
      console.log("Kanban test API: Database connection successful!");
      
      // Now query the kanban columns
      console.log("Kanban test API: Fetching kanban columns");
      const columnsResult = await sql`SELECT * FROM kanban_columns ORDER BY "order"`;
      console.log(`Kanban test API: Found ${columnsResult.length} columns`);
      
      // Format the response
      const columns = columnsResult.map(column => ({
        id: column.id.toString(),
        title: column.title,
        color: column.color,
        tasks: []
      }));
      
      // Return simplified response
      return NextResponse.json({ 
        success: true, 
        data: { 
          columns,
          testMessage: "Direct database connection successful!"
        }
      });
    } catch (dbError) {
      console.error("Kanban test API: Database error:", dbError);
      return NextResponse.json(
        { 
          success: false, 
          error: `Database error: ${dbError instanceof Error ? dbError.message : String(dbError)}` 
        },
        { status: 500 }
      );
    } finally {
      // Always close the connection
      await sql.end();
      console.log("Kanban test API: Database connection closed");
    }
  } catch (error) {
    console.error("Kanban test API: Unhandled error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: `Server error: ${error instanceof Error ? error.message : String(error)}` 
      },
      { status: 500 }
    );
  }
}
