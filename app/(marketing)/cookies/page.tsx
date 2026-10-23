import { MainNavbar } from "@/components/main-navbar"
import { MainFooter } from "@/components/main-footer"
import { Button } from "@/components/ui/button"
import { ArrowRight, Cookie } from "lucide-react"
import Link from "next/link"

export default function CookiesPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MainNavbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-16 bg-muted/30">
          <div className="container">
            <div className="max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary mb-4">
                <Cookie className="h-4 w-4" />
                <span>Legal</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-6">Cookie Policy</h1>
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
                  This Cookie Policy explains how JiraVision ("we", "us", or "our") uses cookies and similar
                  technologies on our website and services. This policy is part of our Privacy Policy.
                </p>

                <h2>1. What Are Cookies?</h2>
                <p>
                  Cookies are small text files that are stored on your device when you visit a website. They are widely
                  used to make websites work more efficiently and provide information to the website owners.
                </p>

                <h2>2. Types of Cookies We Use</h2>
                <p>We use the following types of cookies:</p>

                <h3>Essential Cookies</h3>
                <p>
                  These cookies are necessary for the website to function properly. They enable basic functions like
                  page navigation and access to secure areas of the website. The website cannot function properly
                  without these cookies.
                </p>

                <h3>Performance Cookies</h3>
                <p>
                  These cookies collect information about how visitors use our website, such as which pages they visit
                  most often and if they receive error messages. These cookies don't collect information that identifies
                  a visitor.
                </p>

                <h3>Functionality Cookies</h3>
                <p>
                  These cookies allow the website to remember choices you make (such as your username, language, or
                  region) and provide enhanced, more personal features.
                </p>

                <h3>Targeting Cookies</h3>
                <p>
                  These cookies are used to deliver advertisements that are more relevant to you and your interests.
                  They are also used to limit the number of times you see an advertisement and help measure the
                  effectiveness of advertising campaigns.
                </p>

                <h2>3. Third-Party Cookies</h2>
                <p>
                  Some cookies are placed by third parties on our website. These third parties may include analytics
                  providers, advertising networks, and social media platforms. These third parties may use cookies, web
                  beacons, and similar technologies to collect information about your use of our website and other
                  websites.
                </p>

                <h2>4. How to Manage Cookies</h2>
                <p>
                  Most web browsers allow you to control cookies through their settings. You can usually find these
                  settings in the "Options" or "Preferences" menu of your browser. You can also use the "Help" feature
                  in your browser for more information.
                </p>
                <p>
                  Please note that if you disable or delete certain cookies, some features of our website may not
                  function properly.
                </p>

                <h2>5. Changes to This Cookie Policy</h2>
                <p>
                  We may update this Cookie Policy from time to time. We will notify you of material changes by posting
                  the new Cookie Policy on our website.
                </p>

                <h2>6. Contact Us</h2>
                <p>If you have any questions about this Cookie Policy, please contact us at privacy@jiravision.com.</p>
              </div>

              <div className="mt-12 border-t pt-8">
                <p className="text-muted-foreground mb-6">
                  If you have any questions about our Cookie Policy, please contact our privacy team.
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
