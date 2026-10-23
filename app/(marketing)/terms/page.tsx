import { MainNavbar } from "@/components/main-navbar"
import { MainFooter } from "@/components/main-footer"
import { Button } from "@/components/ui/button"
import { ArrowRight, FileText } from "lucide-react"
import Link from "next/link"

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MainNavbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-16 bg-muted/30">
          <div className="container">
            <div className="max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary mb-4">
                <FileText className="h-4 w-4" />
                <span>Legal</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-6">Terms of Service</h1>
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
                  Welcome to JiraVision. These Terms of Service ("Terms") govern your access to and use of JiraVision's
                  website, products, and services ("Services"). Please read these Terms carefully, and contact us if you
                  have any questions.
                </p>

                <h2>1. Acceptance of Terms</h2>
                <p>
                  By accessing or using our Services, you agree to be bound by these Terms and our Privacy Policy. If
                  you are using our Services on behalf of an organization, you are agreeing to these Terms on behalf of
                  that organization.
                </p>

                <h2>2. Description of Services</h2>
                <p>
                  JiraVision provides AI-powered project management tools designed to improve team collaboration,
                  wellbeing, and productivity. Our Services include, but are not limited to, AI Scrum Master, Team
                  Wellbeing, Gamification Suite, and Ethical Metrics.
                </p>

                <h2>3. Your Account</h2>
                <p>
                  To use our Services, you may need to create an account. You are responsible for safeguarding your
                  account and for all activities that occur under your account. You must provide accurate and complete
                  information when creating your account and keep your account information updated.
                </p>

                <h2>4. Subscription and Payments</h2>
                <p>
                  Some of our Services require payment. When you subscribe to a paid Service, you agree to pay the
                  subscription fees as described at the time of purchase. Subscription fees are billed in advance and
                  are non-refundable except as required by law or as explicitly stated in these Terms.
                </p>

                <h2>5. Data and Privacy</h2>
                <p>
                  Our Privacy Policy describes how we handle the information you provide to us when you use our
                  Services. By using our Services, you consent to our collection and use of your data as described in
                  our Privacy Policy.
                </p>

                <h2>6. Intellectual Property Rights</h2>
                <p>
                  JiraVision and its licensors own all intellectual property rights in the Services. You may not copy,
                  modify, distribute, sell, or lease any part of our Services without our permission.
                </p>

                <h2>7. User Content</h2>
                <p>
                  Our Services may allow you to upload, submit, store, send, or receive content. You retain ownership of
                  any intellectual property rights that you hold in that content. By uploading content to our Services,
                  you grant JiraVision a worldwide license to use, host, store, reproduce, modify, create derivative
                  works, communicate, publish, publicly perform, publicly display, and distribute such content.
                </p>

                <h2>8. Termination</h2>
                <p>
                  We may suspend or terminate your access to the Services at any time for any reason, including if you
                  violate these Terms. You may terminate your account at any time by following the instructions on our
                  website.
                </p>

                <h2>9. Disclaimers</h2>
                <p>
                  THE SERVICES ARE PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED.
                  JIRAVISION DOES NOT WARRANT THAT THE SERVICES WILL BE UNINTERRUPTED OR ERROR-FREE.
                </p>

                <h2>10. Limitation of Liability</h2>
                <p>
                  TO THE MAXIMUM EXTENT PERMITTED BY LAW, JIRAVISION SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL,
                  SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES.
                </p>

                <h2>11. Changes to Terms</h2>
                <p>
                  We may modify these Terms from time to time. We will notify you of material changes by posting the new
                  Terms on our website or sending you an email. Your continued use of the Services after the effective
                  date of the revised Terms constitutes your acceptance of the changes.
                </p>

                <h2>12. Governing Law</h2>
                <p>
                  These Terms shall be governed by the laws of the State of California, without regard to its conflict
                  of law provisions.
                </p>

                <h2>13. Contact Information</h2>
                <p>If you have any questions about these Terms, please contact us at legal@jiravision.com.</p>
              </div>

              <div className="mt-12 border-t pt-8">
                <p className="text-muted-foreground mb-6">
                  If you have any questions about our Terms of Service, please contact our legal team.
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
