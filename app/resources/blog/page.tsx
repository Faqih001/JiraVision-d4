import { MainNavbar } from "@/components/main-navbar"
import { MainFooter } from "@/components/main-footer"
import { Button } from "@/components/ui/button"
import {
  Calendar,
  Clock,
  ArrowRight,
  Search,
  BookOpen,
  Tag,
  ChevronRight,
  Users,
  Star,
  Shield,
  Filter,
} from "lucide-react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import Image from "next/image"

export default function BlogPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MainNavbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-20 bg-gradient-to-br from-slate-50 to-slate-100 relative overflow-hidden">
          <div className="absolute inset-0 bg-grid-slate-200 [mask-image:radial-gradient(ellipse_at_center,white,transparent_70%)]"></div>
          <div className="container relative z-10">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary mb-4">
                <BookOpen className="h-4 w-4" />
                <span>Knowledge Hub</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">JiraVision Blog</h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Insights, tips, and best practices for AI-powered project management.
              </p>
            </div>

            <div className="max-w-md mx-auto relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
              <Input type="search" placeholder="Search articles..." className="pl-10 rounded-full" />
            </div>
          </div>
        </section>

        {/* Featured Article */}
        <section className="py-16 container">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="h-[400px] rounded-xl overflow-hidden relative shadow-xl">
              <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-primary to-purple-600 opacity-20 blur-xl"></div>
              <div className="relative h-full w-full rounded-xl overflow-hidden border border-slate-200">
                <Image
                  src="https://images.unsplash.com/photo-1531482615713-2afd69097998?q=80&w=1170&auto=format&fit=crop"
                  alt="Featured Article"
                  className="object-cover"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  priority
                />
              </div>
            </div>
            <div className="flex flex-col gap-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary w-fit">
                <span>Featured</span>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>May 4, 2025</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>5 min read</span>
                </div>
              </div>
              <h2 className="text-3xl font-bold">How AI is Transforming Agile Project Management</h2>
              <p className="text-muted-foreground">
                Discover how artificial intelligence is revolutionizing traditional agile methodologies and helping
                teams deliver better results with less overhead.
              </p>
              <div className="flex items-center gap-4 mt-2">
                <div className="h-10 w-10 rounded-full overflow-hidden relative">
                  <Image
                    src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=1974&auto=format&fit=crop"
                    alt="Author"
                    className="object-cover"
                    fill
                    sizes="40px"
                  />
                </div>
                <div>
                  <p className="font-medium">Sarah Johnson</p>
                  <p className="text-sm text-muted-foreground">Product Director</p>
                </div>
              </div>
              <Link href="/resources/blog/ai-transforming-agile" className="mt-4">
                <Button className="gap-2 rounded-full">
                  Read Article <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Latest Articles */}
        <section className="py-16 bg-gradient-to-br from-slate-50 to-slate-100">
          <div className="container">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
              <div>
                <h2 className="text-2xl font-bold">Latest Articles</h2>
                <p className="text-muted-foreground">Fresh insights and perspectives on project management</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Button variant="outline" className="gap-2 rounded-full">
                    <Filter className="h-4 w-4" /> Filter
                  </Button>
                </div>
                <Link href="/resources/blog/all" className="text-primary hover:underline flex items-center gap-1">
                  View all <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Article 1 */}
              <div className="bg-white rounded-xl overflow-hidden shadow-lg border border-slate-100 transform transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                <div className="h-48 overflow-hidden relative">
                  <Image
                    src="https://images.unsplash.com/photo-1552581234-26160f608093?q=80&w=1170&auto=format&fit=crop"
                    alt="Article 1"
                    className="object-cover"
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>
                <div className="p-6">
                  <div className="inline-flex items-center gap-2 rounded-full bg-green-100 px-3 py-1 text-sm text-green-700 mb-4">
                    <Users className="h-4 w-4" />
                    <span>Team Wellbeing</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>April 28, 2025</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>4 min read</span>
                    </div>
                  </div>
                  <h3 className="text-xl font-bold mb-2">5 Ways to Improve Team Wellbeing in Remote Environments</h3>
                  <p className="text-muted-foreground mb-4">
                    Practical strategies for maintaining team health and preventing burnout in distributed teams.
                  </p>
                  <Link
                    href="/resources/blog/improve-team-wellbeing"
                    className="text-primary hover:underline flex items-center gap-1"
                  >
                    Read more <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>

              {/* Article 2 */}
              <div className="bg-white rounded-xl overflow-hidden shadow-lg border border-slate-100 transform transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                <div className="h-48 overflow-hidden relative">
                  <Image
                    src="https://images.unsplash.com/photo-1559223607-a43c990c692c?q=80&w=1170&auto=format&fit=crop"
                    alt="Article 2"
                    className="object-cover"
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>
                <div className="p-6">
                  <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-sm text-amber-700 mb-4">
                    <Star className="h-4 w-4" />
                    <span>Gamification</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>April 21, 2025</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>6 min read</span>
                    </div>
                  </div>
                  <h3 className="text-xl font-bold mb-2">
                    The Science Behind Effective Gamification in Project Management
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    How gamification techniques can boost team motivation and productivity when implemented correctly.
                  </p>
                  <Link
                    href="/resources/blog/gamification-science"
                    className="text-primary hover:underline flex items-center gap-1"
                  >
                    Read more <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>

              {/* Article 3 */}
              <div className="bg-white rounded-xl overflow-hidden shadow-lg border border-slate-100 transform transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                <div className="h-48 overflow-hidden relative">
                  <Image
                    src="https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=1170&auto=format&fit=crop"
                    alt="Article 3"
                    className="object-cover"
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>
                <div className="p-6">
                  <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-700 mb-4">
                    <Shield className="h-4 w-4" />
                    <span>Ethical AI</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>April 15, 2025</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>3 min read</span>
                    </div>
                  </div>
                  <h3 className="text-xl font-bold mb-2">Ethical Considerations in AI-Powered Project Management</h3>
                  <p className="text-muted-foreground mb-4">
                    Navigating the ethical challenges and opportunities of using AI in team and project governance.
                  </p>
                  <Link
                    href="/resources/blog/ethical-ai-project-management"
                    className="text-primary hover:underline flex items-center gap-1"
                  >
                    Read more <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Categories Section */}
        <section className="py-16 bg-white">
          <div className="container">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold">Browse by Category</h2>
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary">
                <Tag className="h-4 w-4" />
                <span>Topics</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              <Link href="/resources/blog/category/ai-scrum-master">
                <div className="border border-slate-100 rounded-xl p-6 hover:border-primary hover:bg-primary/5 transition-colors shadow-lg transform transition-all duration-300 hover:-translate-y-1 hover:shadow-xl bg-white">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <BookOpen className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-bold mb-2">AI Scrum Master</h3>
                  <p className="text-sm text-muted-foreground mb-4">Leveraging AI to improve agile processes</p>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">12 articles</span>
                    <ChevronRight className="h-4 w-4 text-primary" />
                  </div>
                </div>
              </Link>

              <Link href="/resources/blog/category/team-wellbeing">
                <div className="border border-slate-100 rounded-xl p-6 hover:border-primary hover:bg-primary/5 transition-colors shadow-lg transform transition-all duration-300 hover:-translate-y-1 hover:shadow-xl bg-white">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-bold mb-2">Team Wellbeing</h3>
                  <p className="text-sm text-muted-foreground mb-4">Supporting healthy, productive teams</p>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">8 articles</span>
                    <ChevronRight className="h-4 w-4 text-primary" />
                  </div>
                </div>
              </Link>

              <Link href="/resources/blog/category/gamification">
                <div className="border border-slate-100 rounded-xl p-6 hover:border-primary hover:bg-primary/5 transition-colors shadow-lg transform transition-all duration-300 hover:-translate-y-1 hover:shadow-xl bg-white">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Star className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-bold mb-2">Gamification</h3>
                  <p className="text-sm text-muted-foreground mb-4">Engaging teams through game mechanics</p>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">10 articles</span>
                    <ChevronRight className="h-4 w-4 text-primary" />
                  </div>
                </div>
              </Link>

              <Link href="/resources/blog/category/ethical-metrics">
                <div className="border border-slate-100 rounded-xl p-6 hover:border-primary hover:bg-primary/5 transition-colors shadow-lg transform transition-all duration-300 hover:-translate-y-1 hover:shadow-xl bg-white">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Shield className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-bold mb-2">Ethical Metrics</h3>
                  <p className="text-sm text-muted-foreground mb-4">Measuring success with integrity</p>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">6 articles</span>
                    <ChevronRight className="h-4 w-4 text-primary" />
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </section>

        {/* Popular Articles Section */}
        <section className="py-16 bg-gradient-to-br from-slate-50 to-slate-100">
          <div className="container">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold">Most Popular Articles</h2>
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-sm text-amber-700">
                <Star className="h-4 w-4" />
                <span>Trending</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white rounded-xl overflow-hidden shadow-lg border border-slate-100 transform transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                <div className="grid grid-cols-1 md:grid-cols-3">
                  <div className="relative h-full min-h-[200px] md:col-span-1">
                    <Image
                      src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1170&auto=format&fit=crop"
                      alt="Popular Article 1"
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  </div>
                  <div className="p-6 md:col-span-2">
                    <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary mb-4">
                      <BookOpen className="h-4 w-4" />
                      <span>AI Scrum Master</span>
                    </div>
                    <h3 className="text-xl font-bold mb-2">The Complete Guide to AI-Powered Scrum Mastering</h3>
                    <p className="text-muted-foreground mb-4">
                      Everything you need to know about implementing AI to enhance your agile processes and improve team
                      productivity.
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>March 15, 2025</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>12 min read</span>
                        </div>
                      </div>
                      <Link
                        href="/resources/blog/ai-scrum-master-guide"
                        className="text-primary hover:underline flex items-center gap-1"
                      >
                        Read more <ChevronRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl overflow-hidden shadow-lg border border-slate-100 transform transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                <div className="grid grid-cols-1 md:grid-cols-3">
                  <div className="relative h-full min-h-[200px] md:col-span-1">
                    <Image
                      src="https://images.unsplash.com/photo-1573164713988-8665fc963095?q=80&w=1169&auto=format&fit=crop"
                      alt="Popular Article 2"
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  </div>
                  <div className="p-6 md:col-span-2">
                    <div className="inline-flex items-center gap-2 rounded-full bg-green-100 px-3 py-1 text-sm text-green-700 mb-4">
                      <Users className="h-4 w-4" />
                      <span>Team Wellbeing</span>
                    </div>
                    <h3 className="text-xl font-bold mb-2">Preventing Burnout: A Manager's Guide to Team Wellbeing</h3>
                    <p className="text-muted-foreground mb-4">
                      Learn how to identify early signs of burnout and implement effective strategies to support your
                      team's mental health.
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>February 28, 2025</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>8 min read</span>
                        </div>
                      </div>
                      <Link
                        href="/resources/blog/preventing-burnout-guide"
                        className="text-primary hover:underline flex items-center gap-1"
                      >
                        Read more <ChevronRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Newsletter Section */}
        <section className="py-16 bg-white">
          <div className="container max-w-4xl">
            <div className="bg-gradient-to-br from-primary/90 to-purple-700/90 rounded-xl p-8 border shadow-xl relative overflow-hidden">
              <div className="absolute inset-0 bg-grid-white/10 bg-[length:20px_20px] [mask-image:radial-gradient(white,transparent_85%)]"></div>
              <div className="relative z-10">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold mb-2 text-white">Subscribe to Our Newsletter</h2>
                  <p className="text-white/80">
                    Get the latest articles, tips, and insights delivered straight to your inbox.
                  </p>
                </div>

                <form className="flex flex-col sm:flex-row gap-4">
                  <Input
                    type="email"
                    placeholder="Your email address"
                    className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/60"
                  />
                  <Button type="submit" variant="secondary">
                    Subscribe
                  </Button>
                </form>

                <p className="text-xs text-white/60 mt-4 text-center">
                  By subscribing, you agree to our Privacy Policy and consent to receive updates from JiraVision.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <MainFooter />
    </div>
  )
}
