import { MainNavbar } from "@/components/main-navbar"
import { MainFooter } from "@/components/main-footer"
import { Button } from "@/components/ui/button"
import { Calendar, Clock, ArrowRight, Search } from "lucide-react"
import Link from "next/link"
import { Input } from "@/components/ui/input"

export default function BlogPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MainNavbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-20 bg-muted/50">
          <div className="container">
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">JiraVision Blog</h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Insights, tips, and best practices for AI-powered project management.
              </p>
            </div>

            <div className="max-w-md mx-auto relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
              <Input type="search" placeholder="Search articles..." className="pl-10" />
            </div>
          </div>
        </section>

        {/* Featured Article */}
        <section className="py-12 container">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="h-[400px] rounded-lg overflow-hidden">
              <img
                src="/placeholder.svg?height=400&width=600"
                alt="Featured Article"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="bg-primary/10 text-primary px-2 py-1 rounded-full">Featured</span>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>May 2, 2025</span>
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
                <div className="h-10 w-10 rounded-full bg-gray-200 overflow-hidden">
                  <img src="/placeholder.svg?height=40&width=40" alt="Author" className="h-full w-full object-cover" />
                </div>
                <div>
                  <p className="font-medium">Sarah Johnson</p>
                  <p className="text-sm text-muted-foreground">Product Director</p>
                </div>
              </div>
              <Link href="/resources/blog/ai-transforming-agile" className="mt-4">
                <Button className="gap-2">
                  Read Article <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Latest Articles */}
        <section className="py-12 container">
          <h2 className="text-2xl font-bold mb-8">Latest Articles</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Article 1 */}
            <div className="flex flex-col">
              <div className="h-48 rounded-lg overflow-hidden mb-4">
                <img
                  src="/placeholder.svg?height=200&width=400"
                  alt="Article 1"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
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
              <Link href="/resources/blog/improve-team-wellbeing" className="text-primary hover:underline mt-auto">
                Read more →
              </Link>
            </div>

            {/* Article 2 */}
            <div className="flex flex-col">
              <div className="h-48 rounded-lg overflow-hidden mb-4">
                <img
                  src="/placeholder.svg?height=200&width=400"
                  alt="Article 2"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
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
              <Link href="/resources/blog/gamification-science" className="text-primary hover:underline mt-auto">
                Read more →
              </Link>
            </div>

            {/* Article 3 */}
            <div className="flex flex-col">
              <div className="h-48 rounded-lg overflow-hidden mb-4">
                <img
                  src="/placeholder.svg?height=200&width=400"
                  alt="Article 3"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
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
                className="text-primary hover:underline mt-auto"
              >
                Read more →
              </Link>
            </div>
          </div>
        </section>

        {/* Categories Section */}
        <section className="py-12 container">
          <h2 className="text-2xl font-bold mb-8">Browse by Category</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/resources/blog/category/ai-scrum-master">
              <div className="border rounded-lg p-6 hover:border-primary hover:bg-primary/5 transition-colors">
                <h3 className="font-bold mb-2">AI Scrum Master</h3>
                <p className="text-sm text-muted-foreground">12 articles</p>
              </div>
            </Link>

            <Link href="/resources/blog/category/team-wellbeing">
              <div className="border rounded-lg p-6 hover:border-primary hover:bg-primary/5 transition-colors">
                <h3 className="font-bold mb-2">Team Wellbeing</h3>
                <p className="text-sm text-muted-foreground">8 articles</p>
              </div>
            </Link>

            <Link href="/resources/blog/category/gamification">
              <div className="border rounded-lg p-6 hover:border-primary hover:bg-primary/5 transition-colors">
                <h3 className="font-bold mb-2">Gamification</h3>
                <p className="text-sm text-muted-foreground">10 articles</p>
              </div>
            </Link>

            <Link href="/resources/blog/category/ethical-metrics">
              <div className="border rounded-lg p-6 hover:border-primary hover:bg-primary/5 transition-colors">
                <h3 className="font-bold mb-2">Ethical Metrics</h3>
                <p className="text-sm text-muted-foreground">6 articles</p>
              </div>
            </Link>
          </div>
        </section>

        {/* Newsletter Section */}
        <section className="py-12 bg-muted/50">
          <div className="container max-w-4xl">
            <div className="bg-background rounded-xl p-8 border">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold mb-2">Subscribe to Our Newsletter</h2>
                <p className="text-muted-foreground">
                  Get the latest articles, tips, and insights delivered straight to your inbox.
                </p>
              </div>

              <form className="flex flex-col sm:flex-row gap-4">
                <Input type="email" placeholder="Your email address" className="flex-1" />
                <Button type="submit">Subscribe</Button>
              </form>

              <p className="text-xs text-muted-foreground mt-4 text-center">
                By subscribing, you agree to our Privacy Policy and consent to receive updates from JiraVision.
              </p>
            </div>
          </div>
        </section>
      </main>

      <MainFooter />
    </div>
  )
}
