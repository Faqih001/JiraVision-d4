import { MainNavbar } from "@/components/main-navbar"
import { MainFooter } from "@/components/main-footer"
import { Button } from "@/components/ui/button"
import { ArrowRight, Scale } from "lucide-react"
import Link from "next/link"

export default function LegalNoticePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MainNavbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-16 bg-muted/30">
          <div className="container">
            <div className="max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary mb-4">
                <Scale className="h-4 w-4" />
                <span>Legal</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-6">Legal Notice</h1>
              <p className="text-xl text-muted-foreground">Last updated: May 1, 2025</p>
            </div>
          </div>
        </section>

        {/* Content Section */}
        <section className="py-12">
          <div className="container">
            <div className="max-w-3xl mx-auto">
              <div className="prose prose-lg dark:prose-invert">
                <h2>Company Information</h2>
                <p>
                  JiraVision, Inc.
                  <br />
                  123 Innovation Way
                  <br />
                  San Francisco, CA 94107
                  <br />
                  United States
                </p>
                <p>
                  Email: legal@jiravision.com
                  <br />
                  Phone: +254 741 140 250
                </p>
                <p>
                  Registered in Delaware
                  <br />
                  Company Registration Number: 12345678
                  <br />
                  VAT ID: US123456789
                </p>

                <h2>Legal Representatives</h2>
                <p>
                  Michael Chen, Chief Executive Officer
                  <br />
                  Sarah Johnson, Chief Technology Officer
                </p>

                <h2>Regulatory Information</h2>
                <p>
                  JiraVision is registered with the U.S. Securities and Exchange Commission (SEC) and complies with all
                  applicable laws and regulations in the jurisdictions where it operates.
                </p>

                <h2>Copyright Notice</h2>
                <p>
                  © {new Date().getFullYear()} JiraVision, Inc. All rights reserved. The text, images, graphics, sound
                  files, animation files, video files, and their arrangement on JiraVision websites are all subject to
                  copyright and other intellectual property protection. These objects may not be copied for commercial
                  use or distribution, nor may these objects be modified or reposted to other sites without explicit
                  written permission.
                </p>

                <h2>Trademarks</h2>
                <p>
                  JiraVision™, the JiraVision logo, and all product names mentioned on this website are trademarks or
                  registered trademarks of JiraVision, Inc. or its subsidiaries. Other product and company names
                  mentioned herein may be trademarks of their respective owners.
                </p>

                <h2>Disclaimer</h2>
                <p>
                  The information provided on this website is for general informational purposes only. While we strive
                  to keep the information up to date and correct, we make no representations or warranties of any kind,
                  express or implied, about the completeness, accuracy, reliability, suitability, or availability with
                  respect to the website or the information, products, services, or related graphics contained on the
                  website for any purpose.
                </p>
                <p>
                  In no event will we be liable for any loss or damage including without limitation, indirect or
                  consequential loss or damage, or any loss or damage whatsoever arising from loss of data or profits
                  arising out of, or in connection with, the use of this website.
                </p>

                <h2>External Links</h2>
                <p>
                  This website may contain links to external websites that are not provided or maintained by or in any
                  way affiliated with JiraVision. Please note that JiraVision does not guarantee the accuracy,
                  relevance, timeliness, or completeness of any information on these external websites.
                </p>

                <h2>Governing Law</h2>
                <p>
                  These terms and conditions are governed by and construed in accordance with the laws of the State of
                  California, and any disputes relating to these terms and conditions will be subject to the exclusive
                  jurisdiction of the courts of San Francisco, California.
                </p>

                <h2>Changes to Legal Notice</h2>
                <p>
                  JiraVision reserves the right to make changes to this Legal Notice at any time. We encourage visitors
                  to frequently check this page for any changes. Your continued use of this website after any changes
                  are made constitutes your acceptance of the new Legal Notice.
                </p>
              </div>

              <div className="mt-12 border-t pt-8">
                <p className="text-muted-foreground mb-6">
                  If you have any questions about our Legal Notice, please contact our legal team.
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
