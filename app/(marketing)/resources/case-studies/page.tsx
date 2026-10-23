import { MainNavbar } from "@/components/main-navbar"
import { MainFooter } from "@/components/main-footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Search,
  ArrowRight,
  ChevronRight,
  Building2,
  Users,
  Clock,
  BarChart,
  CheckCircle2,
  Filter,
  ChevronDown,
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export default function CaseStudiesPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MainNavbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-16 bg-gradient-to-b from-slate-50 to-white relative overflow-hidden">
          <div className="absolute inset-0 bg-grid-slate-200 [mask-image:radial-gradient(ellipse_at_center,white,transparent_70%)]"></div>
          <div className="container relative z-10">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary mb-6">
                <Building2 className="h-4 w-4" />
                <span>Success Stories</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">Customer Case Studies</h1>
              <p className="text-xl text-muted-foreground mb-8">
                Discover how organizations of all sizes use JiraVision to transform their development process
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
                  <Input type="search" placeholder="Search case studies..." className="pl-10 rounded-full" />
                </div>
                <Button variant="outline" className="flex items-center gap-2 rounded-full">
                  <Filter className="h-4 w-4" />
                  <span>Filter</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex flex-wrap justify-center gap-3">
                <Button variant="outline" className="rounded-full" size="sm">
                  All Industries
                </Button>
                <Button variant="outline" className="rounded-full" size="sm">
                  Technology
                </Button>
                <Button variant="outline" className="rounded-full" size="sm">
                  Finance
                </Button>
                <Button variant="outline" className="rounded-full" size="sm">
                  Healthcare
                </Button>
                <Button variant="outline" className="rounded-full" size="sm">
                  E-commerce
                </Button>
                <Button variant="outline" className="rounded-full" size="sm">
                  Education
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Featured Case Study */}
        <section className="py-16 bg-white">
          <div className="container">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-sm text-amber-700 mb-4">
                <CheckCircle2 className="h-4 w-4" />
                <span>Featured Case Study</span>
              </div>
              <h2 className="text-3xl font-bold mb-2">How TechNova Increased Productivity by 45%</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="relative h-[400px] rounded-xl overflow-hidden shadow-lg">
                <Image
                  src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=2070&auto=format&fit=crop"
                  alt="TechNova team working together"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-12 w-12 relative">
                    <Image
                      src="/placeholder.svg?height=48&width=48&text=TN"
                      alt="TechNova logo"
                      fill
                      className="object-contain"
                      sizes="48px"
                    />
                  </div>
                  <div>
                    <h3 className="font-semibold">TechNova</h3>
                    <p className="text-sm text-muted-foreground">Software Development Company</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 mb-8">
                  <div>
                    <p className="text-sm text-muted-foreground">Industry</p>
                    <p className="font-medium">Technology</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Company Size</p>
                    <p className="font-medium">250+ employees</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Location</p>
                    <p className="font-medium">San Francisco, CA</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Products Used</p>
                    <p className="font-medium">AI Scrum Master, Ethical Metrics</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Implementation Time</p>
                    <p className="font-medium">2 months</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">ROI</p>
                    <p className="font-medium">320% in first year</p>
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  <p>
                    TechNova, a leading software development company, was struggling with sprint planning inefficiencies
                    and missed deadlines. After implementing JiraVision's AI Scrum Master and Ethical Metrics, they
                    experienced a 45% increase in team productivity and reduced planning time by 60%.
                  </p>
                  <p>
                    The company was able to deliver projects 30% faster while maintaining high code quality and
                    improving team satisfaction scores by 25%.
                  </p>
                </div>

                <div className="flex flex-wrap gap-4">
                  <Button asChild>
                    <Link href="/resources/case-studies/technova" className="flex items-center gap-2">
                      Read Full Case Study <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="/contact">Request Similar Solution</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Case Studies Grid */}
        <section className="py-16 bg-slate-50">
          <div className="container">
            <div className="flex flex-col md:flex-row gap-8 md:gap-4 justify-between items-start md:items-center mb-12">
              <div>
                <h2 className="text-3xl font-bold mb-2">All Case Studies</h2>
                <p className="text-muted-foreground">Browse success stories from our customers across industries</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Sort by:</span>
                <label htmlFor="sort-options" className="sr-only">Sort Options</label>
                <select id="sort-options" className="bg-white border border-slate-200 rounded-md px-3 py-1 text-sm">
                  <option>Most Recent</option>
                  <option>Most Popular</option>
                  <option>Company Size</option>
                  <option>Industry</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                {
                  company: "HealthPlus",
                  logo: "/placeholder.svg?height=40&width=40&text=H+",
                  industry: "Healthcare",
                  title: "HealthPlus Streamlines Patient Care with JiraVision",
                  description:
                    "How a healthcare provider improved patient outcomes by optimizing their development workflow.",
                  image:
                    "https://images.unsplash.com/photo-1579684385127-1ef15d508118?q=80&w=2080&auto=format&fit=crop",
                  results: [
                    "30% faster development cycles",
                    "Improved patient satisfaction",
                    "Reduced IT costs by 25%",
                  ],
                },
                {
                  company: "FinEdge",
                  logo: "/placeholder.svg?height=40&width=40&text=FE",
                  industry: "Finance",
                  title: "FinEdge Accelerates FinTech Innovation",
                  description:
                    "A financial technology company that revolutionized their product development with JiraVision.",
                  image: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?q=80&w=2032&auto=format&fit=crop",
                  results: [
                    "50% reduction in bug reports",
                    "Doubled feature delivery rate",
                    "Improved compliance tracking",
                  ],
                },
                {
                  company: "EduLearn",
                  logo: "/placeholder.svg?height=40&width=40&text=EL",
                  industry: "Education",
                  title: "EduLearn Transforms Online Education Platform",
                  description: "How an EdTech company scaled their development team while maintaining quality.",
                  image:
                    "https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=2070&auto=format&fit=crop",
                  results: [
                    "Scaled from 5 to 25 developers",
                    "Maintained 99.9% uptime",
                    "Reduced onboarding time by 40%",
                  ],
                },
                {
                  company: "ShopSmart",
                  logo: "/placeholder.svg?height=40&width=40&text=SS",
                  industry: "E-commerce",
                  title: "ShopSmart Enhances Customer Experience",
                  description:
                    "An e-commerce platform that improved their development process to deliver better shopping experiences.",
                  image: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=2070&auto=format&fit=crop",
                  results: [
                    "35% faster time-to-market",
                    "Improved mobile conversion by 28%",
                    "Reduced cart abandonment by 15%",
                  ],
                },
                {
                  company: "GreenEnergy",
                  logo: "/placeholder.svg?height=40&width=40&text=GE",
                  industry: "Energy",
                  title: "GreenEnergy Powers Sustainable Solutions",
                  description: "How a renewable energy company optimized their software development lifecycle.",
                  image:
                    "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?q=80&w=2070&auto=format&fit=crop",
                  results: [
                    "Reduced carbon footprint by 20%",
                    "Improved system reliability",
                    "Accelerated innovation cycles",
                  ],
                },
                {
                  company: "TravelWise",
                  logo: "/placeholder.svg?height=40&width=40&text=TW",
                  industry: "Travel",
                  title: "TravelWise Revolutionizes Booking Experience",
                  description:
                    "A travel company that transformed their development process to create seamless customer journeys.",
                  image:
                    "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=2074&auto=format&fit=crop",
                  results: [
                    "Booking completion up by 22%",
                    "Mobile app ratings improved to 4.8",
                    "Development costs reduced by 30%",
                  ],
                },
              ].map((study, i) => (
                <div
                  key={i}
                  className="group bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200 hover:shadow-md transition-shadow"
                >
                  <div className="h-48 relative overflow-hidden">
                    <Image
                      src={study.image || "/placeholder.svg"}
                      alt={study.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                    <div className="absolute bottom-4 left-4 right-4 text-white">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm rounded-full px-2 py-0.5">
                          <Building2 className="h-3 w-3" />
                          <span>{study.industry}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-10 w-10 relative">
                        <Image
                          src={study.logo || "/placeholder.svg"}
                          alt={`${study.company} logo`}
                          fill
                          className="object-contain"
                          sizes="40px"
                        />
                      </div>
                      <h3 className="font-semibold">{study.company}</h3>
                    </div>
                    <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">{study.title}</h3>
                    <p className="text-muted-foreground mb-4">{study.description}</p>
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold mb-2">Key Results:</h4>
                      <ul className="space-y-1">
                        {study.results.map((result, j) => (
                          <li key={j} className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                            <span>{result}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <Link
                      href={`/resources/case-studies/${study.company.toLowerCase().replace(/\s+/g, "-")}`}
                      className="text-primary hover:underline flex items-center gap-1 text-sm"
                    >
                      Read case study <ChevronRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12 text-center">
              <Button variant="outline" size="lg">
                Load More Case Studies
              </Button>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 bg-white">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-2">The Impact of JiraVision</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Real results from companies that have implemented JiraVision in their development workflow
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                {
                  value: "45%",
                  label: "Average Productivity Increase",
                  icon: <BarChart className="h-8 w-8 text-primary" />,
                },
                {
                  value: "60%",
                  label: "Reduction in Planning Time",
                  icon: <Clock className="h-8 w-8 text-primary" />,
                },
                {
                  value: "35%",
                  label: "Faster Time to Market",
                  icon: <ArrowRight className="h-8 w-8 text-primary" />,
                },
                {
                  value: "98%",
                  label: "Customer Satisfaction",
                  icon: <Users className="h-8 w-8 text-primary" />,
                },
              ].map((stat, i) => (
                <div key={i} className="bg-slate-50 rounded-xl p-6 text-center border border-slate-200">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    {stat.icon}
                  </div>
                  <div className="text-4xl font-bold mb-2">{stat.value}</div>
                  <p className="text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-r from-primary/90 to-primary relative overflow-hidden">
          <div className="absolute inset-0 bg-grid-white/10 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]"></div>
          <div className="container relative z-10">
            <div className="max-w-3xl mx-auto text-center text-white">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to become our next success story?</h2>
              <p className="text-white/80 text-lg mb-8">
                Join thousands of teams who use JiraVision to transform their development process
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
                  <Link href="/contact">Request Demo</Link>
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
