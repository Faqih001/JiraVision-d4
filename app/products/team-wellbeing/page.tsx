import { MainNavbar } from "@/components/main-navbar"
import { MainFooter } from "@/components/main-footer"
import { Button } from "@/components/ui/button"
import { Heart, Check, ArrowRight, BarChart3, Users } from "lucide-react"
import Link from "next/link"

export default function TeamWellbeingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MainNavbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-20 md:py-28 container">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="flex flex-col gap-6">
              <div className="inline-block rounded-lg bg-primary/10 px-3 py-1 text-sm text-primary">
                Emotional Intelligence for Teams
              </div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                Prioritize <span className="text-primary">Team Wellbeing</span>
              </h1>
              <p className="text-xl text-muted-foreground">
                Monitor team health, prevent burnout, and optimize workload distribution with AI-powered emotional
                intelligence.
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
                alt="Team Wellbeing Dashboard"
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
                Our Team Wellbeing suite helps you build a healthier, more productive team culture.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-background rounded-lg p-6 shadow-sm border">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Heart className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Sentiment Analysis</h3>
                <p className="text-muted-foreground">
                  AI-powered analysis of team communications to detect early signs of stress, burnout, or disengagement.
                </p>
              </div>

              <div className="bg-background rounded-lg p-6 shadow-sm border">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Workload Balancing</h3>
                <p className="text-muted-foreground">
                  Intelligent task distribution that considers individual capacity, skills, and current wellbeing
                  status.
                </p>
              </div>

              <div className="bg-background rounded-lg p-6 shadow-sm border">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Team Health Metrics</h3>
                <p className="text-muted-foreground">
                  Comprehensive dashboards tracking team morale, engagement, and satisfaction over time.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-20">
          <div className="container">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Team Wellbeing Matters</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Healthy teams deliver better results and stay together longer.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                    <Check className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Reduce Turnover by 40%</h3>
                    <p className="text-muted-foreground">
                      Teams using our wellbeing tools experience significantly lower turnover rates and higher
                      retention.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                    <Check className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Increase Productivity by 25%</h3>
                    <p className="text-muted-foreground">
                      Balanced workloads and improved team morale lead to measurable productivity gains.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                    <Check className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Improve Team Collaboration</h3>
                    <p className="text-muted-foreground">
                      Teams with higher wellbeing scores demonstrate better communication and collaboration patterns.
                    </p>
                  </div>
                </div>
              </div>

              <div className="relative h-[400px] w-full rounded-lg overflow-hidden">
                <img
                  src="/placeholder.svg?height=400&width=600"
                  alt="Team Wellbeing Benefits"
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
                Hear from teams that have transformed their culture with JiraVision's Team Wellbeing tools.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-background p-6 rounded-lg shadow-sm border">
                <p className="italic text-muted-foreground mb-4">
                  "The wellbeing metrics helped us identify a team that was heading toward burnout before it happened.
                  We were able to redistribute work and prevent a crisis."
                </p>
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-gray-200 overflow-hidden">
                    <img
                      src="/placeholder.svg?height=48&width=48"
                      alt="Emily Rodriguez"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div>
                    <h4 className="font-semibold">Emily Rodriguez</h4>
                    <p className="text-sm text-muted-foreground">HR Director, TechGrowth</p>
                  </div>
                </div>
              </div>

              <div className="bg-background p-6 rounded-lg shadow-sm border">
                <p className="italic text-muted-foreground mb-4">
                  "Our retention rates have improved dramatically since implementing JiraVision's Team Wellbeing suite.
                  Our teams are happier and more productive."
                </p>
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-gray-200 overflow-hidden">
                    <img
                      src="/placeholder.svg?height=48&width=48"
                      alt="James Wilson"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div>
                    <h4 className="font-semibold">James Wilson</h4>
                    <p className="text-sm text-muted-foreground">CTO, InnovateNow</p>
                  </div>
                </div>
              </div>

              <div className="bg-background p-6 rounded-lg shadow-sm border">
                <p className="italic text-muted-foreground mb-4">
                  "As a remote-first company, the wellbeing tools have been essential for maintaining team cohesion and
                  ensuring nobody feels isolated or overwhelmed."
                </p>
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-gray-200 overflow-hidden">
                    <img
                      src="/placeholder.svg?height=48&width=48"
                      alt="Sophia Chen"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div>
                    <h4 className="font-semibold">Sophia Chen</h4>
                    <p className="text-sm text-muted-foreground">People Ops Lead, RemoteForce</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-primary text-primary-foreground">
          <div className="container text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Build a Healthier Team?</h2>
            <p className="text-xl max-w-2xl mx-auto mb-8 text-primary-foreground/80">
              Join thousands of teams already using JiraVision's Team Wellbeing tools to create a more balanced
              workplace.
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
