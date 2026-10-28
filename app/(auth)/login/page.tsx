"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Eye, EyeOff, Lock, Mail } from "lucide-react"

import { useAuth } from "@/context/auth-context"
import { AuthShell } from "@/components/auth/auth-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { safeNextPath } from "@/lib/auth/next-path"
import { SESSION_NOTICE, type InvalidReason } from "@/lib/auth/session-state"

const REASONS = new Set<string>(Object.keys(SESSION_NOTICE))

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const { login, sessionReason } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  // `?reason=` is what the server redirect put there; sessionReason is what this tab's own read
  // found. Either way it is only used as a lookup key, never rendered, so a crafted value cannot
  // put words on the page.
  const reasonParam = searchParams?.get("reason")
  const reason = reasonParam && REASONS.has(reasonParam) ? (reasonParam as InvalidReason) : sessionReason
  const notice = reason ? SESSION_NOTICE[reason] : null
  const next = safeNextPath(searchParams?.get("next"))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsSubmitting(true)

    try {
      const result = await login(email, password)

      if (result.success) {
        router.push(next)
      } else {
        setError(result.message || "Invalid email or password")
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
      image="https://images.unsplash.com/photo-1524749292158-7540c2494485?auto=format&fit=crop&w=1200&q=80"
      imageAlt="A teammate at a desktop screen showing a task board, others working at desks behind"
      imageSide="left"
      panelTitle="Welcome back"
      panelBody="Log in to your JiraVision account to pick up where your team left off."
      title="Sign in to your account"
      subtitle={
        <>
          Or{" "}
          <Link href="/signup" className="font-medium text-primary hover:underline">
            create a new account
          </Link>
        </>
      }
    >
      {notice && !error && (
        <Alert className="mb-6">
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
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

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline">
              Forgot your password?
            </Link>
          </div>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Lock className="h-5 w-5 text-muted-foreground" />
            </div>
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              className="pl-10 pr-10"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
            />
            <button
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <Button type="submit" className="w-full rounded-full" disabled={isSubmitting}>
          {isSubmitting ? "Signing in..." : "Sign in"}
        </Button>
      </form>
      <p className="mt-6 text-center text-xs text-muted-foreground">
        Protected by sign-in rate limits. Need help?{" "}
        <Link href="/contact" className="text-primary hover:underline">
          Contact support
        </Link>
        .
      </p>
    </AuthShell>
  )
}
