import type React from "react"
import type { Metadata } from "next"
import { Inter, Fraunces } from "next/font/google"
import "./globals.css"
import "./accessibility.css"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/context/auth-context"
import { Toaster } from "@/components/ui/toaster"
import LandingChatbot from "@/components/landing-chatbot"
import { AccessibilityWidget } from "@/components/accessibility/accessibility-widget"
import { bootstrapScript } from "@/lib/accessibility"

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
})

// weight must be "variable" for `axes` to have any effect at all — next/font's
// getFontAxes() discards axes for a static weight list. It also fixes a real
// gap: `font-display font-bold` (700) is used once but 700 was never loaded.
// opsz is honoured because font-optical-sizing defaults to `auto`.
const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
  weight: "variable",
  axes: ["opsz"],
})

export const metadata: Metadata = {
  metadataBase: new URL("https://jiravision.vercel.app"),
  title: {
    default: "JiraVision - AI-Native Project Management",
    template: "%s | JiraVision",
  },
  description: "The AI-Native Project Management Platform powered by IBM Granite",
  openGraph: {
    type: "website",
    siteName: "JiraVision",
    url: "https://jiravision.vercel.app",
    title: "JiraVision - AI-Native Project Management",
    description: "Capacity-aware sprint planning, wellbeing signals and ethical metrics, built on Atlassian Jira.",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${fraunces.variable} font-sans antialiased`}>
        {/* Restores saved accessibility choices onto <html> before the body paints,
            so a large-text or high-contrast user never sees a default-sized flash. */}
        <script dangerouslySetInnerHTML={{ __html: bootstrapScript() }} />
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <AuthProvider>
            {/* Scoping root for the accessibility stylesheet: adjustments reach the page
                but never the widget's own panel, the toaster or the chatbot. */}
            <div id="jv-page">{children}</div>
          </AuthProvider>
        </ThemeProvider>
        {/* Every mutation surface reports through useToast(); without this the
            376 toast() call sites resolve into a store nothing ever renders. */}
        <Toaster />
        <LandingChatbot />
        <AccessibilityWidget />
      </body>
    </html>
  )
}
