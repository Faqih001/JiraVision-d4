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
  Search,
  ThumbsUp,
  User,
  Users,
  Clipboard,
  ArrowUp,
  CheckCircle,
  HeartPulse,
  Briefcase,
  ShieldCheck,
  MapPin,
  Clock,
  SlidersHorizontal,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { useMobile } from "@/hooks/use-mobile"
import { useToast } from "@/hooks/use-toast"
import DashboardLayout from "@/components/dashboard-layout"
import { cn } from "@/lib/utils"

// Add the missing interface for TeamMember
interface TeamMember {
  id: number;
  name: string;
  role: string;
  email: string;
  phone: string;
  location: string;
  department: string;
  skills: string[];
  projects: string[];
  status: string;
  completedTasks: number;
  inProgressTasks: number;
  wellbeingScore: number;
  tasksDistribution: number[];
  productivity: {
    trend: string;
    value: number;
    change: number;
  };
}

export default function TeamPage() {
  const { theme } = useTheme()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [showAddMemberModal, setShowAddMemberModal] = useState(false)
  const isMobile = useMobile()

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        await new Promise((resolve) => setTimeout(resolve, 1000))
        setTeamMembers([
          {
            id: 1,
            name: "John Doe",
            role: "Frontend Developer",
            email: "john@jiravision.com",
            phone: "+1 (555) 123-4567",
            location: "San Francisco, CA",
            department: "Engineering",
            skills: ["React", "TypeScript", "NextJS"],
            projects: ["API Gateway", "Dashboard Redesign"],
            status: "Active",
            completedTasks: 28,
            inProgressTasks: 3,
            wellbeingScore: 92,
            tasksDistribution: [70, 20, 10],
            productivity: {
              trend: "increasing",
              value: 94,
              change: 12,
            },
          },
          {
            id: 2,
            name: "Jane Smith",
            role: "Backend Developer",
            email: "jane@jiravision.com",
            phone: "+1 (555) 987-6543",
            location: "Austin, TX",
            department: "Engineering",
            skills: ["Node.js", "Python", "MongoDB"],
            projects: ["Authentication Service", "API Gateway"],
            status: "Active",
            completedTasks: 34,
            inProgressTasks: 2,
            wellbeingScore: 86,
            tasksDistribution: [50, 30, 20],
            productivity: {
              trend: "stable",
              value: 87,
              change: 2,
            },
          },
          {
            id: 3,
            name: "Alice Smith",
            role: "UX Designer",
            email: "alice@jiravision.com",
            phone: "+1 (555) 234-5678",
            location: "New York, NY",
            department: "Design",
            skills: ["Figma", "User Research", "Prototyping"],
            projects: ["Dashboard Redesign", "Mobile App"],
            status: "Active",
            completedTasks: 19,
            inProgressTasks: 1,
            wellbeingScore: 78,
            tasksDistribution: [60, 30, 10],
            productivity: {
              trend: "decreasing",
              value: 84,
              change: -5,
            },
          },
          {
            id: 4,
            name: "Robert Johnson",
            role: "DevOps Engineer",
            email: "robert@jiravision.com",
            phone: "+1 (555) 456-7890",
            location: "Seattle, WA",
            department: "Engineering",
            skills: ["AWS", "Kubernetes", "Terraform"],
            projects: ["Infrastructure Upgrade", "CI/CD Pipeline"],
            status: "Away",
            completedTasks: 22,
            inProgressTasks: 0,
            wellbeingScore: 90,
            tasksDistribution: [75, 15, 10],
            productivity: {
              trend: "increasing",
              value: 93,
              change: 8,
            },
          },
          {
            id: 5,
            name: "Sarah Parker",
            role: "QA Engineer",
            email: "sarah@jiravision.com",
            phone: "+1 (555) 567-8901",
            location: "Chicago, IL",
            department: "Engineering",
            skills: ["Automation Testing", "Cypress", "Jest"],
            projects: ["API Gateway", "Mobile App"],
            status: "Active",
            completedTasks: 31,
            inProgressTasks: 4,
            wellbeingScore: 81,
            tasksDistribution: [40, 40, 20],
            productivity: {
              trend: "stable",
              value: 85,
              change: 0,
            },
          },
          {
            id: 6,
            name: "Michael Wong",
            role: "Product Manager",
            email: "michael@jiravision.com",
            phone: "+1 (555) 678-9012",
            location: "Boston, MA",
            department: "Product",
            skills: ["Product Strategy", "User Stories", "Roadmapping"],
            projects: ["Dashboard Redesign", "Mobile App", "API Gateway"],
            status: "Active",
            completedTasks: 15,
            inProgressTasks: 2,
            wellbeingScore: 95,
            tasksDistribution: [20, 50, 30],
            productivity: {
              trend: "increasing",
              value: 91,
              change: 7,
            },
          },
        ])
      } catch (error) {
        console.error("Error loading team data:", error)
        toast({
          title: "Error",
          description: "Failed to load team data. Please try again later.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [toast])

  const handleAddTeamMember = () => {
    setShowAddMemberModal(true)
  }

  const handleSendMessage = (memberId: number) => {
    const member = teamMembers.find((m) => m.id === memberId)
    toast({
      title: "Message Sent",
      description: `Your message has been sent to ${member?.name}.`,
    })
  }

  const handleViewProfile = (memberId: number) => {
    toast({
      title: "Profile View",
      description: `Viewing profile details for team member #${memberId}.`,
    })
  }

  const handleEditMember = (memberId: number) => {
    toast({
      title: "Edit Member",
      description: `Opening edit form for team member #${memberId}.`,
    })
  }

  const handleManageRoles = (memberId: number) => {
    toast({
      title: "Manage Roles",
      description: `Opening role management for team member #${memberId}.`,
    })
  }

  const filteredMembers = searchQuery 
    ? teamMembers.filter(member => 
        member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.skills.some(skill => skill.toLowerCase().includes(searchQuery.toLowerCase())) ||
        member.department.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : teamMembers

  return (
    <DashboardLayout>
      <div className="flex flex-col space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Team</h1>
            <p className="text-muted-foreground">
              Manage your team members and their roles
            </p>
          </div>
          <div className="flex gap-2 self-stretch sm:self-auto">
            <div className="relative flex-1 sm:flex-none sm:min-w-[220px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search team..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9"
              />
            </div>
            <Button onClick={handleAddTeamMember} className="bg-gradient-to-r from-primary to-purple-600 hover:shadow-md transition-all duration-200">
              <Plus className="h-4 w-4 mr-1.5" />
              <span>{isMobile ? "Add" : "Add Member"}</span>
            </Button>
          </div>
        </div>

        {/* Stats Summary */}
        <section>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-card to-muted/30 hover:shadow-md transition-all duration-200">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-muted-foreground text-sm">Team Members</p>
                    <h3 className="text-3xl font-bold">{teamMembers.length}</h3>
                  </div>
                  <div className="bg-primary/10 p-2.5 rounded-lg">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-4">
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800/30">
                    {teamMembers.filter(m => m.status === "Active").length} Active
                  </Badge>
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/30">
                    {teamMembers.filter(m => m.status === "Away").length} Away
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-card to-muted/30 hover:shadow-md transition-all duration-200">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-muted-foreground text-sm">Avg Wellbeing</p>
                    <h3 className="text-3xl font-bold">{Math.round(teamMembers.reduce((sum, member) => sum + member.wellbeingScore, 0) / teamMembers.length)}%</h3>
                  </div>
                  <div className="bg-rose-500/10 p-2.5 rounded-lg">
                    <Heart className="h-5 w-5 text-rose-500" />
                  </div>
                </div>
                <div className="mt-4">
                  <Progress value={Math.round(teamMembers.reduce((sum, member) => sum + member.wellbeingScore, 0) / teamMembers.length)} className="h-1.5 bg-muted" indicatorClassName="bg-rose-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-card to-muted/30 hover:shadow-md transition-all duration-200">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-muted-foreground text-sm">Tasks Complete</p>
                    <h3 className="text-3xl font-bold">{teamMembers.reduce((sum, member) => sum + member.completedTasks, 0)}</h3>
                  </div>
                  <div className="bg-blue-500/10 p-2.5 rounded-lg">
                    <Clipboard className="h-5 w-5 text-blue-500" />
                  </div>
                </div>
                <div className="flex items-center gap-1.5 mt-4 text-green-600">
                  <ArrowUp className="h-3 w-3" />
                  <span className="text-xs font-medium">24% from last month</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-card to-muted/30 hover:shadow-md transition-all duration-200">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-muted-foreground text-sm">Avg Productivity</p>
                    <h3 className="text-3xl font-bold">{Math.round(teamMembers.reduce((sum, member) => sum + member.productivity.value, 0) / teamMembers.length)}</h3>
                  </div>
                  <div className="bg-emerald-500/10 p-2.5 rounded-lg">
                    <Zap className="h-5 w-5 text-emerald-500" />
                  </div>
                </div>
                <div className="flex items-center gap-1.5 mt-4 text-green-600">
                  <ArrowUp className="h-3 w-3" />
                  <span className="text-xs font-medium">{Math.round(teamMembers.reduce((sum, member) => sum + (member.productivity.change > 0 ? member.productivity.change : 0), 0) / teamMembers.filter(m => m.productivity.change > 0).length)}% up this sprint</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Department filter and skills filter can go here */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="mb-4 w-full sm:w-auto bg-muted/50 p-1 gap-1">
              <TabsTrigger value="all" className="rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">All</TabsTrigger>
              <TabsTrigger value="engineering" className="rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">Engineering</TabsTrigger>
              <TabsTrigger value="design" className="rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">Design</TabsTrigger>
              <TabsTrigger value="product" className="rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">Product</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Team grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array(6).fill(0).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <CardHeader className="pb-2 border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div>
                        <Skeleton className="h-6 w-32" />
                        <Skeleton className="h-4 w-24 mt-1" />
                      </div>
                    </div>
                    <Skeleton className="h-8 w-8 rounded-full" />
                  </div>
                </CardHeader>
                <CardContent className="py-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Skeleton className="h-4 w-4" />
                      <Skeleton className="h-4 w-48" />
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Skeleton className="h-4 w-4" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Skeleton className="h-4 w-4" />
                      <Skeleton className="h-4 w-40" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <Skeleton className="h-6 w-full" />
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-6 w-24" />
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between border-t pt-4">
                  <Skeleton className="h-10 w-24" />
                  <Skeleton className="h-10 w-32" />
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : filteredMembers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMembers.map((member) => (
              <Card key={member.id} className="overflow-hidden group hover:shadow-md transition-all duration-200">
                <CardHeader className="pb-2 border-b bg-muted/30">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12 border-2 border-primary/20">
                        <AvatarFallback className="bg-gradient-to-br from-primary/80 to-purple-600/80 text-primary-foreground">{member.name.split(" ").map(n => n[0]).join("")}</AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          {member.name}
                          {member.status === "Away" && (
                            <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30">Away</Badge>
                          )}
                        </CardTitle>
                        <CardDescription>{member.role}</CardDescription>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewProfile(member.id)}>
                          <User className="h-4 w-4 mr-2" /> View Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEditMember(member.id)}>
                          <SlidersHorizontal className="h-4 w-4 mr-2" /> Edit Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleManageRoles(member.id)}>
                          <ShieldCheck className="h-4 w-4 mr-2" /> Manage Roles
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="py-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{member.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{member.phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{member.location}</span>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <div className="flex justify-between items-center mb-1.5 text-sm">
                      <div className="flex items-center gap-1.5">
                        <HeartPulse className="h-4 w-4 text-rose-500" />
                        <span>Wellbeing Score</span>
                      </div>
                      <span className={cn(
                        "font-medium",
                        member.wellbeingScore >= 90 ? "text-emerald-500" :
                        member.wellbeingScore >= 75 ? "text-amber-500" : "text-rose-500"
                      )}>
                        {member.wellbeingScore}%
                      </span>
                    </div>
                    <Progress value={member.wellbeingScore} className="h-1.5 bg-muted" indicatorClassName={cn(
                      member.wellbeingScore >= 90 ? "bg-emerald-500" :
                      member.wellbeingScore >= 75 ? "bg-amber-500" : "bg-rose-500"
                    )} />
                  </div>

                  <div className="flex flex-wrap gap-2 mt-4">
                    {member.skills.map((skill, index) => (
                      <Badge key={index} variant="outline" className="bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                        {skill}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex justify-between gap-2 mt-4 text-sm">
                    <div className="flex gap-1 items-center text-muted-foreground">
                      <Briefcase className="h-3.5 w-3.5" />
                      <span>{member.projects.length} Projects</span>
                    </div>
                    <div className="flex gap-1 items-center text-muted-foreground">
                      <CheckCircle className="h-3.5 w-3.5" />
                      <span>{member.completedTasks} Tasks</span>
                    </div>
                    <div className="flex gap-1 items-center text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{member.inProgressTasks} In Progress</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between border-t py-3 bg-muted/20">
                  <Button variant="outline" size="sm" onClick={() => handleViewProfile(member.id)}>View Profile</Button>
                  <Button size="sm" className="gap-2" onClick={() => handleSendMessage(member.id)}>
                    <MessageSquare className="h-4 w-4" /> Message
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="p-6 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Search className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">No team members found matching your search</p>
              <Button className="mt-4" size="sm" variant="outline" onClick={() => setSearchQuery("")}>
                Clear Search
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
