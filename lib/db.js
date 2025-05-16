const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
const schema = require('../drizzle/schema');
const { eq } = require('drizzle-orm');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Configure options
const connectionOptions = {
  max: 1,
  ssl: { rejectUnauthorized: false }
};

// Create the client
const client = postgres(connectionString, connectionOptions);
const db = drizzle(client, { schema });

// Get user by ID
async function getUserById(id) {
  try {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, id));
    if (!user) return null;

    return {
      ...user,
      emailVerified: user.emailVerified ?? false,
      skills: [], // TODO: Implement skills once schema is updated
      createdAt: user.createdAt ?? new Date()
    };
  } catch (error) {
    console.error('Error getting user by ID:', error);
    return null;
  }
}

// Get user by email
async function getUserByEmail(email) {
  try {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email));
    if (!user) return null;

    return {
      ...user,
      emailVerified: user.emailVerified ?? false,
      skills: [], // TODO: Implement skills once schema is updated
      createdAt: user.createdAt ?? new Date()
    };
  } catch (error) {
    console.error('Error getting user by email:', error);
    return null;
  }
}

module.exports = { 
  db, 
  eq,
  getUserById,
  getUserByEmail 
};
