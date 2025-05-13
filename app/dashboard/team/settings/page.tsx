"use client"

import { useTheme } from "@/components/ui/use-theme"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Construction, Users, Settings } from "lucide-react"
import { useRouter } from "next/navigation"

export default function TeamSettingsPage() {
  const { theme, setTheme } = useTheme()
  const router = useRouter()

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Team Settings</h1>
          <p className="text-muted-foreground">Configure team members, roles and permissions</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-1"
          onClick={() => router.push('/dashboard/team')}
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Team</span>
        </Button>
      </div>

      <Card className="flex flex-col items-center justify-center p-12 text-center">
        <div className="bg-muted/40 rounded-full p-6 mb-6">
          <Settings className="h-12 w-12 text-muted-foreground" />
        </div>
        <CardTitle className="text-xl mb-2">Team Settings Coming Soon</CardTitle>
        <CardDescription className="max-w-md mb-6">
          The team settings panel is currently under development. 
          This feature will allow you to manage team members, set roles and permissions, 
          create team groups, and define access controls for your organization.
        </CardDescription>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={() => router.push('/dashboard/team')}>
            Return to Team Overview
          </Button>
          <Button variant="outline" onClick={() => router.push('/dashboard')}>
            Back to Dashboard
          </Button>
        </div>
      </Card>
    </div>
  )
} 