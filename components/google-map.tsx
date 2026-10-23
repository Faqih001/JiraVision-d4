"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2 } from "lucide-react"

interface GoogleMapProps {
  apiKey?: string
  center: {
    lat: number
    lng: number
  }
  zoom?: number
}

export function GoogleMap({ apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY, center, zoom = 15 }: GoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<"loading" | "ready" | "error">(apiKey ? "loading" : "error")

  useEffect(() => {
    if (!apiKey) return

    const createMap = () => {
      if (!mapRef.current) return
      try {
        const map = new window.google.maps.Map(mapRef.current, {
          center,
          zoom,
          mapTypeControl: true,
          streetViewControl: true,
          fullscreenControl: true,
          zoomControl: true,
        })
        new window.google.maps.Marker({
          position: center,
          map,
          title: "JiraVision",
        })
      } catch (error) {
        console.error("Error initializing map:", error)
      }
    }

    if (window.google?.maps) {
      createMap()
      setStatus("ready")
      return
    }

    const script = document.createElement("script")
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
    script.async = true
    script.onload = () => {
      createMap()
      setStatus("ready")
    }
    script.onerror = () => setStatus("error")
    document.head.appendChild(script)

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script)
      }
    }
  }, [apiKey, center, zoom])

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full" />
      {status === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
            <p className="text-muted-foreground">Loading map...</p>
          </div>
        </div>
      )}
      {status === "error" && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center p-4">
            <p className="text-sm text-muted-foreground">
              {apiKey
                ? "Failed to load Google Maps. Please check your connection and try again."
                : "Map unavailable: set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to display the map."}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
