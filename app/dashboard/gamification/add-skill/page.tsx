"use client"

import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, ArrowLeft, Construction } from "lucide-react"
import { useRouter } from "next/navigation"

export default function AddSkillPage() {
  const { theme, setTheme } = useTheme()
  const router = useRouter()

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Add New Skill</h1>
          <p className="text-muted-foreground">Create new skills for your team's skill trees</p>
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
          The skill creation tool is currently under development. 
          This feature will allow you to define new skills, set requirements, and add them to your team's skill trees.
        </CardDescription>
        <Button onClick={() => router.back()}>Return to Dashboard</Button>
      </Card>
    </div>
  )
} 