// Database connection test script

// Since we can't easily import from the project directly in a JS script,
// we'll need to establish our own connection
const postgres = require('postgres');
const { drizzle } = require('drizzle-orm/postgres-js');

async function testDatabaseConnection() {
  console.log('Testing database connection...');
  
  // Check for DATABASE_URL
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('ERROR: DATABASE_URL environment variable is not set!');
    process.exit(1);
  }
  
  console.log(`Database URL: ${connectionString ? 'Set (hidden for security)' : 'Not set!'}`);
  
  // Create a postgres client
  const client = postgres(connectionString, { max: 1 });
  
  try {
    // Test basic connectivity
    const result = await client`SELECT NOW() as current_time`;
    console.log('Connection successful!');
    console.log(`Server time: ${result[0]?.current_time}`);
    
    // Check if required tables exist
    console.log('\nChecking for required tables...');
    
    const tablesResult = await client`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('chats', 'messages', 'chat_participants', 'reactions', 'drizzle_migrations')
    `;
    
    const existingTables = tablesResult.map(row => row.table_name);
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
        const countResult = await client`SELECT COUNT(*) FROM ${client(table)}`;
        console.log(`- ${table}: ${countResult[0]?.count || 0} rows`);
      }
    }
    
    // Check migrations
    if (existingTables.includes('drizzle_migrations')) {
      const migrationsResult = await client`
        SELECT id, hash, created_at
        FROM drizzle_migrations
        ORDER BY created_at DESC
      `;
      
      console.log('\nMigration history:');
      if (migrationsResult.length === 0) {
        console.log('No migrations have been applied yet.');
      } else {
        migrationsResult.forEach((migration, index) => {
          console.log(`${index + 1}. [${migration.created_at}] ${migration.hash}`);
        });
      }
    } else {
      console.warn('\n⚠️ Warning: No drizzle_migrations table found. Migrations may not have been run.');
    }
    
  } catch (error) {
    console.error('Error connecting to database:', error);
    process.exit(1);
  } finally {
    // Close the client connection
    await client.end();
  }
}

// Run the test function
testDatabaseConnection().then(() => {
  console.log('\nTest completed.');
  process.exit(0);
}); 