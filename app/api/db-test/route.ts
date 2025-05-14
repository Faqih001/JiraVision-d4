import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { sql } from "drizzle-orm"

export async function GET() {
  try {
    // Test general database connection
    const connectionTest = await db.execute(sql`SELECT 1 as connection_test`)
    
    // Check if chat tables exist
    const tablesResult = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('chats', 'messages', 'chat_participants', 'reactions')
    `)
    
    // Check chat tables data counts
    const chatCount = await db.execute(sql`SELECT COUNT(*) FROM chats`)
    const messageCount = await db.execute(sql`SELECT COUNT(*) FROM messages`)
    const participantCount = await db.execute(sql`SELECT COUNT(*) FROM chat_participants`)
    const reactionCount = await db.execute(sql`SELECT COUNT(*) FROM reactions`)
    
    return NextResponse.json({
      status: "success",
      connection: connectionTest[0],
      tables: tablesResult,
      counts: {
        chats: chatCount[0],
        messages: messageCount[0],
        participants: participantCount[0],
        reactions: reactionCount[0]
      }
    })
  } catch (error: any) {
    console.error("Database test error:", error)
    return NextResponse.json(
      { 
        status: "error", 
        message: error.message,
        details: error.stack 
      },
      { status: 500 }
    )
  }
}
