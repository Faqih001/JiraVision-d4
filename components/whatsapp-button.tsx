"use client"

import { Button } from "@/components/ui/button"
import { Phone } from "lucide-react"

interface WhatsAppButtonProps {
  phoneNumber: string
  message?: string
  className?: string
}

export function WhatsAppButton({
  phoneNumber,
  message = "Hello! I'm interested in JiraVision.",
  className,
}: WhatsAppButtonProps) {
  // Format the phone number by removing any non-digit characters
  const formattedNumber = phoneNumber.replace(/\D/g, "")

  // Create the WhatsApp URL
  const whatsappUrl = `https://wa.me/${formattedNumber}?text=${encodeURIComponent(message)}`

  return (
    <Button
      onClick={() => window.open(whatsappUrl, "_blank")}
      className={`bg-green-500 hover:bg-green-600 text-white ${className}`}
    >
      <Phone className="mr-2 h-4 w-4" /> WhatsApp Us
    </Button>
  )
}
