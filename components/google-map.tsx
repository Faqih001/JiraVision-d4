"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2 } from "lucide-react"

interface GoogleMapProps {
  apiKey: string
  center: {
    lat: number
    lng: number
  }
  zoom?: number
}

export default function GoogleMap({ apiKey, center, zoom = 15 }: GoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    // Check if Google Maps API is already loaded
    if (window.google && window.google.maps) {
      initializeMap()
      return
    }

    // Load Google Maps API
    const script = document.createElement("script")
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
    script.async = true
    script.defer = true
    script.onload = () => {
      setIsLoaded(true)
      initializeMap()
    }
    script.onerror = () => {
      setLoadError("Failed to load Google Maps API")
    }
    document.head.appendChild(script)

    return () => {
      // Clean up script if component unmounts before loading
      if (document.head.contains(script)) {
        document.head.removeChild(script)
      }
    }
  }, [apiKey])

  const initializeMap = () => {
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

      // Add a marker
      new window.google.maps.Marker({
        position: center,
        map,
        title: "JiraVision",
      })
    } catch (error) {
      console.error("Error initializing map:", error)
      setLoadError("Error initializing map")
    }
  }

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100">
        <div className="text-center p-4">
          <p className="text-red-500 font-medium">{loadError}</p>
          <p className="text-sm text-muted-foreground mt-2">Please check your internet connection and try again.</p>
        </div>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
          <p className="text-muted-foreground">Loading map...</p>
        </div>
      </div>
    )
  }

  return <div ref={mapRef} className="w-full h-full" />
}
