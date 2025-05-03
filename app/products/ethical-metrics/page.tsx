import { MainNavbar } from "@/components/main-navbar"
import { MainFooter } from "@/components/main-footer"
import { Button } from "@/components/ui/button"
import { Check, ArrowRight, BarChart3, Scale, LineChart } from "lucide-react"
import Link from "next/link"

export default function EthicalMetricsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MainNavbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-20 md:py-28 container">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="flex flex-col gap-6">
              <div className="inline-block rounded-lg bg-primary/10 px-3 py-1 text-sm text-primary">
                Responsible Team Management
              </div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                Build <span className="text-primary">Ethical</span> Teams
              </h1>
              <p className="text-xl text-muted-foreground">
                Ensure fair and balanced team management with real-time DEI, workload, and pay equity enforcement.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mt-4">
                <Link href="/signup">
                  <Button size="lg" className="gap-2">
                    Try It Free <ArrowRight className="h-4 w-4" />
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
                alt="Ethical Metrics Dashboard"
                className="object-cover w-full h-full"
              />
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 bg-muted/50">
          <div className="container">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Key Features</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Our Ethical Metrics suite helps you build fair, balanced, and inclusive teams.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-background rounded-lg p-6 shadow-sm border">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">DEI Analytics</h3>
                <p className="text-muted-foreground">
                  Comprehensive diversity, equity, and inclusion metrics with actionable insights for improvement.
                </p>
              </div>

              <div className="bg-background rounded-lg p-6 shadow-sm border">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Scale className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Pay Equity Monitoring</h3>
                <p className="text-muted-foreground">
                  Identify and address compensation disparities across gender, ethnicity, and other dimensions.
                </p>
              </div>

              <div className="bg-background rounded-lg p-6 shadow-sm border">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <LineChart className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Workload Fairness</h3>
                <p className="text-muted-foreground">
                  Ensure equitable distribution of work and opportunities across all team members.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-20">
          <div className="container">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Ethical Metrics Matter</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Build a more inclusive, fair, and high-performing organization.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                    <Check className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Attract Top Talent</h3>
                    <p className="text-muted-foreground">
                      Organizations with strong ethical practices attract and retain the best candidates in the market.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                    <Check className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Improve Team Performance</h3>
                    <p className="text-muted-foreground">
                      Fair and inclusive teams demonstrate higher levels of innovation, collaboration, and productivity.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                    <Check className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Reduce Legal Risk</h3>
                    <p className="text-muted-foreground">
                      Proactively identify and address potential compliance issues before they become problems.
                    </p>
                  </div>
                </div>
              </div>

              <div className="relative h-[400px] w-full rounded-lg overflow-hidden">
                <img
                  src="/placeholder.svg?height=400&width=600"
                  alt="Ethical Metrics Benefits"
                  className="object-cover w-full h-full"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="py-20 bg-muted/50">
          <div className="container">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">What Our Customers Say</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Hear from organizations that have transformed their culture with JiraVision's Ethical Metrics.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-background p-6 rounded-lg shadow-sm border">
                <p className="italic text-muted-foreground mb-4">
                  "The DEI analytics helped us identify blind spots in our hiring and promotion practices that we
                  weren't aware of. We've made significant improvements as a result."
                </p>
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-gray-200 overflow-hidden">
                    <img
                      src="/placeholder.svg?height=48&width=48"
                      alt="Olivia Martinez"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div>
                    <h4 className="font-semibold">Olivia Martinez</h4>
                    <p className="text-sm text-muted-foreground">Chief People Officer, EquityTech</p>
                  </div>
                </div>
              </div>

              <div className="bg-background p-6 rounded-lg shadow-sm border">
                <p className="italic text-muted-foreground mb-4">
                  "The pay equity monitoring tools helped us identify and address compensation gaps we didn't know
                  existed. Our team trust has improved dramatically."
                </p>
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-gray-200 overflow-hidden">
                    <img
                      src="/placeholder.svg?height=48&width=48"
                      alt="Robert Kim"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div>
                    <h4 className="font-semibold">Robert Kim</h4>
                    <p className="text-sm text-muted-foreground">VP of HR, FairForce</p>
                  </div>
                </div>
              </div>

              <div className="bg-background p-6 rounded-lg shadow-sm border">
                <p className="italic text-muted-foreground mb-4">
                  "Workload fairness metrics helped us realize we were consistently overloading certain team members.
                  Balancing the work has improved both morale and output quality."
                </p>
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-gray-200 overflow-hidden">
                    <img
                      src="/placeholder.svg?height=48&width=48"
                      alt="Amara Johnson"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div>
                    <h4 className="font-semibold">Amara Johnson</h4>
                    <p className="text-sm text-muted-foreground">Engineering Director, BalancedWorks</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-primary text-primary-foreground">
          <div className="container text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Build a More Ethical Organization?</h2>
            <p className="text-xl max-w-2xl mx-auto mb-8 text-primary-foreground/80">
              Join forward-thinking companies already using JiraVision's Ethical Metrics to create fair and balanced
              teams.
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
