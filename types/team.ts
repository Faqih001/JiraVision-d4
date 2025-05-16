// Define types for team members and departments
export type TeamMember = {
  id: number;
  name: string;
  email: string;
  role: string;  // Make role required
  department?: string;
  status: 'online' | 'offline' | 'away' | 'busy' | 'active';  // Add 'active' as valid status
  avatar?: string;
  jobTitle?: string;
  phone?: string;
  skills?: string[];
  utilization?: number;
  currentSprint?: {
    name: string;
    tasks: number;
  };
}

export type Department = {
  id: number
  name: string
  memberCount: number
  lead: string
  productivity: number
}