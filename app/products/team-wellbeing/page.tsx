import { MainNavbar } from "@/components/main-navbar"
import { MainFooter } from "@/components/main-footer"
import { Button } from "@/components/ui/button"
import { Heart, Check, ArrowRight, BarChart3, Users, Activity, Brain, Zap } from "lucide-react"
import Link from "next/link"

export default function TeamWellbeingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MainNavbar />

      <main className="flex-1">
        {/* Hero Section - Modern Split Design */}
        <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 to-primary/10 py-24 md:py-32">
          <div className="absolute inset-0 bg-grid-white/10 bg-[length:20px_20px] [mask-image:radial-gradient(white,transparent_85%)]"></div>
          <div className="container relative">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div className="flex flex-col gap-6">
                <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary w-fit">
                  <Heart className="h-4 w-4" />
                  <span>Team Wellbeing Suite</span>
                </div>
                <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
                  Prioritize <span className="text-primary">Team Wellbeing</span>
                </h1>
                <p className="text-xl text-muted-foreground">
                  Monitor team health, prevent burnout, and optimize workload distribution with AI-powered emotional
                  intelligence.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 mt-4">
                  <Link href="/signup">
                    <Button size="lg" className="gap-2 rounded-full">
                      Start Free Trial <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="#features">
                    <Button size="lg" variant="outline" className="rounded-full">
                      Explore Features
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="relative">
                <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-primary to-purple-600 opacity-30 blur-xl"></div>
                <div className="relative h-[400px] w-full rounded-xl overflow-hidden border shadow-xl">
                  <img
                    src="https://images.unsplash.com/photo-1552581234-26160f608093?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2000&q=80"
                    alt="Team Wellbeing Dashboard"
                    className="object-cover w-full h-full"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-12 bg-background border-y">
          <div className="container">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div className="text-center">
                <p className="text-3xl md:text-4xl font-bold text-primary">40%</p>
                <p className="text-sm text-muted-foreground mt-1">Reduced Burnout</p>
              </div>
              <div className="text-center">
                <p className="text-3xl md:text-4xl font-bold text-primary">25%</p>
                <p className="text-sm text-muted-foreground mt-1">Increased Productivity</p>
              </div>
              <div className="text-center">
                <p className="text-3xl md:text-4xl font-bold text-primary">30%</p>
                <p className="text-sm text-muted-foreground mt-1">Better Retention</p>
              </div>
              <div className="text-center">
                <p className="text-3xl md:text-4xl font-bold text-primary">85%</p>
                <p className="text-sm text-muted-foreground mt-1">Team Satisfaction</p>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section - Modern Card Design */}
        <section id="features" className="py-24">
          <div className="container">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary mb-4">
                <Zap className="h-4 w-4" />
                <span>Key Features</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-bold mb-4">Build Healthier Teams</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Our Team Wellbeing suite helps you build a healthier, more productive team culture.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* 3D Card Effect */}
              <div className="group relative bg-background rounded-xl p-8 shadow-md border hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-primary/20 to-purple-600/20 opacity-0 group-hover:opacity-100 transition-opacity blur-xl"></div>
                <div className="relative">
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                    <Heart className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">Sentiment Analysis</h3>
                  <p className="text-muted-foreground">
                    AI-powered analysis of team communications to detect early signs of stress, burnout, or
                    disengagement.
                  </p>
                  <div className="mt-6 pt-6 border-t">
                    <img
                      src="https://images.unsplash.com/photo-1551434678-e076c223a692?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80"
                      alt="Sentiment Analysis"
                      className="rounded-lg w-full h-40 object-cover"
                    />
                  </div>
                </div>
              </div>

              <div className="group relative bg-background rounded-xl p-8 shadow-md border hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-primary/20 to-purple-600/20 opacity-0 group-hover:opacity-100 transition-opacity blur-xl"></div>
                <div className="relative">
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                    <BarChart3 className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">Workload Balancing</h3>
                  <p className="text-muted-foreground">
                    Intelligent task distribution that considers individual capacity, skills, and current wellbeing
                    status.
                  </p>
                  <div className="mt-6 pt-6 border-t">
                    <img
                      src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80"
                      alt="Workload Balancing"
                      className="rounded-lg w-full h-40 object-cover"
                    />
                  </div>
                </div>
              </div>

              <div className="group relative bg-background rounded-xl p-8 shadow-md border hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-primary/20 to-purple-600/20 opacity-0 group-hover:opacity-100 transition-opacity blur-xl"></div>
                <div className="relative">
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                    <Users className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">Team Health Metrics</h3>
                  <p className="text-muted-foreground">
                    Comprehensive dashboards tracking team morale, engagement, and satisfaction over time.
                  </p>
                  <div className="mt-6 pt-6 border-t">
                    <img
                      src="https://images.unsplash.com/photo-1552664730-d307ca884978?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80"
                      alt="Team Health Metrics"
                      className="rounded-lg w-full h-40 object-cover"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-24 bg-muted/30">
          <div className="container">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary mb-4">
                <Brain className="h-4 w-4" />
                <span>The Process</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-bold mb-4">How It Works</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Our AI-powered platform continuously monitors and improves team wellbeing.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="bg-background rounded-xl p-6 border relative">
                <div className="absolute -top-4 -left-4 h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                  1
                </div>
                <h3 className="text-lg font-bold mb-3 mt-2">Data Collection</h3>
                <p className="text-muted-foreground text-sm">
                  Gather signals from team communications, work patterns, and optional check-ins.
                </p>
              </div>

              <div className="bg-background rounded-xl p-6 border relative">
                <div className="absolute -top-4 -left-4 h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                  2
                </div>
                <h3 className="text-lg font-bold mb-3 mt-2">AI Analysis</h3>
                <p className="text-muted-foreground text-sm">
                  Our AI processes the data to identify patterns and potential wellbeing issues.
                </p>
              </div>

              <div className="bg-background rounded-xl p-6 border relative">
                <div className="absolute -top-4 -left-4 h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                  3
                </div>
                <h3 className="text-lg font-bold mb-3 mt-2">Insights Generation</h3>
                <p className="text-muted-foreground text-sm">
                  Actionable insights and recommendations are provided to team leaders.
                </p>
              </div>

              <div className="bg-background rounded-xl p-6 border relative">
                <div className="absolute -top-4 -left-4 h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                  4
                </div>
                <h3 className="text-lg font-bold mb-3 mt-2">Continuous Improvement</h3>
                <p className="text-muted-foreground text-sm">
                  Implement changes and monitor improvements in team wellbeing metrics.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Section - Modern Split Design */}
        <section className="py-24">
          <div className="container">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
              <div className="relative order-2 md:order-1">
                <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-primary to-purple-600 opacity-30 blur-xl"></div>
                <div className="relative h-[500px] w-full rounded-xl overflow-hidden border shadow-xl">
                  <img
                    src="https://images.unsplash.com/photo-1573164713988-8665fc963095?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2000&q=80"
                    alt="Team Wellbeing Benefits"
                    className="object-cover w-full h-full"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-8 order-1 md:order-2">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary mb-4">
                    <Activity className="h-4 w-4" />
                    <span>Why It Matters</span>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold mb-6">Why Team Wellbeing Matters</h2>
                  <p className="text-lg text-muted-foreground mb-8">
                    Healthy teams deliver better results and stay together longer. Our platform helps you build a
                    culture where everyone can thrive.
                  </p>
                </div>

                <div className="space-y-6">
                  <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-xl">
                    <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                      <Check className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-1">Reduce Turnover by 40%</h3>
                      <p className="text-muted-foreground">
                        Teams using our wellbeing tools experience significantly lower turnover rates and higher
                        retention.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-xl">
                    <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                      <Check className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-1">Increase Productivity by 25%</h3>
                      <p className="text-muted-foreground">
                        Balanced workloads and improved team morale lead to measurable productivity gains.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-xl">
                    <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                      <Check className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-1">Improve Team Collaboration</h3>
                      <p className="text-muted-foreground">
                        Teams with higher wellbeing scores demonstrate better communication and collaboration patterns.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials Section - Modern Card Design */}
        <section className="py-24 bg-muted/30">
          <div className="container">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary mb-4">
                <Users className="h-4 w-4" />
                <span>Customer Stories</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-bold mb-4">What Our Customers Say</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Hear from teams that have transformed their culture with JiraVision's Team Wellbeing tools.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-background rounded-xl p-8 shadow-md border relative">
                <div className="absolute -top-5 -right-5 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-primary"
                  >
                    <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"></path>
                    <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"></path>
                  </svg>
                </div>
                <p className="italic text-muted-foreground mb-6 mt-4">
                  "The wellbeing metrics helped us identify a team that was heading toward burnout before it happened.
                  We were able to redistribute work and prevent a crisis."
                </p>
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-gray-200 overflow-hidden">
                    <img
                      src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=200&q=80"
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

              <div className="bg-background rounded-xl p-8 shadow-md border relative">
                <div className="absolute -top-5 -right-5 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-primary"
                  >
                    <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"></path>
                    <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"></path>
                  </svg>
                </div>
                <p className="italic text-muted-foreground mb-6 mt-4">
                  "Our retention rates have improved dramatically since implementing JiraVision's Team Wellbeing suite.
                  Our teams are happier and more productive."
                </p>
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-gray-200 overflow-hidden">
                    <img
                      src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=200&q=80"
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

              <div className="bg-background rounded-xl p-8 shadow-md border relative">
                <div className="absolute -top-5 -right-5 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-primary"
                  >
                    <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"></path>
                    <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"></path>
                  </svg>
                </div>
                <p className="italic text-muted-foreground mb-6 mt-4">
                  "As a remote-first company, the wellbeing tools have been essential for maintaining team cohesion and
                  ensuring nobody feels isolated or overwhelmed."
                </p>
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-gray-200 overflow-hidden">
                    <img
                      src="https://images.unsplash.com/photo-1580489944761-15a19d654956?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=200&q=80"
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

        {/* CTA Section - Modern Gradient Design */}
        <section className="py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/90 to-purple-700/90"></div>
          <div className="absolute inset-0 bg-grid-white/10 bg-[length:20px_20px] [mask-image:radial-gradient(white,transparent_85%)]"></div>
          <div className="container relative">
            <div className="max-w-3xl mx-auto text-center text-white">
              <h2 className="text-3xl md:text-5xl font-bold mb-6">Ready to Build a Healthier Team?</h2>
              <p className="text-xl mb-8 text-white/80">
                Join thousands of teams already using JiraVision's Team Wellbeing tools to create a more balanced
                workplace.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/signup">
                  <Button size="lg" variant="secondary" className="rounded-full">
                    Start Free Trial
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button
                    size="lg"
                    variant="outline"
                    className="rounded-full bg-transparent text-white border-white hover:bg-white/10"
                  >
                    Schedule a Demo
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <MainFooter />
    </div>
  )
}
