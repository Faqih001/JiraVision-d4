import type React from "react"
import type { Metadata } from "next"
import { Inter, Fraunces } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/context/auth-context"
import LandingChatbot from "@/components/landing-chatbot"
import ClientCorsWrapper from "@/app/providers/client-cors-wrapper"

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
})

const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
  axis: "opsz",
  weight: ["400", "500", "600"],
})

export const metadata: Metadata = {
  title: "JiraVision - AI-Native Project Management",
  description: "The AI-Native Project Management Platform powered by IBM Granite",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${fraunces.variable} font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
        <LandingChatbot />
        {/* Add CORS handler in development mode via client wrapper */}
        <ClientCorsWrapper />
      </body>
    </html>
  )
}
