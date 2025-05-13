"use client"

import { useState, useEffect } from "react"
import { useTheme } from "next-themes"
import {
  ArrowRight,
  Calendar,
  Check,
  CreditCard,
  Download,
  FileText,
  Info,
  Plus,
  Receipt,
  Settings,
  ShieldCheck,
  Star,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useMobile } from "@/hooks/use-mobile"
import { useRouter } from "next/navigation"

// Define interfaces
interface Invoice {
  id: string
  date: string
  amount: number
  status: 'paid' | 'pending' | 'failed'
  downloadUrl: string
}

interface PaymentMethod {
  id: string
  type: 'card' | 'paypal'
  last4?: string
  expiry?: string
  name: string
  isDefault: boolean
}

interface PlanFeature {
  name: string
  included: boolean
}

interface PricingTier {
  id: string
  name: string
  price: number
  period: 'month' | 'year'
  description: string
  features: PlanFeature[]
  highlighted?: boolean
  current?: boolean
}

export default function BillingPage() {
  const { theme, setTheme } = useTheme()
  const isMobile = useMobile()
  const { toast } = useToast()
  const router = useRouter()

  // State
  const [loading, setLoading] = useState(true)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [pricingTiers, setPricingTiers] = useState<PricingTier[]>([])
  const [billingPeriod, setBillingPeriod] = useState<'month' | 'year'>('month')

  // Fetch data
  useEffect(() => {
    async function fetchBillingData() {
      try {
        setLoading(true)
        
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Set invoices
        setInvoices([
          {
            id: "INV-2023-005",
            date: "2023-12-01",
            amount: 49.99,
            status: "paid",
            downloadUrl: "#"
          },
          {
            id: "INV-2023-004",
            date: "2023-11-01",
            amount: 49.99,
            status: "paid",
            downloadUrl: "#"
          },
          {
            id: "INV-2023-003",
            date: "2023-10-01",
            amount: 49.99,
            status: "paid",
            downloadUrl: "#"
          },
          {
            id: "INV-2023-002",
            date: "2023-09-01",
            amount: 29.99,
            status: "paid",
            downloadUrl: "#"
          },
          {
            id: "INV-2023-001",
            date: "2023-08-01",
            amount: 29.99,
            status: "paid",
            downloadUrl: "#"
          }
        ])
        
        // Set payment methods
        setPaymentMethods([
          {
            id: "pm_1",
            type: "card",
            last4: "4242",
            expiry: "05/25",
            name: "Visa ending in 4242",
            isDefault: true
          },
          {
            id: "pm_2",
            type: "paypal",
            name: "PayPal account",
            isDefault: false
          }
        ])
        
        // Set pricing tiers
        setPricingTiers([
          {
            id: "tier_free",
            name: "Free",
            price: 0,
            period: "month",
            description: "Basic features for small teams and individual developers",
            features: [
              { name: "Up to 5 team members", included: true },
              { name: "Kanban board", included: true },
              { name: "Basic analytics", included: true },
              { name: "2 projects", included: true },
              { name: "Community support", included: true },
              { name: "AI features", included: false },
              { name: "Advanced analytics", included: false },
              { name: "Custom fields", included: false },
            ]
          },
          {
            id: "tier_pro",
            name: "Pro",
            price: 49.99,
            period: "month",
            description: "Perfect for growing teams with advanced requirements",
            features: [
              { name: "Unlimited team members", included: true },
              { name: "Kanban & Scrum boards", included: true },
              { name: "Advanced analytics", included: true },
              { name: "Unlimited projects", included: true },
              { name: "Priority support", included: true },
              { name: "AI-powered insights", included: true },
              { name: "Custom fields", included: true },
              { name: "API access", included: true },
            ],
            highlighted: true,
            current: true
          },
          {
            id: "tier_enterprise",
            name: "Enterprise",
            price: 99.99,
            period: "month",
            description: "Advanced features for large organizations",
            features: [
              { name: "Unlimited team members", included: true },
              { name: "All board types", included: true },
              { name: "Enterprise analytics", included: true },
              { name: "Unlimited projects", included: true },
              { name: "24/7 dedicated support", included: true },
              { name: "Advanced AI features", included: true },
              { name: "SSO & advanced security", included: true },
              { name: "Custom integrations", included: true },
            ]
          }
        ])
      } catch (error) {
        console.error("Error fetching billing data:", error)
        toast({
          title: "Error",
          description: "Failed to load billing data. Please try again.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }
    
    fetchBillingData()
  }, [toast])

  // Format date string to Month DD, YYYY
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }

  // Handle button actions
  const handleDownloadInvoice = (invoiceId: string) => {
    toast({
      title: "Downloading Invoice",
      description: `Preparing invoice ${invoiceId} for download...`,
    })
  }

  const handleAddPaymentMethod = () => {
    toast({
      title: "Add Payment Method",
      description: "Opening payment method form...",
    })
  }

  const handleUpdateBillingInfo = () => {
    toast({
      title: "Update Billing Info",
      description: "Opening billing information form...",
    })
    
    router.push('/dashboard/billing/settings');
  }

  const handleChangePlan = (planId: string) => {
    toast({
      title: "Change Plan",
      description: `Initiating plan change to ${planId}...`,
    })
  }

  const handleCancelSubscription = () => {
    toast({
      title: "Cancel Subscription",
      description: "Opening cancellation confirmation...",
    })
  }

  const handleSetDefault = (paymentId: string) => {
    toast({
      title: "Default Payment Method",
      description: "Setting as default payment method...",
    })
  }

  const handleRemovePayment = (paymentId: string) => {
    toast({
      title: "Remove Payment Method",
      description: "Removing payment method...",
    })
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Billing & Subscription</h1>
          <p className="text-muted-foreground">Manage your subscription plan and payment methods</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1" onClick={handleUpdateBillingInfo}>
            <Settings className="h-4 w-4" />
            <span>Billing Info</span>
          </Button>
          <Button variant="outline" size="sm" className="gap-1" onClick={() => handleDownloadInvoice("latest")}>
            <Download className="h-4 w-4" />
            <span>Latest Invoice</span>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="subscription">
        <TabsList className="mb-4">
          <TabsTrigger value="subscription">Current Plan</TabsTrigger>
          <TabsTrigger value="payment-methods">Payment Methods</TabsTrigger>
          <TabsTrigger value="invoices">Billing History</TabsTrigger>
          <TabsTrigger value="plans">Plans & Pricing</TabsTrigger>
        </TabsList>

        <TabsContent value="subscription">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Current Subscription</CardTitle>
                  <CardDescription>Your current plan and billing details</CardDescription>
                </div>
                <Badge className="bg-primary/10 text-primary border-primary/20">
                  Active
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Current Plan</p>
                  <p className="font-medium">Pro Plan</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Billing Period</p>
                  <p className="font-medium">Monthly</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Next Billing Date</p>
                  <p className="font-medium">January 1, 2024</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Amount</p>
                  <p className="font-medium">$49.99/month</p>
                </div>
              </div>

              <div className="bg-muted/30 p-4 rounded-md space-y-4">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <h4 className="font-medium">Pro Plan Features</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                      {pricingTiers.find(plan => plan.id === "tier_pro")?.features.map((feature, index) => (
                        feature.included && (
                          <div key={index} className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-green-500" />
                            <span className="text-sm">{feature.name}</span>
                          </div>
                        )
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t pt-4 flex flex-wrap gap-2">
              <Button onClick={() => handleChangePlan("upgrade")}>
                Upgrade to Enterprise
              </Button>
              <Button variant="outline" onClick={handleCancelSubscription}>
                Cancel Subscription
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="payment-methods">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Your Payment Methods</h2>
            <Button size="sm" className="gap-1" onClick={handleAddPaymentMethod}>
              <Plus className="h-4 w-4" />
              <span>Add Payment Method</span>
            </Button>
          </div>

          <div className="space-y-4">
            {paymentMethods.map(method => (
              <Card key={method.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <CreditCard className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          {method.name}
                          {method.isDefault && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              Default
                            </Badge>
                          )}
                        </CardTitle>
                        {method.type === 'card' && method.expiry && (
                          <CardDescription>Expires {method.expiry}</CardDescription>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardFooter className="pt-2 flex justify-end gap-2">
                  {!method.isDefault && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleSetDefault(method.id)}
                    >
                      Set as Default
                    </Button>
                  )}
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleRemovePayment(method.id)}
                  >
                    Remove
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Billing History</CardTitle>
                  <CardDescription>Your recent invoices and payments</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {invoices.map(invoice => (
                  <div 
                    key={invoice.id} 
                    className="flex items-center justify-between py-3 border-b last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                        <Receipt className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">{invoice.id}</div>
                        <div className="text-sm text-muted-foreground">{formatDate(invoice.date)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-medium">${invoice.amount.toFixed(2)}</div>
                        <Badge 
                          variant="outline" 
                          className={`
                            ${invoice.status === 'paid' ? 'bg-green-50 text-green-700 border-green-200' : 
                              invoice.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                              'bg-red-50 text-red-700 border-red-200'}
                          `}
                        >
                          {invoice.status}
                        </Badge>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => handleDownloadInvoice(invoice.id)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="border-t pt-4">
              <Button variant="outline" size="sm" className="gap-1 mx-auto">
                <FileText className="h-4 w-4" />
                <span>View All Transactions</span>
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="plans">
          <div className="space-y-4">
            <div className="flex justify-center mb-6">
              <div className="bg-muted p-1 rounded-lg inline-flex">
                <Button 
                  variant={billingPeriod === 'month' ? 'default' : 'ghost'} 
                  size="sm"
                  onClick={() => setBillingPeriod('month')}
                  className="rounded-md"
                >
                  Monthly
                </Button>
                <Button 
                  variant={billingPeriod === 'year' ? 'default' : 'ghost'} 
                  size="sm"
                  onClick={() => setBillingPeriod('year')}
                  className="rounded-md"
                >
                  Yearly <Badge variant="outline" className="ml-1 text-xs font-normal">Save 20%</Badge>
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {pricingTiers.map(tier => (
                <Card 
                  key={tier.id} 
                  className={`flex flex-col ${tier.highlighted ? 'border-primary shadow-md' : ''}`}
                >
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {tier.name}
                          {tier.highlighted && <Star className="h-4 w-4 text-amber-500 fill-amber-500" />}
                        </CardTitle>
                        <CardDescription className="mt-1">{tier.description}</CardDescription>
                      </div>
                      {tier.current && (
                        <Badge className="bg-primary text-primary-foreground">
                          Current Plan
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <div className="mb-6">
                      <span className="text-3xl font-bold">${billingPeriod === 'year' ? (tier.price * 0.8 * 12).toFixed(0) : tier.price}</span>
                      {tier.price > 0 && (
                        <span className="text-muted-foreground">/{billingPeriod}</span>
                      )}
                    </div>

                    <ul className="space-y-2 mb-6">
                      {tier.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-2">
                          {feature.included ? (
                            <Check className="h-4 w-4 text-green-500 mt-0.5" />
                          ) : (
                            <div className="h-4 w-4 border rounded-full border-muted-foreground/30 mt-0.5" />
                          )}
                          <span className={feature.included ? "" : "text-muted-foreground"}>
                            {feature.name}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter className="pt-2 mt-auto">
                    {tier.current ? (
                      <Button variant="outline" className="w-full" disabled>
                        Current Plan
                      </Button>
                    ) : (
                      <Button 
                        className="w-full"
                        variant={tier.highlighted ? "default" : "outline"}
                        onClick={() => handleChangePlan(tier.id)}
                      >
                        {tier.price === 0 ? "Downgrade" : "Switch to"} {tier.name}
                        {tier.highlighted && (
                          <ArrowRight className="h-4 w-4 ml-1" />
                        )}
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>

            <div className="mt-6 bg-muted/30 p-4 rounded-md">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <h3 className="font-medium">Enterprise Features</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                Need custom features, dedicated support, or special integrations?
              </p>
              <Button variant="outline" size="sm">Contact Sales</Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
} 