import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { users, passwordResetTokens } from '@/drizzle/schema';

// User type for authentication
export type User = {
  id: number;
  name: string;
  email: string;
  passwordHash: string;
  role: string;
  avatar?: string;
  emailVerified: boolean;
};

// Use connection string from .env
const connectionString = process.env.DATABASE_URL!;

// For query purposes (not migrations)
const queryClient = postgres(connectionString, { max: 1 });
export const db = drizzle(queryClient, { schema });

// Create a separate connection for one-off operations that is immediately closed
export async function withDb<T>(callback: (db: typeof db) => Promise<T>): Promise<T> {
  const singleClient = postgres(connectionString);
  const singleDb = drizzle(singleClient, { schema });
  
  try {
    return await callback(singleDb);
  } finally {
    await singleClient.end();
  }
}

// Helper for database transactions
export async function transaction<T>(
  callback: (tx: typeof db) => Promise<T>
): Promise<T> {
  return await withDb(async (db) => {
    return await db.transaction(async (tx) => {
      return await callback(tx);
    });
  });
}

// Auth functions
export async function getUserById(id: number): Promise<User | null> {
  try {
    const result = await db.query.users.findFirst({
      where: eq(users.id, id),
      columns: {
        id: true,
        name: true,
        email: true, 
        passwordHash: true,
        role: true,
        avatar: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    return result as User | null;
  } catch (error) {
    console.error("Error getting user by ID:", error);
    return null;
  }
}

export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    const result = await db.query.users.findFirst({
      where: eq(users.email, email),
      columns: {
        id: true,
        name: true,
        email: true, 
        passwordHash: true,
        role: true,
        avatar: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    return result as User | null;
  } catch (error) {
    console.error("Error getting user by email:", error);
    return null;
  }
}

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
