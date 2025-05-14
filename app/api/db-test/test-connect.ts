import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

async function testDatabaseConnection() {
  console.log('Testing database connection...');
  console.log(`Database URL: ${process.env.DATABASE_URL ? 'Set (hidden for security)' : 'Not set!'}`);
  
  try {
    // Test basic connectivity
    const result = await db.execute(sql`SELECT NOW() as current_time`);
    console.log('Connection successful!');
    console.log(`Server time: ${result[0]?.current_time}`);
    
    // Check if required tables exist
    console.log('\nChecking for required tables...');
    
    const tablesResult = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('chats', 'messages', 'chat_participants', 'reactions', 'drizzle_migrations')
    `);
    
    const existingTables = tablesResult.map((row: any) => row.table_name);
    console.log('Existing tables:', existingTables);
    
    // Check if required tables are missing
    const requiredTables = ['chats', 'messages', 'chat_participants', 'reactions'];
    const missingTables = requiredTables.filter(table => !existingTables.includes(table));
    
    if (missingTables.length > 0) {
      console.warn(`\n⚠️ Warning: The following required tables are missing: ${missingTables.join(', ')}`);
      console.log('You should run migrations to create these tables.');
    } else {
      console.log('\n✅ All required tables exist!');
      
      // If tables exist, check row counts
      console.log('\nChecking table data...');
      for (const table of requiredTables) {
        const countResult = await db.execute(sql.raw(`SELECT COUNT(*) FROM ${table}`));
        console.log(`- ${table}: ${countResult[0]?.count || 0} rows`);
      }
    }
    
    // Check migrations
    if (existingTables.includes('drizzle_migrations')) {
      const migrationsResult = await db.execute(sql`
        SELECT id, hash, created_at
        FROM drizzle_migrations
        ORDER BY created_at DESC
      `);
      
      console.log('\nMigration history:');
      if (migrationsResult.length === 0) {
        console.log('No migrations have been applied yet.');
      } else {
        migrationsResult.forEach((migration: any, index: number) => {
          console.log(`${index + 1}. [${migration.created_at}] ${migration.hash}`);
        });
      }
    } else {
      console.warn('\n⚠️ Warning: No drizzle_migrations table found. Migrations may not have been run.');
    }
    
  } catch (error) {
    console.error('Error connecting to database:', error);
    process.exit(1);
  }
}

// Run the test function
testDatabaseConnection().then(() => {
  console.log('\nTest completed.');
  process.exit(0);
}); 