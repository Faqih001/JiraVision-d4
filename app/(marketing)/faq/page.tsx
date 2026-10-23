import { MainNavbar } from "@/components/main-navbar"
import { MainFooter } from "@/components/main-footer"
import { Button } from "@/components/ui/button"
import { ArrowRight, HelpCircle, Search } from "lucide-react"
import Link from "next/link"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

export default function FAQPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MainNavbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-24 md:py-32 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/10"></div>
          <div className="absolute inset-0 bg-grid-white/10 bg-[length:20px_20px] [mask-image:radial-gradient(white,transparent_85%)]"></div>
          <div className="container relative">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary mb-4">
                <HelpCircle className="h-4 w-4" />
                <span>Support</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
                Frequently Asked <span className="text-primary">Questions</span>
              </h1>
              <p className="text-xl text-muted-foreground mb-8">
                Find answers to common questions about JiraVision's products, pricing, and features.
              </p>
              <div className="max-w-xl mx-auto relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
                <input
                  type="search"
                  placeholder="Search for answers..."
                  className="w-full pl-12 pr-4 py-3 rounded-full border border-input bg-background"
                />
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Categories */}
        <section className="py-12 border-b">
          <div className="container">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-background rounded-xl p-6 shadow-sm border text-center hover:shadow-md transition-all duration-300 hover:-translate-y-1">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-primary"
                  >
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                </div>
                <h3 className="font-semibold">Account & Billing</h3>
              </div>

              <div className="bg-background rounded-xl p-6 shadow-sm border text-center hover:shadow-md transition-all duration-300 hover:-translate-y-1">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-primary"
                  >
                    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                </div>
                <h3 className="font-semibold">Features & Settings</h3>
              </div>

              <div className="bg-background rounded-xl p-6 shadow-sm border text-center hover:shadow-md transition-all duration-300 hover:-translate-y-1">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-primary"
                  >
                    <path d="M21 12a9 9 0 0 1-9 9m9-9a9 9 0 0 0-9-9m9 9H3m9 9a9 9 0 0 1-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9"></path>
                  </svg>
                </div>
                <h3 className="font-semibold">Integrations</h3>
              </div>

              <div className="bg-background rounded-xl p-6 shadow-sm border text-center hover:shadow-md transition-all duration-300 hover:-translate-y-1">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-primary"
                  >
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <line x1="10" x2="21" y1="14" y2="3"></line>
                  </svg>
                </div>
                <h3 className="font-semibold">Getting Started</h3>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Accordion */}
        <section className="py-24">
          <div className="container">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold mb-8">General Questions</h2>

              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                  <AccordionTrigger>What is JiraVision?</AccordionTrigger>
                  <AccordionContent>
                    JiraVision is an AI-powered project management platform that enhances team collaboration, wellbeing,
                    and productivity. Our suite of tools includes AI Scrum Master, Team Wellbeing monitoring,
                    Gamification features, and Ethical Metrics to help teams work more effectively and humanely.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-2">
                  <AccordionTrigger>How does JiraVision integrate with existing tools?</AccordionTrigger>
                  <AccordionContent>
                    JiraVision seamlessly integrates with popular project management tools like Jira, Asana, Trello, and
                    more. We also offer integrations with communication platforms like Slack and Microsoft Teams, as
                    well as version control systems like GitHub and GitLab. Our API allows for custom integrations with
                    your existing workflow.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-3">
                  <AccordionTrigger>Is JiraVision suitable for remote teams?</AccordionTrigger>
                  <AccordionContent>
                    JiraVision is designed with remote and distributed teams in mind. Our Team Wellbeing features are
                    particularly helpful for remote teams, as they help maintain team cohesion and prevent isolation.
                    The platform works across time zones and provides asynchronous collaboration tools.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-4">
                  <AccordionTrigger>How secure is JiraVision?</AccordionTrigger>
                  <AccordionContent>
                    Security is a top priority at JiraVision. We use industry-standard encryption for data in transit
                    and at rest, implement strict access controls, and regularly undergo security audits. We are SOC 2
                    Type II compliant and GDPR compliant. Your data is never sold or shared with third parties.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-5">
                  <AccordionTrigger>What kind of support does JiraVision offer?</AccordionTrigger>
                  <AccordionContent>
                    We offer multiple tiers of support depending on your plan. All customers receive access to our
                    comprehensive documentation, knowledge base, and community forums. Business and Enterprise plans
                    include dedicated support representatives, priority response times, and optional onboarding
                    assistance.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              <h2 className="text-2xl md:text-3xl font-bold mt-16 mb-8">Pricing & Plans</h2>

              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="pricing-1">
                  <AccordionTrigger>What plans does JiraVision offer?</AccordionTrigger>
                  <AccordionContent>
                    JiraVision offers several plans to meet different needs: Free (for individuals and small teams), Pro
                    (for growing teams), Business (for organizations), and Enterprise (for large companies with custom
                    needs). Each plan includes different features and levels of support. Visit our pricing page for
                    detailed information.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="pricing-2">
                  <AccordionTrigger>Is there a free trial available?</AccordionTrigger>
                  <AccordionContent>
                    Yes, we offer a 14-day free trial of our Pro and Business plans with no credit card required. This
                    gives you full access to all features so you can evaluate if JiraVision is right for your team
                    before committing.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="pricing-3">
                  <AccordionTrigger>Can I change plans later?</AccordionTrigger>
                  <AccordionContent>
                    You can upgrade, downgrade, or cancel your plan at any time. When upgrading, the new features will
                    be immediately available, and we'll prorate the cost. When downgrading, the changes will take effect
                    at the end of your current billing cycle.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="pricing-4">
                  <AccordionTrigger>
                    Do you offer discounts for nonprofits or educational institutions?
                  </AccordionTrigger>
                  <AccordionContent>
                    Yes, we offer special pricing for qualified nonprofits, educational institutions, and open-source
                    projects. Please contact our sales team with details about your organization to learn more about our
                    discount programs.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              <h2 className="text-2xl md:text-3xl font-bold mt-16 mb-8">Features & Functionality</h2>

              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="features-1">
                  <AccordionTrigger>What is the AI Scrum Master feature?</AccordionTrigger>
                  <AccordionContent>
                    The AI Scrum Master is an intelligent assistant that helps teams follow Agile best practices. It
                    facilitates sprint planning, daily standups, retrospectives, and backlog refinement. The AI can
                    identify bottlenecks, suggest process improvements, and help keep projects on track without
                    micromanagement.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="features-2">
                  <AccordionTrigger>How does the Team Wellbeing feature work?</AccordionTrigger>
                  <AccordionContent>
                    Team Wellbeing uses AI to analyze patterns in team communications, workload distribution, and work
                    hours to identify potential burnout or stress. It provides insights to team leaders while respecting
                    individual privacy. The feature includes optional check-ins, anonymous feedback mechanisms, and
                    recommendations for improving team health.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="features-3">
                  <AccordionTrigger>What gamification elements does JiraVision offer?</AccordionTrigger>
                  <AccordionContent>
                    Our Gamification Suite includes customizable achievement systems, skill trees for professional
                    development, team challenges, leaderboards, and reward mechanisms. These elements can be tailored to
                    your team's culture and goals to increase engagement and motivation without creating unhealthy
                    competition.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="features-4">
                  <AccordionTrigger>What are Ethical Metrics?</AccordionTrigger>
                  <AccordionContent>
                    Ethical Metrics provide insights into diversity, equity, inclusion, workload fairness, and pay
                    equity within your organization. These metrics help identify potential biases or inequities in how
                    work is assigned, recognized, and rewarded, allowing leaders to create more fair and balanced teams.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 bg-muted/30">
          <div className="container">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Still have questions?</h2>
              <p className="text-xl text-muted-foreground mb-8">
                Our support team is here to help. Reach out to us and we'll get back to you as soon as possible.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/contact">
                  <Button size="lg" className="gap-2 rounded-full">
                    Contact Support <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="mailto:support@jiravision.com">
                  <Button size="lg" variant="outline" className="rounded-full">
                    Email Us
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
