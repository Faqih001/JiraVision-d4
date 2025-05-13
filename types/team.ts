// Define types for team members and departments
export type TeamMember = {
  id: number
  name: string
  role: string
  email: string
  phone?: string
  avatar?: string
  department: string
  status: string
  skills: string[]
  utilization: number
  currentSprint?: {
    name: string
    tasks: number
  }
}

export type Department = {
  id: number
  name: string
  memberCount: number
  lead: string
  productivity: number
} 