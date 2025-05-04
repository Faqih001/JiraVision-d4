import { MainNavbar } from "@/components/main-navbar"
import { MainFooter } from "@/components/main-footer"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, BarChart3, Brain, Gamepad2, Heart, Shield, Check, ArrowUpRight } from "lucide-react"

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <MainNavbar />

      {/* Hero Section */}
      <section className="relative py-20 md:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/10"></div>
        <div className="absolute inset-0 bg-grid-white/10 bg-[length:20px_20px] [mask-image:radial-gradient(white,transparent_85%)]"></div>
        <div className="container relative">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="flex flex-col gap-6">
              <div className="inline-block rounded-full bg-primary/10 px-4 py-1.5 text-sm text-primary">
                AI-Native Project Management
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
                The Future of Work is <span className="text-primary">Intelligent</span>
              </h1>
              <p className="text-xl text-muted-foreground">
                JiraVision transforms project management with AI Scrum Masters, emotional intelligence, gamification,
                and ethical governance.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mt-4">
                <Link href="/signup">
                  <Button size="lg" className="gap-2 rounded-full">
                    Get Started <ArrowRight className="h-4 w-4" />
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
                  src="https://images.unsplash.com/photo-1551434678-e076c223a692?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2000&q=80"
                  alt="JiraVision Dashboard Preview"
                  className="object-cover w-full h-full"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trusted By Section */}
      <section className="py-12 border-y">
        <div className="container">
          <div className="text-center mb-8">
            <p className="text-sm text-muted-foreground">TRUSTED BY INNOVATIVE TEAMS WORLDWIDE</p>
          </div>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16">
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Google_2015_logo.svg/2560px-Google_2015_logo.svg.png"
              alt="Google"
              className="h-6 md:h-8 opacity-70 hover:opacity-100 transition-opacity"
            />
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/IBM_logo.svg/2560px-IBM_logo.svg.png"
              alt="IBM"
              className="h-6 md:h-8 opacity-70 hover:opacity-100 transition-opacity"
            />
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/Microsoft_logo_%282012%29.svg/2560px-Microsoft_logo_%282012%29.svg.png"
              alt="Microsoft"
              className="h-6 md:h-8 opacity-70 hover:opacity-100 transition-opacity"
            />
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Amazon_logo.svg/2560px-Amazon_logo.svg.png"
              alt="Amazon"
              className="h-6 md:h-8 opacity-70 hover:opacity-100 transition-opacity"
            />
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Netflix_2015_logo.svg/2560px-Netflix_2015_logo.svg.png"
              alt="Netflix"
              className="h-6 md:h-8 opacity-70 hover:opacity-100 transition-opacity"
            />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24">
        <div className="container">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary mb-4">
              <Brain className="h-4 w-4" />
              <span>Core Innovations</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Reimagine Project Management</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              JiraVision combines cutting-edge AI with human-centered design to create a revolutionary project
              management experience.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Feature 1 */}
            <div className="group bg-background rounded-xl p-8 shadow-md border hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
              <div className="flex gap-6">
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                  <Brain className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-3">AI Scrum Masters</h3>
                  <p className="text-muted-foreground mb-6">
                    Self-managed sprints and planning with AI that understands your team's capacity and goals.
                  </p>
                  <Link
                    href="/products/ai-scrum-master"
                    className="inline-flex items-center text-primary font-medium hover:underline"
                  >
                    Learn more <ArrowUpRight className="ml-1 h-4 w-4" />
                  </Link>
                </div>
              </div>
              <div className="mt-8 pt-6 border-t">
                <img
                  src="https://images.unsplash.com/photo-1531403009284-440f080d1e12?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80"
                  alt="AI Scrum Master"
                  className="rounded-lg w-full h-48 object-cover transform group-hover:scale-105 transition-transform duration-500"
                />
              </div>
            </div>

            {/* Feature 2 */}
            <div className="group bg-background rounded-xl p-8 shadow-md border hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
              <div className="flex gap-6">
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                  <Heart className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-3">Team Wellbeing</h3>
                  <p className="text-muted-foreground mb-6">
                    Mood-aware workload assignment that prevents burnout and optimizes for wellbeing.
                  </p>
                  <Link
                    href="/products/team-wellbeing"
                    className="inline-flex items-center text-primary font-medium hover:underline"
                  >
                    Learn more <ArrowUpRight className="ml-1 h-4 w-4" />
                  </Link>
                </div>
              </div>
              <div className="mt-8 pt-6 border-t">
                <img
                  src="https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80"
                  alt="Team Wellbeing"
                  className="rounded-lg w-full h-48 object-cover transform group-hover:scale-105 transition-transform duration-500"
                />
              </div>
            </div>

            {/* Feature 3 */}
            <div className="group bg-background rounded-xl p-8 shadow-md border hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
              <div className="flex gap-6">
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                  <Gamepad2 className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-3">Gamified Experience</h3>
                  <p className="text-muted-foreground mb-6">
                    Personalized motivation engines with skill trees, rewards, and visual storytelling.
                  </p>
                  <Link
                    href="/products/gamification"
                    className="inline-flex items-center text-primary font-medium hover:underline"
                  >
                    Learn more <ArrowUpRight className="ml-1 h-4 w-4" />
                  </Link>
                </div>
              </div>
              <div className="mt-8 pt-6 border-t">
                <img
                  src="https://images.unsplash.com/photo-1511512578047-dfb367046420?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80"
                  alt="Gamified Experience"
                  className="rounded-lg w-full h-48 object-cover transform group-hover:scale-105 transition-transform duration-500"
                />
              </div>
            </div>

            {/* Feature 4 */}
            <div className="group bg-background rounded-xl p-8 shadow-md border hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
              <div className="flex gap-6">
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                  <Shield className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-3">Ethical Governance</h3>
                  <p className="text-muted-foreground mb-6">
                    Real-time DEI, workload, and pay equity enforcement for fair and balanced teams.
                  </p>
                  <Link
                    href="/products/ethical-metrics"
                    className="inline-flex items-center text-primary font-medium hover:underline"
                  >
                    Learn more <ArrowUpRight className="ml-1 h-4 w-4" />
                  </Link>
                </div>
              </div>
              <div className="mt-8 pt-6 border-t">
                <img
                  src="https://images.unsplash.com/photo-1551836022-d5d88e9218df?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80"
                  alt="Ethical Governance"
                  className="rounded-lg w-full h-48 object-cover transform group-hover:scale-105 transition-transform duration-500"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-24 bg-muted/30">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="relative">
              <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-primary to-purple-600 opacity-30 blur-xl"></div>
              <div className="relative h-[500px] w-full rounded-xl overflow-hidden border shadow-xl">
                <img
                  src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2000&q=80"
                  alt="JiraVision Benefits"
                  className="object-cover w-full h-full"
                />
              </div>
            </div>
            <div className="flex flex-col gap-8">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary mb-4">
                  <BarChart3 className="h-4 w-4" />
                  <span>Business Value</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold mb-6">Measurable Results</h2>
                <p className="text-lg text-muted-foreground mb-8">
                  Our customers see real, measurable improvements in productivity, team wellbeing, and project outcomes.
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex items-start gap-4 p-4 bg-background rounded-xl shadow-sm border">
                  <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                    <Check className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-1">Increased Productivity</h3>
                    <p className="text-muted-foreground">
                      Saves ~5 hours/week per developer with AI-powered workflows.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-background rounded-xl shadow-sm border">
                  <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                    <Check className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-1">Reduced Burnout</h3>
                    <p className="text-muted-foreground">
                      Decreases burnout risk by 40% through emotional intelligence.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-background rounded-xl shadow-sm border">
                  <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                    <Check className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-1">Ethical Compliance</h3>
                    <p className="text-muted-foreground">Monitors for 100% pay equity and ethical compliance.</p>
                  </div>
                </div>
              </div>
              <Link href="/signup">
                <Button className="rounded-full gap-2 mt-4">
                  Get Started Today <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section id="demo" className="py-24">
        <div className="container text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary mb-4">
            <Brain className="h-4 w-4" />
            <span>See It In Action</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Experience JiraVision</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            See how JiraVision transforms your workflow with AI-powered insights and gamified experiences.
          </p>
          <div className="relative max-w-4xl mx-auto">
            <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-primary to-purple-600 opacity-30 blur-xl"></div>
            <div className="relative aspect-video rounded-xl overflow-hidden border bg-background shadow-xl">
              <img
                src="https://images.unsplash.com/photo-1542744173-8e7e53415bb0?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2000&q=80"
                alt="JiraVision Demo Video"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-20 w-20 rounded-full bg-primary/90 flex items-center justify-center cursor-pointer hover:bg-primary transition-colors">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-white ml-1"
                  >
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                  </svg>
                </div>
              </div>
            </div>
          </div>
          <Link href="/signup">
            <Button size="lg" className="mt-12 rounded-full gap-2">
              Try JiraVision Today <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 bg-muted/30">
        <div className="container">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
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
              <span>Customer Stories</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">What Our Customers Say</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Hear from teams that have transformed their workflow with JiraVision.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-background rounded-xl overflow-hidden shadow-md border relative">
              <div className="h-32 bg-gradient-to-r from-primary/20 to-purple-600/20"></div>
              <div className="p-8 -mt-16">
                <div className="h-16 w-16 rounded-full bg-white p-1 shadow-lg mb-4">
                  <img
                    src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=200&q=80"
                    alt="Marcus Johnson"
                    className="h-full w-full object-cover rounded-full"
                  />
                </div>
                <p className="italic text-muted-foreground mb-6">
                  "The AI Scrum Master has revolutionized our sprint planning. We're now consistently hitting our sprint
                  goals with 95% accuracy."
                </p>
                <div>
                  <h4 className="font-semibold">Marcus Johnson</h4>
                  <p className="text-sm text-muted-foreground">Engineering Lead, GameStack</p>
                </div>
              </div>
            </div>

            <div className="bg-background rounded-xl overflow-hidden shadow-md border relative">
              <div className="h-32 bg-gradient-to-r from-primary/20 to-purple-600/20"></div>
              <div className="p-8 -mt-16">
                <div className="h-16 w-16 rounded-full bg-white p-1 shadow-lg mb-4">
                  <img
                    src="https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=200&q=80"
                    alt="Sophia Chen"
                    className="h-full w-full object-cover rounded-full"
                  />
                </div>
                <p className="italic text-muted-foreground mb-6">
                  "Team wellbeing features have been crucial for maintaining our culture and preventing burnout in our
                  remote-first company."
                </p>
                <div>
                  <h4 className="font-semibold">Sophia Chen</h4>
                  <p className="text-sm text-muted-foreground">People Ops Lead, RemoteForce</p>
                </div>
              </div>
            </div>

            <div className="bg-background rounded-xl overflow-hidden shadow-md border relative">
              <div className="h-32 bg-gradient-to-r from-primary/20 to-purple-600/20"></div>
              <div className="p-8 -mt-16">
                <div className="h-16 w-16 rounded-full bg-white p-1 shadow-lg mb-4">
                  <img
                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=200&q=80"
                    alt="Robert Kim"
                    className="h-full w-full object-cover rounded-full"
                  />
                </div>
                <p className="italic text-muted-foreground mb-6">
                  "The ethical metrics tools helped us identify and address compensation gaps we didn't know existed.
                  Our team trust has improved dramatically."
                </p>
                <div>
                  <h4 className="font-semibold">Robert Kim</h4>
                  <p className="text-sm text-muted-foreground">VP of HR, FairForce</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/90 to-purple-700/90"></div>
        <div className="absolute inset-0 bg-grid-white/10 bg-[length:20px_20px] [mask-image:radial-gradient(white,transparent_85%)]"></div>
        <div className="container relative">
          <div className="max-w-3xl mx-auto text-center text-white">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">Ready to Transform Your Workflow?</h2>
            <p className="text-xl mb-8 text-white/80">
              Join the future of AI-powered project management and experience the JiraVision difference.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/signup">
                <Button size="lg" variant="secondary" className="rounded-full gap-2">
                  Sign Up Now <ArrowRight className="h-4 w-4" />
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

      {/* Footer */}
      <MainFooter />
    </div>
  )
}
