"use client"

export type Task = {
  id?: number
  title: string
  description: string
  status: string
  priority: string
  storyPoints: number
  assigneeId?: number
  sprintId?: number
  dueDate?: string
  tags: string[]
}
