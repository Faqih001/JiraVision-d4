import { MainNavbar } from "@/components/main-navbar"
import { MainFooter } from "@/components/main-footer"
import { Button } from "@/components/ui/button"
import { ArrowRight, Shield } from "lucide-react"
import Link from "next/link"

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MainNavbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-16 bg-muted/30">
          <div className="container">
            <div className="max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary mb-4">
                <Shield className="h-4 w-4" />
                <span>Legal</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-6">Privacy Policy</h1>
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
                  At JiraVision, we take your privacy seriously. This Privacy Policy explains how we collect, use,
                  disclose, and safeguard your information when you use our website, products, and services
                  ("Services").
                </p>

                <h2>1. Information We Collect</h2>
                <p>
                  We collect information that you provide directly to us, information we collect automatically when you
                  use our Services, and information from third-party sources.
                </p>

                <h3>Information You Provide</h3>
                <p>
                  We collect information you provide when you create an account, fill out forms, communicate with us, or
                  otherwise use our Services. This may include:
                </p>
                <ul>
                  <li>Personal information (name, email address, phone number)</li>
                  <li>Account credentials</li>
                  <li>Payment information</li>
                  <li>Profile information</li>
                  <li>Content you upload or share through our Services</li>
                </ul>

                <h3>Information We Collect Automatically</h3>
                <p>When you use our Services, we automatically collect certain information, including:</p>
                <ul>
                  <li>Device information (IP address, browser type, operating system)</li>
                  <li>Usage information (pages visited, time spent on pages)</li>
                  <li>Location information</li>
                  <li>Cookies and similar technologies</li>
                </ul>

                <h2>2. How We Use Your Information</h2>
                <p>We use the information we collect for various purposes, including:</p>
                <ul>
                  <li>Providing, maintaining, and improving our Services</li>
                  <li>Processing transactions and managing your account</li>
                  <li>Communicating with you about our Services</li>
                  <li>Personalizing your experience</li>
                  <li>Analyzing usage patterns and trends</li>
                  <li>Protecting against fraud and abuse</li>
                  <li>Complying with legal obligations</li>
                </ul>

                <h2>3. Sharing of Information</h2>
                <p>We may share your information with:</p>
                <ul>
                  <li>Service providers who perform services on our behalf</li>
                  <li>Business partners with your consent</li>
                  <li>In response to legal requests or to protect our rights</li>
                  <li>In connection with a merger, sale, or acquisition</li>
                </ul>

                <h2>4. Data Security</h2>
                <p>
                  We implement appropriate technical and organizational measures to protect your information from
                  unauthorized access, disclosure, alteration, and destruction. However, no method of transmission over
                  the Internet or electronic storage is 100% secure.
                </p>

                <h2>5. Data Retention</h2>
                <p>
                  We retain your information for as long as necessary to provide our Services, comply with legal
                  obligations, resolve disputes, and enforce our agreements.
                </p>

                <h2>6. Your Rights and Choices</h2>
                <p>
                  Depending on your location, you may have certain rights regarding your personal information,
                  including:
                </p>
                <ul>
                  <li>Accessing, correcting, or deleting your information</li>
                  <li>Objecting to or restricting certain processing</li>
                  <li>Data portability</li>
                  <li>Withdrawing consent</li>
                </ul>

                <h2>7. Children's Privacy</h2>
                <p>
                  Our Services are not directed to children under 16, and we do not knowingly collect personal
                  information from children under 16.
                </p>

                <h2>8. International Data Transfers</h2>
                <p>
                  Your information may be transferred to and processed in countries other than your country of
                  residence. We ensure appropriate safeguards are in place to protect your information.
                </p>

                <h2>9. Changes to This Privacy Policy</h2>
                <p>
                  We may update this Privacy Policy from time to time. We will notify you of material changes by posting
                  the new Privacy Policy on our website or sending you an email.
                </p>

                <h2>10. Contact Us</h2>
                <p>If you have any questions about this Privacy Policy, please contact us at privacy@jiravision.com.</p>
              </div>

              <div className="mt-12 border-t pt-8">
                <p className="text-muted-foreground mb-6">
                  If you have any questions about our Privacy Policy or how we handle your data, please contact our
                  privacy team.
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
