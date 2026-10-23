import { MainNavbar } from "@/components/main-navbar"
import { MainFooter } from "@/components/main-footer"
import { Button } from "@/components/ui/button"
import { Brain, Check, ArrowRight, Zap, BarChart3, Users, Calendar, MessageSquare } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export default function AiScrumMasterPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MainNavbar />

      <main className="flex-1">
        {/* Hero Section - Modern Split Design with 3D Elements */}
        <section className="relative py-20 md:py-28 overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
          <div className="absolute inset-0 bg-grid-slate-200 [mask-image:radial-gradient(ellipse_at_center,white_20%,transparent_75%)] dark:bg-grid-slate-800/25"></div>
          <div className="container relative z-10">
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
                    <Button size="lg" className="gap-2 group relative overflow-hidden rounded-full">
                      <span className="absolute inset-0 bg-gradient-to-r from-primary/80 to-primary group-hover:scale-[2.5] transition-transform duration-500 rounded-full blur-md opacity-50"></span>
                      <span className="relative">Try It Free</span>
                      <ArrowRight className="h-4 w-4 relative" />
                    </Button>
                  </Link>
                  <Link href="#features">
                    <Button size="lg" variant="outline" className="rounded-full">
                      Learn More
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary to-violet-600 rounded-xl blur-xl opacity-30 animate-pulse"></div>
                <div className="relative h-[400px] w-full rounded-xl overflow-hidden border shadow-xl">
                  <Image
                    src="https://images.unsplash.com/photo-1531403009284-440f080d1e12?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2340&q=80"
                    alt="AI Scrum Master Dashboard"
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section - Interactive Cards */}
        <section id="features" className="py-20 bg-white dark:bg-slate-950">
          <div className="container">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Key Features</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Our AI Scrum Master brings intelligence and automation to every aspect of your agile workflow.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="group bg-slate-50 dark:bg-slate-900 rounded-2xl p-8 shadow-lg border border-slate-200 dark:border-slate-800 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Brain className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3">Intelligent Sprint Planning</h3>
                <p className="text-muted-foreground mb-6">
                  AI-powered story point estimation and capacity planning based on historical team performance.
                </p>
                <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
                  <Image
                    src="https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80"
                    alt="Sprint Planning"
                    width={400}
                    height={225}
                    className="rounded-lg w-full h-48 object-cover transform group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
              </div>

              <div className="group bg-slate-50 dark:bg-slate-900 rounded-2xl p-8 shadow-lg border border-slate-200 dark:border-slate-800 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <MessageSquare className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3">Automated Stand-ups</h3>
                <p className="text-muted-foreground mb-6">
                  Collect updates asynchronously and get AI-generated summaries of team progress and blockers.
                </p>
                <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
                  <Image
                    src="https://images.unsplash.com/photo-1600880292089-90a7e086ee0c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80"
                    alt="Automated Stand-ups"
                    width={400}
                    height={225}
                    className="rounded-lg w-full h-48 object-cover transform group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
              </div>

              <div className="group bg-slate-50 dark:bg-slate-900 rounded-2xl p-8 shadow-lg border border-slate-200 dark:border-slate-800 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <BarChart3 className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3">Data-Driven Retrospectives</h3>
                <p className="text-muted-foreground mb-6">
                  Identify patterns and generate actionable insights to continuously improve team performance.
                </p>
                <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
                  <Image
                    src="https://images.unsplash.com/photo-1551836022-d5d88e9218df?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80"
                    alt="Data-Driven Retrospectives"
                    width={400}
                    height={225}
                    className="rounded-lg w-full h-48 object-cover transform group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section - Timeline Design */}
        <section className="py-20 bg-slate-50 dark:bg-slate-900">
          <div className="container">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary mb-4">
                <Zap className="h-4 w-4" />
                <span>The Process</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Our AI Scrum Master seamlessly integrates with your existing workflow.
              </p>
            </div>

            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-1 bg-gradient-to-b from-primary/80 to-violet-600/80 rounded-full hidden md:block"></div>

              <div className="space-y-16">
                {/* Step 1 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  <div className="md:text-right">
                    <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-primary text-white text-xl font-bold mb-4">
                      1
                    </div>
                    <h3 className="text-2xl font-bold mb-3">Connect Your Tools</h3>
                    <p className="text-muted-foreground">
                      Integrate with Jira, GitHub, Slack, and other tools your team already uses. No disruption to your
                      existing workflow.
                    </p>
                  </div>
                  <div className="relative">
                    <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 to-violet-600/30 rounded-xl blur-md opacity-70"></div>
                    <div className="relative rounded-xl overflow-hidden border shadow-lg">
                      <Image
                        src="https://images.unsplash.com/photo-1573164713988-8665fc963095?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80"
                        alt="Connect Your Tools"
                        width={600}
                        height={400}
                        className="w-full h-64 object-cover"
                      />
                    </div>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  <div className="md:order-2">
                    <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-primary text-white text-xl font-bold mb-4">
                      2
                    </div>
                    <h3 className="text-2xl font-bold mb-3">AI Analyzes Your Data</h3>
                    <p className="text-muted-foreground">
                      Our AI processes historical data to understand your team's unique patterns, strengths, and areas
                      for improvement.
                    </p>
                  </div>
                  <div className="relative md:order-1">
                    <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 to-violet-600/30 rounded-xl blur-md opacity-70"></div>
                    <div className="relative rounded-xl overflow-hidden border shadow-lg">
                      <Image
                        src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80"
                        alt="AI Analyzes Your Data"
                        width={600}
                        height={400}
                        className="w-full h-64 object-cover"
                      />
                    </div>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  <div className="md:text-right">
                    <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-primary text-white text-xl font-bold mb-4">
                      3
                    </div>
                    <h3 className="text-2xl font-bold mb-3">Get Actionable Insights</h3>
                    <p className="text-muted-foreground">
                      Receive personalized recommendations, automated reports, and real-time guidance to optimize your
                      agile process.
                    </p>
                  </div>
                  <div className="relative">
                    <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 to-violet-600/30 rounded-xl blur-md opacity-70"></div>
                    <div className="relative rounded-xl overflow-hidden border shadow-lg">
                      <Image
                        src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80"
                        alt="Get Actionable Insights"
                        width={600}
                        height={400}
                        className="w-full h-64 object-cover"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Section - Modern Card Design */}
        <section className="py-20 bg-white dark:bg-slate-950">
          <div className="container">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
              <div className="relative order-2 md:order-1">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 to-violet-600/30 rounded-xl blur-xl opacity-70"></div>
                <div className="relative h-[500px] w-full rounded-xl overflow-hidden border shadow-xl">
                  <Image
                    src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2000&q=80"
                    alt="AI Scrum Master Benefits"
                    fill
                    className="object-cover"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-8 order-1 md:order-2">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary mb-4">
                    <Users className="h-4 w-4" />
                    <span>Why Choose AI Scrum Master?</span>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold mb-6">Transform Your Agile Process</h2>
                  <p className="text-lg text-muted-foreground mb-8">
                    Our AI Scrum Master helps teams deliver better results with less overhead, making agile truly agile
                    again.
                  </p>
                </div>

                <div className="space-y-6">
                  <div className="flex items-start gap-4 p-6 bg-slate-50 dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 hover:shadow-md transition-shadow">
                    <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                      <Check className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold mb-2">Save Time and Reduce Overhead</h3>
                      <p className="text-muted-foreground">
                        Automate routine scrum activities and free up your team to focus on delivering value.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-6 bg-slate-50 dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 hover:shadow-md transition-shadow">
                    <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                      <Check className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold mb-2">Improve Estimation Accuracy</h3>
                      <p className="text-muted-foreground">
                        AI-powered story point estimation based on historical data leads to more predictable sprints.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-6 bg-slate-50 dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 hover:shadow-md transition-shadow">
                    <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                      <Check className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold mb-2">Identify and Remove Blockers Faster</h3>
                      <p className="text-muted-foreground">
                        Proactive identification of potential issues before they impact your sprint.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials Section - Modern Card Design */}
        <section className="py-20 bg-slate-50 dark:bg-slate-900">
          <div className="container">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary mb-4">
                <Users className="h-4 w-4" />
                <span>Success Stories</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">What Our Customers Say</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Hear from teams that have transformed their agile process with JiraVision's AI Scrum Master.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white dark:bg-slate-950 rounded-2xl p-8 shadow-lg border border-slate-200 dark:border-slate-800 relative">
                <div className="absolute top-0 right-0 w-20 h-20 overflow-hidden">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-primary transform rotate-45 translate-x-1/2 -translate-y-1/2"></div>
                  <svg
                    className="absolute top-2 right-2 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"></path>
                    <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"></path>
                  </svg>
                </div>
                <p className="italic text-muted-foreground mb-6 mt-4">
                  "The AI Scrum Master has revolutionized our sprint planning. We're now consistently hitting our sprint
                  goals with 95% accuracy."
                </p>
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full overflow-hidden">
                    <Image
                      src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=200&q=80"
                      alt="Sarah Johnson"
                      width={48}
                      height={48}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div>
                    <h4 className="font-semibold">Sarah Johnson</h4>
                    <p className="text-sm text-muted-foreground">Engineering Manager, TechCorp</p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-950 rounded-2xl p-8 shadow-lg border border-slate-200 dark:border-slate-800 relative">
                <div className="absolute top-0 right-0 w-20 h-20 overflow-hidden">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-primary transform rotate-45 translate-x-1/2 -translate-y-1/2"></div>
                  <svg
                    className="absolute top-2 right-2 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"></path>
                    <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"></path>
                  </svg>
                </div>
                <p className="italic text-muted-foreground mb-6 mt-4">
                  "Automated stand-ups have saved us hours each week and improved our async communication across time
                  zones."
                </p>
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full overflow-hidden">
                    <Image
                      src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=200&q=80"
                      alt="Michael Chen"
                      width={48}
                      height={48}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div>
                    <h4 className="font-semibold">Michael Chen</h4>
                    <p className="text-sm text-muted-foreground">Product Owner, GlobalTech</p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-950 rounded-2xl p-8 shadow-lg border border-slate-200 dark:border-slate-800 relative">
                <div className="absolute top-0 right-0 w-20 h-20 overflow-hidden">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-primary transform rotate-45 translate-x-1/2 -translate-y-1/2"></div>
                  <svg
                    className="absolute top-2 right-2 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"></path>
                    <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"></path>
                  </svg>
                </div>
                <p className="italic text-muted-foreground mb-6 mt-4">
                  "The data-driven retrospectives have helped us identify patterns we never would have noticed
                  otherwise."
                </p>
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full overflow-hidden">
                    <Image
                      src="https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=200&q=80"
                      alt="Jessica Martinez"
                      width={48}
                      height={48}
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

        {/* Pricing Section */}
        <section className="py-20 bg-white dark:bg-slate-950">
          <div className="container">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary mb-4">
                <Calendar className="h-4 w-4" />
                <span>Pricing Plans</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Choose the plan that's right for your team. All plans include a 14-day free trial.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {/* Starter Plan */}
              <div className="bg-white dark:bg-slate-950 rounded-2xl p-8 shadow-lg border border-slate-200 dark:border-slate-800 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <h3 className="text-xl font-bold mb-2">Starter</h3>
                <div className="flex items-baseline mb-6">
                  <span className="text-4xl font-bold">$9</span>
                  <span className="text-muted-foreground ml-2">/ user / month</span>
                </div>
                <p className="text-muted-foreground mb-6">Perfect for small teams just getting started with Agile.</p>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center">
                    <Check className="h-5 w-5 text-green-500 mr-2 shrink-0" />
                    <span>Basic AI Scrum Master features</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="h-5 w-5 text-green-500 mr-2 shrink-0" />
                    <span>Sprint planning assistance</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="h-5 w-5 text-green-500 mr-2 shrink-0" />
                    <span>Basic analytics</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="h-5 w-5 text-green-500 mr-2 shrink-0" />
                    <span>Email support</span>
                  </li>
                </ul>
                <Link href="/signup" className="block">
                  <Button className="w-full rounded-full">Start Free Trial</Button>
                </Link>
              </div>

              {/* Pro Plan - Highlighted */}
              <div className="bg-white dark:bg-slate-950 rounded-2xl p-8 shadow-xl border-2 border-primary relative hover:-translate-y-1 transition-all duration-300">
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-primary text-white px-4 py-1 rounded-full text-sm font-medium">
                  Most Popular
                </div>
                <h3 className="text-xl font-bold mb-2">Professional</h3>
                <div className="flex items-baseline mb-6">
                  <span className="text-4xl font-bold">$19</span>
                  <span className="text-muted-foreground ml-2">/ user / month</span>
                </div>
                <p className="text-muted-foreground mb-6">For growing teams that need more advanced features.</p>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center">
                    <Check className="h-5 w-5 text-green-500 mr-2 shrink-0" />
                    <span>All Starter features</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="h-5 w-5 text-green-500 mr-2 shrink-0" />
                    <span>Advanced AI insights</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="h-5 w-5 text-green-500 mr-2 shrink-0" />
                    <span>Custom integrations</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="h-5 w-5 text-green-500 mr-2 shrink-0" />
                    <span>Priority support</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="h-5 w-5 text-green-500 mr-2 shrink-0" />
                    <span>Team performance analytics</span>
                  </li>
                </ul>
                <Link href="/signup" className="block">
                  <Button className="w-full rounded-full bg-primary hover:bg-primary/90">Start Free Trial</Button>
                </Link>
              </div>

              {/* Enterprise Plan */}
              <div className="bg-white dark:bg-slate-950 rounded-2xl p-8 shadow-lg border border-slate-200 dark:border-slate-800 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <h3 className="text-xl font-bold mb-2">Enterprise</h3>
                <div className="flex items-baseline mb-6">
                  <span className="text-4xl font-bold">$49</span>
                  <span className="text-muted-foreground ml-2">/ user / month</span>
                </div>
                <p className="text-muted-foreground mb-6">For large organizations with complex requirements.</p>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center">
                    <Check className="h-5 w-5 text-green-500 mr-2 shrink-0" />
                    <span>All Professional features</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="h-5 w-5 text-green-500 mr-2 shrink-0" />
                    <span>Dedicated account manager</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="h-5 w-5 text-green-500 mr-2 shrink-0" />
                    <span>Custom AI training</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="h-5 w-5 text-green-500 mr-2 shrink-0" />
                    <span>Advanced security features</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="h-5 w-5 text-green-500 mr-2 shrink-0" />
                    <span>SLA guarantees</span>
                  </li>
                </ul>
                <Link href="/contact" className="block">
                  <Button variant="outline" className="w-full rounded-full">
                    Contact Sales
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section - Modern Gradient Design */}
        <section className="py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/90 to-violet-700/90"></div>
          <div className="absolute inset-0 bg-grid-white/10 bg-[length:20px_20px] [mask-image:radial-gradient(white,transparent_85%)]"></div>
          <div className="container relative z-10">
            <div className="max-w-3xl mx-auto text-center text-white">
              <h2 className="text-3xl md:text-5xl font-bold mb-6">Ready to Transform Your Agile Process?</h2>
              <p className="text-xl mb-8 text-white/80">
                Join thousands of teams already using JiraVision's AI Scrum Master to streamline their workflow.
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
