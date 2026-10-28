"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export type User = {
  id: number
  name: string
  email: string
  role: string
  avatar?: string
  emailVerified: boolean
}

/**
 * `unavailable` is not `signed out`. It means the last lookup could not be answered because the
 * database did not reply, and treating that as a sign-out is the fake 401 this whole path exists
 * to stop.
 */
export type AuthStatus = "checking" | "ready" | "unavailable"

export type SessionReason = "not_found" | "expired" | "revoked"

type AuthContextType = {
  user: User | null
  isLoading: boolean
  status: AuthStatus
  /** Why the last session ended, for the message on the sign-in page. */
  sessionReason: SessionReason | null
  /** Ask again after an `unavailable` result, without reloading the page. */
  retrySession: () => void
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>
  signup: (
    name: string,
    email: string,
    password: string,
    confirmPassword: string,
  ) => Promise<{ success: boolean; message?: string }>
  logout: () => Promise<void>
  forgotPassword: (email: string) => Promise<{ success: boolean; message?: string }>
  verifyResetToken: (token: string) => Promise<{ valid: boolean; message?: string }>
  resetPassword: (
    token: string,
    password: string,
    confirmPassword: string,
  ) => Promise<{ success: boolean; message?: string }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// A cold Neon compute answers within ~9s of the first stalled handshake, so the retries cover
// roughly that long before the app admits it cannot tell who is signed in.
const SESSION_RETRY_DELAYS_MS = [1000, 2000, 4000, 8000, 8000]

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<AuthStatus>("checking")
  const [sessionReason, setSessionReason] = useState<SessionReason | null>(null)
  const [attempt, setAttempt] = useState(0)
  const router = useRouter()

  // Check if user is logged in on initial load
  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const response = await fetch("/api/auth/session", {
          credentials: "include",
          cache: "no-store",
        })

        if (cancelled) return

        // 503 says nobody knows yet. Hold the state — do not clear a user we already had, and do
        // not announce a sign-out that never happened.
        if (!response.ok) {
          setStatus("unavailable")
          return
        }

        const data = await response.json().catch(() => ({}))
        if (cancelled) return

        setUser(data.user ?? null)
        setSessionReason(data.user ? null : (data.reason ?? null))
        setStatus("ready")
      } catch {
        // The dev server restarted, or the network dropped. Same reasoning as a 503.
        if (!cancelled) setStatus("unavailable")
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [attempt])

  useEffect(() => {
    if (status !== "unavailable") return
    const delay = SESSION_RETRY_DELAYS_MS[attempt]
    if (delay === undefined) return
    const timer = setTimeout(() => setAttempt((current) => current + 1), delay)
    return () => clearTimeout(timer)
  }, [status, attempt])

  const retrySession = () => {
    setStatus("checking")
    setAttempt(0)
  }

  const isLoading = status === "checking"

  const login = async (email: string, password: string) => {
    try {
      const formData = new FormData()
      formData.append("email", email)
      formData.append("password", password)

      const response = await fetch("/api/auth/login", {
        method: "POST",
        body: formData,
        credentials: "include",
      })

      if (response.status === 503) {
        setStatus("unavailable")
        return { success: false, message: "JiraVision is waking up. Try again in a moment." }
      }

      const data = await response.json().catch(() => ({}))

      if (response.ok && data.success && data.user) {
        setUser(data.user)
        setSessionReason(null)
        setStatus("ready")
        return { success: true }
      }

      return { success: false, message: data.message || "Login failed. Please check your credentials." }
    } catch {
      return { success: false, message: "Unable to connect to server. Please check your connection." }
    }
  }

  const signup = async (name: string, email: string, password: string, confirmPassword: string) => {
    try {
      const formData = new FormData()
      formData.append("name", name)
      formData.append("email", email)
      formData.append("password", password)
      formData.append("confirmPassword", confirmPassword)

      const response = await fetch("/api/auth/signup", {
        method: "POST",
        body: formData,
        credentials: "include",
      })

      if (response.status === 503) {
        setStatus("unavailable")
        return { success: false, message: "JiraVision is waking up. Try again in a moment." }
      }

      const data = await response.json().catch(() => ({}))

      if (response.ok && data.success && data.user) {
        setUser(data.user)
        setSessionReason(null)
        setStatus("ready")
        return { success: true }
      }

      return { success: false, message: data.message || "Signup failed. Please try again." }
    } catch {
      return { success: false, message: "Unable to connect to server. Please check your connection." }
    }
  }

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      })
    } catch {
      // Silently handle error - still log out locally
    } finally {
      setUser(null)
      setSessionReason(null)
      setStatus("ready")
      router.push("/")
    }
  }

  const forgotPassword = async (email: string) => {
    try {
      const formData = new FormData()
      formData.append("email", email)

      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        body: formData,
      })

      const data = await response.json().catch(() => ({}))
      return { success: data.success, message: data.message }
    } catch (error) {
      console.error("Forgot password error:", error)
      return { success: false, message: "An unexpected error occurred" }
    }
  }

  const verifyResetToken = async (token: string) => {
    try {
      const response = await fetch(`/api/auth/verify-token?token=${encodeURIComponent(token)}`)
      const data = await response.json().catch(() => ({}))
      return { valid: data.valid, message: data.message }
    } catch (error) {
      console.error("Verify token error:", error)
      return { valid: false, message: "An unexpected error occurred" }
    }
  }

  const resetPassword = async (token: string, password: string, confirmPassword: string) => {
    try {
      const formData = new FormData()
      formData.append("token", token)
      formData.append("password", password)
      formData.append("confirmPassword", confirmPassword)

      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        body: formData,
      })

      const data = await response.json().catch(() => ({}))
      return { success: data.success, message: data.message }
    } catch (error) {
      console.error("Reset password error:", error)
      return { success: false, message: "An unexpected error occurred" }
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        status,
        sessionReason,
        retrySession,
        login,
        signup,
        logout,
        forgotPassword,
        verifyResetToken,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
