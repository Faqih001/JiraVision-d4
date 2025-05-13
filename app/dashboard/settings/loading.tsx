"use client"

import { CircleJVLoader } from "@/components/ui/loader"

export default function SettingsLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] px-4">
      <CircleJVLoader size="md" showText={true} />
    </div>
  )
}
