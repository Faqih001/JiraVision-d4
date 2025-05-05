"use client"
import { useTheme } from "next-themes"
import { Award, Gift, Plus, RefreshCw, Settings, Star, Trophy, Users, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { useMobile } from "@/hooks/use-mobile"

export default function GamificationPage() {
  const { theme, setTheme } = useTheme()
  const isMobile = useMobile()

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Gamification</h1>
          <p className="text-muted-foreground">Level up your productivity with game-like experiences</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1">
            <Users className="h-4 w-4" />
            <span>Leaderboard</span>
          </Button>
          <Button size="sm" className="gap-1">
            <Settings className="h-4 w-4" />
            <span>Configure</span>
          </Button>
        </div>
      </div>

      {/* Player Profile */}
      <section>
        <Card>
          <CardHeader className="pb-2">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="h-16 w-16 border-2 border-primary">
                    <AvatarFallback className="text-xl">JD</AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center">
                    12
                  </div>
                </div>
                <div>
                  <CardTitle className="text-xl">John Doe</CardTitle>
                  <CardDescription>Frontend Developer</CardDescription>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="gap-1">
                      <Star className="h-3 w-3 text-amber-500" />
                      <span>3,250 XP</span>
                    </Badge>
                    <Badge variant="outline" className="gap-1">
                      <Trophy className="h-3 w-3 text-primary" />
                      <span>Level 12</span>
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <div className="text-sm text-muted-foreground">Next Level: 750 XP needed</div>
                <Progress value={70} className="h-2 w-[200px]" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div className="bg-muted/40 rounded-md p-3 text-center">
                <div className="text-2xl font-bold">24</div>
                <div className="text-xs text-muted-foreground">Tasks Completed</div>
              </div>
              <div className="bg-muted/40 rounded-md p-3 text-center">
                <div className="text-2xl font-bold">8</div>
                <div className="text-xs text-muted-foreground">Achievements</div>
              </div>
              <div className="bg-muted/40 rounded-md p-3 text-center">
                <div className="text-2xl font-bold">3</div>
                <div className="text-xs text-muted-foreground">Skill Trees</div>
              </div>
              <div className="bg-muted/40 rounded-md p-3 text-center">
                <div className="text-2xl font-bold">2</div>
                <div className="text-xs text-muted-foreground">Rewards Claimed</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Skill Trees */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Skill Trees</h2>
          <Button variant="outline" size="sm" className="gap-1">
            <Plus className="h-4 w-4" />
            <span>New Skill</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Frontend Master Skill Tree */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>Frontend Master</CardTitle>
                  <CardDescription>Level 3 • 65% Complete</CardDescription>
                </div>
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Zap className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1 text-sm">
                    <span>Progress to Level 4</span>
                    <span className="font-medium">65%</span>
                  </div>
                  <Progress value={65} className="h-2" />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <CheckIcon className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="text-sm">
                      <div className="font-medium">Responsive Design Expert</div>
                      <div className="text-muted-foreground">Complete 5 responsive layouts</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <CheckIcon className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="text-sm">
                      <div className="font-medium">Component Creator</div>
                      <div className="text-muted-foreground">Build 10 reusable components</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <div className="text-xs font-bold text-blue-600">3/5</div>
                    </div>
                    <div className="text-sm">
                      <div className="font-medium">Animation Wizard</div>
                      <div className="text-muted-foreground">Create 5 complex animations</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <LockIcon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="text-sm">
                      <div className="font-medium text-muted-foreground">Performance Guru</div>
                      <div className="text-muted-foreground">Optimize 3 slow components</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t pt-4">
              <Button variant="outline" size="sm" className="w-full">
                View Full Skill Tree
              </Button>
            </CardFooter>
          </Card>

          {/* Team Player Skill Tree */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>Team Player</CardTitle>
                  <CardDescription>Level 4 • 80% Complete</CardDescription>
                </div>
                <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <Users className="h-5 w-5 text-purple-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1 text-sm">
                    <span>Progress to Level 5</span>
                    <span className="font-medium">80%</span>
                  </div>
                  <Progress value={80} className="h-2" />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <CheckIcon className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="text-sm">
                      <div className="font-medium">Code Reviewer</div>
                      <div className="text-muted-foreground">Review 15 pull requests</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <CheckIcon className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="text-sm">
                      <div className="font-medium">Mentor</div>
                      <div className="text-muted-foreground">Help 5 team members with tasks</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <CheckIcon className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="text-sm">
                      <div className="font-medium">Documentation Hero</div>
                      <div className="text-muted-foreground">Update 3 documentation pages</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <div className="text-xs font-bold text-blue-600">2/3</div>
                    </div>
                    <div className="text-sm">
                      <div className="font-medium">Knowledge Sharer</div>
                      <div className="text-muted-foreground">Present 3 topics at team meetings</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t pt-4">
              <Button variant="outline" size="sm" className="w-full">
                View Full Skill Tree
              </Button>
            </CardFooter>
          </Card>

          {/* Problem Solver Skill Tree */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>Problem Solver</CardTitle>
                  <CardDescription>Level 2 • 40% Complete</CardDescription>
                </div>
                <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <LightbulbIcon className="h-5 w-5 text-amber-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1 text-sm">
                    <span>Progress to Level 3</span>
                    <span className="font-medium">40%</span>
                  </div>
                  <Progress value={40} className="h-2" />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <CheckIcon className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="text-sm">
                      <div className="font-medium">Bug Hunter</div>
                      <div className="text-muted-foreground">Fix 10 bugs</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <div className="text-xs font-bold text-blue-600">3/5</div>
                    </div>
                    <div className="text-sm">
                      <div className="font-medium">Refactoring Expert</div>
                      <div className="text-muted-foreground">Refactor 5 complex functions</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <div className="text-xs font-bold text-blue-600">1/3</div>
                    </div>
                    <div className="text-sm">
                      <div className="font-medium">Performance Optimizer</div>
                      <div className="text-muted-foreground">Improve performance in 3 areas</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <LockIcon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="text-sm">
                      <div className="font-medium text-muted-foreground">Architecture Wizard</div>
                      <div className="text-muted-foreground">Design a system component</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t pt-4">
              <Button variant="outline" size="sm" className="w-full">
                View Full Skill Tree
              </Button>
            </CardFooter>
          </Card>
        </div>
      </section>

      {/* Achievements & Rewards */}
      <section>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Achievements */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Recent Achievements</h2>
              <Button variant="ghost" size="sm">
                View All
              </Button>
            </div>

            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  <div className="flex items-center gap-4 p-4">
                    <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                      <Award className="h-6 w-6 text-amber-600" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">Sprint Champion</div>
                      <div className="text-sm text-muted-foreground">Completed all assigned tasks in Sprint 22.04</div>
                    </div>
                    <Badge>+250 XP</Badge>
                  </div>

                  <div className="flex items-center gap-4 p-4">
                    <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <Zap className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">Code Quality Guardian</div>
                      <div className="text-sm text-muted-foreground">
                        Maintained 95% code coverage for 3 consecutive sprints
                      </div>
                    </div>
                    <Badge>+300 XP</Badge>
                  </div>

                  <div className="flex items-center gap-4 p-4">
                    <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <Users className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">Team Player</div>
                      <div className="text-sm text-muted-foreground">
                        Helped 3 team members complete their tasks on time
                      </div>
                    </div>
                    <Badge>+150 XP</Badge>
                  </div>

                  <div className="flex items-center gap-4 p-4">
                    <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                      <Trophy className="h-6 w-6 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">First Milestone</div>
                      <div className="text-sm text-muted-foreground">
                        Successfully delivered the AI Scrum Master MVP
                      </div>
                    </div>
                    <Badge>+500 XP</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Rewards */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Available Rewards</h2>
              <Button variant="ghost" size="sm">
                View All
              </Button>
            </div>

            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  <div className="flex items-center gap-4 p-4">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Gift className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">Half-Day PTO</div>
                      <div className="text-sm text-muted-foreground">Take a half-day off work</div>
                    </div>
                    <Button size="sm">Claim</Button>
                  </div>

                  <div className="flex items-center gap-4 p-4">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Gift className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">Charity Donation</div>
                      <div className="text-sm text-muted-foreground">$50 donation to charity of your choice</div>
                    </div>
                    <Button size="sm">Claim</Button>
                  </div>

                  <div className="flex items-center gap-4 p-4">
                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <Gift className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-muted-foreground">Team Lunch</div>
                      <div className="text-sm text-muted-foreground">Lunch for the entire team</div>
                    </div>
                    <Button size="sm" disabled>
                      5000 XP
                    </Button>
                  </div>

                  <div className="flex items-center gap-4 p-4">
                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <Gift className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-muted-foreground">Conference Ticket</div>
                      <div className="text-sm text-muted-foreground">Ticket to a tech conference of your choice</div>
                    </div>
                    <Button size="sm" disabled>
                      10000 XP
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Team Leaderboard */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Team Leaderboard</h2>
          <Badge variant="outline" className="gap-1">
            <RefreshCw className="h-3 w-3" />
            <span>Updated daily</span>
          </Badge>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Top Performers This Sprint</CardTitle>
            <CardDescription>May 1 - May 14</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <div className="font-bold text-amber-600">1</div>
                </div>
                <Avatar className="h-10 w-10">
                  <AvatarFallback>RJ</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="font-medium">Robert Johnson</div>
                  <div className="text-sm text-muted-foreground">Backend Developer</div>
                </div>
                <Badge variant="secondary" className="gap-1">
                  <Star className="h-3 w-3 text-amber-500" />
                  <span>4,250 XP</span>
                </Badge>
              </div>

              <div className="flex items-center gap-4">
                <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <div className="font-bold text-slate-600">2</div>
                </div>
                <Avatar className="h-10 w-10">
                  <AvatarFallback>JD</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="font-medium">John Doe</div>
                  <div className="text-sm text-muted-foreground">Frontend Developer</div>
                </div>
                <Badge variant="secondary" className="gap-1">
                  <Star className="h-3 w-3 text-amber-500" />
                  <span>3,250 XP</span>
                </Badge>
              </div>

              <div className="flex items-center gap-4">
                <div className="h-8 w-8 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0">
                  <div className="font-bold text-amber-600">3</div>
                </div>
                <Avatar className="h-10 w-10">
                  <AvatarFallback>EW</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="font-medium">Emily Wilson</div>
                  <div className="text-sm text-muted-foreground">Project Manager</div>
                </div>
                <Badge variant="secondary" className="gap-1">
                  <Star className="h-3 w-3 text-amber-500" />
                  <span>2,980 XP</span>
                </Badge>
              </div>

              <div className="flex items-center gap-4">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <div className="font-medium text-muted-foreground">4</div>
                </div>
                <Avatar className="h-10 w-10">
                  <AvatarFallback>AS</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="font-medium">Alice Smith</div>
                  <div className="text-sm text-muted-foreground">UX Designer</div>
                </div>
                <Badge variant="secondary" className="gap-1">
                  <Star className="h-3 w-3 text-amber-500" />
                  <span>2,450 XP</span>
                </Badge>
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t pt-4">
            <Button variant="outline" size="sm" className="w-full gap-1">
              <Trophy className="h-4 w-4" />
              <span>View Full Leaderboard</span>
            </Button>
          </CardFooter>
        </Card>
      </section>
    </div>
  )
}

// Define the missing icon components
function CheckIcon(props) {
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
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function LightbulbIcon(props) {
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
      <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
      <path d="M9 18h6" />
      <path d="M10 22h4" />
    </svg>
  )
}

function LockIcon(props) {
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
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}
