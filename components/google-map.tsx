"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2 } from "lucide-react"

// Default API key
const DEFAULT_API_KEY = "AIzaSyDPgttFbKx3V_mzD-UMAV0fWHDyU-QBk3c"

// Create a global state to track the loading status of the Google Maps API
interface GoogleMapsGlobal {
  isLoaded: boolean
  isLoading: boolean
  loadPromise: Promise<void> | null
}

// Add to window object and Google Maps types
declare global {
  interface Window {
    googleMapsLoaded?: GoogleMapsGlobal
    google?: {
      maps: {
        Map: new (element: HTMLElement, options: any) => any
        Marker: new (options: any) => any
        LatLng: new (lat: number, lng: number) => any
      }
    }
  }
}

// Function to load Google Maps API only once
const loadGoogleMapsApi = (apiKey: string): Promise<void> => {
  // Return existing promise if already loading
  if (window.googleMapsLoaded?.isLoading && window.googleMapsLoaded.loadPromise) {
    return window.googleMapsLoaded.loadPromise
  }

  // If already loaded, return resolved promise
  if (window.googleMapsLoaded?.isLoaded) {
    return Promise.resolve()
  }

  // Initialize the global state if not exists
  if (!window.googleMapsLoaded) {
    window.googleMapsLoaded = {
      isLoaded: false,
      isLoading: true,
      loadPromise: null,
    }
  }

  // Create and store the loading promise
  const promise = new Promise<void>((resolve, reject) => {
    // Check if Google Maps API is already loaded
    if (window.google && window.google.maps) {
      if (window.googleMapsLoaded) {
        window.googleMapsLoaded.isLoaded = true
        window.googleMapsLoaded.isLoading = false
      }
      resolve()
      return
    }

    // Create script element
    const script = document.createElement("script")
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
    script.async = true
    script.defer = true

    script.onload = () => {
      if (window.googleMapsLoaded) {
        window.googleMapsLoaded.isLoaded = true
        window.googleMapsLoaded.isLoading = false
      }
      resolve()
    }

    script.onerror = () => {
      if (window.googleMapsLoaded) {
        window.googleMapsLoaded.isLoading = false
      }
      reject(new Error("Failed to load Google Maps API"))
    }

    document.head.appendChild(script)
  })

  if (window.googleMapsLoaded) {
    window.googleMapsLoaded.loadPromise = promise
  }
  return promise
}

interface GoogleMapProps {
  apiKey?: string
  center: {
    lat: number
    lng: number
  }
  zoom?: number
}

export function GoogleMap({ apiKey = DEFAULT_API_KEY, center, zoom = 15 }: GoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    loadGoogleMapsApi(apiKey)
      .then(() => {
        setIsLoaded(true)
        initializeMap()
      })
      .catch((error) => {
        console.error("Error loading Google Maps API:", error)
        setLoadError("Failed to load Google Maps API")
      })
  }, [apiKey])

  useEffect(() => {
    // Re-initialize map when center or zoom changes, but only if already loaded
    if (isLoaded) {
      initializeMap()
    }
  }, [center, zoom, isLoaded])

  const initializeMap = () => {
    if (!mapRef.current || !window.google || !window.google.maps) return

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
