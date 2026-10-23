import Link from "next/link"
import { BottomBar } from "@/components/layout/bottom-bar"
import { Footer } from "@/components/layout/footer"
import { Navbar } from "@/components/layout/navbar"
import { CookieConsent } from "@/components/features/cookie-consent"
import { SiteSearch } from "@/components/features/site-search"

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:shadow-md"
      >
        Skip to content
      </a>
      <Navbar />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
      {/* Spacer so the fixed mobile bottom bar never covers the compliance row. */}
      <div aria-hidden="true" className="h-[calc(4.5rem+env(safe-area-inset-bottom))] bg-surface lg:hidden" />
      <BottomBar />
      <SiteSearch />
      <CookieConsent />
    </div>
  )
}
