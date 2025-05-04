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

type AuthContextType = {
  user: User | null
  isLoading: boolean
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  // Check if user is logged in on initial load
  useEffect(() => {
    async function loadUser() {
      try {
        const response = await fetch("/api/auth/session")
        const data = await response.json()

        if (data.user) {
          setUser(data.user)
        }
      } catch (error) {
        console.error("Failed to load user session:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadUser()
  }, [])

  const login = async (email: string, password: string) => {
    setIsLoading(true)
    try {
      const formData = new FormData()
      formData.append("email", email)
      formData.append("password", password)

      const response = await fetch("/api/auth/login", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (data.success && data.user) {
        setUser(data.user)
        return { success: true }
      }

      return { success: false, message: data.message || "Login failed" }
    } catch (error) {
      console.error("Login error:", error)
      return { success: false, message: "An unexpected error occurred" }
    } finally {
      setIsLoading(false)
    }
  }

  const signup = async (name: string, email: string, password: string, confirmPassword: string) => {
    setIsLoading(true)
    try {
      const formData = new FormData()
      formData.append("name", name)
      formData.append("email", email)
      formData.append("password", password)
      formData.append("confirmPassword", confirmPassword)

      const response = await fetch("/api/auth/signup", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (data.success && data.user) {
        setUser(data.user)
        return { success: true }
      }

      return { success: false, message: data.message || "Signup failed" }
    } catch (error) {
      console.error("Signup error:", error)
      return { success: false, message: "An unexpected error occurred" }
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
      setUser(null)
      router.push("/")
    } catch (error) {
      console.error("Logout error:", error)
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

      const data = await response.json()
      return { success: data.success, message: data.message }
    } catch (error) {
      console.error("Forgot password error:", error)
      return { success: false, message: "An unexpected error occurred" }
    }
  }

  const verifyResetToken = async (token: string) => {
    try {
      const response = await fetch(`/api/auth/verify-token?token=${token}`)
      const data = await response.json()
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

      const data = await response.json()
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
