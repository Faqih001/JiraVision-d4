import { NextResponse } from "next/server"
import { initializeDatabase } from "@/lib/db-init"

export async function GET() {
  try {
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
