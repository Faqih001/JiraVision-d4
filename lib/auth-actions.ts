"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import bcrypt from "bcryptjs"
import { v4 as uuidv4 } from "uuid"
import {
  createUser,
  getUserByEmail,
  createPasswordResetToken,
  getPasswordResetToken,
  deletePasswordResetToken,
  getUserById,
  type User,
  db,
} from "./db"
import { Resend } from "resend"
import { users } from "@/drizzle/schema"
import { eq } from "drizzle-orm"
import { initializeDatabase } from "./db-init"

const resend = new Resend(process.env.JIRAVISION_RESEND_API)

// Session management
export async function getSession() {
  try {
    console.log("getSession: Starting session retrieval");
    // In Next.js 15, cookies() returns a Promise that must be awaited
    const cookieStore = await cookies();
    console.log("getSession: Got cookie store");
    
    // Use optional chaining to safely access the cookie value
    const sessionId = cookieStore.get("session_id")?.value;
    console.log(`getSession: Session ID found: ${sessionId ? 'yes' : 'no'}`);
    if (!sessionId) return null;

    const userIdCookie = cookieStore.get("user_id")?.value;
    console.log(`getSession: User ID found: ${userIdCookie ? 'yes' : 'no'}`);
    if (!userIdCookie) return null;

    // Parse the user ID safely
    let userId: number;
    try {
      userId = Number.parseInt(userIdCookie);
      console.log(`getSession: Parsed user ID: ${userId}`);
      if (isNaN(userId) || userId <= 0) return null;
    } catch {
      console.log("getSession: Failed to parse user ID");
      return null;
    }

    console.log(`getSession: Looking up user with ID: ${userId}`);
    const user = await getUserById(userId);
    console.log(`getSession: User found: ${user ? 'yes' : 'no'}`);
    if (!user) return null;

    const { passwordHash, ...userWithoutPassword } = user;
    console.log("getSession: Returning user session");
    return userWithoutPassword as User;
  } catch (error) {
    console.error("Session error:", error);
    return null;
  }
}

export async function createSession(user: User) {
  console.log(`createSession: Creating session for user ID ${user.id}`);
  const sessionId = uuidv4()
  const twoWeeks = 14 * 24 * 60 * 60 * 1000
  
  try {
    // Get the cookies object - must await it in Next.js 15
    const cookieStore = await cookies();
    console.log("createSession: Got cookie store");

    console.log(`createSession: Setting session_id cookie: ${sessionId.substring(0, 6)}...`);
    cookieStore.set("session_id", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: new Date(Date.now() + twoWeeks),
      path: "/",
    })

    console.log(`createSession: Setting user_id cookie: ${user.id}`);
    cookieStore.set("user_id", user.id.toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: new Date(Date.now() + twoWeeks),
      path: "/",
    })
    console.log("createSession: Session cookies set successfully");
  } catch (error) {
    console.error("createSession error:", error);
  }
}

export async function clearSession() {
  console.log("clearSession: Clearing user session cookies");
  try {
    const cookieStore = await cookies();
    console.log("clearSession: Got cookie store");
    cookieStore.delete("session_id");
    cookieStore.delete("user_id");
    console.log("clearSession: Session cookies deleted successfully");
  } catch (error) {
    console.error("clearSession error:", error);
  }
}

// Authentication actions
export async function login(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  if (!email || !password) {
    return { success: false, message: "Email and password are required" }
  }

  try {
    const user = await getUserByEmail(email)
    if (!user) {
      return { success: false, message: "Invalid email or password" }
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash)
    if (!passwordMatch) {
      return { success: false, message: "Invalid email or password" }
    }

    const { passwordHash, ...userWithoutPassword } = user
    await createSession(userWithoutPassword as User)

    return { success: true, user: userWithoutPassword }
  } catch (error) {
    console.error("Login error:", error)
    return { success: false, message: "An unexpected error occurred" }
  }
}

