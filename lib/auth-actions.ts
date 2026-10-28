"use server"

import { redirect } from "next/navigation"
import bcrypt from "bcryptjs"
import {
  createUser,
  getUserByEmail,
  createPasswordResetToken,
  getPasswordResetToken,
  deletePasswordResetToken,
  getUserById,
  DatabaseUnreachableError,
  db,
} from "./db"
import { Resend } from "resend"
import { users } from "@/drizzle/schema"
import { eq } from "drizzle-orm"
import { roleForSignup } from "./roles"
import { createResetToken } from "./auth/reset-token"
import {
  beginSession,
  clearSessionCookies,
  endSession,
  getCurrentUser,
  resolveSession,
  type SessionUser,
} from "./session"

const resend = new Resend(process.env.JIRAVISION_RESEND_API)

// Session management
//
// Thin wrappers over lib/session.ts, kept here because every data route in this app already
// imports getSession from this module.

export type { SessionResult, SessionUser } from "./session"

/**
 * Who this request is signed in as: the user the auth_sessions row behind the cookie's token
 * points to, or null. Returns null for a visitor and for a session that has ended, and throws
 * when the database could not be reached — see SessionUnreachableError.
 */
export async function getSession(): Promise<SessionUser | null> {
  return getCurrentUser()
}

/** The same read, with the outcome the caller has to branch on: see resolveSession. */
export async function getSessionStatus() {
  return resolveSession()
}

export async function clearSession() {
  await clearSessionCookies()
}

// Authentication actions

export type ActionResult = {
  success: boolean
  message?: string
  /**
   * True when the attempt failed because the database did not answer rather than because the
   * credentials were wrong. The routes turn it into a 503 so the form can say "try again"
   * instead of "invalid email or password" to someone whose password is correct.
   */
  unavailable?: boolean
  user?: SessionUser
}

const UNAVAILABLE: ActionResult = {
  success: false,
  unavailable: true,
  message: "JiraVision is waking up. Try again in a moment.",
}

function unreachable(error: unknown): ActionResult | null {
  return error instanceof DatabaseUnreachableError ? UNAVAILABLE : null
}

export async function login(formData: FormData): Promise<ActionResult> {
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

    await beginSession(user.id)

    const { passwordHash: _passwordHash, ...userWithoutPassword } = user
    return { success: true, user: userWithoutPassword }
  } catch (error) {
    const stalled = unreachable(error)
    if (stalled) return stalled
    console.error("Login error:", error)
    return { success: false, message: "An unexpected error occurred" }
  }
}

export async function signup(formData: FormData): Promise<ActionResult> {
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
      role: roleForSignup(email),
    })

    await beginSession(newUser.id)

    const { passwordHash: _, ...userWithoutPassword } = newUser
    return { success: true, user: userWithoutPassword }
  } catch (error) {
    // A stalled first read means "we do not know whether this email exists", which is not a
    // licence to create a second account with it.
    const stalled = unreachable(error)
    if (stalled) {
      console.error("Signup error:", error)
      return stalled
    }

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
  await endSession()
  redirect("/")
}

export async function forgotPassword(formData: FormData): Promise<ActionResult> {
  const email = formData.get("email") as string

  if (!email) {
    return { success: false, message: "Email is required" }
  }

  try {
    const user = await getUserByEmail(email)
    if (!user) {
      // Don't reveal that the email doesn't exist for security reasons
      return { success: true, message: "If your email is registered, you will receive a password reset link" }
    }

    // A 256-bit random token; the table keeps only its digest (lib/auth/reset-token.ts).
    const token = createResetToken()
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
    const stalled = unreachable(error)
    if (stalled) {
      console.error("Forgot password error:", error)
      return stalled
    }
    console.error("Forgot password error:", error)
    return { success: false, message: "An unexpected error occurred" }
  }
}

export async function verifyResetToken(token: string) {
  if (!token) {
    return { valid: false, message: "Invalid token" }
  }

  try {
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
    // A database that did not answer must not read as a dead link: the link is fine and the
    // person would request a new one for nothing.
    if (unreachable(error)) {
      return { valid: false, unavailable: true, message: UNAVAILABLE.message }
    }
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
    // Same rule as verify: a stall is a retry, not "invalid or expired token".
    if (unreachable(error)) return UNAVAILABLE
    console.error("Reset password error:", error)
    return { success: false, message: "An unexpected error occurred" }
  }
}
