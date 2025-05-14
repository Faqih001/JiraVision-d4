const { migrate } = require('drizzle-orm/postgres-js/migrator');
const postgres = require('postgres');
const { drizzle } = require('drizzle-orm/postgres-js');
require('dotenv').config();

const runMigrations = async () => {
  // Get connection string from environment
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('DATABASE_URL environment variable is not set!');
    process.exit(1);
  }
  
  console.log('Running migrations...');
  
  // Create connection
  const migrationClient = postgres(connectionString, { max: 1 });
  
  try {
    const db = drizzle(migrationClient);
    
    // Run migrations
    console.log('Starting migration process...');
    await migrate(db, { migrationsFolder: './drizzle/migrations' });
    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Error running migrations:', error);
    process.exit(1);
  } finally {
    // Close connection
    await migrationClient.end();
  }
};

// Run the migration function
runMigrations(); 