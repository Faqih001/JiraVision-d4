import { MainNavbar } from "@/components/main-navbar"
import { MainFooter } from "@/components/main-footer"
import { Button } from "@/components/ui/button"
import { ArrowRight, Accessibility } from "lucide-react"
import Link from "next/link"

export default function AccessibilityPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MainNavbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-16 bg-muted/30">
          <div className="container">
            <div className="max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary mb-4">
                <Accessibility className="h-4 w-4" />
                <span>Inclusion</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-6">Accessibility Statement</h1>
              <p className="text-xl text-muted-foreground">Last updated: May 1, 2025</p>
            </div>
          </div>
        </section>

        {/* Content Section */}
        <section className="py-12">
          <div className="container">
            <div className="max-w-3xl mx-auto">
              <div className="prose prose-lg dark:prose-invert">
                <p>
                  JiraVision is committed to ensuring digital accessibility for people with disabilities. We are
                  continually improving the user experience for everyone and applying the relevant accessibility
                  standards.
                </p>

                <h2>1. Our Commitment</h2>
                <p>
                  We strive to ensure that our website and services are accessible to all users, regardless of ability
                  or technology. Our goal is to meet and exceed the requirements of the Web Content Accessibility
                  Guidelines (WCAG) 2.1 Level AA.
                </p>

                <h2>2. Conformance Status</h2>
                <p>
                  The Web Content Accessibility Guidelines (WCAG) define requirements for designers and developers to
                  improve accessibility for people with disabilities. It defines three levels of conformance: Level A,
                  Level AA, and Level AAA.
                </p>
                <p>
                  JiraVision is partially conformant with WCAG 2.1 level AA. Partially conformant means that some parts
                  of the content do not fully conform to the accessibility standard.
                </p>

                <h2>3. Accessibility Features</h2>
                <p>Our website includes the following accessibility features:</p>
                <ul>
                  <li>Semantic HTML to ensure proper structure and navigation</li>
                  <li>ARIA landmarks to identify regions of the page</li>
                  <li>Alt text for images</li>
                  <li>Keyboard navigation</li>
                  <li>Color contrast that meets WCAG 2.1 AA standards</li>
                  <li>Resizable text without loss of functionality</li>
                  <li>Focus indicators for keyboard navigation</li>
                </ul>

                <h2>4. Known Limitations</h2>
                <p>Despite our best efforts, there may be some aspects of our website that are not fully accessible:</p>
                <ul>
                  <li>Some older PDF documents may not be fully accessible</li>
                  <li>Some third-party content may not be fully accessible</li>
                  <li>Some interactive elements may not be fully accessible via keyboard navigation</li>
                </ul>

                <h2>5. Feedback</h2>
                <p>
                  We welcome your feedback on the accessibility of JiraVision. Please let us know if you encounter
                  accessibility barriers:
                </p>
                <ul>
                  <li>Email: accessibility@jiravision.com</li>
                  <li>Phone: +254 741 140 250</li>
                  <li>
                    Contact form: <Link href="/contact">Contact Us</Link>
                  </li>
                </ul>
                <p>We try to respond to feedback within 3 business days.</p>

                <h2>6. Assessment and Remediation</h2>
                <p>
                  JiraVision assesses the accessibility of our website regularly. We address accessibility issues as
                  they are identified and prioritize fixes based on severity and impact.
                </p>

                <h2>7. Additional Resources</h2>
                <p>For more information about web accessibility, please visit:</p>
                <ul>
                  <li>
                    <a
                      href="https://www.w3.org/WAI/standards-guidelines/wcag/"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Web Content Accessibility Guidelines (WCAG)
                    </a>
                  </li>
                  <li>
                    <a href="https://www.w3.org/WAI/" target="_blank" rel="noopener noreferrer">
                      Web Accessibility Initiative (WAI)
                    </a>
                  </li>
                </ul>
              </div>

              <div className="mt-12 border-t pt-8">
                <p className="text-muted-foreground mb-6">
                  If you have any questions about our accessibility efforts or need assistance, please contact our
                  accessibility team.
                </p>
                <Link href="/contact">
                  <Button className="gap-2 rounded-full">
                    Contact Us <ArrowRight className="h-4 w-4" />
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
