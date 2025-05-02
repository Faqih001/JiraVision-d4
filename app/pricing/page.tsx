import { MainNavbar } from "@/components/main-navbar"
import { MainFooter } from "@/components/main-footer"
import { Button } from "@/components/ui/button"
import { Check } from "lucide-react"
import Link from "next/link"

export default function PricingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MainNavbar />

      <main className="flex-1">
        <section className="py-20 md:py-28 container">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Simple, Transparent Pricing</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Choose the plan that's right for your team. All plans include a 14-day free trial.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Starter Plan */}
            <div className="border rounded-xl p-8 flex flex-col h-full">
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-2">Starter</h3>
                <div className="flex items-baseline mb-4">
                  <span className="text-4xl font-bold">$9</span>
                  <span className="text-muted-foreground ml-2">/ user / month</span>
                </div>
                <p className="text-muted-foreground">
                  Perfect for small teams getting started with project management.
                </p>
              </div>

              <ul className="space-y-3 mb-8">
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" />
                  <span>Up to 10 team members</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" />
                  <span>Basic AI Scrum Master</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" />
                  <span>Sprint planning and tracking</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" />
                  <span>Basic team wellbeing metrics</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" />
                  <span>Email support</span>
                </li>
              </ul>

              <div className="mt-auto">
                <Link href="/signup">
                  <Button variant="outline" className="w-full">
                    Start Free Trial
                  </Button>
                </Link>
              </div>
            </div>

            {/* Professional Plan */}
            <div className="border rounded-xl p-8 flex flex-col h-full bg-primary/5 border-primary relative">
              <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-4 py-1 rounded-bl-lg rounded-tr-lg text-sm font-medium">
                Most Popular
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-medium mb-2">Professional</h3>
                <div className="flex items-baseline mb-4">
                  <span className="text-4xl font-bold">$19</span>
                  <span className="text-muted-foreground ml-2">/ user / month</span>
                </div>
                <p className="text-muted-foreground">Advanced features for growing teams and organizations.</p>
              </div>

              <ul className="space-y-3 mb-8">
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" />
                  <span>Unlimited team members</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" />
                  <span>Advanced AI Scrum Master</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" />
                  <span>Full team wellbeing suite</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" />
                  <span>Gamification features</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" />
                  <span>Basic ethical metrics</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" />
                  <span>Priority email & chat support</span>
                </li>
              </ul>

              <div className="mt-auto">
                <Link href="/signup">
                  <Button className="w-full">Start Free Trial</Button>
                </Link>
              </div>
            </div>

            {/* Enterprise Plan */}
            <div className="border rounded-xl p-8 flex flex-col h-full">
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-2">Enterprise</h3>
                <div className="flex items-baseline mb-4">
                  <span className="text-4xl font-bold">$49</span>
                  <span className="text-muted-foreground ml-2">/ user / month</span>
                </div>
                <p className="text-muted-foreground">Complete solution for large organizations with advanced needs.</p>
              </div>

              <ul className="space-y-3 mb-8">
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" />
                  <span>Everything in Professional</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" />
                  <span>Custom AI training</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" />
                  <span>Advanced ethical governance</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" />
                  <span>Custom integrations</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" />
                  <span>Advanced analytics & reporting</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" />
                  <span>Dedicated account manager</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" />
                  <span>24/7 premium support</span>
                </li>
              </ul>

              <div className="mt-auto">
                <Link href="/contact">
                  <Button variant="outline" className="w-full">
                    Contact Sales
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-20 bg-muted/50">
          <div className="container">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4">Frequently Asked Questions</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Find answers to common questions about JiraVision pricing and features.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <div className="bg-background p-6 rounded-lg">
                <h3 className="font-bold mb-2">Can I change plans later?</h3>
                <p className="text-muted-foreground">
                  Yes, you can upgrade or downgrade your plan at any time. Changes take effect at the start of your next
                  billing cycle.
                </p>
              </div>

              <div className="bg-background p-6 rounded-lg">
                <h3 className="font-bold mb-2">Is there a free trial?</h3>
                <p className="text-muted-foreground">
                  Yes, all plans include a 14-day free trial with full access to all features. No credit card required.
                </p>
              </div>

              <div className="bg-background p-6 rounded-lg">
                <h3 className="font-bold mb-2">How does billing work?</h3>
                <p className="text-muted-foreground">
                  We offer monthly and annual billing options. Annual plans receive a 20% discount compared to monthly
                  billing.
                </p>
              </div>

              <div className="bg-background p-6 rounded-lg">
                <h3 className="font-bold mb-2">Do you offer discounts for nonprofits?</h3>
                <p className="text-muted-foreground">
                  Yes, we offer special pricing for nonprofits, educational institutions, and open source projects.
                  Contact us for details.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20">
          <div className="container text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              Join thousands of teams already using JiraVision to transform their project management.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/signup">
                <Button size="lg">Start Your Free Trial</Button>
              </Link>
              <Link href="/contact">
                <Button size="lg" variant="outline">
                  Contact Sales
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <MainFooter />
    </div>
  )
}
