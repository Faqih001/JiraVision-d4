import { MainNavbar } from "@/components/main-navbar"
import { MainFooter } from "@/components/main-footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Search,
  BookOpen,
  FileText,
  ArrowRight,
  Settings,
  BarChart,
  Users,
  LifeBuoy,
  ChevronRight,
  Code,
  Play,
  Laptop,
  AlignLeft,
  Clock,
  ChevronDown,
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export default function DocumentationPage() {
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
                <BookOpen className="h-4 w-4" />
                <span>Documentation</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">JiraVision Documentation</h1>
              <p className="text-xl text-muted-foreground mb-8">
                Everything you need to set up, customize, and get the most out of JiraVision
              </p>

              <div className="relative max-w-md mx-auto mb-8">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
                <Input type="search" placeholder="Search documentation..." className="pl-10 rounded-full" />
              </div>

              <div className="flex flex-wrap justify-center gap-3">
                <Button variant="outline" className="rounded-full" size="sm" asChild>
                  <Link href="#getting-started">Getting Started</Link>
                </Button>
                <Button variant="outline" className="rounded-full" size="sm" asChild>
                  <Link href="#api-reference">API Reference</Link>
                </Button>
                <Button variant="outline" className="rounded-full" size="sm" asChild>
                  <Link href="#integrations">Integrations</Link>
                </Button>
                <Button variant="outline" className="rounded-full" size="sm" asChild>
                  <Link href="#tutorials">Tutorials</Link>
                </Button>
                <Button variant="outline" className="rounded-full" size="sm" asChild>
                  <Link href="#faq">FAQ</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Main Doc Categories */}
        <section className="py-16 bg-white" id="getting-started">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-2">Browse Documentation</h2>
              <p className="text-muted-foreground">Choose a category to get started</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  icon: <FileText className="h-8 w-8 text-primary" />,
                  title: "Getting Started",
                  description: "Set up your workspace and learn JiraVision basics",
                  links: [
                    { text: "Quick Start Guide", url: "/resources/documentation/quick-start" },
                    { text: "Installation", url: "/resources/documentation/installation" },
                    { text: "Account Setup", url: "/resources/documentation/account-setup" },
                    { text: "First Project", url: "/resources/documentation/first-project" },
                  ],
                },
                {
                  icon: <Users className="h-8 w-8 text-primary" />,
                  title: "User Management",
                  description: "Add team members and manage permissions",
                  links: [
                    { text: "Inviting Users", url: "/resources/documentation/inviting-users" },
                    { text: "User Roles", url: "/resources/documentation/user-roles" },
                    { text: "Access Control", url: "/resources/documentation/access-control" },
                    { text: "Team Organization", url: "/resources/documentation/team-organization" },
                  ],
                },
                {
                  icon: <Settings className="h-8 w-8 text-primary" />,
                  title: "Configuration",
                  description: "Customize JiraVision to fit your workflow",
                  links: [
                    { text: "General Settings", url: "/resources/documentation/general-settings" },
                    { text: "Workflow Configuration", url: "/resources/documentation/workflow-config" },
                    { text: "Notifications", url: "/resources/documentation/notifications" },
                    { text: "Custom Fields", url: "/resources/documentation/custom-fields" },
                  ],
                },
                {
                  icon: <Code className="h-8 w-8 text-primary" />,
                  title: "API Reference",
                  description: "Use our API to integrate with your tools",
                  links: [
                    { text: "API Overview", url: "/resources/documentation/api-overview" },
                    { text: "Authentication", url: "/resources/documentation/api-authentication" },
                    { text: "Endpoints", url: "/resources/documentation/api-endpoints" },
                    { text: "Rate Limits", url: "/resources/documentation/api-rate-limits" },
                  ],
                },
                {
                  icon: <BarChart className="h-8 w-8 text-primary" />,
                  title: "Reporting & Analytics",
                  description: "Track progress and measure performance",
                  links: [
                    { text: "Dashboards", url: "/resources/documentation/dashboards" },
                    { text: "Report Creation", url: "/resources/documentation/report-creation" },
                    { text: "Metrics Guide", url: "/resources/documentation/metrics-guide" },
                    { text: "Data Export", url: "/resources/documentation/data-export" },
                  ],
                },
                {
                  icon: <LifeBuoy className="h-8 w-8 text-primary" />,
                  title: "Troubleshooting",
                  description: "Solve common issues and get support",
                  links: [
                    { text: "Common Issues", url: "/resources/documentation/common-issues" },
                    { text: "Error Messages", url: "/resources/documentation/error-messages" },
                    { text: "Contact Support", url: "/resources/documentation/contact-support" },
                    { text: "System Status", url: "/resources/documentation/system-status" },
                  ],
                },
              ].map((category, i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    {category.icon}
                  </div>
                  <h3 className="text-xl font-bold mb-2">{category.title}</h3>
                  <p className="text-muted-foreground mb-4">{category.description}</p>
                  <ul className="space-y-2">
                    {category.links.map((link, j) => (
                      <li key={j}>
                        <Link href={link.url} className="text-primary hover:underline flex items-center gap-1 group">
                          <span>{link.text}</span>
                          <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Featured Documentation */}
        <section className="py-16 bg-slate-50" id="tutorials">
          <div className="container">
            <div className="flex flex-col md:flex-row gap-8 md:gap-4 justify-between items-start md:items-center mb-12">
              <div>
                <h2 className="text-3xl font-bold mb-2">Featured Guides & Tutorials</h2>
                <p className="text-muted-foreground">Step-by-step walkthroughs for common workflows</p>
              </div>
              <Button variant="outline" asChild>
                <Link href="/resources/documentation/all-tutorials" className="flex items-center gap-2">
                  View all tutorials <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  title: "Setting Up Your First Sprint",
                  description: "A comprehensive guide to planning and executing your first sprint in JiraVision.",
                  image:
                    "https://images.unsplash.com/photo-1590402494610-2c378a9114c6?q=80&w=2070&auto=format&fit=crop",
                  icon: <Play className="h-4 w-4" />,
                  type: "Video Tutorial",
                  minutes: 7,
                },
                {
                  title: "Advanced Team Management",
                  description: "Learn how to organize teams, assign roles, and optimize your team structure.",
                  image:
                    "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?q=80&w=2070&auto=format&fit=crop",
                  icon: <AlignLeft className="h-4 w-4" />,
                  type: "Written Guide",
                  minutes: 15,
                },
                {
                  title: "Creating Custom Dashboards",
                  description: "Build powerful, personalized dashboards to track your most important metrics.",
                  image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070&auto=format&fit=crop",
                  icon: <Play className="h-4 w-4" />,
                  type: "Video Tutorial",
                  minutes: 12,
                },
              ].map((guide, i) => (
                <div key={i} className="group bg-white rounded-xl overflow-hidden shadow-md border border-slate-100">
                  <div className="h-48 relative overflow-hidden">
                    <Image
                      src={guide.image || "/placeholder.svg"}
                      alt={guide.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                    <div className="absolute bottom-4 left-4 right-4 text-white">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <div className="flex items-center gap-1 bg-primary/80 rounded-full px-2 py-0.5">
                          {guide.icon}
                          <span>{guide.type}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{guide.minutes} min</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">{guide.title}</h3>
                    <p className="text-muted-foreground mb-4">{guide.description}</p>
                    <Link
                      href={`/resources/documentation/guides/${guide.title.toLowerCase().replace(/\s+/g, "-")}`}
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      View tutorial <ChevronRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Integration Documentation */}
        <section className="py-16 bg-white" id="integrations">
          <div className="container">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary mb-4">
                <Laptop className="h-4 w-4" />
                <span>Integrations</span>
              </div>
              <h2 className="text-3xl font-bold mb-2">Integration Documentation</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Connect JiraVision with your favorite tools and services to create a seamless workflow
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {[
                { name: "Slack", logo: "/placeholder.svg?height=40&width=40&text=Slack" },
                { name: "GitHub", logo: "/placeholder.svg?height=40&width=40&text=GitHub" },
                { name: "Google", logo: "/placeholder.svg?height=40&width=40&text=Google" },
                { name: "Microsoft", logo: "/placeholder.svg?height=40&width=40&text=MS" },
                { name: "Figma", logo: "/placeholder.svg?height=40&width=40&text=Figma" },
                { name: "Zoom", logo: "/placeholder.svg?height=40&width=40&text=Zoom" },
                { name: "Salesforce", logo: "/placeholder.svg?height=40&width=40&text=SF" },
                { name: "Zendesk", logo: "/placeholder.svg?height=40&width=40&text=ZD" },
                { name: "Asana", logo: "/placeholder.svg?height=40&width=40&text=Asana" },
                { name: "Notion", logo: "/placeholder.svg?height=40&width=40&text=Notion" },
                { name: "Zapier", logo: "/placeholder.svg?height=40&width=40&text=Zapier" },
                { name: "HubSpot", logo: "/placeholder.svg?height=40&width=40&text=HS" },
              ].map((integration, i) => (
                <Link
                  key={i}
                  href={`/resources/documentation/integrations/${integration.name.toLowerCase()}`}
                  className="group"
                >
                  <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col items-center justify-center gap-3 text-center hover:border-primary hover:shadow-md transition-all">
                    <div className="h-12 w-12 relative">
                      <Image
                        src={integration.logo || "/placeholder.svg"}
                        alt={integration.name}
                        fill
                        className="object-contain"
                        sizes="48px"
                      />
                    </div>
                    <span className="font-medium group-hover:text-primary transition-colors">{integration.name}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 bg-slate-50" id="faq">
          <div className="container">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-sm text-amber-700 mb-4">
                <LifeBuoy className="h-4 w-4" />
                <span>FAQ</span>
              </div>
              <h2 className="text-3xl font-bold mb-2">Frequently Asked Questions</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Quick answers to the most common questions about JiraVision
              </p>
            </div>

            <div className="max-w-3xl mx-auto divide-y divide-slate-200">
              {[
                {
                  question: "How do I reset my password?",
                  answer:
                    "Go to the login page and click on 'Forgot Password?' Follow the instructions sent to your email to reset your password.",
                },
                {
                  question: "How do I add new team members?",
                  answer:
                    "Navigate to Settings > Team Members, click 'Invite New Member', and enter their email address. They'll receive an invitation email with instructions.",
                },
                {
                  question: "Can I import data from other tools?",
                  answer:
                    "Yes, JiraVision supports importing data from Jira, Asana, Trello, and more. Go to Settings > Import/Export to get started.",
                },
                {
                  question: "How do I set up custom fields?",
                  answer:
                    "Go to Settings > Custom Fields, click 'Add New Field', choose the field type, and configure its properties and visibility.",
                },
                {
                  question: "What's the difference between roles and permissions?",
                  answer:
                    "Roles are pre-defined sets of permissions (like Admin, Member, Viewer). Permissions are specific actions users can take (like create projects, edit tasks).",
                },
              ].map((faq, i) => (
                <div key={i} className="py-5">
                  <details className="group">
                    <summary className="flex justify-between items-center font-medium cursor-pointer list-none">
                      <span className="text-lg font-semibold">{faq.question}</span>
                      <span className="transition group-open:rotate-180">
                        <ChevronDown className="h-5 w-5" />
                      </span>
                    </summary>
                    <p className="text-muted-foreground mt-3 group-open:animate-fadeIn">{faq.answer}</p>
                  </details>
                </div>
              ))}
            </div>

            <div className="text-center mt-12">
              <p className="text-muted-foreground mb-4">Don't see your question here?</p>
              <Button asChild>
                <Link href="/contact">Contact Support</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Developer Resources */}
        <section className="py-16 bg-white" id="api-reference">
          <div className="container">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary mb-6">
                  <Code className="h-4 w-4" />
                  <span>For Developers</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Developer Resources</h2>
                <p className="text-lg text-muted-foreground mb-6">
                  Access our comprehensive API documentation, SDKs, and developer tools to build powerful integrations
                  with JiraVision.
                </p>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center mt-0.5">
                      <ChevronRight className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">RESTful API</h3>
                      <p className="text-muted-foreground">
                        Access all JiraVision data and functionality through our RESTful API
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center mt-0.5">
                      <ChevronRight className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Webhooks</h3>
                      <p className="text-muted-foreground">
                        Get real-time notifications when events occur in JiraVision
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center mt-0.5">
                      <ChevronRight className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">SDKs & Libraries</h3>
                      <p className="text-muted-foreground">Official libraries for JavaScript, Python, Ruby, and more</p>
                    </div>
                  </div>
                </div>
                <div className="mt-8">
                  <Button asChild>
                    <Link href="/resources/documentation/api" className="flex items-center gap-2">
                      Explore API Documentation <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                <div className="bg-slate-900 rounded-t-lg p-4 text-white font-mono text-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-3 w-3 rounded-full bg-red-500"></div>
                    <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
                    <div className="h-3 w-3 rounded-full bg-green-500"></div>
                    <span className="text-slate-400 text-xs ml-2">Example API Request</span>
                  </div>
                  <pre className="text-green-400">GET /api/v1/projects</pre>
                  <pre className="text-slate-400 mt-2">Authorization: Bearer {"{your_api_key}"}</pre>
                </div>
                <div className="bg-white rounded-b-lg p-4 border-x border-b border-slate-200 font-mono text-sm">
                  <pre className="text-slate-800 whitespace-pre-wrap">
                    {`{
  "data": [
    {
      "id": "proj_123456",
      "name": "Mobile App Redesign",
      "description": "Redesign of the mobile app UI/UX",
      "status": "active",
      "created_at": "2023-04-15T10:30:00Z",
      "updated_at": "2023-05-20T14:25:00Z"
    },
    {
      "id": "proj_789012",
      "name": "Website Optimization",
      "description": "Performance improvements for the website",
      "status": "active",
      "created_at": "2023-03-10T09:15:00Z",
      "updated_at": "2023-05-18T11:45:00Z"
    }
  ],
  "meta": {
    "total": 2,
    "page": 1,
    "per_page": 10
  }
}`}
                  </pre>
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
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to get started with JiraVision?</h2>
              <p className="text-white/80 text-lg mb-8">
                Join thousands of teams who use JiraVision to streamline their development process
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
                  <Link href="/contact">Contact Sales</Link>
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
