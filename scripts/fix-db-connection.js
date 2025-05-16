// This script checks the database connection and creates any missing tables
const { Client } = require('pg');
require('dotenv').config();

async function testDBConnection() {
  console.log("Testing database connection...");
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log("✅ Database connection successful!");

    // Check if the users table exists
    const tableCheckResult = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);

    const usersTableExists = tableCheckResult.rows[0].exists;
    if (!usersTableExists) {
      console.log("⚠️ Users table does not exist! Creating it now...");
      
      // Create the users table
      await client.query(`
        CREATE TABLE IF NOT EXISTS "users" (
          "id" serial PRIMARY KEY NOT NULL,
          "name" text NOT NULL,
          "email" varchar(255) NOT NULL UNIQUE,
          "password_hash" text NOT NULL,
          "role" varchar(50) NOT NULL DEFAULT 'user',
          "avatar" text,
          "email_verified" boolean DEFAULT false,
          "job_title" varchar(255),
          "department" varchar(255),
          "location" varchar(255),
          "bio" text,
          "language" varchar(10) DEFAULT 'en-US',
          "timezone" varchar(50) DEFAULT 'Africa/Nairobi',
          "preferences" jsonb DEFAULT '{}',
          "status" varchar(20) DEFAULT 'offline',
          "created_at" timestamp DEFAULT now(),
          "updated_at" timestamp DEFAULT now()
        );
      `);
      
      console.log("✅ Users table created successfully!");
      
      // Create a test user for login
      const testUserEmail = 'test@example.com';
      const testUserCheck = await client.query(`
        SELECT COUNT(*) FROM users WHERE email = $1;
      `, [testUserEmail]);
      
      if (parseInt(testUserCheck.rows[0].count) === 0) {
        console.log("Creating test user for login...");
        // Insert a test user with password: 'password123'
        // This is a bcrypt hash of 'password123'
        const passwordHash = '$2a$10$qmBGACuVcP3hLH2whD9HRuFpNbC0FhBgBCeQRgEb4GXtR.XX2Yw0i';
        
        await client.query(`
          INSERT INTO users (name, email, password_hash, role, email_verified)
          VALUES ($1, $2, $3, $4, $5);
        `, ['Test User', testUserEmail, passwordHash, 'user', true]);
        
        console.log("✅ Test user created! Email: test@example.com, Password: password123");
      } else {
        console.log("✅ Test user already exists.");
      }
    } else {
      console.log("✅ Users table exists!");
      
      // Check for any test user
      const userCount = await client.query(`SELECT COUNT(*) FROM users;`);
      if (parseInt(userCount.rows[0].count) === 0) {
        console.log("No users found. Creating a test user...");
        // Insert a test user with password: 'password123'
        const passwordHash = '$2a$10$qmBGACuVcP3hLH2whD9HRuFpNbC0FhBgBCeQRgEb4GXtR.XX2Yw0i';
        
        await client.query(`
          INSERT INTO users (name, email, password_hash, role, email_verified)
          VALUES ($1, $2, $3, $4, $5);
        `, ['Test User', 'test@example.com', passwordHash, 'user', true]);
        
        console.log("✅ Test user created! Email: test@example.com, Password: password123");
      } else {
        console.log(`✅ Found ${userCount.rows[0].count} user(s) in the database.`);
      }
    }
    
    // Check for other required tables
    const requiredTables = [
      'password_reset_tokens', 
      'sprints', 
      'tasks'
    ];
    
    for (const table of requiredTables) {
      const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        );
      `, [table]);
      
      if (tableCheck.rows[0].exists) {
        console.log(`✅ Table '${table}' exists!`);
      } else {
        console.log(`⚠️ Table '${table}' does not exist!`);
      }
    }

  } catch (err) {
    console.error("❌ Database connection error:", err);
  } finally {
    await client.end();
    console.log("Database connection closed.");
  }
}

testDBConnection().catch(err => {
  console.error("Script error:", err);
});
