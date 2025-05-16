"use client"

import { useState, useEffect } from "react"

export interface ScreenSize {
  width: number;
  isXs: boolean;  // < 640px
  isSm: boolean;  // >= 640px and < 768px
  isMd: boolean;  // >= 768px and < 1024px
  isLg: boolean;  // >= 1024px and < 1280px
  isXl: boolean;  // >= 1280px and < 1536px
  is2xl: boolean; // >= 1536px
  isMobile: boolean; // < 768px (compatibility with useMobile)
}

export const useScreenSize = (): ScreenSize => {
  const [screenSize, setScreenSize] = useState<ScreenSize>({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    isXs: false,
    isSm: false,
    isMd: false,
    isLg: false,
    isXl: false,
    is2xl: false,
    isMobile: false,
  })

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
      
      setScreenSize({
        width,
        isXs: width < 640,
        isSm: width >= 640 && width < 768,
        isMd: width >= 768 && width < 1024,
        isLg: width >= 1024 && width < 1280,
        isXl: width >= 1280 && width < 1536,
        is2xl: width >= 1536,
        isMobile: width < 768,
      })
    }

    // Set initial value
    handleResize()

    // Listen for window resize events
    window.addEventListener("resize", handleResize)

    // Clean up event listener on unmount
    return () => {
      window.removeEventListener("resize", handleResize)
    }
  }, [])

  return screenSize
}
