import { MainNavbar } from "@/components/main-navbar"
import { MainFooter } from "@/components/main-footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Phone, Mail, MapPin, Clock, ArrowRight } from "lucide-react"
import { GoogleMap } from "@/components/google-map"

export default function ContactPage() {
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
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
                Get in <span className="text-primary">Touch</span>
              </h1>
              <p className="text-xl text-muted-foreground mb-8">
                Have questions about our products or services? Our team is here to help you.
              </p>
            </div>
          </div>
        </section>

        {/* Contact Form Section */}
        <section className="py-16">
          <div className="container">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
              {/* Contact Form */}
              <div>
                <div className="bg-background rounded-xl p-8 shadow-lg border">
                  <h2 className="text-2xl md:text-3xl font-bold mb-6">Send Us a Message</h2>
                  <form className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label htmlFor="firstName" className="text-sm font-medium">
                          First Name
                        </label>
                        <Input id="firstName" placeholder="Enter your first name" />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="lastName" className="text-sm font-medium">
                          Last Name
                        </label>
                        <Input id="lastName" placeholder="Enter your last name" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="email" className="text-sm font-medium">
                        Email
                      </label>
                      <Input id="email" type="email" placeholder="Enter your email" />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="company" className="text-sm font-medium">
                        Company
                      </label>
                      <Input id="company" placeholder="Enter your company name" />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="subject" className="text-sm font-medium">
                        Subject
                      </label>
                      <Select>
                        <SelectTrigger id="subject">
                          <SelectValue placeholder="Select a subject" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">General Inquiry</SelectItem>
                          <SelectItem value="sales">Sales Question</SelectItem>
                          <SelectItem value="support">Technical Support</SelectItem>
                          <SelectItem value="partnership">Partnership Opportunity</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="message" className="text-sm font-medium">
                        Message
                      </label>
                      <Textarea id="message" placeholder="Enter your message" rows={5} />
                    </div>

                    <Button type="submit" className="w-full rounded-full">
                      Send Message
                    </Button>
                  </form>
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold mb-6">Contact Information</h2>
                  <p className="text-muted-foreground mb-8">
                    Our team is available to answer your questions and help you get the most out of JiraVision.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-background rounded-xl p-6 shadow-md border">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      <Phone className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Phone</h3>
                    <p className="text-muted-foreground">+254 741 140 250</p>
                    <p className="text-muted-foreground">support@jiravision.com</p>
                  </div>

                  <div className="bg-background rounded-xl p-6 shadow-md border">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      <Mail className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Email</h3>
                    <p className="text-muted-foreground">info@jiravision.com</p>
                    <p className="text-muted-foreground">sales@jiravision.com</p>
                  </div>

                  <div className="bg-background rounded-xl p-6 shadow-md border">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      <MapPin className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Address</h3>
                    <p className="text-muted-foreground">123 Innovation Way</p>
                    <p className="text-muted-foreground">San Francisco, CA 94107</p>
                  </div>

                  <div className="bg-background rounded-xl p-6 shadow-md border">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      <Clock className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Hours</h3>
                    <p className="text-muted-foreground">Monday - Friday</p>
                    <p className="text-muted-foreground">9:00 AM - 6:00 PM PST</p>
                  </div>
                </div>

                <div className="mt-8">
                  <h3 className="text-lg font-semibold mb-4">Our Location</h3>
                  <div className="h-[300px] rounded-xl overflow-hidden border">
                    <GoogleMap
                      center={{
                        lat: 37.7749,
                        lng: -122.4194,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 bg-muted/30">
          <div className="container">
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-2xl md:text-3xl font-bold mb-4">Frequently Asked Questions</h2>
                <p className="text-muted-foreground">Find quick answers to common questions about contacting us.</p>
              </div>

              <div className="space-y-6">
                <div className="bg-background rounded-xl p-6 shadow-sm border">
                  <h3 className="font-semibold mb-2">What's the typical response time?</h3>
                  <p className="text-muted-foreground">
                    We aim to respond to all inquiries within 24 hours during business days. For urgent matters, please
                    call our support line.
                  </p>
                </div>

                <div className="bg-background rounded-xl p-6 shadow-sm border">
                  <h3 className="font-semibold mb-2">Do you offer technical support by phone?</h3>
                  <p className="text-muted-foreground">
                    Yes, technical support is available by phone for customers on Business and Enterprise plans. Other
                    customers can reach our support team via email or chat.
                  </p>
                </div>

                <div className="bg-background rounded-xl p-6 shadow-sm border">
                  <h3 className="font-semibold mb-2">How can I schedule a demo?</h3>
                  <p className="text-muted-foreground">
                    You can schedule a demo by filling out the contact form above and selecting "Sales Question" as the
                    subject. One of our representatives will reach out to arrange a time.
                  </p>
                </div>
              </div>

              <div className="text-center mt-12">
                <p className="text-muted-foreground mb-4">
                  Can't find what you're looking for? Check our comprehensive FAQ section.
                </p>
                <Button variant="outline" className="rounded-full gap-2">
                  View All FAQs <ArrowRight className="h-4 w-4" />
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
