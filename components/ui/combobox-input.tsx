"use client"

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type Props = {
  id: string
  value: string
  onValueChange: (value: string) => void
  options: readonly string[]
  placeholder?: string
  describedBy?: string
  autoComplete?: string
}

/**
 * A text field with a themed suggestion list, for fields where the list is advice rather than a
 * constraint. A native <datalist> cannot be styled: Chrome hands the list to the OS, so it renders
 * in the system appearance (black under a dark desktop) at its own width, detached from the field.
 */
export function ComboboxInput({
  id,
  value,
  onValueChange,
  options,
  placeholder,
  describedBy,
  autoComplete = "off",
}: Props) {
  const fallbackId = useId()
  const inputId = id || fallbackId
  const listId = `${inputId}-suggestions`
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const matches = useMemo(() => {
    const query = value.trim().toLowerCase()
    if (!query) return options
    return options.filter((option) => {
      const candidate = option.toLowerCase()
      return candidate !== query && candidate.includes(query)
    })
  }, [options, value])

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node
      if (inputRef.current?.contains(target) || listRef.current?.contains(target)) return
      setOpen(false)
      setActive(-1)
    }
    document.addEventListener("pointerdown", onPointerDown)
    return () => document.removeEventListener("pointerdown", onPointerDown)
  }, [open])

  useEffect(() => {
    if (active < 0) return
    document.getElementById(`${inputId}-option-${active}`)?.scrollIntoView({ block: "nearest" })
  }, [active, inputId])

  const choose = (option: string) => {
    onValueChange(option)
    setOpen(false)
    setActive(-1)
    inputRef.current?.focus()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault()
      if (!open) {
        setOpen(true)
        return
      }
      setActive((current) => (matches.length === 0 ? -1 : (current + 1) % matches.length))
      return
    }
    if (event.key === "ArrowUp") {
      event.preventDefault()
      if (!open || matches.length === 0) return
      setActive((current) => (current <= 0 ? matches.length - 1 : current - 1))
      return
    }
    if (event.key === "Enter" && open && active >= 0 && matches[active]) {
      event.preventDefault()
      choose(matches[active])
      return
    }
    if (event.key === "Escape" && open) {
      event.preventDefault()
      setOpen(false)
      setActive(-1)
    }
  }

  const showList = open && matches.length > 0

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        id={inputId}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={listId}
        aria-activedescendant={showList && active >= 0 ? `${inputId}-option-${active}` : undefined}
        aria-describedby={describedBy}
        autoComplete={autoComplete}
        value={value}
        placeholder={placeholder}
        onChange={(event) => {
          onValueChange(event.target.value)
          setOpen(true)
          setActive(-1)
        }}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onBlur={() => {
          setOpen(false)
          setActive(-1)
        }}
        onKeyDown={handleKeyDown}
      />
      {showList ? (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label="Suggestions"
          className="absolute inset-x-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
        >
          {matches.map((option, index) => (
            <li
              key={option}
              id={`${inputId}-option-${index}`}
              role="option"
              aria-selected={index === active}
              className={cn(
                "cursor-pointer select-none rounded-sm px-3 py-1.5 text-sm",
                index === active
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent hover:text-accent-foreground",
              )}
              // Keep the field focused so the list survives the pointer going down.
              onPointerDown={(event) => event.preventDefault()}
              onPointerMove={() => setActive(index)}
              onClick={() => choose(option)}
            >
              {option}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
