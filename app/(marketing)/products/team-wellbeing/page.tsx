import { MainNavbar } from "@/components/main-navbar"
import { MainFooter } from "@/components/main-footer"
import { Button } from "@/components/ui/button"
import { Heart, Check, ArrowRight, BarChart3, Users, Activity, Brain, Zap, Calendar } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export default function TeamWellbeingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MainNavbar />

      <main className="flex-1">
        {/* Hero Section - Modern Split Design with Particles */}
        <section className="relative overflow-hidden bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-950 dark:to-rose-900 py-24 md:py-32">
          <div className="absolute inset-0 bg-grid-rose-200 [mask-image:radial-gradient(ellipse_at_center,white_20%,transparent_75%)] dark:bg-grid-rose-800/25"></div>
          <div className="container relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div className="flex flex-col gap-6">
                <div className="inline-flex items-center gap-2 rounded-full bg-rose-500/10 px-3 py-1 text-sm text-rose-600 dark:text-rose-400 w-fit">
                  <Heart className="h-4 w-4" />
                  <span>Team Wellbeing Suite</span>
                </div>
                <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
                  Prioritize <span className="text-rose-600 dark:text-rose-400">Team Wellbeing</span>
                </h1>
                <p className="text-xl text-muted-foreground">
                  Monitor team health, prevent burnout, and optimize workload distribution with AI-powered emotional
                  intelligence.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 mt-4">
                  <Link href="/signup">
                    <Button size="lg" className="gap-2 rounded-full bg-rose-600 hover:bg-rose-700 text-white">
                      Start Free Trial <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="#features">
                    <Button
                      size="lg"
                      variant="outline"
                      className="rounded-full border-rose-600/20 text-rose-600 dark:text-rose-400 hover:bg-rose-600/10"
                    >
                      Explore Features
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="relative">
                <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-rose-600 to-purple-600 opacity-30 blur-xl"></div>
                <div className="relative h-[400px] w-full rounded-xl overflow-hidden border shadow-xl">
                  <Image
                    src="https://images.unsplash.com/photo-1552581234-26160f608093?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2000&q=80"
                    alt="Team Wellbeing Dashboard"
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section - Animated Cards */}
        <section className="py-12 bg-white dark:bg-slate-950 border-y border-slate-200 dark:border-slate-800">
          <div className="container">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div className="group bg-white dark:bg-slate-900 rounded-xl p-6 shadow-md border border-slate-200 dark:border-slate-800 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 text-center">
                <div className="h-12 w-12 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Activity className="h-6 w-6 text-rose-600 dark:text-rose-400" />
                </div>
                <p className="text-3xl md:text-4xl font-bold text-rose-600 dark:text-rose-400 mb-1">40%</p>
                <p className="text-sm text-muted-foreground">Reduced Burnout</p>
              </div>

              <div className="group bg-white dark:bg-slate-900 rounded-xl p-6 shadow-md border border-slate-200 dark:border-slate-800 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 text-center">
                <div className="h-12 w-12 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Zap className="h-6 w-6 text-rose-600 dark:text-rose-400" />
                </div>
                <p className="text-3xl md:text-4xl font-bold text-rose-600 dark:text-rose-400 mb-1">25%</p>
                <p className="text-sm text-muted-foreground">Increased Productivity</p>
              </div>

              <div className="group bg-white dark:bg-slate-900 rounded-xl p-6 shadow-md border border-slate-200 dark:border-slate-800 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 text-center">
                <div className="h-12 w-12 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Users className="h-6 w-6 text-rose-600 dark:text-rose-400" />
                </div>
                <p className="text-3xl md:text-4xl font-bold text-rose-600 dark:text-rose-400 mb-1">30%</p>
                <p className="text-sm text-muted-foreground">Better Retention</p>
              </div>

              <div className="group bg-white dark:bg-slate-900 rounded-xl p-6 shadow-md border border-slate-200 dark:border-slate-800 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 text-center">
                <div className="h-12 w-12 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Heart className="h-6 w-6 text-rose-600 dark:text-rose-400" />
                </div>
                <p className="text-3xl md:text-4xl font-bold text-rose-600 dark:text-rose-400 mb-1">85%</p>
                <p className="text-sm text-muted-foreground">Team Satisfaction</p>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section - Modern Card Design with Hover Effects */}
        <section id="features" className="py-24 bg-white dark:bg-slate-950">
          <div className="container">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 rounded-full bg-rose-500/10 px-3 py-1 text-sm text-rose-600 dark:text-rose-400 mb-4">
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
              <div className="group relative bg-white dark:bg-slate-900 rounded-xl p-8 shadow-md border border-slate-200 dark:border-slate-800 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
                <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-rose-600/20 to-purple-600/20 opacity-0 group-hover:opacity-100 transition-opacity blur-xl"></div>
                <div className="relative">
                  <div className="h-14 w-14 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                    <Heart className="h-7 w-7 text-rose-600 dark:text-rose-400" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">Sentiment Analysis</h3>
                  <p className="text-muted-foreground mb-6">
                    AI-powered analysis of team communications to detect early signs of stress, burnout, or
                    disengagement.
                  </p>
                  <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
                    <div className="relative h-40 w-full rounded-lg overflow-hidden">
                      <Image
                        src="https://images.unsplash.com/photo-1551434678-e076c223a692?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80"
                        alt="Sentiment Analysis"
                        fill
                        className="object-cover transform group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="group relative bg-white dark:bg-slate-900 rounded-xl p-8 shadow-md border border-slate-200 dark:border-slate-800 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
                <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-rose-600/20 to-purple-600/20 opacity-0 group-hover:opacity-100 transition-opacity blur-xl"></div>
                <div className="relative">
                  <div className="h-14 w-14 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                    <BarChart3 className="h-7 w-7 text-rose-600 dark:text-rose-400" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">Workload Balancing</h3>
                  <p className="text-muted-foreground mb-6">
                    Intelligent task distribution that considers individual capacity, skills, and current wellbeing
                    status.
                  </p>
                  <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
                    <div className="relative h-40 w-full rounded-lg overflow-hidden">
                      <Image
                        src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80"
                        alt="Workload Balancing"
                        fill
                        className="object-cover transform group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="group relative bg-white dark:bg-slate-900 rounded-xl p-8 shadow-md border border-slate-200 dark:border-slate-800 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
                <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-rose-600/20 to-purple-600/20 opacity-0 group-hover:opacity-100 transition-opacity blur-xl"></div>
                <div className="relative">
                  <div className="h-14 w-14 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                    <Users className="h-7 w-7 text-rose-600 dark:text-rose-400" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">Team Health Metrics</h3>
                  <p className="text-muted-foreground mb-6">
                    Comprehensive dashboards tracking team morale, engagement, and satisfaction over time.
                  </p>
                  <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
                    <div className="relative h-40 w-full rounded-lg overflow-hidden">
                      <Image
                        src="https://images.unsplash.com/photo-1552664730-d307ca884978?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80"
                        alt="Team Health Metrics"
                        fill
                        className="object-cover transform group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section - Modern Timeline */}
        <section className="py-24 bg-slate-50 dark:bg-slate-900">
          <div className="container">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 rounded-full bg-rose-500/10 px-3 py-1 text-sm text-rose-600 dark:text-rose-400 mb-4">
                <Brain className="h-4 w-4" />
                <span>The Process</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-bold mb-4">How It Works</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Our AI-powered platform continuously monitors and improves team wellbeing.
              </p>
            </div>

            <div className="relative max-w-4xl mx-auto">
              {/* Timeline line */}
              <div className="absolute left-[15px] md:left-1/2 top-0 bottom-0 w-1 bg-gradient-to-b from-rose-600 to-purple-600 transform md:-translate-x-1/2"></div>

              <div className="space-y-16">
                {/* Step 1 */}
                <div className="relative grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  <div className="md:text-right order-2 md:order-1">
                    <h3 className="text-2xl font-bold mb-3">Data Collection</h3>
                    <p className="text-muted-foreground">
                      Gather signals from team communications, work patterns, and optional check-ins to build a
                      comprehensive picture of team wellbeing.
                    </p>
                  </div>

                  <div className="relative order-1 md:order-2 pl-12 md:pl-0">
                    <div className="absolute left-0 md:left-1/2 top-0 h-10 w-10 rounded-full bg-rose-600 text-white flex items-center justify-center font-bold text-lg transform md:-translate-x-1/2">
                      1
                    </div>
                    <div className="bg-white dark:bg-slate-950 rounded-xl p-6 shadow-md border border-slate-200 dark:border-slate-800">
                      <div className="relative h-48 w-full rounded-lg overflow-hidden mb-4">
                        <Image
                          src="https://images.unsplash.com/photo-1551836022-d5d88e9218df?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80"
                          alt="Data Collection"
                          fill
                          className="object-cover"
                        />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Our platform integrates with your existing tools to collect data without disrupting workflows.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="relative grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  <div className="relative pl-12 md:pl-0">
                    <div className="absolute left-0 md:left-1/2 top-0 h-10 w-10 rounded-full bg-rose-600 text-white flex items-center justify-center font-bold text-lg transform md:-translate-x-1/2">
                      2
                    </div>
                    <div className="bg-white dark:bg-slate-950 rounded-xl p-6 shadow-md border border-slate-200 dark:border-slate-800">
                      <div className="relative h-48 w-full rounded-lg overflow-hidden mb-4">
                        <Image
                          src="https://images.unsplash.com/photo-1551434678-e076c223a692?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80"
                          alt="AI Analysis"
                          fill
                          className="object-cover"
                        />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Advanced machine learning models analyze patterns and identify potential wellbeing issues.
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-2xl font-bold mb-3">AI Analysis</h3>
                    <p className="text-muted-foreground">
                      Our AI processes the data to identify patterns and potential wellbeing issues before they become
                      serious problems.
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="relative grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  <div className="md:text-right order-2 md:order-1">
                    <h3 className="text-2xl font-bold mb-3">Insights Generation</h3>
                    <p className="text-muted-foreground">
                      Actionable insights and recommendations are provided to team leaders, helping them make informed
                      decisions.
                    </p>
                  </div>

                  <div className="relative order-1 md:order-2 pl-12 md:pl-0">
                    <div className="absolute left-0 md:left-1/2 top-0 h-10 w-10 rounded-full bg-rose-600 text-white flex items-center justify-center font-bold text-lg transform md:-translate-x-1/2">
                      3
                    </div>
                    <div className="bg-white dark:bg-slate-950 rounded-xl p-6 shadow-md border border-slate-200 dark:border-slate-800">
                      <div className="relative h-48 w-full rounded-lg overflow-hidden mb-4">
                        <Image
                          src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80"
                          alt="Insights Generation"
                          fill
                          className="object-cover"
                        />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Clear visualizations and recommendations make it easy to understand and act on insights.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="relative grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  <div className="relative pl-12 md:pl-0">
                    <div className="absolute left-0 md:left-1/2 top-0 h-10 w-10 rounded-full bg-rose-600 text-white flex items-center justify-center font-bold text-lg transform md:-translate-x-1/2">
                      4
                    </div>
                    <div className="bg-white dark:bg-slate-950 rounded-xl p-6 shadow-md border border-slate-200 dark:border-slate-800">
                      <div className="relative h-48 w-full rounded-lg overflow-hidden mb-4">
                        <Image
                          src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80"
                          alt="Continuous Improvement"
                          fill
                          className="object-cover"
                        />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Track progress over time and see the positive impact of your wellbeing initiatives.
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-2xl font-bold mb-3">Continuous Improvement</h3>
                    <p className="text-muted-foreground">
                      Implement changes and monitor improvements in team wellbeing metrics, creating a virtuous cycle of
                      better team health.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Section - Modern Split Design */}
        <section className="py-24 bg-white dark:bg-slate-950">
          <div className="container">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
              <div className="relative order-2 md:order-1">
                <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-rose-600 to-purple-600 opacity-30 blur-xl"></div>
                <div className="relative h-[500px] w-full rounded-xl overflow-hidden border shadow-xl">
                  <Image
                    src="https://images.unsplash.com/photo-1573164713988-8665fc963095?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2000&q=80"
                    alt="Team Wellbeing Benefits"
                    fill
                    className="object-cover"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-8 order-1 md:order-2">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-rose-500/10 px-3 py-1 text-sm text-rose-600 dark:text-rose-400 mb-4">
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
                  <div className="group flex items-start gap-4 p-6 bg-slate-50 dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 hover:shadow-md transition-all duration-300 hover:-translate-y-1">
                    <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <Check className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold mb-2">Reduce Turnover by 40%</h3>
                      <p className="text-muted-foreground">
                        Teams using our wellbeing tools experience significantly lower turnover rates and higher
                        retention, saving on recruitment and training costs.
                      </p>
                    </div>
                  </div>

                  <div className="group flex items-start gap-4 p-6 bg-slate-50 dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 hover:shadow-md transition-all duration-300 hover:-translate-y-1">
                    <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <Check className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold mb-2">Increase Productivity by 25%</h3>
                      <p className="text-muted-foreground">
                        Balanced workloads and improved team morale lead to measurable productivity gains and higher
                        quality work output.
                      </p>
                    </div>
                  </div>

                  <div className="group flex items-start gap-4 p-6 bg-slate-50 dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 hover:shadow-md transition-all duration-300 hover:-translate-y-1">
                    <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <Check className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold mb-2">Improve Team Collaboration</h3>
                      <p className="text-muted-foreground">
                        Teams with higher wellbeing scores demonstrate better communication and collaboration patterns,
                        leading to more innovation.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials Section - Modern Card Design */}
        <section className="py-24 bg-slate-50 dark:bg-slate-900">
          <div className="container">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 rounded-full bg-rose-500/10 px-3 py-1 text-sm text-rose-600 dark:text-rose-400 mb-4">
                <Users className="h-4 w-4" />
                <span>Customer Stories</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-bold mb-4">What Our Customers Say</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Hear from teams that have transformed their culture with JiraVision's Team Wellbeing tools.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white dark:bg-slate-950 rounded-xl overflow-hidden shadow-lg border border-slate-200 dark:border-slate-800 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="h-32 bg-gradient-to-r from-rose-500/20 to-purple-600/20"></div>
                <div className="p-8 -mt-16">
                  <div className="h-16 w-16 rounded-full bg-white p-1 shadow-lg mb-4 mx-auto">
                    <div className="h-full w-full rounded-full overflow-hidden">
                      <Image
                        src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=200&q=80"
                        alt="Emily Rodriguez"
                        width={64}
                        height={64}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </div>
                  <p className="italic text-muted-foreground mb-6 text-center">
                    "The wellbeing metrics helped us identify a team that was heading toward burnout before it happened.
                    We were able to redistribute work and prevent a crisis."
                  </p>
                  <div className="text-center">
                    <h4 className="font-semibold">Emily Rodriguez</h4>
                    <p className="text-sm text-muted-foreground">HR Director, TechGrowth</p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-950 rounded-xl overflow-hidden shadow-lg border border-slate-200 dark:border-slate-800 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="h-32 bg-gradient-to-r from-rose-500/20 to-purple-600/20"></div>
                <div className="p-8 -mt-16">
                  <div className="h-16 w-16 rounded-full bg-white p-1 shadow-lg mb-4 mx-auto">
                    <div className="h-full w-full rounded-full overflow-hidden">
                      <Image
                        src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=200&q=80"
                        alt="Robert Kim"
                        width={64}
                        height={64}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </div>
                  <p className="italic text-muted-foreground mb-6 text-center">
                    "Our retention rates have improved dramatically since implementing JiraVision's Team Wellbeing
                    suite. Our teams are happier and more productive."
                  </p>
                  <div className="text-center">
                    <h4 className="font-semibold">James Wilson</h4>
                    <p className="text-sm text-muted-foreground">CTO, InnovateNow</p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-950 rounded-xl overflow-hidden shadow-lg border border-slate-200 dark:border-slate-800 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="h-32 bg-gradient-to-r from-rose-500/20 to-purple-600/20"></div>
                <div className="p-8 -mt-16">
                  <div className="h-16 w-16 rounded-full bg-white p-1 shadow-lg mb-4 mx-auto">
                    <div className="h-full w-full rounded-full overflow-hidden">
                      <Image
                        src="https://images.unsplash.com/photo-1580489944761-15a19d654956?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=200&q=80"
                        alt="Sophia Chen"
                        width={64}
                        height={64}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </div>
                  <p className="italic text-muted-foreground mb-6 text-center">
                    "As a remote-first company, the wellbeing tools have been essential for maintaining team cohesion
                    and ensuring nobody feels isolated or overwhelmed."
                  </p>
                  <div className="text-center">
                    <h4 className="font-semibold">Sophia Chen</h4>
                    <p className="text-sm text-muted-foreground">People Ops Lead, RemoteForce</p>
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
              <div className="inline-flex items-center gap-2 rounded-full bg-rose-500/10 px-3 py-1 text-sm text-rose-600 dark:text-rose-400 mb-4">
                <Calendar className="h-4 w-4" />
                <span>Pricing Plans</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Wellbeing for Every Team</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Choose the plan that's right for your team. All plans include a 14-day free trial.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {/* Starter Plan */}
              <div className="bg-white dark:bg-slate-950 rounded-xl p-8 shadow-lg border border-slate-200 dark:border-slate-800 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <h3 className="text-xl font-bold mb-2">Starter</h3>
                <div className="flex items-baseline mb-6">
                  <span className="text-4xl font-bold">$9</span>
                  <span className="text-muted-foreground ml-2">/ user / month</span>
                </div>
                <p className="text-muted-foreground mb-6">
                  Perfect for small teams just getting started with wellbeing initiatives.
                </p>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center">
                    <Check className="h-5 w-5 text-green-500 mr-2 shrink-0" />
                    <span>Basic wellbeing metrics</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="h-5 w-5 text-green-500 mr-2 shrink-0" />
                    <span>Weekly team check-ins</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="h-5 w-5 text-green-500 mr-2 shrink-0" />
                    <span>Simple workload tracking</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="h-5 w-5 text-green-500 mr-2 shrink-0" />
                    <span>Email support</span>
                  </li>
                </ul>
                <Link href="/signup" className="block">
                  <Button className="w-full rounded-full bg-rose-600 hover:bg-rose-700 text-white">
                    Start Free Trial
                  </Button>
                </Link>
              </div>

              {/* Pro Plan - Highlighted */}
              <div className="bg-white dark:bg-slate-950 rounded-xl p-8 shadow-xl border-2 border-rose-600 dark:border-rose-500 relative hover:-translate-y-1 transition-all duration-300">
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-rose-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                  Most Popular
                </div>
                <h3 className="text-xl font-bold mb-2">Professional</h3>
                <div className="flex items-baseline mb-6">
                  <span className="text-4xl font-bold">$19</span>
                  <span className="text-muted-foreground ml-2">/ user / month</span>
                </div>
                <p className="text-muted-foreground mb-6">
                  For growing teams that need more advanced wellbeing features.
                </p>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center">
                    <Check className="h-5 w-5 text-green-500 mr-2 shrink-0" />
                    <span>All Starter features</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="h-5 w-5 text-green-500 mr-2 shrink-0" />
                    <span>Advanced sentiment analysis</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="h-5 w-5 text-green-500 mr-2 shrink-0" />
                    <span>Burnout prevention alerts</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="h-5 w-5 text-green-500 mr-2 shrink-0" />
                    <span>Priority support</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="h-5 w-5 text-green-500 mr-2 shrink-0" />
                    <span>Team wellbeing dashboard</span>
                  </li>
                </ul>
                <Link href="/signup" className="block">
                  <Button className="w-full rounded-full bg-rose-600 hover:bg-rose-700 text-white">
                    Start Free Trial
                  </Button>
                </Link>
              </div>

              {/* Enterprise Plan */}
              <div className="bg-white dark:bg-slate-950 rounded-xl p-8 shadow-lg border border-slate-200 dark:border-slate-800 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <h3 className="text-xl font-bold mb-2">Enterprise</h3>
                <div className="flex items-baseline mb-6">
                  <span className="text-4xl font-bold">$49</span>
                  <span className="text-muted-foreground ml-2">/ user / month</span>
                </div>
                <p className="text-muted-foreground mb-6">
                  For large organizations with complex wellbeing requirements.
                </p>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center">
                    <Check className="h-5 w-5 text-green-500 mr-2 shrink-0" />
                    <span>All Professional features</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="h-5 w-5 text-green-500 mr-2 shrink-0" />
                    <span>Dedicated wellbeing consultant</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="h-5 w-5 text-green-500 mr-2 shrink-0" />
                    <span>Custom wellbeing programs</span>
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
                  <Button
                    variant="outline"
                    className="w-full rounded-full border-rose-600/20 text-rose-600 dark:text-rose-400 hover:bg-rose-600/10"
                  >
                    Contact Sales
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section - Modern Gradient Design */}
        <section className="py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-rose-600/90 to-purple-700/90"></div>
          <div className="absolute inset-0 bg-grid-white/10 bg-[length:20px_20px] [mask-image:radial-gradient(white,transparent_85%)]"></div>
          <div className="container relative z-10">
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
