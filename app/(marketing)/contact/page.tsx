import { MainNavbar } from "@/components/main-navbar"
import { MainFooter } from "@/components/main-footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Phone, Mail, MapPin, Clock, ArrowRight, MessageSquare, Building2, HelpCircle, Headphones } from "lucide-react"
import { GoogleMap } from "@/components/google-map"
import Image from "next/image"
import Link from "next/link"
import { WhatsAppButton } from "@/components/whatsapp-button"

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
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary mb-4">
                <MessageSquare className="h-4 w-4" />
                <span>Contact Us</span>
              </div>
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
                <div className="bg-white rounded-xl p-8 shadow-xl border relative overflow-hidden">
                  <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-primary to-purple-600 opacity-5 blur-xl"></div>
                  <div className="relative z-10">
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
                  <div className="bg-white rounded-xl p-6 shadow-lg border transform transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      <Phone className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Phone</h3>
                    <p className="text-muted-foreground">+254 741 140 250</p>
                    <p className="text-muted-foreground">Mon-Fri, 9am-6pm PST</p>
                  </div>

                  <div className="bg-white rounded-xl p-6 shadow-lg border transform transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      <Mail className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Email</h3>
                    <p className="text-muted-foreground">info@jiravision.com</p>
                    <p className="text-muted-foreground">support@jiravision.com</p>
                  </div>

                  <div className="bg-white rounded-xl p-6 shadow-lg border transform transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      <MapPin className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Address</h3>
                    <p className="text-muted-foreground">Kabarak University</p>
                    <p className="text-muted-foreground">Nakuru, Kenya</p>
                  </div>

                  <div className="bg-white rounded-xl p-6 shadow-lg border transform transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      <Clock className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Hours</h3>
                    <p className="text-muted-foreground">Monday - Friday</p>
                    <p className="text-muted-foreground">9:00 AM - 6:00 PM PST</p>
                  </div>
                </div>

                <div className="mt-8">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Our Location</h3>
                    <WhatsAppButton phoneNumber="254741140250" />
                  </div>
                  <div className="h-[300px] rounded-xl overflow-hidden border shadow-lg">
                    <GoogleMap
                      center={{
                        lat: -0.1673,
                        lng: 36.1091,
                      }}
                      apiKey="AIzaSyDPgttFbKx3V_mzD-UMAV0fWHDyU-QBk3c"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Department Contacts Section */}
        <section className="py-16 bg-gradient-to-br from-slate-50 to-slate-100">
          <div className="container">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary mb-4">
                <Building2 className="h-4 w-4" />
                <span>Departments</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold mb-4">Connect with the Right Team</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Reach out directly to the department that can best assist you with your needs.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white rounded-xl overflow-hidden shadow-lg border transform transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                <div className="h-40 relative">
                  <Image
                    src="https://images.unsplash.com/photo-1556761175-5973dc0f32e7?q=80&w=1170&auto=format&fit=crop"
                    alt="Sales Team"
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
                  <div className="absolute bottom-4 left-4 text-white">
                    <h3 className="text-xl font-bold">Sales</h3>
                  </div>
                </div>
                <div className="p-6">
                  <p className="text-muted-foreground mb-4">
                    For pricing inquiries, demos, and information about our products and services.
                  </p>
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="h-4 w-4 text-primary" />
                    <span>sales@jiravision.com</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-primary" />
                    <span>+254 741 140 251</span>
                  </div>
                  <Link href="/contact/sales">
                    <Button variant="link" className="p-0 h-auto mt-4 text-primary">
                      Contact Sales <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="bg-white rounded-xl overflow-hidden shadow-lg border transform transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                <div className="h-40 relative">
                  <Image
                    src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?q=80&w=1170&auto=format&fit=crop"
                    alt="Support Team"
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
                  <div className="absolute bottom-4 left-4 text-white">
                    <h3 className="text-xl font-bold">Support</h3>
                  </div>
                </div>
                <div className="p-6">
                  <p className="text-muted-foreground mb-4">
                    For technical assistance, troubleshooting, and help with using our platform.
                  </p>
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="h-4 w-4 text-primary" />
                    <span>support@jiravision.com</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-primary" />
                    <span>+254 741 140 252</span>
                  </div>
                  <Link href="/contact/support">
                    <Button variant="link" className="p-0 h-auto mt-4 text-primary">
                      Get Support <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="bg-white rounded-xl overflow-hidden shadow-lg border transform transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                <div className="h-40 relative">
                  <Image
                    src="https://images.unsplash.com/photo-1557804506-669a67965ba0?q=80&w=1074&auto=format&fit=crop"
                    alt="Partnerships Team"
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
                  <div className="absolute bottom-4 left-4 text-white">
                    <h3 className="text-xl font-bold">Partnerships</h3>
                  </div>
                </div>
                <div className="p-6">
                  <p className="text-muted-foreground mb-4">
                    For integration partners, resellers, and other business collaboration opportunities.
                  </p>
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="h-4 w-4 text-primary" />
                    <span>partners@jiravision.com</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-primary" />
                    <span>+254 741 140 253</span>
                  </div>
                  <Link href="/contact/partnerships">
                    <Button variant="link" className="p-0 h-auto mt-4 text-primary">
                      Explore Partnerships <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 bg-white">
          <div className="container">
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-12">
                <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary mb-4">
                  <HelpCircle className="h-4 w-4" />
                  <span>FAQ</span>
                </div>
                <h2 className="text-2xl md:text-3xl font-bold mb-4">Frequently Asked Questions</h2>
                <p className="text-muted-foreground">Find quick answers to common questions about contacting us.</p>
              </div>

              <div className="space-y-6">
                <div className="bg-white rounded-xl p-6 shadow-lg border">
                  <h3 className="font-semibold mb-2">What's the typical response time?</h3>
                  <p className="text-muted-foreground">
                    We aim to respond to all inquiries within 24 hours during business days. For urgent matters, please
                    call our support line.
                  </p>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-lg border">
                  <h3 className="font-semibold mb-2">Do you offer technical support by phone?</h3>
                  <p className="text-muted-foreground">
                    Yes, technical support is available by phone for customers on Business and Enterprise plans. Other
                    customers can reach our support team via email or chat.
                  </p>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-lg border">
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
                <Link href="/faq">
                  <Button variant="outline" className="rounded-full gap-2">
                    View All FAQs <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-gradient-to-br from-primary/90 to-purple-700/90 relative overflow-hidden">
          <div className="absolute inset-0 bg-grid-white/10 bg-[length:20px_20px] [mask-image:radial-gradient(white,transparent_85%)]"></div>
          <div className="container relative z-10">
            <div className="max-w-3xl mx-auto text-center text-white">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-sm text-white mb-4">
                <Headphones className="h-4 w-4" />
                <span>Live Support</span>
              </div>
              <h2 className="text-3xl font-bold mb-4">Need Immediate Assistance?</h2>
              <p className="text-xl text-white/80 mb-8">
                Our support team is available to help you with any questions or issues you may have.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" variant="secondary" className="rounded-full gap-2">
                  <Phone className="h-4 w-4" /> Call Support
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-full bg-transparent text-white border-white hover:bg-white/10 gap-2"
                >
                  <MessageSquare className="h-4 w-4" /> Live Chat
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
