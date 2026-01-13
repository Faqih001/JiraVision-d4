/**
 * Test Neon Database Connection
 * Run this file to verify your Neon database is set up correctly
 * 
 * Usage: node -r dotenv/config test-neon-connection.js
 */

const { neon } = require("@neondatabase/serverless");

async function testNeonConnection() {
  console.log("🔍 Testing Neon Database Connection...\n");

  // Check if DATABASE_URL is set
  if (!process.env.DATABASE_URL) {
    console.error("❌ ERROR: DATABASE_URL environment variable is not set");
    console.log("Please set DATABASE_URL in your .env file\n");
    process.exit(1);
  }

  console.log("✅ DATABASE_URL is set");
  console.log(`📍 Connection: ${process.env.DATABASE_URL.split('@')[1]?.split('/')[0] || 'hidden'}\n`);

  try {
    const sql = neon(process.env.DATABASE_URL);

    // Test 1: Basic connection test
    console.log("Test 1: Basic Connection");
    const timeResult = await sql`SELECT NOW() as current_time, version() as pg_version`;
    console.log("✅ Connected successfully!");
    console.log(`   Time: ${timeResult[0].current_time}`);
    console.log(`   PostgreSQL Version: ${timeResult[0].pg_version.split(' ')[0]}\n`);

    // Test 2: Check if tables exist
    console.log("Test 2: Checking Tables");
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;
    
    if (tables.length === 0) {
      console.log("⚠️  No tables found. Please run the neon-setup.sql script to create tables.\n");
    } else {
      console.log(`✅ Found ${tables.length} tables:`);
      tables.forEach((table, index) => {
        console.log(`   ${index + 1}. ${table.table_name}`);
      });
      console.log();
    }

    // Test 3: Check users table
    if (tables.some(t => t.table_name === 'users')) {
      console.log("Test 3: Checking Users Table");
      const userCount = await sql`SELECT COUNT(*) as count FROM users`;
      console.log(`✅ Users table exists with ${userCount[0].count} users\n`);
    }

    // Test 4: Check sprints table
    if (tables.some(t => t.table_name === 'sprints')) {
      console.log("Test 4: Checking Sprints Table");
      const sprintCount = await sql`SELECT COUNT(*) as count FROM sprints`;
      console.log(`✅ Sprints table exists with ${sprintCount[0].count} sprints\n`);
    }

    // Test 5: Check tasks table
    if (tables.some(t => t.table_name === 'tasks')) {
      console.log("Test 5: Checking Tasks Table");
      const taskCount = await sql`SELECT COUNT(*) as count FROM tasks`;
      console.log(`✅ Tasks table exists with ${taskCount[0].count} tasks\n`);
    }

    console.log("🎉 All tests passed! Your Neon database is ready to use.\n");
    
    if (tables.length === 0) {
      console.log("📝 Next Steps:");
      console.log("   1. Go to your Neon SQL Editor: https://console.neon.tech");
      console.log("   2. Run the SQL script from neon-setup.sql");
      console.log("   3. Run this test again to verify\n");
    }

  } catch (error) {
    console.error("❌ Connection failed:", error.message);
    console.error("\n🔧 Troubleshooting:");
    console.error("   1. Check your DATABASE_URL in .env file");
    console.error("   2. Ensure sslmode=require is in the connection string");
    console.error("   3. Verify your Neon project is active");
    console.error("   4. Check your internet connection\n");
    process.exit(1);
  }
}

testNeonConnection();
