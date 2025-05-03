import { MainNavbar } from "@/components/main-navbar"
import { MainFooter } from "@/components/main-footer"
import { Button } from "@/components/ui/button"
import { Check, ArrowRight, Trophy, Target, Award } from "lucide-react"
import Link from "next/link"

export default function GamificationPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MainNavbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-20 md:py-28 container">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="flex flex-col gap-6">
              <div className="inline-block rounded-lg bg-primary/10 px-3 py-1 text-sm text-primary">
                Engagement Through Play
              </div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                Make Work <span className="text-primary">Engaging</span>
              </h1>
              <p className="text-xl text-muted-foreground">
                Transform your team's experience with personalized motivation engines, skill trees, rewards, and visual
                storytelling.
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
                alt="Gamification Dashboard"
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
                Our Gamification Suite brings game mechanics to your workflow to boost motivation and engagement.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-background rounded-lg p-6 shadow-sm border">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Trophy className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Achievement System</h3>
                <p className="text-muted-foreground">
                  Customizable badges, levels, and rewards that recognize team and individual accomplishments.
                </p>
              </div>

              <div className="bg-background rounded-lg p-6 shadow-sm border">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Target className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Skill Trees</h3>
                <p className="text-muted-foreground">
                  Visual progression paths that help team members develop new skills and track their growth.
                </p>
              </div>

              <div className="bg-background rounded-lg p-6 shadow-sm border">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Award className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Team Challenges</h3>
                <p className="text-muted-foreground">
                  Collaborative goals and friendly competition that foster teamwork and drive collective success.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-20">
          <div className="container">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Gamification Works</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Leverage the psychology of motivation to drive better team performance and satisfaction.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                    <Check className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Increase Engagement by 35%</h3>
                    <p className="text-muted-foreground">
                      Teams using gamification show significantly higher engagement scores and participation rates.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                    <Check className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Accelerate Skill Development</h3>
                    <p className="text-muted-foreground">
                      Clear progression paths and immediate feedback help team members acquire new skills faster.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                    <Check className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Foster Team Cohesion</h3>
                    <p className="text-muted-foreground">
                      Collaborative challenges and shared goals strengthen team bonds and improve collaboration.
                    </p>
                  </div>
                </div>
              </div>

              <div className="relative h-[400px] w-full rounded-lg overflow-hidden">
                <img
                  src="/placeholder.svg?height=400&width=600"
                  alt="Gamification Benefits"
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
                Hear from teams that have transformed their culture with JiraVision's Gamification Suite.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-background p-6 rounded-lg shadow-sm border">
                <p className="italic text-muted-foreground mb-4">
                  "The achievement system has completely changed how our team approaches challenges. Everyone is more
                  motivated and excited about their work."
                </p>
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-gray-200 overflow-hidden">
                    <img
                      src="/placeholder.svg?height=48&width=48"
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

              <div className="bg-background p-6 rounded-lg shadow-sm border">
                <p className="italic text-muted-foreground mb-4">
                  "The skill trees have made professional development tangible and exciting. Our team members are
                  actively seeking opportunities to learn and grow."
                </p>
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-gray-200 overflow-hidden">
                    <img
                      src="/placeholder.svg?height=48&width=48"
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

              <div className="bg-background p-6 rounded-lg shadow-sm border">
                <p className="italic text-muted-foreground mb-4">
                  "Team challenges have brought our distributed team together in ways we never expected. There's a new
                  sense of camaraderie and shared purpose."
                </p>
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-gray-200 overflow-hidden">
                    <img
                      src="/placeholder.svg?height=48&width=48"
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

        {/* CTA Section */}
        <section className="py-20 bg-primary text-primary-foreground">
          <div className="container text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Make Work More Engaging?</h2>
            <p className="text-xl max-w-2xl mx-auto mb-8 text-primary-foreground/80">
              Join thousands of teams already using JiraVision's Gamification Suite to boost motivation and performance.
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
