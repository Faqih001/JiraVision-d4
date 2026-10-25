import { NextResponse } from "next/server"
import { initializeDatabase } from "@/lib/db-init"
import { getCurrentUser } from "@/lib/session"
import { isSuperAdmin } from "@/lib/roles"
import { db } from "@/lib/db"
import { users } from "@/drizzle/schema"
import { sql } from "drizzle-orm"

export async function GET() {
  try {
    // Anonymous access is only acceptable while the database has nobody to
    // protect: this route creates the tables and seeds admin@jiravision.com
    // with the password admin123. Once a real account exists it becomes a
    // super-admin-only endpoint.
    let isEmpty = true
    try {
      const [counts] = await db.select({ count: sql`count(*)` }).from(users)
      isEmpty = Number(counts.count) === 0
    } catch {
      // The users table is what initializeDatabase() creates, so failing to read
      // it means a brand-new database — exactly the bootstrap case.
      isEmpty = true
    }

    if (!isEmpty) {
      const user = await getCurrentUser()
      if (!user) {
        return NextResponse.json(
          { success: false, message: "Not authenticated" },
          { status: 401 }
        )
      }
      if (!isSuperAdmin(user)) {
        return NextResponse.json(
          { success: false, message: "Super-admin role required" },
          { status: 403 }
        )
      }
    }

    const success = await initializeDatabase()

    if (success) {
      return NextResponse.json({
        success: true,
        message: "Database initialized successfully",
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          message: "Database initialization failed",
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("Error in setup route:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Database initialization failed with error",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
