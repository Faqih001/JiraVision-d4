"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"

// Types of user adetails and role (Admin or User)
type User = {
  id: string
  name: string
  email: string
  role: "admin" | "user"
  avatar?: string
}

// Type for the context value
type AuthContextType = {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<boolean>
  signup: (name: string, email: string, password: string) => Promise<boolean>
  logout: () => void
  forgotPassword: (email: string, token?: string) => Promise<boolean>
  resetPassword: (token: string, newPassword: string) => Promise<boolean>
  verifyResetToken: (token: string) => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  // Check if user is logged in on initial load
  useEffect(() => {
    const storedUser = localStorage.getItem("jiravision_user")
    if (storedUser) {
      setUser(JSON.parse(storedUser))
    }
    setIsLoading(false)
  }, [])

  // Mock users for demo purposes
  const mockUsers = [
    {
      id: "1",
      name: "Demo User",
      email: "demo@example.com",
      password: "password",
      role: "user" as const,
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=demo",
    },
    {
      id: "2",
      name: "Admin User",
      email: "admin@example.com",
      password: "admin123",
      role: "admin" as const,
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=admin",
    },
  ]

  // Store reset tokens (in a real app, this would be in a database)
  const [resetTokens, setResetTokens] = useState<Record<string, string>>({})

  const login = async (email: string, password: string) => {
    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 1000))

    const foundUser = mockUsers.find((u) => u.email === email && u.password === password)

    if (foundUser) {
      const { password: _, ...userWithoutPassword } = foundUser
      setUser(userWithoutPassword)
      localStorage.setItem("jiravision_user", JSON.stringify(userWithoutPassword))
      return true
    }

    return false
  }

  const signup = async (name: string, email: string, password: string) => {
    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Check if user already exists
    if (mockUsers.some((u) => u.email === email)) {
      return false
    }

    // In a real app, we would create a new user in the database
    // For demo, we'll just create a new user object
    const newUser = {
      id: `${mockUsers.length + 1}`,
      name,
      email,
      role: "user" as const,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
    }

    setUser(newUser)
    localStorage.setItem("jiravision_user", JSON.stringify(newUser))
    return true
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem("jiravision_user")
    router.push("/")
  }

  const forgotPassword = async (email: string, token?: string) => {
    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Check if email exists
    const foundUser = mockUsers.find((u) => u.email === email)
    if (!foundUser) {
      return false
    }

    // If a token is provided, store it
    if (token) {
      // Store the token with the user's email
      setResetTokens((prev) => ({
        ...prev,
        [token]: email,
      }))
    } else {
      // Generate a reset token (in a real app, this would be a secure random token)
      const generatedToken = Math.random().toString(36).substring(2, 15)

      // Store the token with the user's email
      setResetTokens((prev) => ({
        ...prev,
        [generatedToken]: email,
      }))

      // In a real app, we would send an email with the reset link
      console.log(`Reset token for ${email}: ${generatedToken}`)
    }

    return true
  }

  const verifyResetToken = async (token: string) => {
    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Check if token exists
    return !!resetTokens[token]
  }

  const resetPassword = async (token: string, newPassword: string) => {
    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Check if token exists
    const email = resetTokens[token]
    if (!email) {
      return false
    }

    // In a real app, we would update the user's password in the database
    console.log(`Password reset for ${email}: ${newPassword}`)

    // Remove the used token
    const { [token]: _, ...remainingTokens } = resetTokens
    setResetTokens(remainingTokens)

    return true
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
        resetPassword,
        verifyResetToken,
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
