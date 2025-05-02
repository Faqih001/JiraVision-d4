import { MainNavbar } from "@/components/main-navbar"
import { MainFooter } from "@/components/main-footer"
import { Button } from "@/components/ui/button"
import { ArrowRight, Check, Rocket, Zap, TrendingUp, Users } from "lucide-react"
import Link from "next/link"

export default function StartupsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MainNavbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-20 md:py-28 container">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="flex flex-col gap-6">
              <div className="inline-block rounded-lg bg-primary/10 px-3 py-1 text-sm text-primary">
                Solutions for Startups
              </div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                Scale Your Startup with <span className="text-primary">Intelligent Tools</span>
              </h1>
              <p className="text-xl text-muted-foreground">
                JiraVision helps startups move fast, stay agile, and build products that customers love—without the
                overhead.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mt-4">
                <Link href="/signup">
                  <Button size="lg" className="gap-2">
                    Start Free Trial <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="#features">
                  <Button size="lg" variant="outline">
                    Learn More
                  </Button>
                </Link>
              </div>
            </div>
            <div className="relative h-[400px] w-full rounded-lg overflow-hidden">
              <img
                src="/placeholder.svg?height=400&width=600"
                alt="Startup Team Using JiraVision"
                className="object-cover w-full h-full"
              />
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 bg-muted/50">
          <div className="container">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Built for Startup Speed</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                JiraVision helps startups move fast, iterate quickly, and scale efficiently.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="bg-background rounded-lg p-6 shadow-sm border">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Rocket className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Quick Setup</h3>
                <p className="text-muted-foreground">
                  Get up and running in minutes with templates designed for startup workflows.
                </p>
              </div>

              <div className="bg-background rounded-lg p-6 shadow-sm border">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Rapid Iteration</h3>
                <p className="text-muted-foreground">
                  AI-powered sprint planning and retrospectives to help you iterate faster.
                </p>
              </div>

              <div className="bg-background rounded-lg p-6 shadow-sm border">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Built to Scale</h3>
                <p className="text-muted-foreground">
                  Workflows that grow with your team, from 2 founders to 200 employees.
                </p>
              </div>

              <div className="bg-background rounded-lg p-6 shadow-sm border">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Team Wellbeing</h3>
                <p className="text-muted-foreground">
                  Prevent burnout and maintain momentum with wellbeing-focused features.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Startup Benefits Section */}
        <section className="py-20">
          <div className="container">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div className="relative h-[400px] w-full rounded-lg overflow-hidden">
                <img
                  src="/placeholder.svg?height=400&width=600"
                  alt="Startup Benefits"
                  className="object-cover w-full h-full"
                />
              </div>
              <div className="flex flex-col gap-6">
                <h2 className="text-3xl md:text-4xl font-bold">Why Startups Choose JiraVision</h2>
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                      <Check className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-1">Startup-Friendly Pricing</h3>
                      <p className="text-muted-foreground">
                        Special pricing for early-stage startups and flexible plans that grow with you.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                      <Check className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-1">Reduce Meeting Overhead</h3>
                      <p className="text-muted-foreground">
                        Automated stand-ups and AI-facilitated planning sessions save valuable time.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                      <Check className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-1">Focus on Building, Not Managing</h3>
                      <p className="text-muted-foreground">
                        Let AI handle the process management while your team focuses on building your product.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                      <Check className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-1">Investor-Ready Metrics</h3>
                      <p className="text-muted-foreground">
                        Generate reports and metrics that demonstrate progress to investors and stakeholders.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="py-20 bg-muted/50">
          <div className="container">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Startup Success Stories</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                See how other startups have accelerated their growth with JiraVision.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-background p-6 rounded-lg shadow-sm border">
                <p className="italic text-muted-foreground mb-4">
                  "JiraVision helped us ship our MVP in half the time we expected. The AI Scrum Master kept us focused
                  on what mattered most."
                </p>
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-gray-200 overflow-hidden">
                    <img
                      src="/placeholder.svg?height=48&width=48"
                      alt="Alex Rivera"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div>
                    <h4 className="font-semibold">Alex Rivera</h4>
                    <p className="text-sm text-muted-foreground">CTO, LaunchFast</p>
                  </div>
                </div>
              </div>

              <div className="bg-background p-6 rounded-lg shadow-sm border">
                <p className="italic text-muted-foreground mb-4">
                  "As a remote-first startup, the team wellbeing features have been crucial for maintaining our culture
                  and preventing burnout."
                </p>
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-gray-200 overflow-hidden">
                    <img
                      src="/placeholder.svg?height=48&width=48"
                      alt="Priya Sharma"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div>
                    <h4 className="font-semibold">Priya Sharma</h4>
                    <p className="text-sm text-muted-foreground">CEO, RemotelyHQ</p>
                  </div>
                </div>
              </div>

              <div className="bg-background p-6 rounded-lg shadow-sm border">
                <p className="italic text-muted-foreground mb-4">
                  "We scaled from 5 to 50 people in 18 months, and JiraVision scaled perfectly with us. The onboarding
                  for new team members is seamless."
                </p>
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-gray-200 overflow-hidden">
                    <img
                      src="/placeholder.svg?height=48&width=48"
                      alt="David Kim"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div>
                    <h4 className="font-semibold">David Kim</h4>
                    <p className="text-sm text-muted-foreground">COO, GrowthEngine</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Startup Pricing Section */}
        <section className="py-20">
          <div className="container">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Startup-Friendly Pricing</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Flexible plans designed to grow with your startup.
              </p>
            </div>

            <div className="max-w-3xl mx-auto">
              <div className="bg-background border rounded-xl p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-4 py-1 rounded-bl-lg rounded-tr-lg text-sm font-medium">
                  Startup Special
                </div>

                <div className="mb-6">
                  <h3 className="text-2xl font-bold mb-2">Startup Growth Plan</h3>
                  <div className="flex items-baseline mb-4">
                    <span className="text-4xl font-bold">$9</span>
                    <span className="text-muted-foreground ml-2">/ user / month</span>
                  </div>
                  <p className="text-muted-foreground">
                    Everything you need to build and scale your startup, at a price that works for early-stage
                    companies.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                    <span>Full AI Scrum Master features</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                    <span>Team wellbeing monitoring</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                    <span>Unlimited projects</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                    <span>Startup-focused templates</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                    <span>Investor-ready reporting</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                    <span>Priority support</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Link href="/signup" className="flex-1">
                    <Button className="w-full">Start Free Trial</Button>
                  </Link>
                  <Link href="/contact" className="flex-1">
                    <Button variant="outline" className="w-full">
                      Contact Sales
                    </Button>
                  </Link>
                </div>

                <div className="mt-6 text-sm text-muted-foreground">
                  <p>Eligible startups may qualify for additional discounts. Contact our sales team to learn more.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-primary text-primary-foreground">
          <div className="container text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Accelerate Your Startup?</h2>
            <p className="text-xl max-w-2xl mx-auto mb-8 text-primary-foreground/80">
              Join hundreds of startups already using JiraVision to build faster and scale smarter.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/signup">
                <Button size="lg" variant="secondary">
                  Start Free Trial
                </Button>
              </Link>
              <Link href="/contact">
                <Button
                  size="lg"
                  variant="outline"
                  className="bg-transparent text-primary-foreground border-primary-foreground hover:bg-primary-foreground/10"
                >
                  Schedule a Demo
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
