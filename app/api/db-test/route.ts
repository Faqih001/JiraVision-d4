import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { initializeDatabase } from "@/lib/db-init"
import { sql } from "drizzle-orm"

export async function GET() {
  try {
    // First, try to initialize the database
    await initializeDatabase()

    // Then try a simple query
    const result = await db.execute(sql`SELECT NOW() as time`)

    return NextResponse.json({
      success: true,
      message: "Database connection successful",
      time: result[0]?.time,
      database_url: process.env.DATABASE_URL ? "Set" : "Not set",
      database_url_unpooled: process.env.DATABASE_URL_UNPOOLED ? "Set" : "Not set",
    })
  } catch (error) {
    console.error("Database test error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Database connection failed",
        error: String(error),
        database_url: process.env.DATABASE_URL ? "Set" : "Not set",
        database_url_unpooled: process.env.DATABASE_URL_UNPOOLED ? "Set" : "Not set",
      },
      { status: 500 },
    )
  }
}
