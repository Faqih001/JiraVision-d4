"use client"
import { useTheme } from "next-themes"
import { Award, Gift, Plus, RefreshCw, Settings, Star, Trophy, Users, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { useMobile } from "@/hooks/use-mobile"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export default function GamificationPage() {
  const { theme, setTheme } = useTheme()
  const isMobile = useMobile()
  const { toast } = useToast()
  const router = useRouter()
  
  // Modal states
  const [showAddSkillModal, setShowAddSkillModal] = useState(false)
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false)
  const [showAchievementsModal, setShowAchievementsModal] = useState(false)
  const [showRewardsModal, setShowRewardsModal] = useState(false)
  const [showSkillTreeModal, setShowSkillTreeModal] = useState(false)
  const [showConfigureModal, setShowConfigureModal] = useState(false)
  const [selectedSkillTree, setSelectedSkillTree] = useState("")

  const handleViewLeaderboard = () => {
    toast({
      title: "Leaderboard",
      description: "Opening team gamification leaderboard...",
    });
    
    setShowLeaderboardModal(true);
  };

  const handleConfigureGamification = () => {
    toast({
      title: "Configure Gamification",
      description: "Opening gamification settings...",
    });
    
    setShowConfigureModal(true);
  };

  const handleAddNewSkill = () => {
    toast({
      title: "Add Skill",
      description: "Opening skill creation interface...",
    });
    
    setShowAddSkillModal(true);
  };

  const handleViewSkillTree = (skillTreeName: string) => {
    toast({
      title: "View Skill Tree",
      description: `Opening detailed view for ${skillTreeName} skill tree...`,
    });
    
    setSelectedSkillTree(skillTreeName);
    setShowSkillTreeModal(true);
  };

  const handleViewAllAchievements = () => {
    toast({
      title: "All Achievements",
      description: "Opening complete achievements list...",
    });
    
    setShowAchievementsModal(true);
  };

  const handleViewAllRewards = () => {
    toast({
      title: "All Rewards",
      description: "Opening complete rewards catalog...",
    });
    
    setShowRewardsModal(true);
  };

  const handleClaimReward = (rewardName: string) => {
    toast({
      title: "Claim Reward",
      description: `Claiming reward: ${rewardName}...`,
    });
    
    // This would typically make an API call to claim the reward
  };

  const handleViewFullLeaderboard = () => {
    toast({
      title: "Full Leaderboard",
      description: "Opening complete leaderboard view...",
    });
    
    setShowLeaderboardModal(true);
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Add Skill Modal */}
      <Dialog open={showAddSkillModal} onOpenChange={setShowAddSkillModal}>
        <DialogContent className="w-[95vw] max-w-[500px] p-4 md:p-6 rounded-lg">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-xl md:text-2xl font-bold">Add New Skill</DialogTitle>
            <DialogDescription className="text-sm md:text-base">
              Create a new skill for your team members to work towards.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-3 md:py-4 max-h-[60vh] md:max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="skill-name" className="text-sm font-medium">Name</Label>
              <Input 
                id="skill-name" 
                placeholder="Frontend Master" 
                className="w-full"
                aria-label="Skill name" 
              />
            </div>
            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="skill-category" className="text-sm font-medium">Category</Label>
              <Input 
                id="skill-category" 
                placeholder="Technical, Soft Skills, etc." 
                className="w-full"
                aria-label="Skill category" 
              />
            </div>
            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="skill-description" className="text-sm font-medium">Description</Label>
              <Textarea 
                id="skill-description" 
                placeholder="Describe what this skill involves..." 
                className="w-full min-h-[100px]"
                aria-label="Skill description" 
              />
            </div>
            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="skill-xp" className="text-sm font-medium">XP Value</Label>
              <Input 
                id="skill-xp" 
                type="number" 
                placeholder="500" 
                className="w-full"
                aria-label="XP Value" 
              />
            </div>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowAddSkillModal(false)} className="w-full sm:w-auto sm:order-1">Cancel</Button>
            <Button onClick={() => {
              toast({
                title: "Skill Added",
                description: "New skill has been created successfully",
              });
              setShowAddSkillModal(false);
            }} className="w-full sm:w-auto sm:order-2">Create Skill</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Leaderboard Modal */}
      <Dialog open={showLeaderboardModal} onOpenChange={setShowLeaderboardModal}>
        <DialogContent className="w-[95vw] max-w-[700px] p-4 md:p-6 rounded-lg">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-xl md:text-2xl">Team Leaderboard</DialogTitle>
            <DialogDescription className="text-sm md:text-base">
              See who's leading in performance this sprint
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 md:space-y-4 py-3 md:py-4 max-h-[50vh] md:max-h-[60vh] overflow-y-auto">
            <div className="flex items-center gap-3 md:gap-4 p-2 md:p-3 bg-muted/20 rounded-md">
              <div className="h-6 w-6 md:h-8 md:w-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <div className="font-bold text-amber-600 text-xs md:text-sm">1</div>
              </div>
              <Avatar className="h-8 w-8 md:h-10 md:w-10">
                <AvatarFallback>RJ</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm md:text-base truncate">Robert Johnson</div>
                <div className="text-xs md:text-sm text-muted-foreground truncate">Backend Developer</div>
              </div>
              <Badge variant="secondary" className="gap-1 ml-2 shrink-0">
                <Star className="h-3 w-3 text-amber-500" />
                <span className="text-xs">4,250</span>
              </Badge>
            </div>

            <div className="flex items-center gap-3 md:gap-4 p-2 md:p-3 bg-muted/20 rounded-md">
              <div className="h-6 w-6 md:h-8 md:w-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                <div className="font-bold text-slate-600 text-xs md:text-sm">2</div>
              </div>
              <Avatar className="h-8 w-8 md:h-10 md:w-10">
                <AvatarFallback>JD</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm md:text-base truncate">John Doe</div>
                <div className="text-xs md:text-sm text-muted-foreground truncate">Frontend Developer</div>
              </div>
              <Badge variant="secondary" className="gap-1 ml-2 shrink-0">
                <Star className="h-3 w-3 text-amber-500" />
                <span className="text-xs">3,250</span>
              </Badge>
            </div>

            <div className="flex items-center gap-3 md:gap-4 p-2 md:p-3 bg-muted/20 rounded-md">
              <div className="h-6 w-6 md:h-8 md:w-8 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0">
                <div className="font-bold text-amber-600 text-xs md:text-sm">3</div>
              </div>
              <Avatar className="h-8 w-8 md:h-10 md:w-10">
                <AvatarFallback>EW</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm md:text-base truncate">Emily Wilson</div>
                <div className="text-xs md:text-sm text-muted-foreground truncate">Project Manager</div>
              </div>
              <Badge variant="secondary" className="gap-1 ml-2 shrink-0">
                <Star className="h-3 w-3 text-amber-500" />
                <span className="text-xs">2,980</span>
              </Badge>
            </div>

            <div className="flex items-center gap-3 md:gap-4 p-2 md:p-3 bg-muted/20 rounded-md">
              <div className="h-6 w-6 md:h-8 md:w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <div className="font-medium text-muted-foreground text-xs md:text-sm">4</div>
              </div>
              <Avatar className="h-8 w-8 md:h-10 md:w-10">
                <AvatarFallback>AS</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm md:text-base truncate">Alice Smith</div>
                <div className="text-xs md:text-sm text-muted-foreground truncate">UX Designer</div>
              </div>
              <Badge variant="secondary" className="gap-1 ml-2 shrink-0">
                <Star className="h-3 w-3 text-amber-500" />
                <span className="text-xs">2,450</span>
              </Badge>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLeaderboardModal(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Achievements Modal */}
      <Dialog open={showAchievementsModal} onOpenChange={setShowAchievementsModal}>
        <DialogContent className="w-[95vw] max-w-[700px] p-4 md:p-6 rounded-lg">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-xl md:text-2xl">All Achievements</DialogTitle>
            <DialogDescription className="text-sm md:text-base">
              Track your progress and see what achievements you can earn
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 md:space-y-4 py-3 md:py-4 max-h-[50vh] md:max-h-[60vh] overflow-y-auto">
            <div className="bg-muted/20 p-3 md:p-4 rounded-lg">
              <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <Award className="h-5 w-5 md:h-6 md:w-6 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm md:text-base flex items-center flex-wrap gap-2">
                    Sprint Champion
                    <Badge variant="secondary" className="ml-0 md:ml-2 text-xs">Completed</Badge>
                  </div>
                  <div className="text-xs md:text-sm text-muted-foreground">Completed all assigned tasks in Sprint 22.04</div>
                </div>
                <Badge className="self-start md:self-center mt-2 md:mt-0 shrink-0">+250 XP</Badge>
              </div>
            </div>

            <div className="bg-muted/20 p-3 md:p-4 rounded-lg">
              <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <Zap className="h-5 w-5 md:h-6 md:w-6 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm md:text-base flex items-center flex-wrap gap-2">
                    Code Quality Guardian
                    <Badge variant="secondary" className="ml-0 md:ml-2 text-xs">Completed</Badge>
                  </div>
                  <div className="text-xs md:text-sm text-muted-foreground">Maintained 95% code coverage for 3 consecutive sprints</div>
                </div>
                <Badge className="self-start md:self-center mt-2 md:mt-0 shrink-0">+300 XP</Badge>
              </div>
            </div>

            <div className="bg-muted/20 p-3 md:p-4 rounded-lg">
              <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Users className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm md:text-base flex items-center flex-wrap gap-2">
                    Team Player
                    <Badge variant="secondary" className="ml-0 md:ml-2 text-xs">Completed</Badge>
                  </div>
                  <div className="text-xs md:text-sm text-muted-foreground">Helped 3 team members complete their tasks on time</div>
                </div>
                <Badge className="self-start md:self-center mt-2 md:mt-0 shrink-0">+150 XP</Badge>
              </div>
            </div>

            <div className="bg-muted/20 p-3 md:p-4 rounded-lg">
              <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <Trophy className="h-5 w-5 md:h-6 md:w-6 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm md:text-base flex items-center flex-wrap gap-2">
                    First Milestone
                    <Badge variant="secondary" className="ml-0 md:ml-2 text-xs">Completed</Badge>
                  </div>
                  <div className="text-xs md:text-sm text-muted-foreground">Successfully delivered the AI Scrum Master MVP</div>
                </div>
                <Badge className="self-start md:self-center mt-2 md:mt-0 shrink-0">+500 XP</Badge>
              </div>
            </div>

            <div className="bg-muted/20 p-3 md:p-4 rounded-lg">
              <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <RefreshCw className="h-5 w-5 md:h-6 md:w-6 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm md:text-base flex items-center flex-wrap gap-2">
                    Continuous Improver
                    <Badge variant="outline" className="ml-0 md:ml-2 text-xs">In Progress (2/5)</Badge>
                  </div>
                  <div className="text-xs md:text-sm text-muted-foreground">Submit 5 process improvement suggestions</div>
                </div>
                <Badge className="self-start md:self-center mt-2 md:mt-0 shrink-0">+200 XP</Badge>
              </div>
            </div>

            <div className="bg-muted/20 p-3 md:p-4 rounded-lg">
              <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <Award className="h-5 w-5 md:h-6 md:w-6 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm md:text-base flex items-center flex-wrap gap-2">
                    Perfect Attendance
                    <Badge variant="outline" className="ml-0 md:ml-2 text-xs">In Progress (4/5)</Badge>
                  </div>
                  <div className="text-xs md:text-sm text-muted-foreground">Attend 5 consecutive sprint planning meetings</div>
                </div>
                <Badge className="self-start md:self-center mt-2 md:mt-0 shrink-0">+100 XP</Badge>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAchievementsModal(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rewards Modal */}
      <Dialog open={showRewardsModal} onOpenChange={setShowRewardsModal}>
        <DialogContent className="w-[95vw] max-w-[700px] p-4 md:p-6 rounded-lg">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-xl md:text-2xl">Rewards Catalog</DialogTitle>
            <DialogDescription className="text-sm md:text-base">
              Redeem your XP for rewards and benefits
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 md:space-y-4 py-3 md:py-4 max-h-[50vh] md:max-h-[60vh] overflow-y-auto">
            <div className="bg-muted/20 p-3 md:p-4 rounded-lg">
              <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Gift className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm md:text-base">Half-Day PTO</div>
                  <div className="text-xs md:text-sm text-muted-foreground">Take a half-day off work</div>
                  <div className="text-xs md:text-sm font-medium text-primary mt-1">1,500 XP</div>
                </div>
                <Button size="sm" onClick={() => handleClaimReward("Half-Day PTO")} className="self-start md:self-center mt-2 md:mt-0">Claim</Button>
              </div>
            </div>

            <div className="bg-muted/20 p-3 md:p-4 rounded-lg">
              <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Gift className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm md:text-base">Charity Donation</div>
                  <div className="text-xs md:text-sm text-muted-foreground">$50 donation to charity of your choice</div>
                  <div className="text-xs md:text-sm font-medium text-primary mt-1">2,000 XP</div>
                </div>
                <Button size="sm" onClick={() => handleClaimReward("Charity Donation")} className="self-start md:self-center mt-2 md:mt-0">Claim</Button>
              </div>
            </div>

            <div className="bg-muted/20 p-3 md:p-4 rounded-lg">
              <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Gift className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm md:text-base">Premium Headphones</div>
                  <div className="text-xs md:text-sm text-muted-foreground">Noise-cancelling headphones for focus</div>
                  <div className="text-xs md:text-sm font-medium text-primary mt-1">3,500 XP</div>
                </div>
                <Button size="sm" onClick={() => handleClaimReward("Premium Headphones")} className="self-start md:self-center mt-2 md:mt-0">Claim</Button>
              </div>
            </div>

            <div className="bg-muted/20 p-3 md:p-4 rounded-lg">
              <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <Gift className="h-5 w-5 md:h-6 md:w-6 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm md:text-base">Team Lunch</div>
                  <div className="text-xs md:text-sm text-muted-foreground">Lunch for the entire team</div>
                  <div className="text-xs md:text-sm font-medium text-muted-foreground mt-1">5,000 XP</div>
                </div>
                <Button size="sm" disabled className="self-start md:self-center mt-2 md:mt-0">
                  5000 XP
                </Button>
              </div>
            </div>

            <div className="bg-muted/20 p-3 md:p-4 rounded-lg">
              <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <Gift className="h-5 w-5 md:h-6 md:w-6 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm md:text-base">Conference Ticket</div>
                  <div className="text-xs md:text-sm text-muted-foreground">Ticket to a tech conference of your choice</div>
                  <div className="text-xs md:text-sm font-medium text-muted-foreground mt-1">10,000 XP</div>
                </div>
                <Button size="sm" disabled className="self-start md:self-center mt-2 md:mt-0">
                  10000 XP
                </Button>
              </div>
            </div>

            <div className="bg-muted/20 p-3 md:p-4 rounded-lg">
              <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <Gift className="h-5 w-5 md:h-6 md:w-6 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm md:text-base">Full Day PTO</div>
                  <div className="text-xs md:text-sm text-muted-foreground">Take a full day off work</div>
                  <div className="text-xs md:text-sm font-medium text-muted-foreground mt-1">3,000 XP</div>
                </div>
                <Button size="sm" disabled className="self-start md:self-center mt-2 md:mt-0">
                  3000 XP
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRewardsModal(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Skill Tree Modal */}
      <Dialog open={showSkillTreeModal} onOpenChange={setShowSkillTreeModal}>
        <DialogContent className="w-[95vw] max-w-[800px] p-4 md:p-6 rounded-lg">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-xl md:text-2xl">{selectedSkillTree}</DialogTitle>
            <DialogDescription className="text-sm md:text-base">
              Detailed view of your progress in this skill tree
            </DialogDescription>
          </DialogHeader>
          <div className="py-3 md:py-4 max-h-[60vh] md:max-h-[70vh] overflow-y-auto">
            <div className="space-y-4 md:space-y-6">
              <div className="flex flex-col gap-2">
                <div className="flex justify-between mb-1 text-sm">
                  <span>Overall Progress</span>
                  <span className="font-medium">
                    {selectedSkillTree === "Frontend Master" ? "65%" : 
                     selectedSkillTree === "Team Player" ? "80%" : 
                     selectedSkillTree === "Problem Solver" ? "40%" : "50%"}
                  </span>
                </div>
                <Progress 
                  value={
                    selectedSkillTree === "Frontend Master" ? 65 : 
                    selectedSkillTree === "Team Player" ? 80 : 
                    selectedSkillTree === "Problem Solver" ? 40 : 50
                  } 
                  className="h-2" 
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Level 1</CardTitle>
                    <CardDescription>Beginner skills</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <CheckIcon className="h-4 w-4 text-green-600" />
                      </div>
                      <div className="text-sm">
                        <div className="font-medium">Basic Understanding</div>
                        <div className="text-muted-foreground">Complete onboarding tasks</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <CheckIcon className="h-4 w-4 text-green-600" />
                      </div>
                      <div className="text-sm">
                        <div className="font-medium">First Contribution</div>
                        <div className="text-muted-foreground">Make your first code commit</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Level 2</CardTitle>
                    <CardDescription>Intermediate skills</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <CheckIcon className="h-4 w-4 text-green-600" />
                      </div>
                      <div className="text-sm">
                        <div className="font-medium">Code Reviewer</div>
                        <div className="text-muted-foreground">Review 5 pull requests</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <div className="text-xs font-bold text-blue-600">3/5</div>
                      </div>
                      <div className="text-sm">
                        <div className="font-medium">Documentation Expert</div>
                        <div className="text-muted-foreground">Update 5 documentation pages</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Level 3</CardTitle>
                    <CardDescription>Advanced skills</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <div className="text-xs font-bold text-blue-600">2/3</div>
                      </div>
                      <div className="text-sm">
                        <div className="font-medium">Mentor</div>
                        <div className="text-muted-foreground">Help onboard 3 new team members</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <div className="text-xs font-bold text-blue-600">1/4</div>
                      </div>
                      <div className="text-sm">
                        <div className="font-medium">Task Master</div>
                        <div className="text-muted-foreground">Complete 4 complex tasks in a sprint</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Level 4</CardTitle>
                    <CardDescription>Expert skills</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        <LockIcon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="text-sm">
                        <div className="font-medium text-muted-foreground">Project Lead</div>
                        <div className="text-muted-foreground">Lead a feature implementation</div>
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
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSkillTreeModal(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Configure Modal */}
      <Dialog open={showConfigureModal} onOpenChange={setShowConfigureModal}>
        <DialogContent className="w-[95vw] max-w-[700px] p-4 md:p-6 rounded-lg">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-xl md:text-2xl font-bold">Gamification Settings</DialogTitle>
            <DialogDescription className="text-sm md:text-base">
              Customize how gamification works in your team
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-3 md:py-4 max-h-[60vh] md:max-h-[70vh] overflow-y-auto">
            <div className="bg-muted/30 rounded-lg p-3 md:p-4 space-y-3">
              <h3 className="text-base md:text-lg font-medium">General Settings</h3>
              <div className="grid gap-3">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <Label htmlFor="enable-gamification" className="font-medium text-sm">Enable Gamification</Label>
                    <p className="text-xs text-muted-foreground">Turn gamification features on or off</p>
                  </div>
                  <div className="flex items-center">
                    <input 
                      type="checkbox" 
                      id="enable-gamification" 
                      defaultChecked 
                      className="mr-2 h-4 w-4" 
                      aria-label="Enable gamification"
                      title="Enable gamification"
                    />
                    <Label htmlFor="enable-gamification" className="text-sm">Enabled</Label>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <Label htmlFor="public-leaderboard" className="font-medium text-sm">Public Leaderboard</Label>
                    <p className="text-xs text-muted-foreground">Show the leaderboard to all team members</p>
                  </div>
                  <div className="flex items-center">
                    <input 
                      type="checkbox" 
                      id="public-leaderboard" 
                      defaultChecked 
                      className="mr-2 h-4 w-4"
                      aria-label="Make leaderboard public" 
                      title="Make leaderboard public"
                    />
                    <Label htmlFor="public-leaderboard" className="text-sm">Public</Label>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <Label htmlFor="notifications" className="font-medium text-sm">Notifications</Label>
                    <p className="text-xs text-muted-foreground">Send notifications for achievements</p>
                  </div>
                  <div className="flex items-center">
                    <input 
                      type="checkbox" 
                      id="notifications" 
                      defaultChecked 
                      className="mr-2 h-4 w-4"
                      aria-label="Enable notifications" 
                      title="Enable notifications"
                    />
                    <Label htmlFor="notifications" className="text-sm">Enabled</Label>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-muted/30 rounded-lg p-3 md:p-4 space-y-3">
              <h3 className="text-base md:text-lg font-medium">XP & Levels</h3>
              <div className="grid gap-3">
                <div className="grid grid-cols-1 gap-2">
                  <Label htmlFor="base-xp" className="text-sm font-medium">
                    Base XP per Task
                  </Label>
                  <Input 
                    id="base-xp" 
                    type="number" 
                    defaultValue="100" 
                    className="w-full"
                    aria-label="Base XP per Task" 
                    placeholder="Enter base XP amount"
                  />
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <Label htmlFor="level-threshold" className="text-sm font-medium">
                    XP for Level Up
                  </Label>
                  <Input 
                    id="level-threshold" 
                    type="number" 
                    defaultValue="1000" 
                    className="w-full"
                    aria-label="XP for Level Up" 
                    placeholder="Enter XP required for level up"
                  />
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <Label htmlFor="max-level" className="text-sm font-medium">
                    Maximum Level
                  </Label>
                  <Input 
                    id="max-level" 
                    type="number" 
                    defaultValue="20" 
                    className="w-full"
                    aria-label="Maximum Level" 
                    placeholder="Enter maximum level"
                  />
                </div>
              </div>
            </div>

            <div className="bg-muted/30 rounded-lg p-3 md:p-4 space-y-3">
              <h3 className="text-base md:text-lg font-medium">Skill Trees</h3>
              <div className="grid gap-3">
                <div className="grid grid-cols-1 gap-2">
                  <Label htmlFor="max-skill-trees" className="text-sm font-medium">
                    Max Active Trees
                  </Label>
                  <Input 
                    id="max-skill-trees" 
                    type="number" 
                    defaultValue="3" 
                    className="w-full"
                    aria-label="Maximum Active Skill Trees" 
                    placeholder="Enter maximum number of active skill trees"
                  />
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <Label htmlFor="skill-difficulty" className="text-sm font-medium">
                    Skill Difficulty
                  </Label>
                  <select 
                    id="skill-difficulty" 
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    aria-label="Skill Difficulty"
                    defaultValue="medium"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowConfigureModal(false)} className="w-full sm:w-auto sm:order-1">Cancel</Button>
            <Button onClick={() => {
              toast({
                title: "Settings Saved",
                description: "Gamification settings have been updated",
              });
              setShowConfigureModal(false);
            }} className="w-full sm:w-auto sm:order-2">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Gamification</h1>
          <p className="text-muted-foreground">Level up your productivity with game-like experiences</p>
        </div>
        <div className="flex items-center gap-2 mt-2 md:mt-0">
          <Button variant="outline" size="sm" className="gap-1" onClick={handleViewLeaderboard}>
            <Users className="h-4 w-4" />
            <span className="sr-only md:not-sr-only">Leaderboard</span>
          </Button>
          <Button size="sm" className="gap-1" onClick={handleConfigureGamification}>
            <Settings className="h-4 w-4" />
            <span className="sr-only md:not-sr-only">Configure</span>
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
                  <Avatar className="h-14 w-14 md:h-16 md:w-16 border-2 border-primary">
                    <AvatarFallback className="text-lg md:text-xl">JD</AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground text-xs font-bold rounded-full h-5 w-5 md:h-6 md:w-6 flex items-center justify-center">
                    12
                  </div>
                </div>
                <div>
                  <CardTitle className="text-lg md:text-xl">John Doe</CardTitle>
                  <CardDescription>Frontend Developer</CardDescription>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <Badge variant="secondary" className="gap-1 text-xs md:text-sm">
                      <Star className="h-3 w-3 text-amber-500" />
                      <span>3,250 XP</span>
                    </Badge>
                    <Badge variant="outline" className="gap-1 text-xs md:text-sm">
                      <Trophy className="h-3 w-3 text-primary" />
                      <span>Level 12</span>
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2 mt-3 md:mt-0">
                <div className="text-xs md:text-sm text-muted-foreground">Next Level: 750 XP needed</div>
                <Progress value={70} className="h-2 w-full md:w-[200px]" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mt-4">
              <div className="bg-muted/40 rounded-md p-2 md:p-3 text-center">
                <div className="text-xl md:text-2xl font-bold">24</div>
                <div className="text-xs text-muted-foreground">Tasks Completed</div>
              </div>
              <div className="bg-muted/40 rounded-md p-2 md:p-3 text-center">
                <div className="text-xl md:text-2xl font-bold">8</div>
                <div className="text-xs text-muted-foreground">Achievements</div>
              </div>
              <div className="bg-muted/40 rounded-md p-2 md:p-3 text-center">
                <div className="text-xl md:text-2xl font-bold">3</div>
                <div className="text-xs text-muted-foreground">Skill Trees</div>
              </div>
              <div className="bg-muted/40 rounded-md p-2 md:p-3 text-center">
                <div className="text-xl md:text-2xl font-bold">2</div>
                <div className="text-xs text-muted-foreground">Rewards Claimed</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Skill Trees */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <h2 className="text-xl md:text-2xl font-bold">Skill Trees</h2>
          <Button variant="outline" size="sm" className="gap-1 w-full sm:w-auto" onClick={handleAddNewSkill}>
            <Plus className="h-4 w-4" />
            <span>New Skill</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
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
              <Button variant="outline" size="sm" className="w-full" onClick={() => handleViewSkillTree("Frontend Master")}>
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
              <Button variant="outline" size="sm" className="w-full" onClick={() => handleViewSkillTree("Team Player")}>
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
              <Button variant="outline" size="sm" className="w-full" onClick={() => handleViewSkillTree("Problem Solver")}>
                View Full Skill Tree
              </Button>
            </CardFooter>
          </Card>
        </div>
      </section>

      {/* Achievements & Rewards */}
      <section>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {/* Achievements */}
          <div>
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <h2 className="text-xl md:text-2xl font-bold">Recent Achievements</h2>
              <Button variant="ghost" size="sm" onClick={handleViewAllAchievements}>
                View All
              </Button>
            </div>

            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  <div className="flex items-start md:items-center gap-3 md:gap-4 p-3 md:p-4">
                    <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                      <Award className="h-5 w-5 md:h-6 md:w-6 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm md:text-base">Sprint Champion</div>
                      <div className="text-xs md:text-sm text-muted-foreground">Completed all assigned tasks in Sprint 22.04</div>
                    </div>
                    <Badge className="mt-1 text-xs">+250 XP</Badge>
                  </div>

                  <div className="flex items-start md:items-center gap-3 md:gap-4 p-3 md:p-4">
                    <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <Zap className="h-5 w-5 md:h-6 md:w-6 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm md:text-base">Code Quality Guardian</div>
                      <div className="text-xs md:text-sm text-muted-foreground">
                        Maintained 95% code coverage for 3 consecutive sprints
                      </div>
                    </div>
                    <Badge className="mt-1 text-xs">+300 XP</Badge>
                  </div>

                  <div className="flex items-start md:items-center gap-3 md:gap-4 p-3 md:p-4">
                    <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <Users className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm md:text-base">Team Player</div>
                      <div className="text-xs md:text-sm text-muted-foreground">
                        Helped 3 team members complete their tasks on time
                      </div>
                    </div>
                    <Badge className="mt-1 text-xs">+150 XP</Badge>
                  </div>

                  <div className="flex items-start md:items-center gap-3 md:gap-4 p-3 md:p-4">
                    <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                      <Trophy className="h-5 w-5 md:h-6 md:w-6 text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm md:text-base">First Milestone</div>
                      <div className="text-xs md:text-sm text-muted-foreground">
                        Successfully delivered the AI Scrum Master MVP
                      </div>
                    </div>
                    <Badge className="mt-1 text-xs">+500 XP</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Rewards */}
          <div>
            <div className="flex items-center justify-between mt-5 md:mt-0 mb-3 md:mb-4">
              <h2 className="text-xl md:text-2xl font-bold">Available Rewards</h2>
              <Button variant="ghost" size="sm" onClick={handleViewAllRewards}>
                View All
              </Button>
            </div>

            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  <div className="flex items-start md:items-center gap-3 md:gap-4 p-3 md:p-4">
                    <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Gift className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm md:text-base">Half-Day PTO</div>
                      <div className="text-xs md:text-sm text-muted-foreground">Take a half-day off work</div>
                    </div>
                    <Button size="sm" className="text-xs" onClick={() => handleClaimReward("Half-Day PTO")}>Claim</Button>
                  </div>

                  <div className="flex items-start md:items-center gap-3 md:gap-4 p-3 md:p-4">
                    <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Gift className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm md:text-base">Charity Donation</div>
                      <div className="text-xs md:text-sm text-muted-foreground">$50 donation to charity of your choice</div>
                    </div>
                    <Button size="sm" className="text-xs" onClick={() => handleClaimReward("Charity Donation")}>Claim</Button>
                  </div>

                  <div className="flex items-start md:items-center gap-3 md:gap-4 p-3 md:p-4">
                    <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <Gift className="h-5 w-5 md:h-6 md:w-6 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm md:text-base text-muted-foreground">Team Lunch</div>
                      <div className="text-xs md:text-sm text-muted-foreground">Lunch for the entire team</div>
                    </div>
                    <Button size="sm" className="text-xs" disabled>
                      5000 XP
                    </Button>
                  </div>

                  <div className="flex items-start md:items-center gap-3 md:gap-4 p-3 md:p-4">
                    <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <Gift className="h-5 w-5 md:h-6 md:w-6 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm md:text-base text-muted-foreground">Conference Ticket</div>
                      <div className="text-xs md:text-sm text-muted-foreground">Ticket to a tech conference of your choice</div>
                    </div>
                    <Button size="sm" className="text-xs" disabled>
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
        <div className="flex justify-between items-center mt-5 md:mt-6 mb-3 md:mb-6">
          <h2 className="text-lg md:text-xl font-bold">Team Leaderboard</h2>
          <Button variant="ghost" size="sm" onClick={handleViewFullLeaderboard}>
            View Full
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base md:text-lg">Top Performers This Sprint</CardTitle>
            <CardDescription className="text-xs md:text-sm">May 1 - May 14</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 md:space-y-4">
              <div className="flex items-center gap-2 md:gap-4">
                <div className="h-6 w-6 md:h-8 md:w-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <div className="font-bold text-amber-600 text-xs md:text-sm">1</div>
                </div>
                <Avatar className="h-8 w-8 md:h-10 md:w-10">
                  <AvatarFallback>RJ</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="font-medium text-sm md:text-base truncate">Robert Johnson</div>
                  <div className="text-xs text-muted-foreground truncate">Backend Developer</div>
                </div>
                <Badge variant="secondary" className="gap-1 shrink-0">
                  <Star className="h-3 w-3 text-amber-500" />
                  <span className="text-xs">4,250</span>
                </Badge>
              </div>

              <div className="flex items-center gap-2 md:gap-4">
                <div className="h-6 w-6 md:h-8 md:w-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <div className="font-bold text-slate-600 text-xs md:text-sm">2</div>
                </div>
                <Avatar className="h-8 w-8 md:h-10 md:w-10">
                  <AvatarFallback>JD</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="font-medium text-sm md:text-base truncate">John Doe</div>
                  <div className="text-xs text-muted-foreground truncate">Frontend Developer</div>
                </div>
                <Badge variant="secondary" className="gap-1 shrink-0">
                  <Star className="h-3 w-3 text-amber-500" />
                  <span className="text-xs">3,250</span>
                </Badge>
              </div>

              <div className="flex items-center gap-2 md:gap-4">
                <div className="h-6 w-6 md:h-8 md:w-8 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0">
                  <div className="font-bold text-amber-600 text-xs md:text-sm">3</div>
                </div>
                <Avatar className="h-8 w-8 md:h-10 md:w-10">
                  <AvatarFallback>EW</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="font-medium text-sm md:text-base truncate">Emily Wilson</div>
                  <div className="text-xs text-muted-foreground truncate">Project Manager</div>
                </div>
                <Badge variant="secondary" className="gap-1 shrink-0">
                  <Star className="h-3 w-3 text-amber-500" />
                  <span className="text-xs">2,980</span>
                </Badge>
              </div>

              <div className="flex items-center gap-2 md:gap-4">
                <div className="h-6 w-6 md:h-8 md:w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <div className="font-medium text-muted-foreground text-xs md:text-sm">4</div>
                </div>
                <Avatar className="h-8 w-8 md:h-10 md:w-10">
                  <AvatarFallback>AS</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="font-medium text-sm md:text-base truncate">Alice Smith</div>
                  <div className="text-xs text-muted-foreground truncate">UX Designer</div>
                </div>
                <Badge variant="secondary" className="gap-1 shrink-0">
                  <Star className="h-3 w-3 text-amber-500" />
                  <span className="text-xs">2,450</span>
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

// Define the missing icon components
function CheckIcon(props: React.SVGProps<SVGSVGElement>) {
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

function LightbulbIcon(props: React.SVGProps<SVGSVGElement>) {
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

function LockIcon(props: React.SVGProps<SVGSVGElement>) {
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
