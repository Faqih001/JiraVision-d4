import { MainNavbar } from "@/components/main-navbar"
import { MainFooter } from "@/components/main-footer"
import { Button } from "@/components/ui/button"
import {
  ArrowRight,
  CheckCircle2,
  Building2,
  Users,
  Clock,
  BarChart,
  Zap,
  Shield,
  LineChart,
  Award,
  ChevronRight,
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export default function AgenciesPage() {
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
                  <Building2 className="h-4 w-4" />
                  <span>For Agencies</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-bold mb-4">Supercharge Your Agency's Development Workflow</h1>
                <p className="text-xl text-muted-foreground mb-8">
                  Streamline project management, boost team productivity, and deliver exceptional results to your
                  clients with JiraVision's agency-focused solutions.
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
                  alt="Agency team collaborating"
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
              <h2 className="text-3xl font-bold mb-4">Why Agencies Choose JiraVision</h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Purpose-built features that address the unique challenges of creative and development agencies
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                {
                  icon: <Clock className="h-10 w-10 text-primary" />,
                  title: "Streamlined Project Management",
                  description:
                    "Manage multiple client projects simultaneously with customizable workflows and automated task assignments.",
                },
                {
                  icon: <Users className="h-10 w-10 text-primary" />,
                  title: "Team Collaboration",
                  description:
                    "Foster seamless collaboration between designers, developers, and project managers with integrated communication tools.",
                },
                {
                  icon: <BarChart className="h-10 w-10 text-primary" />,
                  title: "Client Reporting",
                  description:
                    "Generate professional, customizable reports to showcase progress and results to your clients.",
                },
                {
                  icon: <Zap className="h-10 w-10 text-primary" />,
                  title: "Resource Optimization",
                  description:
                    "Allocate team resources efficiently across projects to maximize productivity and prevent burnout.",
                },
                {
                  icon: <Shield className="h-10 w-10 text-primary" />,
                  title: "Client Portal",
                  description:
                    "Provide clients with secure access to project updates, approvals, and deliverables in real-time.",
                },
                {
                  icon: <LineChart className="h-10 w-10 text-primary" />,
                  title: "Profitability Tracking",
                  description:
                    "Monitor project budgets, time tracking, and profitability metrics to optimize your agency's operations.",
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
                <h2 className="text-3xl font-bold mb-4">AI-Powered Client Management</h2>
                <p className="text-lg text-muted-foreground mb-6">
                  Our AI Scrum Master helps agencies manage client expectations, automate routine communications, and
                  predict potential bottlenecks before they impact your timeline.
                </p>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-6 w-6 text-green-500 mt-0.5 shrink-0" />
                    <div>
                      <h4 className="font-semibold">Automated Client Updates</h4>
                      <p className="text-muted-foreground">
                        Schedule and send personalized progress reports to clients without manual effort
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-6 w-6 text-green-500 mt-0.5 shrink-0" />
                    <div>
                      <h4 className="font-semibold">Smart Deadline Predictions</h4>
                      <p className="text-muted-foreground">
                        AI analyzes team velocity and project complexity to forecast realistic timelines
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-6 w-6 text-green-500 mt-0.5 shrink-0" />
                    <div>
                      <h4 className="font-semibold">Risk Identification</h4>
                      <p className="text-muted-foreground">
                        Proactively identify potential issues before they impact client satisfaction
                      </p>
                    </div>
                  </li>
                </ul>
                <Button asChild>
                  <Link href="/products/ai-scrum-master" className="flex items-center gap-2">
                    Learn More <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <div className="order-1 lg:order-2 relative h-[400px] rounded-xl overflow-hidden shadow-lg">
                <Image
                  src="https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=2070&auto=format&fit=crop"
                  alt="AI-Powered Client Management"
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
              <h2 className="text-3xl font-bold mb-4">Trusted by Leading Agencies</h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                See how agencies around the world are transforming their workflows with JiraVision
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                {
                  quote:
                    "JiraVision has completely transformed how we manage client projects. We've reduced our project management overhead by 40% while delivering better results to our clients.",
                  author: "Sarah Johnson",
                  role: "Director of Operations",
                  company: "DigitalCraft Agency",
                  image: "/placeholder.svg?height=64&width=64&text=SJ",
                },
                {
                  quote:
                    "The client reporting features alone have saved us countless hours each month. Our clients love the transparency, and we love the automation.",
                  author: "Michael Chen",
                  role: "CEO",
                  company: "Pixel Perfect Design",
                  image: "/placeholder.svg?height=64&width=64&text=MC",
                },
                {
                  quote:
                    "As we've grown from 5 to 50 people, JiraVision has scaled perfectly with us. The resource allocation features ensure our team stays productive without burning out.",
                  author: "Emily Rodriguez",
                  role: "Head of Project Management",
                  company: "Webflow Masters",
                  image: "/placeholder.svg?height=64&width=64&text=ER",
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

        {/* Agency-Specific Features */}
        <section className="py-16 bg-slate-50">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Agency-Specific Features</h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Tailored solutions designed specifically for the unique needs of creative and development agencies
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[
                {
                  title: "Multi-Client Dashboard",
                  description:
                    "Get a bird's-eye view of all your client projects in one centralized dashboard with customizable views and filters.",
                  image:
                    "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2015&auto=format&fit=crop",
                },
                {
                  title: "Time Tracking & Billing",
                  description:
                    "Track billable hours across projects and team members, and generate accurate invoices with minimal administrative effort.",
                  image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?q=80&w=2011&auto=format&fit=crop",
                },
                {
                  title: "Client Approval Workflows",
                  description:
                    "Streamline the client approval process with customizable workflows, automated reminders, and version tracking.",
                  image:
                    "https://images.unsplash.com/photo-1600880292089-90a7e086ee0c?q=80&w=2070&auto=format&fit=crop",
                },
                {
                  title: "Resource Allocation",
                  description:
                    "Optimize team workloads across multiple projects with visual capacity planning and skill-based assignment.",
                  image:
                    "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=2070&auto=format&fit=crop",
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

        {/* Pricing for Agencies */}
        <section className="py-16 bg-white">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Flexible Pricing for Agencies</h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Scalable plans that grow with your agency, from boutique studios to large creative firms
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {[
                {
                  name: "Startup",
                  price: "$49",
                  description: "Perfect for small agencies just getting started",
                  features: [
                    "Up to 10 team members",
                    "5 active client projects",
                    "Basic reporting",
                    "Client portal",
                    "Email support",
                  ],
                  cta: "Get Started",
                  popular: false,
                },
                {
                  name: "Professional",
                  price: "$99",
                  description: "Ideal for growing agencies with multiple clients",
                  features: [
                    "Up to 25 team members",
                    "Unlimited client projects",
                    "Advanced reporting & analytics",
                    "Custom client portals",
                    "Time tracking & billing",
                    "Priority support",
                  ],
                  cta: "Get Started",
                  popular: true,
                },
                {
                  name: "Enterprise",
                  price: "Custom",
                  description: "Tailored solutions for large agencies with complex needs",
                  features: [
                    "Unlimited team members",
                    "Unlimited client projects",
                    "Custom integrations",
                    "Dedicated account manager",
                    "White-labeling options",
                    "24/7 premium support",
                    "On-premise deployment option",
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
              <p className="text-muted-foreground mb-4">Need a custom solution for your agency?</p>
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
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to transform your agency's workflow?</h2>
              <p className="text-white/80 text-lg mb-8">
                Join hundreds of agencies that use JiraVision to deliver exceptional results to their clients while
                growing their business.
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
