"use client"

import { useFormContext } from "react-hook-form"

// Off-screen honeypot input: bots fill it, humans never see it (lib/forms/handler.ts fakes success).
export function HoneypotField() {
  const { register } = useFormContext()
  return (
    <div aria-hidden="true" className="absolute left-[-9999px] top-[-9999px] h-0 w-0 overflow-hidden">
      <label htmlFor="jv-website">Company website (leave blank)</label>
      <input id="jv-website" type="text" autoComplete="off" tabIndex={-1} {...register("website")} />
    </div>
  )
}
