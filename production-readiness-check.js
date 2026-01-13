#!/usr/bin/env node
/**
 * Production Readiness Check for Neon Database
 * Verifies all configurations and connections are production-ready
 */

const { neon } = require("@neondatabase/serverless");

async function runProductionChecks() {
  console.log("🔍 JiraVision - Neon Database Production Readiness Check\n");
  console.log("=" .repeat(60) + "\n");

  const checks = {
    passed: 0,
    failed: 0,
    warnings: 0
  };

  // Check 1: Environment Variables
  console.log("📋 Check 1: Environment Variables");
  if (!process.env.DATABASE_URL) {
    console.log("❌ DATABASE_URL is not set");
    checks.failed++;
  } else {
    console.log("✅ DATABASE_URL is configured");
    checks.passed++;
    
    // Check SSL mode
    if (process.env.DATABASE_URL.includes('sslmode=require')) {
      console.log("✅ SSL mode is enabled (required for production)");
      checks.passed++;
    } else {
      console.log("⚠️  SSL mode not explicitly set - should be 'require' for production");
      checks.warnings++;
    }

    // Check connection pooling
    if (process.env.DATABASE_URL.includes('pooler')) {
      console.log("✅ Connection pooling is enabled");
      checks.passed++;
    } else {
      console.log("⚠️  Connection pooling not detected - recommended for production");
      checks.warnings++;
    }
  }

  if (process.env.JWT_SECRET) {
    if (process.env.JWT_SECRET === 'your-super-secret-jwt-key-change-this-in-production') {
      console.log("⚠️  JWT_SECRET is using default value - change for production!");
      checks.warnings++;
    } else {
      console.log("✅ JWT_SECRET is configured");
      checks.passed++;
    }
  } else {
    console.log("❌ JWT_SECRET is not set");
    checks.failed++;
  }

  if (process.env.NODE_ENV) {
    console.log(`✅ NODE_ENV is set to: ${process.env.NODE_ENV}`);
    checks.passed++;
  } else {
    console.log("⚠️  NODE_ENV is not set");
    checks.warnings++;
  }

  console.log();

  if (checks.failed > 0) {
    console.log("❌ Environment check failed. Fix errors before continuing.\n");
    return false;
  }

  // Check 2: Database Connection
  console.log("📋 Check 2: Database Connection");
  try {
    const sql = neon(process.env.DATABASE_URL);
    const result = await sql`SELECT NOW() as time, version() as version`;
    console.log("✅ Successfully connected to Neon database");
    console.log(`   PostgreSQL Version: ${result[0].version.split(' ')[0]}`);
    checks.passed++;
  } catch (error) {
    console.log(`❌ Database connection failed: ${error.message}`);
    checks.failed++;
    console.log();
    return false;
  }
  console.log();

  // Check 3: Required Tables
  console.log("📋 Check 3: Database Schema");
  try {
    const sql = neon(process.env.DATABASE_URL);
    
    const requiredTables = [
      'users', 'password_reset_tokens', 'sprints', 'tasks',
      'wellbeing_metrics', 'gamification', 'ethical_metrics',
      'sprint_analytics', 'ai_insights', 'chats', 'chat_participants',
      'messages', 'reactions', 'kanban_columns', 'kanban_tasks',
      'kanban_task_comments', 'kanban_task_attachments', 'calendar_events'
    ];

    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;

    const existingTables = tables.map(t => t.table_name);
    
    let allTablesExist = true;
    for (const table of requiredTables) {
      if (existingTables.includes(table)) {
        console.log(`✅ Table '${table}' exists`);
        checks.passed++;
      } else {
        console.log(`❌ Table '${table}' is missing`);
        checks.failed++;
        allTablesExist = false;
      }
    }

    if (!allTablesExist) {
      console.log("\n⚠️  Some tables are missing. Run neon-setup.sql to create them.\n");
      return false;
    }
  } catch (error) {
    console.log(`❌ Schema check failed: ${error.message}`);
    checks.failed++;
    console.log();
    return false;
  }
  console.log();

  // Check 4: Indexes
  console.log("📋 Check 4: Database Indexes");
  try {
    const sql = neon(process.env.DATABASE_URL);
    
    const indexes = await sql`
      SELECT indexname, tablename
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname
    `;

    console.log(`✅ Found ${indexes.length} indexes for performance optimization`);
    checks.passed++;
  } catch (error) {
    console.log(`⚠️  Could not verify indexes: ${error.message}`);
    checks.warnings++;
  }
  console.log();

  // Check 5: Sample Data
  console.log("📋 Check 5: Sample/Seed Data");
  try {
    const sql = neon(process.env.DATABASE_URL);
    
    const userCount = await sql`SELECT COUNT(*) as count FROM users`;
    const sprintCount = await sql`SELECT COUNT(*) as count FROM sprints`;
    const columnCount = await sql`SELECT COUNT(*) as count FROM kanban_columns`;

    if (userCount[0].count > 0) {
      console.log(`✅ Found ${userCount[0].count} users in database`);
      checks.passed++;
    } else {
      console.log("⚠️  No users found - you may want to create an admin user");
      checks.warnings++;
    }

    if (sprintCount[0].count > 0) {
      console.log(`✅ Found ${sprintCount[0].count} sprints`);
      checks.passed++;
    } else {
      console.log("⚠️  No sprints found");
      checks.warnings++;
    }

    if (columnCount[0].count > 0) {
      console.log(`✅ Found ${columnCount[0].count} kanban columns`);
      checks.passed++;
    } else {
      console.log("⚠️  No kanban columns found");
      checks.warnings++;
    }
  } catch (error) {
    console.log(`⚠️  Could not check sample data: ${error.message}`);
    checks.warnings++;
  }
  console.log();

  // Check 6: Triggers
  console.log("📋 Check 6: Database Triggers");
  try {
    const sql = neon(process.env.DATABASE_URL);
    
    const triggers = await sql`
      SELECT trigger_name, event_object_table
      FROM information_schema.triggers
      WHERE trigger_schema = 'public'
    `;

    if (triggers.length > 0) {
      console.log(`✅ Found ${triggers.length} triggers (auto-update timestamps)`);
      checks.passed++;
    } else {
      console.log("⚠️  No triggers found - timestamps may not auto-update");
      checks.warnings++;
    }
  } catch (error) {
    console.log(`⚠️  Could not verify triggers: ${error.message}`);
    checks.warnings++;
  }
  console.log();

  // Check 7: Performance Test
  console.log("📋 Check 7: Performance Test");
  try {
    const sql = neon(process.env.DATABASE_URL);
    
    const start = Date.now();
    await sql`SELECT * FROM users LIMIT 10`;
    const duration = Date.now() - start;

    if (duration < 100) {
      console.log(`✅ Query performance: ${duration}ms (excellent)`);
      checks.passed++;
    } else if (duration < 500) {
      console.log(`✅ Query performance: ${duration}ms (good)`);
      checks.passed++;
    } else {
      console.log(`⚠️  Query performance: ${duration}ms (may need optimization)`);
      checks.warnings++;
    }
  } catch (error) {
    console.log(`⚠️  Performance test failed: ${error.message}`);
    checks.warnings++;
  }
  console.log();

  // Final Report
  console.log("=" .repeat(60));
  console.log("📊 PRODUCTION READINESS SUMMARY\n");
  console.log(`✅ Passed:   ${checks.passed}`);
  console.log(`⚠️  Warnings: ${checks.warnings}`);
  console.log(`❌ Failed:   ${checks.failed}\n`);

  if (checks.failed === 0 && checks.warnings <= 3) {
    console.log("🎉 SUCCESS! Your database is READY FOR PRODUCTION!\n");
    console.log("Next steps:");
    console.log("  1. Update JWT_SECRET for production (if still using default)");
    console.log("  2. Set NODE_ENV=production in production environment");
    console.log("  3. Monitor database performance in Neon dashboard");
    console.log("  4. Set up regular backups (Neon handles this automatically)");
    console.log("  5. Review and update any sensitive data before deploying\n");
    return true;
  } else if (checks.failed === 0) {
    console.log("⚠️  Your database is functional but has some warnings.");
    console.log("Review the warnings above before deploying to production.\n");
    return true;
  } else {
    console.log("❌ Your database is NOT ready for production.");
    console.log("Fix the failed checks above before deploying.\n");
    return false;
  }
}

runProductionChecks().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error("Fatal error:", error);
  process.exit(1);
});
