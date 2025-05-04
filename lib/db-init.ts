import { neon } from "@neondatabase/serverless"

export async function initializeDatabase() {
  try {
    console.log("Initializing database...")
    const sqlClient = neon(process.env.DATABASE_URL!)

    // Check if users table exists
    const checkUsersTable = await sqlClient`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = 'users'
      );
    `

    const usersTableExists = checkUsersTable[0]?.exists === true

    if (!usersTableExists) {
      console.log("Creating users table...")
      await sqlClient`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          email VARCHAR(255) NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          role VARCHAR(50) NOT NULL DEFAULT 'user',
          avatar TEXT,
          email_verified BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `
    }

    // Check if password_reset_tokens table exists
    const checkResetTable = await sqlClient`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = 'password_reset_tokens'
      );
    `

    const resetTableExists = checkResetTable[0]?.exists === true

    if (!resetTableExists) {
      console.log("Creating password_reset_tokens table...")
      await sqlClient`
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id),
          token TEXT NOT NULL UNIQUE,
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `
    }

    console.log("Database initialization completed successfully!")
    return true
  } catch (error) {
    console.error("Database initialization failed:", error)
    return false
  }
}
