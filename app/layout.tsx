import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/context/auth-context"
import LandingChatbot from "@/components/landing-chatbot"
import ClientCorsWrapper from "@/app/providers/client-cors-wrapper"

// Configure the Inter font with display strategy to prevent FOUT
const inter = Inter({ 
  subsets: ["latin"],
  display: 'swap', // Use 'swap' to ensure text remains visible during font loading
  preload: true,
  fallback: ['system-ui', 'sans-serif']
})

export const metadata: Metadata = {
  title: "JiraVision - AI-Native Project Management",
  description: "The AI-Native Project Management Platform powered by IBM Granite",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
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
