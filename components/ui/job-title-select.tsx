"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getJobTitlesForDepartment } from "@/lib/job-titles"

type JobTitleSelectProps = {
  value: string
  onValueChange: (value: string) => void
  departmentCode: string | null
  disabled?: boolean
  placeholder?: string
  id?: string
}

export function JobTitleSelect({
  value,
  onValueChange,
  departmentCode,
  disabled,
  placeholder = "Select job title",
  id,
}: JobTitleSelectProps) {
  const jobTitles = getJobTitlesForDepartment(departmentCode)

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled || !departmentCode}>
      <SelectTrigger id={id}>
        <SelectValue placeholder={departmentCode ? placeholder : "Select department first"} />
      </SelectTrigger>
      <SelectContent>
        {jobTitles.map((jt) => (
          <SelectItem key={jt.title} value={jt.title}>
            {jt.title}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