export async function signup(formData: FormData) {
  const name = formData.get("name") as string
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const confirmPassword = formData.get("confirmPassword") as string

  if (!name || !email || !password) {
    return { success: false, message: "All fields are required" }
  }

  if (password !== confirmPassword) {
    return { success: false, message: "Passwords do not match" }
  }

  try {
    // Ensure database tables exist
    await initializeDatabase()

    const existingUser = await getUserByEmail(email)
    if (existingUser) {
      return { success: false, message: "Email already in use" }
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`

    const newUser = await createUser({
      name,
      email,
      passwordHash,
      avatar,
    })

    const { passwordHash: _, ...userWithoutPassword } = newUser
    await createSession(userWithoutPassword as User)

    return { success: true, user: userWithoutPassword }
  } catch (error) {
    console.error("Signup error:", error)

    // Check if it's a database connection error
    if (String(error).includes("connection") || String(error).includes("relation") || String(error).includes("table")) {
      return {
        success: false,
        message: "Database connection issue. Please try again later or contact support.",
      }
    }

    return { success: false, message: "An unexpected error occurred" }
  }
}

export async function logout() {
  await clearSession()
  redirect("/")
}

export async function forgotPassword(formData: FormData) {
  const email = formData.get("email") as string

  if (!email) {
    return { success: false, message: "Email is required" }
  }

  try {
    // Ensure database tables exist
    await initializeDatabase()

    const user = await getUserByEmail(email)
    if (!user) {
      // Don't reveal that the email doesn't exist for security reasons
      return { success: true, message: "If your email is registered, you will receive a password reset link" }
    }

    // Generate a secure token
    const token = uuidv4()
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 1) // Token expires in 1 hour

    await createPasswordResetToken(user.id, token, expiresAt)

    // Send email with reset link
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/reset-password?token=${token}`

    await resend.emails.send({
      from: "JiraVision <onboarding@resend.dev>",
      to: email,
      subject: "Reset Your JiraVision Password",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #7c3aed; padding: 20px; text-align: center; color: white;">
            <h1 style="margin: 0;">JiraVision</h1>
          </div>
          <div style="padding: 20px; border: 1px solid #e5e5e5; border-top: none;">
            <h2 style="color: #333; margin-top: 0;">Reset Your Password</h2>
            <p>Hello ${user.name},</p>
            <p>We received a request to reset your password for your JiraVision account. Click the button below to reset it:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background-color: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">Reset Password</a>
            </div>
            <p>If you didn't request a password reset, you can safely ignore this email.</p>
            <p>This link will expire in 1 hour for security reasons.</p>
            <p style="word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 4px; font-size: 14px;">${resetUrl}</p>
            <p style="margin-top: 30px; color: #666; font-size: 14px;">
              Regards,<br>
              The JiraVision Team
            </p>
          </div>
          <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
            <p>&copy; ${new Date().getFullYear()} JiraVision. All rights reserved.</p>
          </div>
        </div>
      `,
    })

    return { success: true, message: "If your email is registered, you will receive a password reset link" }
  } catch (error) {
    console.error("Forgot password error:", error)
    return { success: false, message: "An unexpected error occurred" }
  }
}

export async function verifyResetToken(token: string) {
  if (!token) {
    return { valid: false, message: "Invalid token" }
  }

  try {
    // Ensure database tables exist
    await initializeDatabase()

    const resetToken = await getPasswordResetToken(token)
    if (!resetToken) {
      return { valid: false, message: "Invalid or expired token" }
    }

    if (new Date() > new Date(resetToken.expiresAt)) {
      await deletePasswordResetToken(token)
      return { valid: false, message: "Token has expired" }
    }

    return { valid: true }
  } catch (error) {
    console.error("Verify token error:", error)
    return { valid: false, message: "An unexpected error occurred" }
  }
}

export async function resetPassword(formData: FormData) {
  const token = formData.get("token") as string
  const password = formData.get("password") as string
  const confirmPassword = formData.get("confirmPassword") as string

  if (!token || !password || !confirmPassword) {
    return { success: false, message: "All fields are required" }
  }

  if (password !== confirmPassword) {
    return { success: false, message: "Passwords do not match" }
  }

  try {
    // Ensure database tables exist
    await initializeDatabase()

    const resetToken = await getPasswordResetToken(token)
    if (!resetToken) {
      return { success: false, message: "Invalid or expired token" }
    }

    if (new Date() > new Date(resetToken.expiresAt)) {
      await deletePasswordResetToken(token)
      return { success: false, message: "Token has expired" }
    }

    const user = await getUserById(resetToken.userId)
    if (!user) {
      return { success: false, message: "User not found" }
    }

    const passwordHash = await bcrypt.hash(password, 10)

    // Update user's password
    await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, user.id))

    // Delete the used token
    await deletePasswordResetToken(token)

    return { success: true, message: "Password has been reset successfully" }
  } catch (error) {
    console.error("Reset password error:", error)
    return { success: false, message: "An unexpected error occurred" }
  }
}
