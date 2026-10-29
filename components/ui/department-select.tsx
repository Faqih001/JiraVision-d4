"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DEPARTMENTS } from "@/lib/departments"

type DepartmentSelectProps = {
  value: string
  onValueChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
  id?: string
}

export function DepartmentSelect({
  value,
  onValueChange,
  disabled,
  placeholder = "Select department",
  id,
}: DepartmentSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger id={id}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {DEPARTMENTS.map((dept) => (
          <SelectItem key={dept.code} value={dept.code}>
            {dept.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
