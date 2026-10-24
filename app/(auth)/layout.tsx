import type React from "react"

/**
 * Auth routes carry no marketing chrome on purpose: the two-panel AuthShell owns
 * the whole viewport. CookieConsent stays on the marketing layout — these pages
 * never call track(), so no analytics script needs gating here.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-surface">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:shadow-md"
      >
        Skip to content
      </a>
      <main id="main">{children}</main>
    </div>
  )
}
