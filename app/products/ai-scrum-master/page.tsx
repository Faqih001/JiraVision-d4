import { MainNavbar } from "@/components/main-navbar"
import { MainFooter } from "@/components/main-footer"
import { Button } from "@/components/ui/button"
import { Brain, Check, ArrowRight } from "lucide-react"
import Link from "next/link"

export default function AiScrumMasterPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MainNavbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-20 md:py-28 container">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="flex flex-col gap-6">
              <div className="inline-block rounded-lg bg-primary/10 px-3 py-1 text-sm text-primary">
                AI-Powered Project Management
              </div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                Meet Your <span className="text-primary">AI Scrum Master</span>
              </h1>
              <p className="text-xl text-muted-foreground">
                Intelligent sprint planning, automated stand-ups, and data-driven retrospectives that adapt to your
                team's unique workflow.
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
                alt="AI Scrum Master Dashboard"
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
                Our AI Scrum Master brings intelligence and automation to every aspect of your agile workflow.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-background rounded-lg p-6 shadow-sm border">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Brain className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Intelligent Sprint Planning</h3>
                <p className="text-muted-foreground">
                  AI-powered story point estimation and capacity planning based on historical team performance.
                </p>
              </div>

              <div className="bg-background rounded-lg p-6 shadow-sm border">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Brain className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Automated Stand-ups</h3>
                <p className="text-muted-foreground">
                  Collect updates asynchronously and get AI-generated summaries of team progress and blockers.
                </p>
              </div>

              <div className="bg-background rounded-lg p-6 shadow-sm border">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Brain className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Data-Driven Retrospectives</h3>
                <p className="text-muted-foreground">
                  Identify patterns and generate actionable insights to continuously improve team performance.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-20">
          <div className="container">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Choose AI Scrum Master?</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Transform your agile process with intelligent automation and data-driven insights.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                    <Check className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Save Time and Reduce Overhead</h3>
                    <p className="text-muted-foreground">
                      Automate routine scrum activities and free up your team to focus on delivering value.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                    <Check className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Improve Estimation Accuracy</h3>
                    <p className="text-muted-foreground">
                      AI-powered story point estimation based on historical data leads to more predictable sprints.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                    <Check className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Identify and Remove Blockers Faster</h3>
                    <p className="text-muted-foreground">
                      Proactive identification of potential issues before they impact your sprint.
                    </p>
                  </div>
                </div>
              </div>

              <div className="relative h-[400px] w-full rounded-lg overflow-hidden">
                <img
                  src="/placeholder.svg?height=400&width=600"
                  alt="AI Scrum Master Benefits"
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
                Hear from teams that have transformed their agile process with JiraVision's AI Scrum Master.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-background p-6 rounded-lg shadow-sm border">
                <p className="italic text-muted-foreground mb-4">
                  "The AI Scrum Master has revolutionized our sprint planning. We're now consistently hitting our sprint
                  goals with 95% accuracy."
                </p>
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-gray-200 overflow-hidden">
                    <img
                      src="/placeholder.svg?height=48&width=48"
                      alt="Sarah Johnson"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div>
                    <h4 className="font-semibold">Sarah Johnson</h4>
                    <p className="text-sm text-muted-foreground">Engineering Manager, TechCorp</p>
                  </div>
                </div>
              </div>

              <div className="bg-background p-6 rounded-lg shadow-sm border">
                <p className="italic text-muted-foreground mb-4">
                  "Automated stand-ups have saved us hours each week and improved our async communication across time
                  zones."
                </p>
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-gray-200 overflow-hidden">
                    <img
                      src="/placeholder.svg?height=48&width=48"
                      alt="Michael Chen"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div>
                    <h4 className="font-semibold">Michael Chen</h4>
                    <p className="text-sm text-muted-foreground">Product Owner, GlobalTech</p>
                  </div>
                </div>
              </div>

              <div className="bg-background p-6 rounded-lg shadow-sm border">
                <p className="italic text-muted-foreground mb-4">
                  "The data-driven retrospectives have helped us identify patterns we never would have noticed
                  otherwise."
                </p>
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-gray-200 overflow-hidden">
                    <img
                      src="/placeholder.svg?height=48&width=48"
                      alt="Jessica Martinez"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div>
                    <h4 className="font-semibold">Jessica Martinez</h4>
                    <p className="text-sm text-muted-foreground">Scrum Master, InnovateCo</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-primary text-primary-foreground">
          <div className="container text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Transform Your Agile Process?</h2>
            <p className="text-xl max-w-2xl mx-auto mb-8 text-primary-foreground/80">
              Join thousands of teams already using JiraVision's AI Scrum Master to streamline their workflow.
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
