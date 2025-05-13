import { pgTable, serial, text, varchar, timestamp, boolean, date, integer, decimal, jsonb } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

// User preferences migration SQL
export const userPreferences = sql`
-- Add user preferences fields to the users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'en-US',
ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'Africa/Nairobi',
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS job_title VARCHAR(255),
ADD COLUMN IF NOT EXISTS department VARCHAR(255),
ADD COLUMN IF NOT EXISTS location VARCHAR(255),
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::JSONB;
`
