import type React from "react"
import DashboardLayout from "@/components/dashboard-layout"
import { ProfileProvider } from "@/app/providers/profile"

export default function DashboardRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProfileProvider>
      <DashboardLayout>{children}</DashboardLayout>
    </ProfileProvider>
  )
}
