import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export async function GET() {
  try {
    // Check if required tables exist
    const tablesResult = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('chats', 'messages', 'chat_participants', 'reactions', 'drizzle_migrations')
    `);
    
    // Extract table names
    const existingTables = tablesResult.map((row: any) => row.table_name);
    
    // Check if drizzle_migrations table exists
    const migrationsTableExists = existingTables.includes('drizzle_migrations');
    
    // If migrations table exists, check migration history
    let migrationsRun = [];
    if (migrationsTableExists) {
      const migrationsResult = await db.execute(sql`
        SELECT id, hash, created_at
        FROM drizzle_migrations
        ORDER BY created_at DESC
      `);
      migrationsRun = migrationsResult;
    }
    
    // Check table structure
    const tableStructures: Record<string, any> = {};
    
    for (const table of ['chats', 'messages', 'chat_participants', 'reactions']) {
      if (existingTables.includes(table)) {
        const columnsResult = await db.execute(sql`
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = ${table}
        `);
        tableStructures[table] = columnsResult;
      }
    }
    
    // Determine if all required tables exist
    const requiredTables = ['chats', 'messages', 'chat_participants', 'reactions'];
    const missingTables = requiredTables.filter(table => !existingTables.includes(table));
    const allTablesExist = missingTables.length === 0;
    
    // Check for minimal required columns in each table
    const hasRequiredColumns = {
      chats: tableStructures.chats?.some((col: any) => col.column_name === 'id') ?? false,
      messages: tableStructures.messages?.some((col: any) => col.column_name === 'id') ?? false,
      chat_participants: tableStructures.chat_participants?.some((col: any) => col.column_name === 'chat_id') ?? false,
      reactions: tableStructures.reactions?.some((col: any) => col.column_name === 'message_id') ?? false
    };
    
    // Return comprehensive information
    return NextResponse.json({
      migrationsTableExists,
      migrationsRun,
      existingTables,
      missingTables,
      allTablesExist,
      hasRequiredColumns,
      tableStructures,
      summary: {
        status: allTablesExist ? "success" : "error",
        message: allTablesExist 
          ? "All required tables exist in the database" 
          : `Missing tables: ${missingTables.join(', ')}`,
        migrationsStatus: migrationsTableExists 
          ? `Migrations table exists with ${migrationsRun.length} migrations` 
          : "No migrations table found - migrations may not have been run"
      }
    });
  } catch (error: any) {
    console.error("Database migration check error:", error);
    return NextResponse.json(
      { 
        status: "error", 
        message: error.message,
        details: error.stack 
      },
      { status: 500 }
    );
  }
} 