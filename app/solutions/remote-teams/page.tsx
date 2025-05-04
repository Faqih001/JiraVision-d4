import { MainNavbar } from "@/components/main-navbar"
import { MainFooter } from "@/components/main-footer"
import { Button } from "@/components/ui/button"
import {
  ArrowRight,
  CheckCircle2,
  Globe,
  Users,
  Clock,
  BarChart,
  MessageSquare,
  Shield,
  LineChart,
  Award,
  ChevronRight,
  Video,
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export default function RemoteTeamsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MainNavbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-16 md:py-24 bg-gradient-to-b from-slate-50 to-white relative overflow-hidden">
          <div className="absolute inset-0 bg-grid-slate-200 [mask-image:radial-gradient(ellipse_at_center,white,transparent_70%)]"></div>
          <div className="container relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary mb-6">
                  <Globe className="h-4 w-4" />
                  <span>For Remote Teams</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-bold mb-4">Empower Your Distributed Team to Thrive</h1>
                <p className="text-xl text-muted-foreground mb-8">
                  Bridge the distance gap with powerful collaboration tools designed specifically for remote and hybrid
                  teams.
                </p>
                <div className="flex flex-wrap gap-4">
                  <Button size="lg" asChild>
                    <Link href="/signup">Start Free Trial</Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild>
                    <Link href="/contact">Schedule Demo</Link>
                  </Button>
                </div>
              </div>
              <div className="relative h-[400px] rounded-xl overflow-hidden shadow-xl">
                <Image
                  src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?q=80&w=2070&auto=format&fit=crop"
                  alt="Remote team collaborating"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Key Benefits */}
        <section className="py-16 bg-white">
          <div className="container">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4">Remote Work Challenges, Solved</h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                JiraVision addresses the unique challenges faced by distributed teams with purpose-built features
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                {
                  icon: <Clock className="h-10 w-10 text-primary" />,
                  title: "Asynchronous Collaboration",
                  description:
                    "Work effectively across time zones with tools designed for async communication and handoffs.",
                },
                {
                  icon: <Users className="h-10 w-10 text-primary" />,
                  title: "Team Cohesion",
                  description:
                    "Build strong team connections despite physical distance with virtual team-building activities.",
                },
                {
                  icon: <BarChart className="h-10 w-10 text-primary" />,
                  title: "Visibility & Transparency",
                  description:
                    "Maintain clear visibility into project progress, team workloads, and individual contributions.",
                },
                {
                  icon: <MessageSquare className="h-10 w-10 text-primary" />,
                  title: "Effective Communication",
                  description:
                    "Reduce miscommunication with structured channels for different types of team interactions.",
                },
                {
                  icon: <Shield className="h-10 w-10 text-primary" />,
                  title: "Work-Life Balance",
                  description: "Protect team wellbeing with tools that respect working hours and prevent burnout.",
                },
                {
                  icon: <LineChart className="h-10 w-10 text-primary" />,
                  title: "Performance Tracking",
                  description: "Measure productivity and outcomes fairly, not hours logged or activity metrics.",
                },
              ].map((benefit, i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                    {benefit.icon}
                  </div>
                  <h3 className="text-xl font-bold mb-2">{benefit.title}</h3>
                  <p className="text-muted-foreground">{benefit.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Feature Highlight */}
        <section className="py-16 bg-slate-50">
          <div className="container">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="order-2 lg:order-1">
                <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-sm text-amber-700 mb-6">
                  <Award className="h-4 w-4" />
                  <span>Featured Solution</span>
                </div>
                <h2 className="text-3xl font-bold mb-4">Team Wellbeing for Remote Workers</h2>
                <p className="text-lg text-muted-foreground mb-6">
                  Our Team Wellbeing module helps remote teams stay connected, engaged, and mentally healthy while
                  working from anywhere in the world.
                </p>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-6 w-6 text-green-500 mt-0.5 shrink-0" />
                    <div>
                      <h4 className="font-semibold">Burnout Prevention</h4>
                      <p className="text-muted-foreground">
                        AI-powered alerts identify potential burnout before it happens
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-6 w-6 text-green-500 mt-0.5 shrink-0" />
                    <div>
                      <h4 className="font-semibold">Virtual Team Building</h4>
                      <p className="text-muted-foreground">
                        Automated activities that strengthen team bonds across distances
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-6 w-6 text-green-500 mt-0.5 shrink-0" />
                    <div>
                      <h4 className="font-semibold">Work-Life Balance Tools</h4>
                      <p className="text-muted-foreground">Features that respect time zones and working hours</p>
                    </div>
                  </li>
                </ul>
                <Button asChild>
                  <Link href="/products/team-wellbeing" className="flex items-center gap-2">
                    Learn More <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <div className="order-1 lg:order-2 relative h-[400px] rounded-xl overflow-hidden shadow-lg">
                <Image
                  src="https://images.unsplash.com/photo-1573497620053-ea5300f94f21?q=80&w=2070&auto=format&fit=crop"
                  alt="Team Wellbeing for Remote Workers"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-16 bg-white">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Trusted by Remote Teams Worldwide</h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                See how distributed teams are thriving with JiraVision
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                {
                  quote:
                    "JiraVision has been a game-changer for our fully remote team. The asynchronous collaboration features have made working across 6 time zones seamless.",
                  author: "Alex Rivera",
                  role: "Engineering Manager",
                  company: "GlobalTech Solutions",
                  image: "/placeholder.svg?height=64&width=64&text=AR",
                },
                {
                  quote:
                    "The Team Wellbeing module helped us identify and address burnout before it became a problem. Our team satisfaction scores have increased by 40%.",
                  author: "Priya Sharma",
                  role: "Head of People",
                  company: "RemoteFirst Inc.",
                  image: "/placeholder.svg?height=64&width=64&text=PS",
                },
                {
                  quote:
                    "As a company with employees in 12 countries, JiraVision's cultural sensitivity features and time zone management tools have been invaluable.",
                  author: "Thomas Müller",
                  role: "COO",
                  company: "WorldWide Developers",
                  image: "/placeholder.svg?height=64&width=64&text=TM",
                },
              ].map((testimonial, i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col h-full">
                    <div className="mb-6 flex-grow">
                      <p className="italic text-muted-foreground">"{testimonial.quote}"</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 relative rounded-full overflow-hidden">
                        <Image
                          src={testimonial.image || "/placeholder.svg"}
                          alt={testimonial.author}
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      </div>
                      <div>
                        <p className="font-semibold">{testimonial.author}</p>
                        <p className="text-sm text-muted-foreground">
                          {testimonial.role}, {testimonial.company}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12 text-center">
              <Button variant="outline" asChild>
                <Link href="/resources/case-studies" className="flex items-center gap-2">
                  View All Case Studies <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Remote-Specific Features */}
        <section className="py-16 bg-slate-50">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Remote-First Features</h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Tools designed specifically for the unique needs of distributed teams
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[
                {
                  title: "Time Zone Intelligence",
                  description:
                    "Smart scheduling that respects working hours across time zones and suggests optimal meeting times for global teams.",
                  image:
                    "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?q=80&w=2068&auto=format&fit=crop",
                },
                {
                  title: "Virtual Standups",
                  description:
                    "Asynchronous daily standups that keep everyone informed without requiring simultaneous presence.",
                  image:
                    "https://images.unsplash.com/photo-1600880292089-90a7e086ee0c?q=80&w=2070&auto=format&fit=crop",
                },
                {
                  title: "Digital Watercooler",
                  description:
                    "Create casual interaction opportunities that foster team bonding and combat isolation in remote settings.",
                  image: "https://images.unsplash.com/photo-1543269865-cbf427effbad?q=80&w=2070&auto=format&fit=crop",
                },
                {
                  title: "Remote Onboarding",
                  description:
                    "Structured onboarding processes designed to integrate new team members effectively in a remote environment.",
                  image:
                    "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=2070&auto=format&fit=crop",
                },
              ].map((feature, i) => (
                <div
                  key={i}
                  className="group bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200 hover:shadow-md transition-shadow"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2">
                    <div className="h-full min-h-[200px] relative">
                      <Image
                        src={feature.image || "/placeholder.svg"}
                        alt={feature.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                      />
                    </div>
                    <div className="p-6 flex flex-col justify-center">
                      <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
                        {feature.title}
                      </h3>
                      <p className="text-muted-foreground mb-4">{feature.description}</p>
                      <Link
                        href={`/features/${feature.title.toLowerCase().replace(/\s+/g, "-")}`}
                        className="text-primary hover:underline flex items-center gap-1 text-sm"
                      >
                        Learn more <ChevronRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Remote Work Resources */}
        <section className="py-16 bg-white">
          <div className="container">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary mb-4">
                <Video className="h-4 w-4" />
                <span>Resources</span>
              </div>
              <h2 className="text-3xl font-bold mb-4">Remote Work Resources</h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Expert insights and best practices for remote team success
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  title: "Building a Strong Remote Culture",
                  description: "Learn strategies for fostering connection and shared values in distributed teams.",
                  image:
                    "https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=2070&auto=format&fit=crop",
                  type: "Webinar",
                  duration: "45 min",
                },
                {
                  title: "Remote Team Communication Playbook",
                  description: "A comprehensive guide to effective communication across time zones and cultures.",
                  image:
                    "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=2070&auto=format&fit=crop",
                  type: "Guide",
                  duration: "15 min read",
                },
                {
                  title: "Preventing Remote Work Burnout",
                  description: "Practical strategies for maintaining team wellbeing in a distributed environment.",
                  image:
                    "https://images.unsplash.com/photo-1573497620053-ea5300f94f21?q=80&w=2070&auto=format&fit=crop",
                  type: "Case Study",
                  duration: "10 min read",
                },
              ].map((resource, i) => (
                <div
                  key={i}
                  className="group bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200 hover:shadow-md transition-shadow"
                >
                  <div className="h-48 relative overflow-hidden">
                    <Image
                      src={resource.image || "/placeholder.svg"}
                      alt={resource.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                    <div className="absolute bottom-4 left-4 right-4 text-white">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm rounded-full px-2 py-0.5">
                          <span>{resource.type}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{resource.duration}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
                      {resource.title}
                    </h3>
                    <p className="text-muted-foreground mb-4">{resource.description}</p>
                    <Link
                      href={`/resources/${resource.type.toLowerCase()}s/${resource.title.toLowerCase().replace(/\s+/g, "-")}`}
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      Access resource <ChevronRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12 text-center">
              <Button variant="outline" asChild>
                <Link href="/resources" className="flex items-center gap-2">
                  View All Resources <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Pricing for Remote Teams */}
        <section className="py-16 bg-slate-50">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Flexible Pricing for Remote Teams</h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Scalable plans that grow with your distributed team
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {[
                {
                  name: "Starter",
                  price: "$29",
                  description: "Perfect for small remote teams",
                  features: [
                    "Up to 10 team members",
                    "Basic time zone management",
                    "Asynchronous standups",
                    "Team directory",
                    "Email support",
                  ],
                  cta: "Get Started",
                  popular: false,
                },
                {
                  name: "Professional",
                  price: "$79",
                  description: "Ideal for growing distributed teams",
                  features: [
                    "Up to 50 team members",
                    "Advanced time zone intelligence",
                    "Virtual team building tools",
                    "Wellbeing monitoring",
                    "Remote onboarding toolkit",
                    "Priority support",
                  ],
                  cta: "Get Started",
                  popular: true,
                },
                {
                  name: "Enterprise",
                  price: "Custom",
                  description: "For large global organizations",
                  features: [
                    "Unlimited team members",
                    "Custom integrations",
                    "Advanced analytics",
                    "Dedicated success manager",
                    "Custom training programs",
                    "24/7 premium support",
                    "Enterprise-grade security",
                  ],
                  cta: "Contact Sales",
                  popular: false,
                },
              ].map((plan, i) => (
                <div
                  key={i}
                  className={`bg-white rounded-xl p-8 border ${plan.popular ? "border-primary shadow-lg" : "border-slate-200 shadow-sm"} relative`}
                >
                  {plan.popular && (
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                      <div className="bg-primary text-white text-xs font-semibold px-3 py-1 rounded-full">
                        Most Popular
                      </div>
                    </div>
                  )}
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                    <div className="flex items-end justify-center gap-1 mb-2">
                      <span className="text-4xl font-bold">{plan.price}</span>
                      {plan.price !== "Custom" && <span className="text-muted-foreground">/month</span>}
                    </div>
                    <p className="text-sm text-muted-foreground">{plan.description}</p>
                  </div>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, j) => (
                      <li key={j} className="flex items-start gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className={`w-full ${plan.popular ? "" : "bg-white text-primary border-primary hover:bg-primary/10"}`}
                    variant={plan.popular ? "default" : "outline"}
                    asChild
                  >
                    <Link href={plan.cta === "Contact Sales" ? "/contact" : "/signup"}>{plan.cta}</Link>
                  </Button>
                </div>
              ))}
            </div>

            <div className="mt-12 text-center">
              <p className="text-muted-foreground mb-4">Need a custom solution for your global team?</p>
              <Button variant="outline" asChild>
                <Link href="/contact">Contact Our Sales Team</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-r from-primary/90 to-primary relative overflow-hidden">
          <div className="absolute inset-0 bg-grid-white/10 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]"></div>
          <div className="container relative z-10">
            <div className="max-w-3xl mx-auto text-center text-white">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to empower your remote team?</h2>
              <p className="text-white/80 text-lg mb-8">
                Join thousands of distributed teams that use JiraVision to collaborate effectively across time zones and
                borders.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Button size="lg" variant="secondary" asChild>
                  <Link href="/signup">Start Free Trial</Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="bg-transparent text-white border-white hover:bg-white/10"
                  asChild
                >
                  <Link href="/contact">Schedule Demo</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <MainFooter />
    </div>
  )
}
