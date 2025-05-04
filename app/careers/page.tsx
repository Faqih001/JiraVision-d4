import { MainNavbar } from "@/components/main-navbar"
import { MainFooter } from "@/components/main-footer"
import { Button } from "@/components/ui/button"
import { ArrowRight, Briefcase, Heart, Star, Coffee, Globe, Users, Search } from "lucide-react"
import Link from "next/link"

export default function CareersPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MainNavbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-24 md:py-32 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/10"></div>
          <div className="absolute inset-0 bg-grid-white/10 bg-[length:20px_20px] [mask-image:radial-gradient(white,transparent_85%)]"></div>
          <div className="container relative">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary mb-4">
                <Briefcase className="h-4 w-4" />
                <span>Join Our Team</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
                Build the <span className="text-primary">Future of Work</span>
              </h1>
              <p className="text-xl text-muted-foreground mb-8">
                Join a team that's passionate about creating more humane, ethical, and effective ways of working
                together.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="#positions">
                  <Button size="lg" className="gap-2 rounded-full">
                    View Open Positions <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/about">
                  <Button size="lg" variant="outline" className="rounded-full">
                    Learn About Us
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Why Join Us Section */}
        <section className="py-24">
          <div className="container">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary mb-4">
                <Heart className="h-4 w-4" />
                <span>Why JiraVision</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-bold mb-4">Why Work With Us</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                We're building a company where people love to work. Here's what makes JiraVision special.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="group bg-background rounded-xl p-8 shadow-md border hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                  <Star className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3">Meaningful Work</h3>
                <p className="text-muted-foreground">
                  Build products that make a real difference in how people work and collaborate around the world.
                </p>
              </div>

              <div className="group bg-background rounded-xl p-8 shadow-md border hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                  <Coffee className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3">Work-Life Balance</h3>
                <p className="text-muted-foreground">
                  We practice what we preach with flexible work arrangements, generous time off, and a focus on
                  wellbeing.
                </p>
              </div>

              <div className="group bg-background rounded-xl p-8 shadow-md border hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                  <Globe className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3">Remote-First Culture</h3>
                <p className="text-muted-foreground">
                  Work from anywhere with our distributed team spanning multiple continents and time zones.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-24 bg-muted/30">
          <div className="container">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
              <div className="relative">
                <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-primary to-purple-600 opacity-30 blur-xl"></div>
                <div className="relative h-[500px] w-full rounded-xl overflow-hidden border shadow-xl">
                  <img
                    src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2000&q=80"
                    alt="JiraVision Team"
                    className="object-cover w-full h-full"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-8">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary mb-4">
                    <Heart className="h-4 w-4" />
                    <span>Our Benefits</span>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold mb-6">What We Offer</h2>
                  <p className="text-lg text-muted-foreground mb-8">
                    We believe in taking care of our team with competitive compensation and comprehensive benefits.
                  </p>
                </div>

                <div className="space-y-6">
                  <div className="flex items-start gap-4 p-4 bg-background rounded-xl shadow-sm border">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-primary"
                      >
                        <path d="M12 2v20"></path>
                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-1">Competitive Compensation</h3>
                      <p className="text-muted-foreground">
                        Salary, equity, and bonuses that recognize your contributions to our success.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 bg-background rounded-xl shadow-sm border">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-primary"
                      >
                        <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"></path>
                        <path d="m3 9 2.45-4.9A2 2 0 0 1 7.24 3h9.52a2 2 0 0 1 1.8 1.1L21 9"></path>
                        <path d="M12 3v6"></path>
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-1">Comprehensive Healthcare</h3>
                      <p className="text-muted-foreground">
                        Medical, dental, and vision coverage for you and your dependents.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 bg-background rounded-xl shadow-sm border">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-primary"
                      >
                        <rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect>
                        <line x1="16" x2="16" y1="2" y2="6"></line>
                        <line x1="8" x2="8" y1="2" y2="6"></line>
                        <line x1="3" x2="21" y1="10" y2="10"></line>
                        <path d="M8 14h.01"></path>
                        <path d="M12 14h.01"></path>
                        <path d="M16 14h.01"></path>
                        <path d="M8 18h.01"></path>
                        <path d="M12 18h.01"></path>
                        <path d="M16 18h.01"></path>
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-1">Flexible Time Off</h3>
                      <p className="text-muted-foreground">
                        Unlimited vacation policy that encourages you to rest and recharge.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 bg-background rounded-xl shadow-sm border">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-primary"
                      >
                        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-1">Learning & Development</h3>
                      <p className="text-muted-foreground">
                        Budget for courses, conferences, and resources to help you grow professionally.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Open Positions Section */}
        <section id="positions" className="py-24">
          <div className="container">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary mb-4">
                <Briefcase className="h-4 w-4" />
                <span>Open Roles</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-bold mb-4">Current Openings</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Join our team and help us build the future of work. We're always looking for talented people.
              </p>
            </div>

            <div className="max-w-4xl mx-auto">
              <div className="flex items-center gap-4 mb-8">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
                  <input
                    type="search"
                    placeholder="Search positions..."
                    className="w-full pl-10 pr-4 py-2 rounded-full border border-input bg-background"
                  />
                </div>
                <select className="px-4 py-2 rounded-full border border-input bg-background">
                  <option value="all">All Departments</option>
                  <option value="engineering">Engineering</option>
                  <option value="product">Product</option>
                  <option value="design">Design</option>
                  <option value="marketing">Marketing</option>
                  <option value="sales">Sales</option>
                </select>
              </div>

              <div className="space-y-4">
                <div className="bg-background rounded-xl p-6 shadow-sm border hover:shadow-md transition-all duration-300">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-bold mb-1">Senior Frontend Engineer</h3>
                      <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Briefcase className="h-4 w-4" /> Engineering
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Globe className="h-4 w-4" /> Remote
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M12 2v20"></path>
                            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                          </svg>{" "}
                          Full-time
                        </span>
                      </div>
                    </div>
                    <Button className="rounded-full">Apply Now</Button>
                  </div>
                </div>

                <div className="bg-background rounded-xl p-6 shadow-sm border hover:shadow-md transition-all duration-300">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-bold mb-1">Product Designer</h3>
                      <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Briefcase className="h-4 w-4" /> Design
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Globe className="h-4 w-4" /> Remote
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M12 2v20"></path>
                            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                          </svg>{" "}
                          Full-time
                        </span>
                      </div>
                    </div>
                    <Button className="rounded-full">Apply Now</Button>
                  </div>
                </div>

                <div className="bg-background rounded-xl p-6 shadow-sm border hover:shadow-md transition-all duration-300">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-bold mb-1">AI Research Scientist</h3>
                      <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Briefcase className="h-4 w-4" /> Engineering
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Globe className="h-4 w-4" /> Remote
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M12 2v20"></path>
                            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                          </svg>{" "}
                          Full-time
                        </span>
                      </div>
                    </div>
                    <Button className="rounded-full">Apply Now</Button>
                  </div>
                </div>

                <div className="bg-background rounded-xl p-6 shadow-sm border hover:shadow-md transition-all duration-300">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-bold mb-1">Customer Success Manager</h3>
                      <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Briefcase className="h-4 w-4" /> Customer Success
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Globe className="h-4 w-4" /> Remote
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M12 2v20"></path>
                            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                          </svg>{" "}
                          Full-time
                        </span>
                      </div>
                    </div>
                    <Button className="rounded-full">Apply Now</Button>
                  </div>
                </div>
              </div>

              <div className="text-center mt-12">
                <p className="text-muted-foreground mb-4">Don't see a role that fits your skills?</p>
                <Button variant="outline" className="rounded-full">
                  Send General Application
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="py-24 bg-muted/30">
          <div className="container">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary mb-4">
                <Users className="h-4 w-4" />
                <span>Team Voices</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-bold mb-4">What Our Team Says</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Hear directly from the people who make JiraVision an amazing place to work.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-background rounded-xl p-8 shadow-md border relative">
                <div className="absolute -top-5 -right-5 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
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
                    <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"></path>
                    <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"></path>
                  </svg>
                </div>
                <p className="italic text-muted-foreground mb-6 mt-4">
                  "Working at JiraVision has been the highlight of my career. I get to solve challenging problems while
                  working with brilliant, kind people who care deeply about our mission."
                </p>
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-gray-200 overflow-hidden">
                    <img
                      src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=200&q=80"
                      alt="James Wilson"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div>
                    <h4 className="font-semibold">James Wilson</h4>
                    <p className="text-sm text-muted-foreground">Senior Engineer, 2 years</p>
                  </div>
                </div>
              </div>

              <div className="bg-background rounded-xl p-8 shadow-md border relative">
                <div className="absolute -top-5 -right-5 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
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
                    <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"></path>
                    <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"></path>
                  </svg>
                </div>
                <p className="italic text-muted-foreground mb-6 mt-4">
                  "The remote-first culture at JiraVision is truly exceptional. I've never felt more supported or
                  connected despite working from different continents."
                </p>
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-gray-200 overflow-hidden">
                    <img
                      src="https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=200&q=80"
                      alt="Sophia Chen"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div>
                    <h4 className="font-semibold">Sophia Chen</h4>
                    <p className="text-sm text-muted-foreground">Product Designer, 3 years</p>
                  </div>
                </div>
              </div>

              <div className="bg-background rounded-xl p-8 shadow-md border relative">
                <div className="absolute -top-5 -right-5 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
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
                    <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"></path>
                    <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"></path>
                  </svg>
                </div>
                <p className="italic text-muted-foreground mb-6 mt-4">
                  "I joined JiraVision for the mission, but I stay for the people. The growth opportunities here are
                  incredible, and I've learned more in one year than in my previous five."
                </p>
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-gray-200 overflow-hidden">
                    <img
                      src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=200&q=80"
                      alt="Marcus Johnson"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div>
                    <h4 className="font-semibold">Marcus Johnson</h4>
                    <p className="text-sm text-muted-foreground">Customer Success, 1 year</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/90 to-purple-700/90"></div>
          <div className="absolute inset-0 bg-grid-white/10 bg-[length:20px_20px] [mask-image:radial-gradient(white,transparent_85%)]"></div>
          <div className="container relative">
            <div className="max-w-3xl mx-auto text-center text-white">
              <h2 className="text-3xl md:text-5xl font-bold mb-6">Ready to Join Our Team?</h2>
              <p className="text-xl mb-8 text-white/80">
                Explore our open positions and take the first step toward a rewarding career at JiraVision.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="#positions">
                  <Button size="lg" variant="secondary" className="rounded-full">
                    View Open Positions
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button
                    size="lg"
                    variant="outline"
                    className="rounded-full bg-transparent text-white border-white hover:bg-white/10"
                  >
                    Contact Recruiting
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
