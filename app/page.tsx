import { MainNavbar } from "@/components/main-navbar"
import { MainFooter } from "@/components/main-footer"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, BarChart3, Brain, Gamepad2, Heart, Shield } from "lucide-react"

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <MainNavbar />

      {/* Hero Section */}
      <section className="py-20 md:py-28 container">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="flex flex-col gap-6">
            <div className="inline-block rounded-lg bg-primary/10 px-3 py-1 text-sm text-primary">
              AI-Native Project Management
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
              The Future of Work is <span className="text-primary">Intelligent</span>
            </h1>
            <p className="text-xl text-muted-foreground">
              JiraVision transforms project management with AI Scrum Masters, emotional intelligence, gamification, and
              ethical governance.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mt-4">
              <Link href="/signup">
                <Button size="lg" className="gap-2">
                  Get Started <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="#features">
                <Button size="lg" variant="outline">
                  Explore Features
                </Button>
              </Link>
            </div>
          </div>
          <div className="relative h-[400px] w-full rounded-lg overflow-hidden">
            <img
              src="/placeholder.svg?height=400&width=600"
              alt="JiraVision Dashboard Preview"
              className="object-cover w-full h-full"
            />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-muted/50">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Core Innovations</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              JiraVision combines cutting-edge AI with human-centered design to create a revolutionary project
              management experience.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Feature 1 */}
            <div className="bg-background rounded-lg p-6 shadow-sm border">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Brain className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2">AI Scrum Masters</h3>
              <p className="text-muted-foreground">
                Self-managed sprints and planning with AI that understands your team's capacity and goals.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-background rounded-lg p-6 shadow-sm border">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Heart className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2">Emotional Intelligence</h3>
              <p className="text-muted-foreground">
                Mood-aware workload assignment that prevents burnout and optimizes for wellbeing.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-background rounded-lg p-6 shadow-sm border">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Gamepad2 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2">Gamified Experience</h3>
              <p className="text-muted-foreground">
                Personalized motivation engines with skill trees, rewards, and visual storytelling.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-background rounded-lg p-6 shadow-sm border">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2">Ethical Governance</h3>
              <p className="text-muted-foreground">
                Real-time DEI, workload, and pay equity enforcement for fair and balanced teams.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-20">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="relative h-[400px] w-full rounded-lg overflow-hidden">
              <img
                src="/placeholder.svg?height=400&width=600"
                alt="JiraVision Benefits"
                className="object-cover w-full h-full"
              />
            </div>
            <div className="flex flex-col gap-6">
              <h2 className="text-3xl md:text-4xl font-bold">Business Value</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center mt-1">
                    <BarChart3 className="h-3 w-3 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-medium">Increased Productivity</h3>
                  </div>
                  <div>
                    <p className="text-muted-foreground">
                      Saves ~5 hours/week per developer with AI-powered workflows.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center mt-1">
                    <Heart className="h-3 w-3 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium">Reduced Burnout</h3>
                    <p className="text-muted-foreground">
                      Decreases burnout risk by 40% through emotional intelligence.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-purple-100 flex items-center justify-center mt-1">
                    <Shield className="h-3 w-3 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-medium">Ethical Compliance</h3>
                    <p className="text-muted-foreground">Monitors for 100% pay equity and ethical compliance.</p>
                  </div>
                </div>
              </div>
              <Link href="/signup">
                <Button className="w-fit mt-4">Get Started Today</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section id="demo" className="py-20 bg-muted/50">
        <div className="container text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Experience JiraVision</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            See how JiraVision transforms your workflow with AI-powered insights and gamified experiences.
          </p>
          <div className="aspect-video max-w-4xl mx-auto rounded-lg overflow-hidden border bg-background">
            <img
              src="/placeholder.svg?height=600&width=1000"
              alt="JiraVision Demo Video"
              className="w-full h-full object-cover"
            />
          </div>
          <Link href="/signup">
            <Button size="lg" className="mt-8">
              Try JiraVision Today
            </Button>
          </Link>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Transform Your Workflow?</h2>
          <p className="text-xl max-w-2xl mx-auto mb-8 text-primary-foreground/80">
            Join the future of AI-powered project management and experience the JiraVision difference.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup">
              <Button size="lg" variant="secondary">
                Sign Up Now
              </Button>
            </Link>
            <Link href="/login">
              <Button
                size="lg"
                variant="outline"
                className="bg-transparent text-primary-foreground border-primary-foreground hover:bg-primary-foreground/10"
              >
                Login to Your Account
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <MainFooter />
    </div>
  )
}
