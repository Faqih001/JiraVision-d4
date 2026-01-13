"use client"
import React from 'react'

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <html>
      <body>
        <h1>Something went wrong</h1>
        <pre>{String(error?.message)}</pre>
        <button onClick={() => reset()}>Try again</button>
      </body>
    </html>
  )
}
"use client"

import ErrorBoundary from "@/components/error-boundary"

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorBoundary error={error} reset={reset} />
}
