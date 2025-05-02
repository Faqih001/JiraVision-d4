"use client"

import type React from "react"

import { useState } from "react"
import { MainNavbar } from "@/components/main-navbar"
import { MainFooter } from "@/components/main-footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Mail, Phone, MapPin, Clock, Send, CheckCircle } from "lucide-react"
import GoogleMap from "@/components/google-map"

export default function ContactPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/send-contact-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          subject,
          message,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setIsSubmitted(true)
        setName("")
        setEmail("")
        setSubject("")
        setMessage("")
      } else {
        setError(data.error || "Failed to send message. Please try again.")
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.")
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <MainNavbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-20 bg-muted/50">
          <div className="container text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Contact Us</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Have questions or need assistance? We're here to help. Reach out to our team.
            </p>
          </div>
        </section>

        {/* Contact Section */}
        <section className="py-12 container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div>
              <h2 className="text-2xl font-bold mb-6">Get in Touch</h2>

              {isSubmitted ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-2">Message Sent!</h3>
                  <p className="text-muted-foreground mb-4">
                    Thank you for reaching out. We'll get back to you as soon as possible.
                  </p>
                  <Button onClick={() => setIsSubmitted(false)}>Send Another Message</Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="name">Your Name</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} required />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      id="message"
                      rows={5}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      required
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>Sending...</>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Send Message
                      </>
                    )}
                  </Button>
                </form>
              )}
            </div>

            {/* Contact Information */}
            <div>
              <h2 className="text-2xl font-bold mb-6">Contact Information</h2>

              <div className="space-y-8">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Our Location</h3>
                    <p className="text-muted-foreground">
                      Kabarak, Nakuru
                      <br />
                      Kenya
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Phone className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Phone Number</h3>
                    <p className="text-muted-foreground">
                      <a href="tel:+254741140250" className="hover:text-primary">
                        +254 741 140 250
                      </a>
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Email Address</h3>
                    <p className="text-muted-foreground">
                      <a href="mailto:fakiiahmad@gmail.com" className="hover:text-primary">
                        fakiiahmad@gmail.com
                      </a>
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Business Hours</h3>
                    <div className="text-muted-foreground">
                      <p>Monday - Friday: 9:00 AM - 5:00 PM</p>
                      <p>Saturday: 10:00 AM - 2:00 PM</p>
                      <p>Sunday: Closed</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Map Section */}
        <section className="py-12">
          <div className="container">
            <h2 className="text-2xl font-bold mb-6">Find Us</h2>
            <div className="h-[400px] rounded-lg overflow-hidden border">
              <GoogleMap
                apiKey="AIzaSyDPgttFbKx3V_mzD-UMAV0fWHDyU-QBk3c"
                center={{ lat: -0.1673, lng: 35.9382 }} // Approximate coordinates for Kabarak, Nakuru
                zoom={15}
              />
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-12 bg-muted/50">
          <div className="container">
            <h2 className="text-2xl font-bold mb-6 text-center">Frequently Asked Questions</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <div className="bg-background p-6 rounded-lg">
                <h3 className="font-bold mb-2">What are your support hours?</h3>
                <p className="text-muted-foreground">
                  Our support team is available Monday through Friday from 9:00 AM to 5:00 PM EAT. For urgent issues, we
                  also offer limited weekend support.
                </p>
              </div>

              <div className="bg-background p-6 rounded-lg">
                <h3 className="font-bold mb-2">How quickly will I receive a response?</h3>
                <p className="text-muted-foreground">
                  We aim to respond to all inquiries within 24 hours during business days. For urgent matters, please
                  indicate in your message.
                </p>
              </div>

              <div className="bg-background p-6 rounded-lg">
                <h3 className="font-bold mb-2">Do you offer on-site consultations?</h3>
                <p className="text-muted-foreground">
                  Yes, we offer on-site consultations for enterprise clients. Please contact our sales team to schedule
                  a visit.
                </p>
              </div>

              <div className="bg-background p-6 rounded-lg">
                <h3 className="font-bold mb-2">How can I request a product demo?</h3>
                <p className="text-muted-foreground">
                  You can request a product demo by filling out the contact form above or by emailing us directly at
                  fakiiahmad@gmail.com.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <MainFooter />
    </div>
  )
}
