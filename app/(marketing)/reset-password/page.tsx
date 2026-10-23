"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Lock, Eye, EyeOff, ArrowLeft, CheckCircle } from "lucide-react"
import { MainNavbar } from "@/components/main-navbar"
import { MainFooter } from "@/components/main-footer"
import { useAuth } from "@/context/auth-context"

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState("")
  const [tokenError, setTokenError] = useState("")
  const [isTokenValid, setIsTokenValid] = useState(false)
  const [isCheckingToken, setIsCheckingToken] = useState(true)

  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams?.get("token") || ""
  const { verifyResetToken, resetPassword } = useAuth()

  useEffect(() => {
    const checkToken = async () => {
      if (!token) {
        setTokenError("Missing reset token. Please request a new password reset link.")
        setIsCheckingToken(false)
        return
      }

      try {
        const result = await verifyResetToken(token)
        setIsTokenValid(result.valid)
        if (!result.valid) {
          setTokenError(result.message || "Invalid or expired reset token. Please request a new password reset link.")
        }
      } catch (err) {
        setTokenError("An error occurred while verifying your reset token. Please try again.")
      } finally {
        setIsCheckingToken(false)
      }
    }

    checkToken()
  }, [token, verifyResetToken])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long")
      return
    }

    setIsSubmitting(true)

    try {
      const result = await resetPassword(token, password, confirmPassword)
      if (result.success) {
        setIsSubmitted(true)
      } else {
        setError(result.message || "Failed to reset password. Please try again.")
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.")
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <MainNavbar />
      <div className="flex-1 flex items-center justify-center bg-gray-50 p-4 md:p-8">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl shadow-lg p-8">
            {isCheckingToken ? (
              <div className="text-center py-8">
                <div className="animate-pulse mb-4">
                  <div className="h-12 w-12 bg-primary/20 rounded-full mx-auto"></div>
                </div>
                <p className="text-muted-foreground">Verifying your reset token...</p>
              </div>
            ) : tokenError ? (
              <div className="text-center py-4">
                <Alert variant="destructive" className="mb-6">
                  <AlertDescription>{tokenError}</AlertDescription>
                </Alert>
                <Link href="/forgot-password">
                  <Button>Request New Reset Link</Button>
                </Link>
              </div>
            ) : !isSubmitted ? (
              <>
                <div className="mb-6">
                  <h1 className="text-2xl font-bold mb-2">Create new password</h1>
                  <p className="text-muted-foreground">
                    Your new password must be different from previously used passwords.
                  </p>
                </div>

                {error && (
                  <Alert variant="destructive" className="mb-6">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">New password</Label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <Lock className="h-5 w-5 text-gray-400" />
                      </div>
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        required
                        className="pl-10 pr-10"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isSubmitting}
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 flex items-center pr-3"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5 text-gray-400" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm new password</Label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <Lock className="h-5 w-5 text-gray-400" />
                      </div>
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        className="pl-10 pr-10"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={isSubmitting}
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 flex items-center pr-3"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-5 w-5 text-gray-400" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? "Resetting..." : "Reset password"}
                  </Button>
                </form>
              </>
            ) : (
              <div className="text-center">
                <div className="flex justify-center mb-4">
                  <CheckCircle className="h-12 w-12 text-green-500" />
                </div>
                <h1 className="text-2xl font-bold mb-2">Password reset successful</h1>
                <p className="text-muted-foreground mb-6">
                  Your password has been successfully reset. You can now log in with your new password.
                </p>
                <Link href="/login">
                  <Button>Go to login</Button>
                </Link>
              </div>
            )}

            {!tokenError && !isSubmitted && (
              <div className="mt-6 pt-6 border-t text-center">
                <Link href="/login" className="inline-flex items-center text-sm text-primary hover:underline">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to login
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
      <MainFooter />
    </div>
  )
}
