"use client"

import { Button } from "@/components/ui/button"

interface GlobalErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export function GlobalError({ error, reset }: GlobalErrorProps) {
  return (
    <html>
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center text-center p-4">
          <div className="space-y-4 max-w-md">
            <h2 className="text-3xl font-bold tracking-tight">Something went wrong!</h2>
            <p className="text-gray-500">
              We apologize for the inconvenience. Our team has been notified of this issue.
            </p>
            {error.message && (
              <div className="rounded-md bg-gray-100 p-4 text-sm">
                <p>Error: {error.message}</p>
              </div>
            )}
            <Button onClick={reset}>Try again</Button>
          </div>
        </div>
      </body>
    </html>
  )
}
