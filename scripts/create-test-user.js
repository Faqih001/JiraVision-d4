// This script helps test the authentication API endpoints

const postgres = require('postgres');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function createTestUser() {
  try {
    console.log('Creating a test user...');
    
    // Get connection string from environment
    const connectionString = process.env.DATABASE_URL;
    
    if (!connectionString) {
      console.error('DATABASE_URL environment variable is not set!');
      process.exit(1);
    }
    
    console.log('Using connection string:', connectionString);
    
    // Create postgres connection
    const client = postgres(connectionString, { 
      max: 1,
      debug: true,
      onnotice: m => console.log('DB notice:', m)
    });
    
    // Hash the password
    const passwordHash = await bcrypt.hash('Test123!', 10);
    
    // Insert the user directly into the database
    const result = await client`
      INSERT INTO users (name, email, password_hash, role, email_verified)
      VALUES ('Test Admin', 'admin@example.com', ${passwordHash}, 'admin', true),
             ('Test User', 'user@example.com', ${passwordHash}, 'user', true),
             ('John Doe', 'john@example.com', ${passwordHash}, 'user', true),
             ('Jane Smith', 'jane@example.com', ${passwordHash}, 'user', true),
             ('Product Manager', 'pm@example.com', ${passwordHash}, 'manager', true)
      RETURNING id, name, email, role
    `;
    
    console.log('Users created successfully:');
    console.log(result);
    
    // Test retrieving all users
    const users = await client`SELECT id, name, email, role FROM users`;
    
    console.log('\nAll users in database:');
    console.log(users);
    
    await client.end();
  } catch (error) {
    console.error('Error creating test users:', error);
  } finally {
    process.exit(0);
  }
}

// Run the function
createTestUser();
