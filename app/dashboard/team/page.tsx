"use client"

import { useState, useEffect } from "react"
import { useTheme } from "next-themes"
import {
  Calendar,
  Download,
  FileText,
  Filter,
  Heart,
  Mail,
  MessageSquare,
  MoreHorizontal,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ThumbsUp,
  Users,
  UsersRound,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { useMobile } from "@/hooks/use-mobile"
import { useRouter } from "next/navigation"
// Remove: import DashboardLayout from "@/components/dashboard-layout"

// Define types
type TeamMember = {
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

type Department = {
  id: number
  name: string
  memberCount: number
  lead: string
  productivity: number
}

export default function TeamPage() {
  const { theme, setTheme } = useTheme()
  const isMobile = useMobile()
  const { toast } = useToast()
  const router = useRouter()

  // State for data
  const [loading, setLoading] = useState(true)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [searchQuery, setSearchQuery] = useState("")

  // Fetch data
  useEffect(() => {
    async function fetchTeamData() {
      try {
        setLoading(true)

        // Fetch team members from API
        const response = await fetch('/api/team/members')
        const data = await response.json()
        
        if (data.success && Array.isArray(data.teamMembers)) {
          // Add utilization field if not present
          const membersWithUtilization = data.teamMembers.map((member: TeamMember) => ({
            ...member,
            utilization: member.utilization || Math.floor(Math.random() * 30) + 70, // Random utilization between 70-100 if not present
          }))
          setTeamMembers(membersWithUtilization)
        } else {
          throw new Error("Failed to fetch team members")
        }

        // Set departments based on actual team members
        // Get unique departments and count members in each
        const deptMap: Record<string, { count: number, members: TeamMember[] }> = data.teamMembers.reduce((acc: Record<string, { count: number, members: TeamMember[] }>, member: TeamMember) => {
          const dept = member.department || 'Other';
          if (!acc[dept]) {
            acc[dept] = { count: 0, members: [] };
          }
          acc[dept].count += 1;
          acc[dept].members.push(member);
          return acc;
        }, {});
        
        // Convert to department objects
        const departmentsData = Object.entries(deptMap).map(([name, info], index) => {
          // Find a senior member to use as lead (could be improved with actual data)
          const leadMember = info.members[0];
          
          return {
            id: index + 1,
            name,
            memberCount: info.count,
            lead: leadMember ? leadMember.name : "Not Assigned",
            productivity: Math.floor(Math.random() * 15) + 80, // Random productivity between 80-95
          };
        });
        
        setDepartments(departmentsData)
      } catch (error) {
        console.error("Error fetching team data:", error)
        toast({
          title: "Error",
          description: "Failed to load team data. Please try again.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchTeamData()
  }, [toast])

  // Handle button actions
  const handleAddTeamMember = () => {
    toast({
      title: "Add Team Member",
      description: "Opening form to add a new team member...",
    });
  };

  const handleExportTeam = () => {
    toast({
      title: "Export Team Data",
      description: "Generating team data export...",
    });
  };

  const handleConfigureTeam = () => {
    toast({
      title: "Team Settings",
      description: "Opening team configuration settings...",
    });
    
    router.push('/dashboard/team/settings');
  };

  const handleViewProfile = (teamMemberId: number) => {
    toast({
      title: "View Profile",
      description: `Opening profile for team member #${teamMemberId}...`,
    });
  };

  const handleContactMember = (type: string, contact: string) => {
    toast({
      title: `Contact via ${type}`,
      description: `Opening ${type} to ${contact}...`,
    });
  };

  const handleAddDepartment = () => {
    toast({
      title: "Add Department",
      description: "Opening form to create a new department...",
    });
  };

  // Filter team members based on search query
  const filteredTeamMembers = teamMembers.filter(member => 
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    // Remove: <DashboardLayout>
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Team</h1>
          <p className="text-muted-foreground">Manage your team members and departments</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1" onClick={handleExportTeam}>
            <Download className="h-4 w-4" />
            <span>Export</span>
          </Button>
          <Button variant="outline" size="sm" className="gap-1" onClick={handleConfigureTeam}>
            <Settings className="h-4 w-4" />
            <span>Configure</span>
          </Button>
          <Button size="sm" className="gap-1" onClick={handleAddTeamMember}>
            <Plus className="h-4 w-4" />
            <span>Add Member</span>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="members">
        <TabsList className="mb-4">
          <TabsTrigger value="members">Team Members</TabsTrigger>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="utilization">Utilization</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-4">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-full sm:w-80">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search team members..."
                  className="w-full pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-1">
                <Badge variant="outline" className="text-xs py-0 px-1">
                  Department: All
                </Badge>
              </Button>
              <Button variant="outline" size="sm" className="gap-1">
                <Badge variant="outline" className="text-xs py-0 px-1">
                  Status: All
                </Badge>
              </Button>
            </div>
          </div>

          {/* Team Members Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTeamMembers.map((member) => (
              <Card key={member.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        {member.avatar ? <AvatarImage src={member.avatar} /> : null}
                        <AvatarFallback>
                          {member.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg">{member.name}</CardTitle>
                        <CardDescription>{member.role}</CardDescription>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        member.status === "active"
                          ? "bg-green-50 text-green-700 border-green-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }
                    >
                      {member.status === "active" ? "Active" : "Away"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-sm flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span 
                        className="text-primary cursor-pointer hover:underline"
                        onClick={() => handleContactMember('email', member.email)}
                      >
                        {member.email}
                      </span>
                    </div>
                    {member.phone && (
                      <div className="text-sm flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span 
                          className="text-primary cursor-pointer hover:underline"
                          onClick={() => handleContactMember('phone', member.phone || '')}
                        >
                          {member.phone}
                        </span>
                      </div>
                    )}
                    <div className="text-sm flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{member.department}</span>
                    </div>
                    {member.currentSprint && (
                      <div className="text-sm flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {member.currentSprint.name} • {member.currentSprint.tasks} tasks
                        </span>
                      </div>
                    )}
                    <div className="mt-3">
                      <div className="flex justify-between mb-1 text-sm">
                        <span>Utilization</span>
                        <span className="font-medium">{member.utilization}%</span>
                      </div>
                      <Progress
                        value={member.utilization}
                        className={`h-2 ${
                          member.utilization > 90
                            ? "bg-amber-100"
                            : member.utilization < 60
                              ? "bg-blue-100"
                              : ""
                        }`}
                      />
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {member.skills.map((skill, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="border-t pt-4">
                  <div className="flex w-full justify-between gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleContactMember('chat', member.name)}
                    >
                      <MessageSquare className="h-4 w-4 mr-1" />
                      Message
                    </Button>
                    <Button 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleViewProfile(member.id)}
                    >
                      View Profile
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="departments" className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Departments</h2>
            <Button size="sm" className="gap-1" onClick={handleAddDepartment}>
              <Plus className="h-4 w-4" />
              <span>Add Department</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {departments.map((department) => (
              <Card key={department.id}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <UsersRound className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle>{department.name}</CardTitle>
                      <CardDescription>{department.memberCount} members</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-sm">
                      <div className="font-medium">Department Lead</div>
                      <div className="text-muted-foreground">{department.lead}</div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1 text-sm">
                        <span>Productivity</span>
                        <span className="font-medium">{department.productivity}%</span>
                      </div>
                      <Progress value={department.productivity} className="h-2" />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="border-t pt-4">
                  <Button variant="outline" size="sm" className="w-full">
                    View Details
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="utilization" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Team Utilization</CardTitle>
                  <CardDescription>Current sprint capacity and availability</CardDescription>
                </div>
                <Badge variant="outline" className="gap-1">
                  <RefreshCw className="h-3 w-3" />
                  <span>Updated daily</span>
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] flex items-center justify-center bg-muted/30 rounded-md mb-6">
                <div className="text-center">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <p className="font-medium">Team Utilization Chart</p>
                  <p className="text-sm text-muted-foreground">Visualization of team workload distribution</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1 text-sm">
                    <span>Overall Team Utilization</span>
                    <span className="font-medium">82%</span>
                  </div>
                  <Progress value={82} className="h-2" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                  <div className="bg-muted/40 rounded-md p-3">
                    <div className="text-2xl font-bold">85%</div>
                    <div className="text-xs text-muted-foreground">Engineering</div>
                  </div>
                  <div className="bg-muted/40 rounded-md p-3">
                    <div className="text-2xl font-bold">78%</div>
                    <div className="text-xs text-muted-foreground">Design</div>
                  </div>
                  <div className="bg-muted/40 rounded-md p-3">
                    <div className="text-2xl font-bold">90%</div>
                    <div className="text-xs text-muted-foreground">Product</div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t pt-4">
              <Button variant="outline" size="sm" className="w-full">
                <Download className="h-4 w-4 mr-1" />
                Export Utilization Report
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
    // Remove the closing </DashboardLayout> tag at the end of the component
  )
}

function BarChart(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" x2="12" y1="20" y2="10" />
      <line x1="18" x2="18" y1="20" y2="4" />
      <line x1="6" x2="6" y1="20" y2="16" />
    </svg>
  )
}

function AlertCircle(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12" y2="16" />
    </svg>
  )
}

function LineChart(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 3v18h18" />
      <path d="M3 14l4-9 5 9 4-5 4 5" />
    </svg>
  )
}
