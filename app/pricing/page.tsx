import { MainNavbar } from "@/components/main-navbar"
import { MainFooter } from "@/components/main-footer"
import { Button } from "@/components/ui/button"
import { Check, X, Zap, HelpCircle } from "lucide-react"
import Link from "next/link"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function PricingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MainNavbar />

      <main className="flex-1">
        <section className="py-20 md:py-28 container">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary mb-4">
              <Zap className="h-4 w-4" />
              <span>Pricing</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Simple, Transparent Pricing</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Choose the plan that's right for your team. All plans include a 14-day free trial.
            </p>
          </div>

          <div className="max-w-5xl mx-auto mb-16">
            <Tabs defaultValue="monthly" className="w-full">
              <div className="flex justify-center mb-8">
                <TabsList className="grid w-[400px] grid-cols-2">
                  <TabsTrigger value="monthly">Monthly</TabsTrigger>
                  <TabsTrigger value="annual">Annual (Save 20%)</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="monthly">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {/* Starter Plan */}
                  <div className="border rounded-xl p-8 flex flex-col h-full bg-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
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

                    <ul className="space-y-3 mb-8 flex-grow">
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
                      <li className="flex items-start">
                        <X className="h-5 w-5 text-slate-300 mr-2 shrink-0 mt-0.5" />
                        <span className="text-slate-500">Gamification features</span>
                      </li>
                      <li className="flex items-start">
                        <X className="h-5 w-5 text-slate-300 mr-2 shrink-0 mt-0.5" />
                        <span className="text-slate-500">Advanced analytics</span>
                      </li>
                    </ul>

                    <div className="mt-auto">
                      <Link href="/signup">
                        <Button variant="outline" className="w-full rounded-full">
                          Start Free Trial
                        </Button>
                      </Link>
                    </div>
                  </div>

                  {/* Professional Plan */}
                  <div className="border-2 border-primary rounded-xl p-8 flex flex-col h-full bg-white shadow-xl relative transform transition-all duration-300 hover:-translate-y-2">
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

                    <ul className="space-y-3 mb-8 flex-grow">
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
                      <li className="flex items-start">
                        <Check className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" />
                        <span>Basic analytics & reporting</span>
                      </li>
                    </ul>

                    <div className="mt-auto">
                      <Link href="/signup">
                        <Button className="w-full rounded-full">Start Free Trial</Button>
                      </Link>
                    </div>
                  </div>

                  {/* Enterprise Plan */}
                  <div className="border rounded-xl p-8 flex flex-col h-full bg-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                    <div className="mb-6">
                      <h3 className="text-lg font-medium mb-2">Enterprise</h3>
                      <div className="flex items-baseline mb-4">
                        <span className="text-4xl font-bold">$49</span>
                        <span className="text-muted-foreground ml-2">/ user / month</span>
                      </div>
                      <p className="text-muted-foreground">
                        Complete solution for large organizations with advanced needs.
                      </p>
                    </div>

                    <ul className="space-y-3 mb-8 flex-grow">
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
                        <Button variant="outline" className="w-full rounded-full">
                          Contact Sales
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="annual">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {/* Starter Plan Annual */}
                  <div className="border rounded-xl p-8 flex flex-col h-full bg-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                    <div className="mb-6">
                      <h3 className="text-lg font-medium mb-2">Starter</h3>
                      <div className="flex items-baseline mb-4">
                        <span className="text-4xl font-bold">$7</span>
                        <span className="text-muted-foreground ml-2">/ user / month</span>
                      </div>
                      <p className="text-muted-foreground">
                        Perfect for small teams getting started with project management.
                      </p>
                    </div>

                    <ul className="space-y-3 mb-8 flex-grow">
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
                      <li className="flex items-start">
                        <X className="h-5 w-5 text-slate-300 mr-2 shrink-0 mt-0.5" />
                        <span className="text-slate-500">Gamification features</span>
                      </li>
                      <li className="flex items-start">
                        <X className="h-5 w-5 text-slate-300 mr-2 shrink-0 mt-0.5" />
                        <span className="text-slate-500">Advanced analytics</span>
                      </li>
                    </ul>

                    <div className="mt-auto">
                      <Link href="/signup">
                        <Button variant="outline" className="w-full rounded-full">
                          Start Free Trial
                        </Button>
                      </Link>
                    </div>
                  </div>

                  {/* Professional Plan Annual */}
                  <div className="border-2 border-primary rounded-xl p-8 flex flex-col h-full bg-white shadow-xl relative transform transition-all duration-300 hover:-translate-y-2">
                    <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-4 py-1 rounded-bl-lg rounded-tr-lg text-sm font-medium">
                      Most Popular
                    </div>

                    <div className="mb-6">
                      <h3 className="text-lg font-medium mb-2">Professional</h3>
                      <div className="flex items-baseline mb-4">
                        <span className="text-4xl font-bold">$15</span>
                        <span className="text-muted-foreground ml-2">/ user / month</span>
                      </div>
                      <p className="text-muted-foreground">Advanced features for growing teams and organizations.</p>
                    </div>

                    <ul className="space-y-3 mb-8 flex-grow">
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
                      <li className="flex items-start">
                        <Check className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" />
                        <span>Basic analytics & reporting</span>
                      </li>
                    </ul>

                    <div className="mt-auto">
                      <Link href="/signup">
                        <Button className="w-full rounded-full">Start Free Trial</Button>
                      </Link>
                    </div>
                  </div>

                  {/* Enterprise Plan Annual */}
                  <div className="border rounded-xl p-8 flex flex-col h-full bg-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                    <div className="mb-6">
                      <h3 className="text-lg font-medium mb-2">Enterprise</h3>
                      <div className="flex items-baseline mb-4">
                        <span className="text-4xl font-bold">$39</span>
                        <span className="text-muted-foreground ml-2">/ user / month</span>
                      </div>
                      <p className="text-muted-foreground">
                        Complete solution for large organizations with advanced needs.
                      </p>
                    </div>

                    <ul className="space-y-3 mb-8 flex-grow">
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
                        <Button variant="outline" className="w-full rounded-full">
                          Contact Sales
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Feature Comparison */}
          <div className="max-w-5xl mx-auto mt-20">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Compare Features</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                A detailed comparison of what's included in each plan.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="py-4 px-6 text-left">Features</th>
                    <th className="py-4 px-6 text-center">Starter</th>
                    <th className="py-4 px-6 text-center bg-primary/5">Professional</th>
                    <th className="py-4 px-6 text-center">Enterprise</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-4 px-6 font-medium">Team Members</td>
                    <td className="py-4 px-6 text-center">Up to 10</td>
                    <td className="py-4 px-6 text-center bg-primary/5">Unlimited</td>
                    <td className="py-4 px-6 text-center">Unlimited</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-4 px-6 font-medium">AI Scrum Master</td>
                    <td className="py-4 px-6 text-center">Basic</td>
                    <td className="py-4 px-6 text-center bg-primary/5">Advanced</td>
                    <td className="py-4 px-6 text-center">Custom Training</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-4 px-6 font-medium">Team Wellbeing</td>
                    <td className="py-4 px-6 text-center">Basic Metrics</td>
                    <td className="py-4 px-6 text-center bg-primary/5">Full Suite</td>
                    <td className="py-4 px-6 text-center">Enterprise Suite</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-4 px-6 font-medium">Gamification</td>
                    <td className="py-4 px-6 text-center">
                      <X className="h-5 w-5 text-slate-300 mx-auto" />
                    </td>
                    <td className="py-4 px-6 text-center bg-primary/5">
                      <Check className="h-5 w-5 text-green-500 mx-auto" />
                    </td>
                    <td className="py-4 px-6 text-center">
                      <Check className="h-5 w-5 text-green-500 mx-auto" />
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-4 px-6 font-medium">Ethical Metrics</td>
                    <td className="py-4 px-6 text-center">
                      <X className="h-5 w-5 text-slate-300 mx-auto" />
                    </td>
                    <td className="py-4 px-6 text-center bg-primary/5">Basic</td>
                    <td className="py-4 px-6 text-center">Advanced</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-4 px-6 font-medium">Analytics & Reporting</td>
                    <td className="py-4 px-6 text-center">Basic</td>
                    <td className="py-4 px-6 text-center bg-primary/5">Advanced</td>
                    <td className="py-4 px-6 text-center">Custom</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-4 px-6 font-medium">Support</td>
                    <td className="py-4 px-6 text-center">Email</td>
                    <td className="py-4 px-6 text-center bg-primary/5">Priority Email & Chat</td>
                    <td className="py-4 px-6 text-center">24/7 Premium</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-4 px-6 font-medium">Custom Integrations</td>
                    <td className="py-4 px-6 text-center">
                      <X className="h-5 w-5 text-slate-300 mx-auto" />
                    </td>
                    <td className="py-4 px-6 text-center bg-primary/5">Limited</td>
                    <td className="py-4 px-6 text-center">Unlimited</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-20 bg-muted/50">
          <div className="container">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary mb-4">
                <HelpCircle className="h-4 w-4" />
                <span>FAQ</span>
              </div>
              <h2 className="text-3xl font-bold mb-4">Frequently Asked Questions</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Find answers to common questions about JiraVision pricing and features.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <div className="bg-background p-6 rounded-lg shadow-md border">
                <h3 className="font-bold mb-2">Can I change plans later?</h3>
                <p className="text-muted-foreground">
                  Yes, you can upgrade or downgrade your plan at any time. Changes take effect at the start of your next
                  billing cycle.
                </p>
              </div>

              <div className="bg-background p-6 rounded-lg shadow-md border">
                <h3 className="font-bold mb-2">Is there a free trial?</h3>
                <p className="text-muted-foreground">
                  Yes, all plans include a 14-day free trial with full access to all features. No credit card required.
                </p>
              </div>

              <div className="bg-background p-6 rounded-lg shadow-md border">
                <h3 className="font-bold mb-2">How does billing work?</h3>
                <p className="text-muted-foreground">
                  We offer monthly and annual billing options. Annual plans receive a 20% discount compared to monthly
                  billing.
                </p>
              </div>

              <div className="bg-background p-6 rounded-lg shadow-md border">
                <h3 className="font-bold mb-2">Do you offer discounts for nonprofits?</h3>
                <p className="text-muted-foreground">
                  Yes, we offer special pricing for nonprofits, educational institutions, and open source projects.
                  Contact us for details.
                </p>
              </div>

              <div className="bg-background p-6 rounded-lg shadow-md border">
                <h3 className="font-bold mb-2">What payment methods do you accept?</h3>
                <p className="text-muted-foreground">
                  We accept all major credit cards, PayPal, and bank transfers for annual enterprise plans.
                </p>
              </div>

              <div className="bg-background p-6 rounded-lg shadow-md border">
                <h3 className="font-bold mb-2">Can I cancel my subscription?</h3>
                <p className="text-muted-foreground">
                  Yes, you can cancel your subscription at any time. You'll continue to have access until the end of
                  your current billing period.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-br from-primary/90 to-purple-700/90 relative overflow-hidden">
          <div className="absolute inset-0 bg-grid-white/10 bg-[length:20px_20px] [mask-image:radial-gradient(white,transparent_85%)]"></div>
          <div className="container text-center relative z-10">
            <h2 className="text-3xl font-bold mb-4 text-white">Ready to get started?</h2>
            <p className="text-xl text-white/80 max-w-2xl mx-auto mb-8">
              Join thousands of teams already using JiraVision to transform their project management.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/signup">
                <Button size="lg" variant="secondary" className="rounded-full">
                  Start Your Free Trial
                </Button>
              </Link>
              <Link href="/contact">
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-full bg-transparent text-white border-white hover:bg-white/10"
                >
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
