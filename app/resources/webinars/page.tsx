import { MainNavbar } from "@/components/main-navbar"
import { MainFooter } from "@/components/main-footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Search,
  ArrowRight,
  ChevronRight,
  Video,
  Calendar,
  Clock,
  Users,
  Play,
  CheckCircle2,
  Filter,
  ChevronDown,
  Download,
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export default function WebinarsPage() {
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
                <Video className="h-4 w-4" />
                <span>Live & On-Demand</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">JiraVision Webinars</h1>
              <p className="text-xl text-muted-foreground mb-8">
                Expert insights, best practices, and product demonstrations to help you get the most out of JiraVision
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
                  <Input type="search" placeholder="Search webinars..." className="pl-10 rounded-full" />
                </div>
                <Button variant="outline" className="flex items-center gap-2 rounded-full">
                  <Filter className="h-4 w-4" />
                  <span>Filter</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex flex-wrap justify-center gap-3">
                <Button variant="outline" className="rounded-full" size="sm">
                  All Topics
                </Button>
                <Button variant="outline" className="rounded-full" size="sm">
                  Getting Started
                </Button>
                <Button variant="outline" className="rounded-full" size="sm">
                  Advanced Features
                </Button>
                <Button variant="outline" className="rounded-full" size="sm">
                  Best Practices
                </Button>
                <Button variant="outline" className="rounded-full" size="sm">
                  Case Studies
                </Button>
                <Button variant="outline" className="rounded-full" size="sm">
                  Product Updates
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Upcoming Webinars */}
        <section className="py-16 bg-white">
          <div className="container">
            <div className="flex flex-col md:flex-row gap-8 md:gap-4 justify-between items-start md:items-center mb-12">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-sm text-amber-700 mb-4">
                  <Calendar className="h-4 w-4" />
                  <span>Upcoming</span>
                </div>
                <h2 className="text-3xl font-bold mb-2">Upcoming Live Webinars</h2>
                <p className="text-muted-foreground">Register now to join our live sessions and Q&A</p>
              </div>
              <Button variant="outline" asChild>
                <Link href="/resources/webinars/calendar" className="flex items-center gap-2">
                  View Full Calendar <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {[
                {
                  title: "Mastering Sprint Planning with AI Scrum Master",
                  description:
                    "Learn how to leverage AI to optimize your sprint planning process and boost team productivity.",
                  image:
                    "https://images.unsplash.com/photo-1531482615713-2afd69097998?q=80&w=2070&auto=format&fit=crop",
                  date: "May 15, 2023",
                  time: "11:00 AM - 12:00 PM EDT",
                  speakers: [
                    { name: "Sarah Johnson", role: "Product Manager" },
                    { name: "Michael Chen", role: "Lead Developer" },
                  ],
                },
                {
                  title: "Ethical Metrics: Measuring What Matters",
                  description:
                    "Discover how to implement ethical metrics that drive sustainable growth and team wellbeing.",
                  image: "https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=2070&auto=format&fit=crop",
                  date: "May 22, 2023",
                  time: "2:00 PM - 3:00 PM EDT",
                  speakers: [
                    { name: "David Williams", role: "Director of Engineering" },
                    { name: "Emily Rodriguez", role: "Agile Coach" },
                  ],
                },
              ].map((webinar, i) => (
                <div key={i} className="group bg-white rounded-xl overflow-hidden shadow-md border border-slate-200">
                  <div className="h-48 relative overflow-hidden">
                    <Image
                      src={webinar.image || "/placeholder.svg"}
                      alt={webinar.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 1024px) 100vw, 50vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                    <div className="absolute top-4 left-4">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <div className="flex items-center gap-1 bg-red-500 text-white rounded-full px-3 py-1">
                          <span>Live</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>{webinar.date}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{webinar.time}</span>
                      </div>
                    </div>
                    <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
                      {webinar.title}
                    </h3>
                    <p className="text-muted-foreground mb-4">{webinar.description}</p>

                    <div className="mb-6">
                      <h4 className="text-sm font-semibold mb-2">Speakers:</h4>
                      <div className="flex flex-wrap gap-3">
                        {webinar.speakers.map((speaker, j) => (
                          <div key={j} className="flex items-center gap-2">
                            <div className="h-8 w-8 bg-slate-200 rounded-full flex items-center justify-center text-xs font-medium">
                              {speaker.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{speaker.name}</p>
                              <p className="text-xs text-muted-foreground">{speaker.role}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <Button asChild>
                        <Link href={`/resources/webinars/register/${webinar.title.toLowerCase().replace(/\s+/g, "-")}`}>
                          Register Now
                        </Link>
                      </Button>
                      <Button variant="outline" asChild>
                        <Link
                          href={`/resources/webinars/details/${webinar.title.toLowerCase().replace(/\s+/g, "-")}`}
                          className="flex items-center gap-1"
                        >
                          Learn More <ChevronRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* On-Demand Webinars */}
        <section className="py-16 bg-slate-50">
          <div className="container">
            <div className="flex flex-col md:flex-row gap-8 md:gap-4 justify-between items-start md:items-center mb-12">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary mb-4">
                  <Play className="h-4 w-4" />
                  <span>On-Demand</span>
                </div>
                <h2 className="text-3xl font-bold mb-2">On-Demand Webinars</h2>
                <p className="text-muted-foreground">Watch our most popular webinars at your convenience</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Sort by:</span>
                <select className="bg-white border border-slate-200 rounded-md px-3 py-1 text-sm">
                  <option>Most Recent</option>
                  <option>Most Popular</option>
                  <option>Topic</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                {
                  title: "Getting Started with JiraVision",
                  description: "A comprehensive introduction to JiraVision's core features and capabilities.",
                  image:
                    "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=2070&auto=format&fit=crop",
                  duration: "45 min",
                  views: "2.5K",
                  category: "Getting Started",
                },
                {
                  title: "Advanced Team Management Techniques",
                  description: "Learn advanced strategies for managing distributed teams effectively with JiraVision.",
                  image:
                    "https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=2070&auto=format&fit=crop",
                  duration: "60 min",
                  views: "1.8K",
                  category: "Advanced Features",
                },
                {
                  title: "Integrating JiraVision with Your Tech Stack",
                  description: "How to seamlessly connect JiraVision with your existing tools and workflows.",
                  image:
                    "https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?q=80&w=2070&auto=format&fit=crop",
                  duration: "50 min",
                  views: "3.2K",
                  category: "Best Practices",
                },
                {
                  title: "Customizing Dashboards for Executive Insights",
                  description:
                    "Create powerful, customized dashboards that provide actionable insights for leadership.",
                  image:
                    "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2015&auto=format&fit=crop",
                  duration: "40 min",
                  views: "1.5K",
                  category: "Advanced Features",
                },
                {
                  title: "Scaling Agile with JiraVision",
                  description: "Best practices for scaling your agile processes as your organization grows.",
                  image: "https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=2070&auto=format&fit=crop",
                  duration: "55 min",
                  views: "2.1K",
                  category: "Best Practices",
                },
                {
                  title: "JiraVision 2023 Product Roadmap",
                  description: "An exclusive look at upcoming features and enhancements to the JiraVision platform.",
                  image:
                    "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=2070&auto=format&fit=crop",
                  duration: "65 min",
                  views: "4.7K",
                  category: "Product Updates",
                },
              ].map((webinar, i) => (
                <div
                  key={i}
                  className="group bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200 hover:shadow-md transition-shadow"
                >
                  <div className="h-48 relative overflow-hidden">
                    <Image
                      src={webinar.image || "/placeholder.svg"}
                      alt={webinar.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                    <div className="absolute top-4 left-4">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm rounded-full px-2 py-0.5">
                          <span>{webinar.category}</span>
                        </div>
                      </div>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="h-16 w-16 rounded-full bg-primary/90 flex items-center justify-center">
                        <Play className="h-8 w-8 text-white" />
                      </div>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{webinar.duration}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        <span>{webinar.views} views</span>
                      </div>
                    </div>
                    <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
                      {webinar.title}
                    </h3>
                    <p className="text-muted-foreground mb-4">{webinar.description}</p>
                    <div className="flex flex-wrap gap-3">
                      <Button variant="outline" asChild>
                        <Link
                          href={`/resources/webinars/watch/${webinar.title.toLowerCase().replace(/\s+/g, "-")}`}
                          className="flex items-center gap-2"
                        >
                          <Play className="h-4 w-4" /> Watch Now
                        </Link>
                      </Button>
                      <Button variant="ghost" size="icon" asChild>
                        <Link
                          href={`/resources/webinars/download/${webinar.title.toLowerCase().replace(/\s+/g, "-")}`}
                          title="Download slides"
                        >
                          <Download className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12 text-center">
              <Button variant="outline" size="lg">
                Load More Webinars
              </Button>
            </div>
          </div>
        </section>

        {/* Featured Webinar */}
        <section className="py-16 bg-white">
          <div className="container">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-sm text-amber-700 mb-4">
                <CheckCircle2 className="h-4 w-4" />
                <span>Featured Webinar</span>
              </div>
              <h2 className="text-3xl font-bold mb-2">The Future of Agile Development with AI</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="relative h-[400px] rounded-xl overflow-hidden shadow-lg group">
                <Image
                  src="https://images.unsplash.com/photo-1558403194-611308249627?q=80&w=2070&auto=format&fit=crop"
                  alt="The Future of Agile Development with AI"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="h-20 w-20 rounded-full bg-primary/90 flex items-center justify-center">
                    <Play className="h-10 w-10 text-white" />
                  </div>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>Recorded on April 10, 2023</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>75 minutes</span>
                  </div>
                </div>

                <h3 className="text-2xl font-bold mb-4">The Future of Agile Development with AI</h3>
                <p className="text-muted-foreground mb-6">
                  In this groundbreaking webinar, industry experts discuss how artificial intelligence is transforming
                  agile development practices and what this means for the future of software development teams.
                </p>

                <div className="mb-6">
                  <h4 className="text-sm font-semibold mb-2">You'll learn:</h4>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                      <span>How AI is revolutionizing sprint planning and estimation</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                      <span>Practical applications of machine learning in code review and quality assurance</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                      <span>Strategies for integrating AI tools into your existing workflow</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                      <span>
                        Real-world case studies of teams that have successfully adopted AI-powered development
                      </span>
                    </li>
                  </ul>
                </div>

                <div className="mb-6">
                  <h4 className="text-sm font-semibold mb-2">Speakers:</h4>
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-slate-200 rounded-full flex items-center justify-center text-sm font-medium">
                        JD
                      </div>
                      <div>
                        <p className="font-medium">Dr. Jennifer Davis</p>
                        <p className="text-xs text-muted-foreground">AI Research Director, JiraVision</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-slate-200 rounded-full flex items-center justify-center text-sm font-medium">
                        RM
                      </div>
                      <div>
                        <p className="font-medium">Robert Martinez</p>
                        <p className="text-xs text-muted-foreground">CTO, TechForward</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4">
                  <Button asChild>
                    <Link
                      href="/resources/webinars/watch/future-of-agile-development-with-ai"
                      className="flex items-center gap-2"
                    >
                      <Play className="h-4 w-4" /> Watch Now
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link
                      href="/resources/webinars/download/future-of-agile-development-with-ai"
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" /> Download Slides
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Host Your Own Webinar */}
        <section className="py-16 bg-slate-50">
          <div className="container">
            <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-md overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-2">
                <div className="p-8 md:p-10">
                  <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary mb-6">
                    <Users className="h-4 w-4" />
                    <span>Share Your Expertise</span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold mb-4">Host Your Own JiraVision Webinar</h2>
                  <p className="text-muted-foreground mb-6">
                    Are you a JiraVision expert with insights to share? Apply to host your own webinar and reach
                    thousands of developers and teams.
                  </p>
                  <ul className="space-y-3 mb-8">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                      <span>Share your expertise with the JiraVision community</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                      <span>Get technical and marketing support from our team</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                      <span>Expand your professional network and visibility</span>
                    </li>
                  </ul>
                  <Button asChild>
                    <Link href="/resources/webinars/host-application">Apply to Host</Link>
                  </Button>
                </div>
                <div className="relative h-64 md:h-auto">
                  <Image
                    src="https://images.unsplash.com/photo-1543269865-cbf427effbad?q=80&w=2070&auto=format&fit=crop"
                    alt="Host your own webinar"
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-r from-primary/90 to-primary relative overflow-hidden">
          <div className="absolute inset-0 bg-grid-white/10 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]"></div>
          <div className="container relative z-10">
            <div className="max-w-3xl mx-auto text-center text-white">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Stay Updated with JiraVision</h2>
              <p className="text-white/80 text-lg mb-8">
                Subscribe to our newsletter to get notified about upcoming webinars and events
              </p>
              <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
                />
                <Button variant="secondary">Subscribe</Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <MainFooter />
    </div>
  )
}
