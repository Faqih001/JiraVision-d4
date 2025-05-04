import { MainNavbar } from "@/components/main-navbar"
import { MainFooter } from "@/components/main-footer"
import { Button } from "@/components/ui/button"
import { Check, ArrowRight, Trophy, Target, Award, Gamepad2, Star, Medal, Sparkles, Users } from "lucide-react"
import Link from "next/link"

export default function GamificationPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MainNavbar />

      <main className="flex-1">
        {/* Hero Section - Immersive Design */}
        <section className="relative py-24 md:py-32 overflow-hidden bg-black">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1511512578047-dfb367046420?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2000&q=80')] bg-cover bg-center opacity-20"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black"></div>
          <div className="container relative">
            <div className="max-w-3xl mx-auto text-center text-white">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/20 px-3 py-1 text-sm text-white/90 mb-4">
                <Gamepad2 className="h-4 w-4" />
                <span>Gamification Suite</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
                Make Work <span className="text-primary">Engaging</span>
              </h1>
              <p className="text-xl text-white/80 mb-8">
                Transform your team's experience with personalized motivation engines, skill trees, rewards, and visual
                storytelling.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/signup">
                  <Button size="lg" className="gap-2 rounded-full">
                    Try It Free <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="#features">
                  <Button
                    size="lg"
                    variant="outline"
                    className="rounded-full bg-transparent text-white border-white hover:bg-white/10"
                  >
                    Explore Features
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Floating Cards Section */}
        <section className="py-16 relative -mt-20">
          <div className="container">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-background rounded-xl p-6 shadow-xl border relative transform hover:-translate-y-2 transition-all duration-300">
                <div className="absolute -top-5 left-6 h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                  <Trophy className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-bold mb-2 mt-4">Achievement System</h3>
                <p className="text-muted-foreground">
                  Customizable badges, levels, and rewards that recognize team and individual accomplishments.
                </p>
              </div>

              <div className="bg-background rounded-xl p-6 shadow-xl border relative transform hover:-translate-y-2 transition-all duration-300">
                <div className="absolute -top-5 left-6 h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                  <Target className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-bold mb-2 mt-4">Skill Trees</h3>
                <p className="text-muted-foreground">
                  Visual progression paths that help team members develop new skills and track their growth.
                </p>
              </div>

              <div className="bg-background rounded-xl p-6 shadow-xl border relative transform hover:-translate-y-2 transition-all duration-300">
                <div className="absolute -top-5 left-6 h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                  <Award className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-bold mb-2 mt-4">Team Challenges</h3>
                <p className="text-muted-foreground">
                  Collaborative goals and friendly competition that foster teamwork and drive collective success.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section - Interactive Cards */}
        <section id="features" className="py-24 bg-muted/30">
          <div className="container">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary mb-4">
                <Sparkles className="h-4 w-4" />
                <span>Key Features</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-bold mb-4">Gamify Your Workflow</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Our Gamification Suite brings game mechanics to your workflow to boost motivation and engagement.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="relative">
                <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-primary to-purple-600 opacity-30 blur-xl"></div>
                <div className="relative h-[500px] w-full rounded-xl overflow-hidden border shadow-xl">
                  <img
                    src="https://images.unsplash.com/photo-1519389950473-47ba0277781c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2000&q=80"
                    alt="Gamification Dashboard"
                    className="object-cover w-full h-full"
                  />
                </div>
              </div>

              <div className="space-y-8">
                <div className="group bg-background rounded-xl p-6 shadow-md border hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                      <Trophy className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2">Achievement System</h3>
                      <p className="text-muted-foreground">
                        Customizable badges, levels, and rewards that recognize team and individual accomplishments.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="group bg-background rounded-xl p-6 shadow-md border hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                      <Target className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2">Skill Trees</h3>
                      <p className="text-muted-foreground">
                        Visual progression paths that help team members develop new skills and track their growth.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="group bg-background rounded-xl p-6 shadow-md border hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                      <Award className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2">Team Challenges</h3>
                      <p className="text-muted-foreground">
                        Collaborative goals and friendly competition that foster teamwork and drive collective success.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="group bg-background rounded-xl p-6 shadow-md border hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                      <Star className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2">Leaderboards & Rankings</h3>
                      <p className="text-muted-foreground">
                        Transparent performance metrics that celebrate achievements and inspire healthy competition.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Section - Modern Card Design */}
        <section className="py-24">
          <div className="container">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary mb-4">
                <Medal className="h-4 w-4" />
                <span>The Benefits</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-bold mb-4">Why Gamification Works</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Leverage the psychology of motivation to drive better team performance and satisfaction.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-background rounded-xl overflow-hidden shadow-md border group hover:shadow-xl transition-all duration-300">
                <div className="h-48 overflow-hidden">
                  <img
                    src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80"
                    alt="Increased Engagement"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-3">Increase Engagement by 35%</h3>
                  <p className="text-muted-foreground">
                    Teams using gamification show significantly higher engagement scores and participation rates.
                  </p>
                  <div className="mt-4 pt-4 border-t flex items-center gap-2 text-primary">
                    <Check className="h-5 w-5" />
                    <span className="text-sm font-medium">Proven Results</span>
                  </div>
                </div>
              </div>

              <div className="bg-background rounded-xl overflow-hidden shadow-md border group hover:shadow-xl transition-all duration-300">
                <div className="h-48 overflow-hidden">
                  <img
                    src="https://images.unsplash.com/photo-1531482615713-2afd69097998?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80"
                    alt="Skill Development"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-3">Accelerate Skill Development</h3>
                  <p className="text-muted-foreground">
                    Clear progression paths and immediate feedback help team members acquire new skills faster.
                  </p>
                  <div className="mt-4 pt-4 border-t flex items-center gap-2 text-primary">
                    <Check className="h-5 w-5" />
                    <span className="text-sm font-medium">Measurable Growth</span>
                  </div>
                </div>
              </div>

              <div className="bg-background rounded-xl overflow-hidden shadow-md border group hover:shadow-xl transition-all duration-300">
                <div className="h-48 overflow-hidden">
                  <img
                    src="https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80"
                    alt="Team Cohesion"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-3">Foster Team Cohesion</h3>
                  <p className="text-muted-foreground">
                    Collaborative challenges and shared goals strengthen team bonds and improve collaboration.
                  </p>
                  <div className="mt-4 pt-4 border-t flex items-center gap-2 text-primary">
                    <Check className="h-5 w-5" />
                    <span className="text-sm font-medium">Stronger Teams</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials Section - Modern Carousel Design */}
        <section className="py-24 bg-muted/30">
          <div className="container">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary mb-4">
                <Users className="h-4 w-4" />
                <span>Success Stories</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-bold mb-4">What Our Customers Say</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Hear from teams that have transformed their culture with JiraVision's Gamification Suite.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-background rounded-xl p-8 shadow-md border relative">
                <div className="absolute top-0 right-0 w-20 h-20 overflow-hidden">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-primary transform rotate-45 translate-x-1/2 -translate-y-1/2"></div>
                  <Trophy className="absolute top-2 right-2 h-5 w-5 text-primary-foreground z-10" />
                </div>
                <p className="italic text-muted-foreground mb-6">
                  "The achievement system has completely changed how our team approaches challenges. Everyone is more
                  motivated and excited about their work."
                </p>
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-gray-200 overflow-hidden">
                    <img
                      src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=200&q=80"
                      alt="Marcus Johnson"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div>
                    <h4 className="font-semibold">Marcus Johnson</h4>
                    <p className="text-sm text-muted-foreground">Engineering Lead, GameStack</p>
                  </div>
                </div>
              </div>

              <div className="bg-background rounded-xl p-8 shadow-md border relative">
                <div className="absolute top-0 right-0 w-20 h-20 overflow-hidden">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-primary transform rotate-45 translate-x-1/2 -translate-y-1/2"></div>
                  <Trophy className="absolute top-2 right-2 h-5 w-5 text-primary-foreground z-10" />
                </div>
                <p className="italic text-muted-foreground mb-6">
                  "The skill trees have made professional development tangible and exciting. Our team members are
                  actively seeking opportunities to learn and grow."
                </p>
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-gray-200 overflow-hidden">
                    <img
                      src="https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=200&q=80"
                      alt="Aisha Patel"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div>
                    <h4 className="font-semibold">Aisha Patel</h4>
                    <p className="text-sm text-muted-foreground">People Development, FutureLearn</p>
                  </div>
                </div>
              </div>

              <div className="bg-background rounded-xl p-8 shadow-md border relative">
                <div className="absolute top-0 right-0 w-20 h-20 overflow-hidden">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-primary transform rotate-45 translate-x-1/2 -translate-y-1/2"></div>
                  <Trophy className="absolute top-2 right-2 h-5 w-5 text-primary-foreground z-10" />
                </div>
                <p className="italic text-muted-foreground mb-6">
                  "Team challenges have brought our distributed team together in ways we never expected. There's a new
                  sense of camaraderie and shared purpose."
                </p>
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-gray-200 overflow-hidden">
                    <img
                      src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=200&q=80"
                      alt="Thomas Lee"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div>
                    <h4 className="font-semibold">Thomas Lee</h4>
                    <p className="text-sm text-muted-foreground">Director of Operations, RemoteFirst</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section - Game-Inspired Design */}
        <section className="py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1511512578047-dfb367046420?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2000&q=80')] bg-cover bg-center opacity-10"></div>
          <div className="absolute inset-0 bg-gradient-to-br from-primary/90 to-purple-700/90"></div>
          <div className="container relative">
            <div className="max-w-3xl mx-auto text-center text-white">
              <h2 className="text-3xl md:text-5xl font-bold mb-6">Ready to Make Work More Engaging?</h2>
              <p className="text-xl mb-8 text-white/80">
                Join thousands of teams already using JiraVision's Gamification Suite to boost motivation and
                performance.
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
