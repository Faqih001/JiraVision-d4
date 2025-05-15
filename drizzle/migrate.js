const { migrate } = require('drizzle-orm/postgres-js/migrator');
const postgres = require('postgres');
const { drizzle } = require('drizzle-orm/postgres-js');
const fs = require('fs');
require('dotenv').config();

const runMigrations = async () => {
  try {
    // Get connection string from environment
    const connectionString = process.env.DATABASE_URL;
    
    if (!connectionString) {
      console.error('DATABASE_URL environment variable is not set!');
      process.exit(1);
    }
    
    console.log('Running migrations...');
    console.log(`Using connection: ${connectionString.replace(/:[^:]*@/, ':***@')}`);
    
    // Check if migrations folder exists
    if (!fs.existsSync('./drizzle/migrations')) {
      console.error('Migrations folder does not exist!');
      process.exit(1);
    }
    
    // List migration files
    const files = fs.readdirSync('./drizzle/migrations');
    console.log('Migration files:', files);
    
    // Create connection
    const migrationClient = postgres(connectionString, { max: 1 });
    
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