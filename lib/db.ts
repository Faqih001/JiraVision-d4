import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { users, passwordResetTokens } from '@/drizzle/schema';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

// User type for authentication
export type User = {
  id: number;
  name: string;
  email: string;
  passwordHash: string;
  role: string;
  avatar: string | null;
  emailVerified: boolean;
  jobTitle: string | null;
  department: string | null;
  location: string | null;
  bio: string | null;
  skills: string[] | null;
  timezone: string | null;
  status: string | null;
  lastActive: Date | null;
  createdAt: Date;
  updatedAt: Date | null;
};

// Use connection string from .env
const connectionString = process.env.DATABASE_URL!;

// Always use PostgreSQL
const isDatabaseTypePostgres = true;

// Debug flag
const DEBUG = process.env.NODE_ENV === 'development';

console.log('Database connection: Using PostgreSQL connection');

// Configure options based on database type
const connectionOptions: postgres.Options<{}> = {
  max: 1,
  debug: DEBUG,
  ssl: isDatabaseTypePostgres ? { rejectUnauthorized: false } : undefined,
  onnotice: msg => {
    if (DEBUG) console.log('Database notice:', msg);
  }
};

// Create a default client - will be replaced in the try block if successful
let queryClient = postgres('postgres://localhost:5432/empty', { max: 0 });

try {
  // For query purposes (not migrations)
  queryClient = postgres(connectionString, connectionOptions);
  
  if (DEBUG) {
    console.log('Database connection established successfully.');
  }
} catch (error) {
  console.error('Failed to establish database connection:', error);
  // We already have a fallback client defined above
}

// Export db OUTSIDE the try-catch
export const db: PostgresJsDatabase<typeof schema> = drizzle(queryClient, { schema });

// Create a separate connection for one-off operations that is immediately closed
export async function withDb<T>(callback: (db: PostgresJsDatabase<typeof schema>) => Promise<T>): Promise<T> {
  const singleClient = postgres(connectionString, connectionOptions);
  const singleDb = drizzle(singleClient, { schema });
  
  try {
    return await callback(singleDb);
  } catch (error) {
    console.error('Error in database operation:', error);
    throw error;
  } finally {
    await singleClient.end();
  }
}

// Helper functions for common database operations

// Get user by ID
export async function getUserById(id: number): Promise<User | null> {
  try {
    const result = await db.select().from(users).where(eq(users.id, id));
    if (!result || result.length === 0) return null;
    
    const user = result[0];
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      passwordHash: user.passwordHash,
      role: user.role,
      avatar: user.avatar,
      emailVerified: user.emailVerified ?? false,
      jobTitle: user.jobTitle,
      department: user.department,
      location: user.location,
      bio: user.bio,
      skills: [], // TODO: Implement skills once schema is updated
      timezone: user.timezone,
      status: user.status,
      lastActive: user.lastActive,
      createdAt: user.createdAt ?? new Date(),
      updatedAt: user.updatedAt
    };
  } catch (error) {
    console.error('Error getting user by ID:', error);
    return null;
  }
}

// Get user by email
export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    const result = await db.select().from(users).where(eq(users.email, email));
    if (!result || result.length === 0) return null;
    
    const user = result[0];
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      passwordHash: user.passwordHash,
      role: user.role,
      avatar: user.avatar,
      emailVerified: user.emailVerified ?? false,
      jobTitle: user.jobTitle,
      department: user.department,
      location: user.location,
      bio: user.bio,
      skills: [], // TODO: Implement skills once schema is updated
      timezone: user.timezone,
      status: user.status,
      lastActive: user.lastActive,
      createdAt: user.createdAt ?? new Date(),
      updatedAt: user.updatedAt
    };
  } catch (error) {
    console.error('Error getting user by email:', error);
    return null;
  }
}

// Helper for database transactions
export async function transaction<T>(
  callback: (tx: PostgresJsDatabase<typeof schema>) => Promise<T>
): Promise<T> {
  return await withDb(async (db) => {
    try {
      return await db.transaction(async (tx) => {
        return await callback(tx);
      });
    } catch (error) {
      console.error('Transaction error:', error);
      throw error;
    }
  });
}

// Auth functions
export async function createUser(data: {
  name: string;
  email: string;
  passwordHash: string;
  avatar?: string;
}): Promise<User> {
  try {
    const [newUser] = await db.insert(users)
      .values({
        name: data.name,
        email: data.email,
        passwordHash: data.passwordHash,
        avatar: data.avatar,
        role: "user",
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    
    return newUser as User;
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
}

export async function createPasswordResetToken(
  userId: number,
  token: string,
  expiresAt: Date
) {
  try {
    const [result] = await db.insert(passwordResetTokens)
      .values({
        userId: userId,
        token: token,
        expiresAt: expiresAt,
        createdAt: new Date()
      })
      .returning();
    
    return result;
  } catch (error) {
    console.error("Error creating password reset token:", error);
    return null;
  }
}

export async function getPasswordResetToken(token: string) {
  try {
    const result = await db.query.passwordResetTokens.findFirst({
      where: eq(passwordResetTokens.token, token)
    });
    
    return result;
  } catch (error) {
    console.error("Error getting password reset token:", error);
    return null;
  }
}

export async function deletePasswordResetToken(token: string) {
  try {
    await db.delete(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token));
  } catch (error) {
    console.error("Error deleting password reset token:", error);
  }
}
