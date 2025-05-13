"use client"

import { useTheme } from "@/components/ui/use-theme"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Settings, ArrowLeft, Construction } from "lucide-react"
import { useRouter } from "next/navigation"

export default function GamificationConfigPage() {
  const { theme, setTheme } = useTheme()
  const router = useRouter()

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Gamification Settings</h1>
          <p className="text-muted-foreground">Configure gamification elements for your team</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-1"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </Button>
      </div>

      <Card className="flex flex-col items-center justify-center p-12 text-center">
        <Construction className="h-16 w-16 text-muted-foreground mb-6" />
        <CardTitle className="text-xl mb-2">Coming Soon</CardTitle>
        <CardDescription className="max-w-md mb-6">
          The gamification configuration panel is currently under development. 
          This feature will allow you to customize rewards, achievements, and skill trees for your team.
        </CardDescription>
        <Button onClick={() => router.back()}>Return to Dashboard</Button>
      </Card>
    </div>
  )
} 