import { MainNavbar } from "@/components/main-navbar"
import { MainFooter } from "@/components/main-footer"
import { Button } from "@/components/ui/button"
import { ArrowRight, Users, Building, Heart, Award, Lightbulb, Target } from "lucide-react"
import Link from "next/link"

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MainNavbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-24 md:py-32 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/10"></div>
          <div className="absolute inset-0 bg-grid-white/10 bg-[length:20px_20px] [mask-image:radial-gradient(white,transparent_85%)]"></div>
          <div className="container relative">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary mb-4">
                <Building className="h-4 w-4" />
                <span>Our Story</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
                Transforming Work with <span className="text-primary">Empathy & AI</span>
              </h1>
              <p className="text-xl text-muted-foreground mb-8">
                We're on a mission to create more humane, ethical, and effective project management tools that put
                people first.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/contact">
                  <Button size="lg" className="gap-2 rounded-full">
                    Get in Touch <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/careers">
                  <Button size="lg" variant="outline" className="rounded-full">
                    Join Our Team
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Our Story Section */}
        <section className="py-24">
          <div className="container">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
              <div className="relative order-2 md:order-1">
                <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-primary to-purple-600 opacity-30 blur-xl"></div>
                <div className="relative h-[500px] w-full rounded-xl overflow-hidden border shadow-xl">
                  <img
                    src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2000&q=80"
                    alt="JiraVision Team"
                    className="object-cover w-full h-full"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-8 order-1 md:order-2">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary mb-4">
                    <Lightbulb className="h-4 w-4" />
                    <span>Our Beginning</span>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold mb-6">How JiraVision Started</h2>
                  <p className="text-lg text-muted-foreground mb-4">
                    JiraVision was born from a simple observation: traditional project management tools were focused on
                    tasks and timelines, not the humans doing the work.
                  </p>
                  <p className="text-lg text-muted-foreground mb-4">
                    Our founders, a team of engineers and psychologists, set out to create a platform that would bring
                    emotional intelligence, ethical governance, and human-centered design to project management.
                  </p>
                  <p className="text-lg text-muted-foreground">
                    Since our founding in 2020, we've grown from a small startup to a global company serving thousands
                    of teams across the world.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="py-24 bg-muted/30">
          <div className="container">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary mb-4">
                <Heart className="h-4 w-4" />
                <span>Our Values</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-bold mb-4">What We Stand For</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Our core values guide everything we do, from product development to customer support.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-background rounded-xl p-8 shadow-md border relative overflow-hidden group hover:shadow-xl transition-all duration-300">
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-bl-full transform translate-x-1/2 -translate-y-1/2 group-hover:bg-primary/20 transition-colors"></div>
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                  <Heart className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3">People First</h3>
                <p className="text-muted-foreground">
                  We believe that technology should serve people, not the other way around. We design our products with
                  human needs and wellbeing at the center.
                </p>
              </div>

              <div className="bg-background rounded-xl p-8 shadow-md border relative overflow-hidden group hover:shadow-xl transition-all duration-300">
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-bl-full transform translate-x-1/2 -translate-y-1/2 group-hover:bg-primary/20 transition-colors"></div>
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                  <Award className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3">Ethical Excellence</h3>
                <p className="text-muted-foreground">
                  We're committed to building products that promote fairness, diversity, and ethical governance in the
                  workplace.
                </p>
              </div>

              <div className="bg-background rounded-xl p-8 shadow-md border relative overflow-hidden group hover:shadow-xl transition-all duration-300">
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-bl-full transform translate-x-1/2 -translate-y-1/2 group-hover:bg-primary/20 transition-colors"></div>
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                  <Target className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3">Continuous Innovation</h3>
                <p className="text-muted-foreground">
                  We're constantly pushing the boundaries of what's possible with AI and human-centered design to create
                  better ways of working.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Team Section */}
        <section className="py-24">
          <div className="container">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary mb-4">
                <Users className="h-4 w-4" />
                <span>Our Team</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-bold mb-4">Meet the People Behind JiraVision</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                We're a diverse team of engineers, designers, psychologists, and business leaders united by a common
                mission.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="bg-background rounded-xl overflow-hidden shadow-md border group hover:shadow-xl transition-all duration-300">
                <div className="h-64 overflow-hidden">
                  <img
                    src="https://images.unsplash.com/photo-1560250097-0b93528c311a?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80"
                    alt="Michael Chen"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-1">Michael Chen</h3>
                  <p className="text-primary mb-3">Co-Founder & CEO</p>
                  <p className="text-muted-foreground text-sm">
                    Former Google engineer with a passion for ethical AI and human-centered design.
                  </p>
                </div>
              </div>

              <div className="bg-background rounded-xl overflow-hidden shadow-md border group hover:shadow-xl transition-all duration-300">
                <div className="h-64 overflow-hidden">
                  <img
                    src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80"
                    alt="Sarah Johnson"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-1">Sarah Johnson</h3>
                  <p className="text-primary mb-3">Co-Founder & CTO</p>
                  <p className="text-muted-foreground text-sm">
                    AI researcher and engineer with a background in organizational psychology.
                  </p>
                </div>
              </div>

              <div className="bg-background rounded-xl overflow-hidden shadow-md border group hover:shadow-xl transition-all duration-300">
                <div className="h-64 overflow-hidden">
                  <img
                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80"
                    alt="David Rodriguez"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-1">David Rodriguez</h3>
                  <p className="text-primary mb-3">Chief Product Officer</p>
                  <p className="text-muted-foreground text-sm">
                    Product leader with experience at Atlassian and Microsoft, focused on user experience.
                  </p>
                </div>
              </div>

              <div className="bg-background rounded-xl overflow-hidden shadow-md border group hover:shadow-xl transition-all duration-300">
                <div className="h-64 overflow-hidden">
                  <img
                    src="https://images.unsplash.com/photo-1580489944761-15a19d654956?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80"
                    alt="Aisha Patel"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-1">Aisha Patel</h3>
                  <p className="text-primary mb-3">VP of Customer Success</p>
                  <p className="text-muted-foreground text-sm">
                    Customer experience expert dedicated to helping teams get the most out of JiraVision.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-24 bg-muted/30">
          <div className="container">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="bg-background rounded-xl p-8 shadow-md border text-center">
                <p className="text-4xl font-bold text-primary mb-2">5,000+</p>
                <p className="text-muted-foreground">Teams Using JiraVision</p>
              </div>

              <div className="bg-background rounded-xl p-8 shadow-md border text-center">
                <p className="text-4xl font-bold text-primary mb-2">50+</p>
                <p className="text-muted-foreground">Countries Worldwide</p>
              </div>

              <div className="bg-background rounded-xl p-8 shadow-md border text-center">
                <p className="text-4xl font-bold text-primary mb-2">100+</p>
                <p className="text-muted-foreground">Team Members</p>
              </div>

              <div className="bg-background rounded-xl p-8 shadow-md border text-center">
                <p className="text-4xl font-bold text-primary mb-2">$25M</p>
                <p className="text-muted-foreground">Venture Funding</p>
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
              <h2 className="text-3xl md:text-5xl font-bold mb-6">Join Us on Our Mission</h2>
              <p className="text-xl mb-8 text-white/80">
                Whether you're looking to use our products, join our team, or partner with us, we'd love to hear from
                you.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/contact">
                  <Button size="lg" variant="secondary" className="rounded-full">
                    Contact Us
                  </Button>
                </Link>
                <Link href="/careers">
                  <Button
                    size="lg"
                    variant="outline"
                    className="rounded-full bg-transparent text-white border-white hover:bg-white/10"
                  >
                    View Open Positions
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
