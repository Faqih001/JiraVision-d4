"use client"

import { useTheme } from "@/components/ui/use-theme"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, CreditCard, DollarSign } from "lucide-react"
import { useRouter } from "next/navigation"

export default function BillingSettingsPage() {
  const { theme, setTheme } = useTheme()
  const router = useRouter()

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Billing Settings</h1>
          <p className="text-muted-foreground">Manage your payment methods and subscription preferences</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-1"
          onClick={() => router.push('/dashboard/billing')}
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Billing</span>
        </Button>
      </div>

      <Card className="flex flex-col items-center justify-center p-12 text-center">
        <div className="bg-muted/40 rounded-full p-6 mb-6">
          <CreditCard className="h-12 w-12 text-muted-foreground" />
        </div>
        <CardTitle className="text-xl mb-2">Billing Settings Coming Soon</CardTitle>
        <CardDescription className="max-w-md mb-6">
          The billing settings panel is currently under development. 
          This feature will allow you to update payment methods, manage subscription plans, 
          view invoices, and set payment preferences for your account.
        </CardDescription>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={() => router.push('/dashboard/billing')}>
            Return to Billing Overview
          </Button>
          <Button variant="outline" onClick={() => router.push('/dashboard')}>
            Back to Dashboard
          </Button>
        </div>
      </Card>
    </div>
  )
} 