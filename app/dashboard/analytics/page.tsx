import { useTheme } from "@/components/ui/use-theme"
import { useMobile } from "@/hooks/use-mobile"
import { useToast } from "@/components/ui/use-toast"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  BarChart, 
  LineChart, 
  Settings, 
  Download, 
  Users, 
  Award, 
  Clock, 
  Calendar, 
  TrendingUp, 
  AlertTriangle,
  Zap
} from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"

export default function AnalyticsPage() {
  const { theme, setTheme } = useTheme()
  const isMobile = useMobile()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("overview")

  // Handle button actions
  const handleExportReport = () => {
    toast({
      title: "Export Report",
      description: "Preparing analytics report for export...",
    });
  };

  const handleCustomize = () => {
    toast({
      title: "Customize Dashboard",
      description: "Opening dashboard customization settings...",
    });
  };

  const handleConfigureEmail = () => {
    toast({
      title: "Configure Email Reports",
      description: "Opening email report configuration...",
    });
  };

  const handleViewAllTrends = () => {
    toast({
      title: "All Trends",
      description: "Opening detailed trends view...",
    });
  };

  const handleViewAllSprints = () => {
    toast({
      title: "Sprint Details",
      description: "Opening detailed sprint metrics view...",
    });
  };

  const handleViewAllTeams = () => {
    toast({
      title: "Team Performance",
      description: "Opening detailed team metrics view...",
    });
  };

  const handleViewAllRisks = () => {
    toast({
      title: "Risk Analysis",
      description: "Opening detailed risk metrics view...",
    });
  };

  const handlePredictiveAnalysis = () => {
    toast({
      title: "Predictive Analysis",
      description: "Generating AI-powered predictions...",
    });
  };

  const handleGenerateReport = () => {
    toast({
      title: "Generate Report",
      description: "Creating comprehensive analytics report...",
    });
  };

  const handleCompareWithPrevious = () => {
    toast({
      title: "Compare Reports",
      description: "Opening comparison with previous period...",
    });
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">Insights and performance metrics</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1" onClick={handleCustomize}>
            <Settings className="h-4 w-4" />
            <span>Customize</span>
          </Button>
          <Button size="sm" className="gap-1" onClick={handleExportReport}>
            <Download className="h-4 w-4" />
            <span>Export Report</span>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full md:w-fit grid-cols-3 mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col space-y-2">
                  <span className="text-muted-foreground text-sm">Velocity</span>
                  <div className="flex items-end justify-between">
                    <span className="text-2xl font-bold">42</span>
                    <span className="text-emerald-600 text-sm flex items-center">+8%</span>
                  </div>
                  <span className="text-xs text-muted-foreground">points/sprint</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col space-y-2">
                  <span className="text-muted-foreground text-sm">Cycle Time</span>
                  <div className="flex items-end justify-between">
                    <span className="text-2xl font-bold">2.4</span>
                    <span className="text-emerald-600 text-sm flex items-center">-15%</span>
                  </div>
                  <span className="text-xs text-muted-foreground">days</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col space-y-2">
                  <span className="text-muted-foreground text-sm">Delivery Rate</span>
                  <div className="flex items-end justify-between">
                    <span className="text-2xl font-bold">94%</span>
                    <span className="text-emerald-600 text-sm flex items-center">+3%</span>
                  </div>
                  <span className="text-xs text-muted-foreground">completion</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col space-y-2">
                  <span className="text-muted-foreground text-sm">Happiness Score</span>
                  <div className="flex items-end justify-between">
                    <span className="text-2xl font-bold">8.2</span>
                    <span className="text-emerald-600 text-sm flex items-center">+0.4</span>
                  </div>
                  <span className="text-xs text-muted-foreground">team avg.</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-2">
              <CardHeader className="pb-0">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Key Trends</h2>
                  <Button variant="ghost" size="sm" onClick={handleViewAllTrends}>
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-72 flex items-center justify-center text-muted-foreground text-sm">
                  [Line Chart: 6-Month Velocity Trend]
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sprint Success</CardTitle>
                <CardDescription>Last 6 sprints</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Sprint 23.05</span>
                      <span className="font-medium">94%</span>
                    </div>
                    <Progress value={94} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Sprint 23.04</span>
                      <span className="font-medium">89%</span>
                    </div>
                    <Progress value={89} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Sprint 23.03</span>
                      <span className="font-medium">97%</span>
                    </div>
                    <Progress value={97} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Sprint 23.02</span>
                      <span className="font-medium">86%</span>
                    </div>
                    <Progress value={86} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Sprint 23.01</span>
                      <span className="font-medium">91%</span>
                    </div>
                    <Progress value={91} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Sprint 22.12</span>
                      <span className="font-medium">83%</span>
                    </div>
                    <Progress value={83} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold">Sprint Performance</h3>
                    <Button variant="ghost" size="sm" onClick={handleViewAllSprints}>
                      View All
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Sprint Completion Rate</span>
                    </div>
                    <span className="font-medium text-emerald-600">94%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Average Cycle Time</span>
                    </div>
                    <span className="font-medium">2.4 days</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Estimate Accuracy</span>
                    </div>
                    <span className="font-medium">87%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Issues per Sprint</span>
                    </div>
                    <span className="font-medium">3.2 avg</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold">Team Performance</h3>
                    <Button variant="ghost" size="sm" onClick={handleViewAllTeams}>
                      View All
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Team Velocity</span>
                    </div>
                    <span className="font-medium">42 points/sprint</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Award className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Team Capacity</span>
                    </div>
                    <span className="font-medium">85%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Skill Coverage</span>
                    </div>
                    <span className="font-medium">92%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Overtime Hours</span>
                    </div>
                    <span className="font-medium text-emerald-600">-12%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Risk Analysis</h2>
                <Button variant="ghost" size="sm" onClick={handleViewAllRisks}>
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-medium">Predictive Analysis</h3>
                    <Button size="sm" variant="outline" onClick={handlePredictiveAnalysis}>
                      Run Analysis
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Deadline Risk</span>
                      <Badge className="bg-amber-100 text-amber-800">Medium</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Resource Risk</span>
                      <Badge className="bg-green-100 text-green-800">Low</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Technical Risk</span>
                      <Badge className="bg-red-100 text-red-800">High</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Scope Risk</span>
                      <Badge className="bg-amber-100 text-amber-800">Medium</Badge>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2 h-40 flex items-center justify-center text-muted-foreground text-sm">
                  [Risk Heat Map Visualization]
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Team Performance Analysis</CardTitle>
              <CardDescription>Performance metrics for all team members</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-96 flex items-center justify-center text-muted-foreground">
                [Team Performance Dashboard]
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Custom Reports</CardTitle>
              <CardDescription>Generate custom analytics reports</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                [Report Configuration Interface]
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Recent Reports</h4>
                  <ul className="space-y-1 text-sm">
                    <li className="text-muted-foreground">Sprint 23.05 Summary</li>
                    <li className="text-muted-foreground">Q2 Performance Overview</li>
                    <li className="text-muted-foreground">Risk Assessment - May 2023</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Report Templates</h4>
                  <ul className="space-y-1 text-sm">
                    <li className="text-muted-foreground">Sprint Summary</li>
                    <li className="text-muted-foreground">Quarterly Review</li>
                    <li className="text-muted-foreground">Team Performance</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Export Options</h4>
                  <ul className="space-y-1 text-sm">
                    <li className="text-muted-foreground">PDF Document</li>
                    <li className="text-muted-foreground">Excel Spreadsheet</li>
                    <li className="text-muted-foreground">Email Report</li>
                  </ul>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between pt-4 gap-4">
              <Button onClick={handleGenerateReport} className="flex-1">
                Generate Report
              </Button>
              <Button variant="outline" onClick={handleCompareWithPrevious} className="flex-1">
                Compare With Previous
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Email Reports</CardTitle>
              <CardDescription>Configure automatic email reports</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Weekly Sprint Summary</h4>
                    <p className="text-sm text-muted-foreground">Sent every Friday at 4:00 PM</p>
                  </div>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    Active
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Monthly Performance Report</h4>
                    <p className="text-sm text-muted-foreground">Sent on the last day of each month</p>
                  </div>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    Active
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Quarterly Review</h4>
                    <p className="text-sm text-muted-foreground">Sent at the end of each quarter</p>
                  </div>
                  <Badge variant="outline" className="bg-muted text-muted-foreground">
                    Inactive
                  </Badge>
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-4 border-t">
              <Button variant="outline" size="sm" className="w-full" onClick={handleConfigureEmail}>
                Configure Email Reports
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 