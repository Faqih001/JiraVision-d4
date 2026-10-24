"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { useAuth } from "@/context/auth-context"
import { AuthShell } from "@/components/auth/auth-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Mail, ArrowLeft, CheckCircle } from "lucide-react"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const { forgotPassword } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsSubmitting(true)

    try {
      const result = await forgotPassword(email)
      if (result.success) {
        setIsSubmitted(true)
        setSuccessMessage(result.message || "Password reset email sent")
      } else {
        setError(result.message || "Failed to send reset email")
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.")
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthShell
      image="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80"
      imageAlt="Laptops and notebooks on a busy small-team desk"
      imageSide="left"
      panelTitle="Account recovery"
      panelBody="Reset links go to the address already on your account, and your password stays unchanged until you follow one."
      title="Reset your password"
      subtitle="Enter your email address and we’ll send you a link to reset your password."
    >
      {!isSubmitted ? (
        <>
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                </div>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="pl-10"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <Button type="submit" className="w-full rounded-full" disabled={isSubmitting}>
              {isSubmitting ? "Sending..." : "Send reset link"}
            </Button>
          </form>
        </>
      ) : (
        <div className="text-center">
          <div className="mb-4 flex justify-center">
            <CheckCircle className="h-12 w-12 text-success" />
          </div>
          <h2 className="font-display text-xl font-medium">Check your email</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            We’ve sent a password reset link to <strong>{email}</strong>. Follow the instructions in the
            email to choose a new password.
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            Don’t see it? Check your spam folder or{" "}
            <button type="button" onClick={() => setIsSubmitted(false)} className="font-medium text-primary hover:underline">
              try again
            </button>
            .
          </p>
        </div>
      )}

      <div className="mt-6 border-t border-border pt-6 text-center">
        <Link href="/login" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" />
          Back to login
        </Link>
      </div>
    </AuthShell>
  )
}
