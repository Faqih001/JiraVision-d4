"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"

interface ErrorBoundaryProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ErrorBoundary({ error, reset }: ErrorBoundaryProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Error caught by error boundary:", error)
  }, [error])

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
      <div className="space-y-4">
        <h2 className="text-3xl font-bold tracking-tight">Something went wrong!</h2>
        <p className="text-muted-foreground">
          We apologize for the inconvenience. Our team has been notified of this issue.
        </p>
        {error.message && (
          <div className="rounded-md bg-muted p-4 text-sm">
            <p>Error: {error.message}</p>
          </div>
        )}
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  )
}
