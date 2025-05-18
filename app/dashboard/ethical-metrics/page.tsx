"use client"
import { useState, useEffect } from "react"
import { useTheme } from "next-themes"
import {
  AlertCircle,
  BarChart3,
  Check,
  Download,
  FileText,
  LineChart,
  RefreshCw,
  Settings,
  Shield,
  ThumbsUp,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useMobile } from "@/hooks/use-mobile"
import { toast } from "@/components/ui/use-toast"
import { ConfigureEthicalMetricsModal } from "@/components/ethical-metrics/configure-metrics-modal"
import { OvertimeLimitsModal } from "@/components/ethical-metrics/overtime-limits-modal"
import { ComplianceReportModal } from "@/components/ethical-metrics/compliance-report-modal"
import { 
  WorkloadCard, 
  PayEquityCard,
  DeiTaskCard,
  OvertimeCard,
  RecommendationsCard,
  GovernancePoliciesCard,
  ComplianceHistoryCard,
  ComplianceOverviewCard
} from "@/components/ethical-metrics/metrics-components"

export default function EthicalMetricsPage() {
  const { theme, setTheme } = useTheme()
  const isMobile = useMobile()

  const handleExportReport = () => {
    toast({
      title: "Exporting Report",
      description: "Generating and downloading ethical metrics report...",
    });
    
    // This would typically generate and download a PDF or Excel file
  };

  const handleConfigure = () => {
    toast({
      title: "Configure Metrics",
      description: "Opening ethical metrics configuration settings...",
    });
    
    // This would typically open a configuration modal
  };

  const handleApplyRecommendation = async () => {
    try {
      toast({
        title: "Applying Recommendation",
        description: "Implementing ethical recommendation...",
      });
      
      // This would typically make an API call to apply the recommendation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Recommendation Applied",
        description: "The ethical recommendation has been implemented successfully.",
      });
    } catch (error) {
      console.error("Error applying recommendation:", error);
      toast({
        title: "Error",
        description: "Failed to apply recommendation. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleViewComplianceReport = () => {
    toast({
      title: "Compliance Report",
      description: "Opening detailed compliance report...",
    });
    
    // This would typically open a detailed compliance report
  };

  const handleSetOvertimeLimits = () => {
    toast({
      title: "Overtime Limits",
      description: "Opening overtime limits configuration...",
    });
    
    // This would typically open a settings modal
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Ethical Metrics</h1>
          <p className="text-muted-foreground">Monitor and enforce ethical standards across your team</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1" onClick={handleExportReport}>
            <Download className="h-4 w-4" />
            <span>Export Report</span>
          </Button>
          <Button size="sm" className="gap-1" onClick={handleConfigure}>
            <Settings className="h-4 w-4" />
            <span>Configure</span>
          </Button>
        </div>
      </div>

      {/* Ethical Compliance Overview */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Compliance Overview</h2>
          <Badge variant="outline" className="gap-1">
            <RefreshCw className="h-3 w-3" />
            <span>Updated hourly</span>
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-green-50 border-green-200">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-green-800">Pay Equity</CardTitle>
                <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                  <Check className="h-4 w-4 text-green-600" />
                </div>
              </div>
              <CardDescription className="text-green-700">100% Compliant</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-green-800">Compliance Score</span>
                  <span className="font-medium text-green-800">100%</span>
                </div>
                <Progress value={100} className="h-2 bg-green-100" />
                <p className="text-xs text-green-700">
                  All team members are paid equitably based on role, experience, and location.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 border-blue-200">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-blue-800">Workload Balance</CardTitle>
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <Check className="h-4 w-4 text-blue-600" />
                </div>
              </div>
              <CardDescription className="text-blue-700">92% Balanced</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-blue-800">Balance Score</span>
                  <span className="font-medium text-blue-800">92%</span>
                </div>
                <Progress value={92} className="h-2 bg-blue-100" />
                <p className="text-xs text-blue-700">
                  Task distribution is well-balanced with minor adjustments needed for one team member.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-amber-50 border-amber-200">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-amber-800">DEI Task Distribution</CardTitle>
                <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                </div>
              </div>
              <CardDescription className="text-amber-700">88% Compliant</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-amber-800">Distribution Score</span>
                  <span className="font-medium text-amber-800">88%</span>
                </div>
                <Progress value={88} className="h-2 bg-amber-100" />
                <p className="text-xs text-amber-700">
                  High-visibility tasks need more equitable distribution across team demographics.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Detailed Metrics */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Detailed Metrics</h2>

        <Tabs defaultValue="workload">
          <TabsList className="mb-4">
            <TabsTrigger value="workload">Workload</TabsTrigger>
            <TabsTrigger value="pay">Pay Equity</TabsTrigger>
            <TabsTrigger value="dei">DEI</TabsTrigger>
            <TabsTrigger value="overtime">Overtime</TabsTrigger>
          </TabsList>

          <TabsContent value="workload">
            <Card>
              <CardHeader>
                <CardTitle>Workload Distribution</CardTitle>
                <CardDescription>Task allocation across team members</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="h-[300px] flex items-center justify-center bg-muted/30 rounded-md">
                    <div className="text-center">
                      <BarChart3 className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">Workload Distribution Chart</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-1 text-sm">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback>JD</AvatarFallback>
                          </Avatar>
                          <span>John Doe</span>
                        </div>
                        <span className="font-medium">Balanced (95%)</span>
                      </div>
                      <Progress value={95} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1 text-sm">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback>AS</AvatarFallback>
                          </Avatar>
                          <span>Alice Smith</span>
                        </div>
                        <span className="font-medium text-amber-600">High (120%)</span>
                      </div>
                      <Progress value={100} className="h-2 bg-amber-100" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1 text-sm">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback>RJ</AvatarFallback>
                          </Avatar>
                          <span>Robert Johnson</span>
                        </div>
                        <span className="font-medium">Balanced (90%)</span>
                      </div>
                      <Progress value={90} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1 text-sm">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback>EW</AvatarFallback>
                          </Avatar>
                          <span>Emily Wilson</span>
                        </div>
                        <span className="font-medium">Balanced (85%)</span>
                      </div>
                      <Progress value={85} className="h-2" />
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t pt-4">
                <Button variant="outline" size="sm" className="gap-1">
                  <FileText className="h-4 w-4" />
                  <span>View Detailed Report</span>
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="pay">
            <Card>
              <CardHeader>
                <CardTitle>Pay Equity Analysis</CardTitle>
                <CardDescription>Compensation fairness across demographics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="h-[300px] flex items-center justify-center bg-muted/30 rounded-md">
                    <div className="text-center">
                      <BarChart3 className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">Pay Equity Visualization</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader className="p-3">
                        <CardTitle className="text-base">By Gender</CardTitle>
                      </CardHeader>
                      <CardContent className="p-3 pt-0">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Equity Ratio</span>
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            1.00
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Perfect equity achieved across gender demographics.
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="p-3">
                        <CardTitle className="text-base">By Ethnicity</CardTitle>
                      </CardHeader>
                      <CardContent className="p-3 pt-0">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Equity Ratio</span>
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            1.00
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Perfect equity achieved across ethnic demographics.
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="p-3">
                        <CardTitle className="text-base">By Experience</CardTitle>
                      </CardHeader>
                      <CardContent className="p-3 pt-0">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Equity Ratio</span>
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            1.00
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Perfect equity achieved across experience levels.
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t pt-4">
                <Button variant="outline" size="sm" className="gap-1" onClick={handleViewComplianceReport}>
                  <Shield className="h-4 w-4" />
                  <span>View Compliance Report</span>
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="dei">
            <Card>
              <CardHeader>
                <CardTitle>DEI Task Distribution</CardTitle>
                <CardDescription>Diversity, equity, and inclusion in task allocation</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="h-[300px] flex items-center justify-center bg-muted/30 rounded-md">
                    <div className="text-center">
                      <BarChart3 className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">DEI Task Distribution Chart</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-1 text-sm">
                        <span>High-Visibility Tasks</span>
                        <span className="font-medium text-amber-600">85%</span>
                      </div>
                      <Progress value={85} className="h-2 bg-amber-100" />
                      <p className="text-xs text-muted-foreground mt-1">
                        Distribution of tasks that provide visibility to leadership and stakeholders.
                      </p>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1 text-sm">
                        <span>Technical Leadership</span>
                        <span className="font-medium text-amber-600">80%</span>
                      </div>
                      <Progress value={80} className="h-2 bg-amber-100" />
                      <p className="text-xs text-muted-foreground mt-1">
                        Distribution of tasks that demonstrate technical leadership.
                      </p>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1 text-sm">
                        <span>Career Growth Opportunities</span>
                        <span className="font-medium">95%</span>
                      </div>
                      <Progress value={95} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1">
                        Distribution of tasks that contribute to career advancement.
                      </p>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1 text-sm">
                        <span>Administrative Tasks</span>
                        <span className="font-medium">90%</span>
                      </div>
                      <Progress value={90} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1">
                        Distribution of administrative and support tasks.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t pt-4 flex justify-between">
                <div className="text-sm text-muted-foreground">
                  <AlertCircle className="h-4 w-4 inline mr-1 text-amber-500" />
                  <span>Action needed to improve high-visibility task distribution</span>
                </div>
                <Button variant="outline" size="sm">
                  Take Action
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="overtime">
            <Card>
              <CardHeader>
                <CardTitle>Overtime Monitoring</CardTitle>
                <CardDescription>Work hours beyond standard schedule</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="h-[300px] flex items-center justify-center bg-muted/30 rounded-md">
                    <div className="text-center">
                      <LineChart className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">Overtime Trend Visualization</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="p-3">
                        <CardTitle className="text-base">Weekly Overtime</CardTitle>
                      </CardHeader>
                      <CardContent className="p-3 pt-0">
                        <div className="text-3xl font-bold">2.5 hrs</div>
                        <div className="text-sm text-muted-foreground">Average per team member</div>
                        <div className="mt-2 text-xs flex items-center gap-1 text-green-600">
                          <ThumbsUp className="h-3 w-3" />
                          <span>Within healthy limits</span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="p-3">
                        <CardTitle className="text-base">After-Hours Communication</CardTitle>
                      </CardHeader>
                      <CardContent className="p-3 pt-0">
                        <div className="text-3xl font-bold">3.2 hrs</div>
                        <div className="text-sm text-muted-foreground">Average per team member</div>
                        <div className="mt-2 text-xs flex items-center gap-1 text-amber-600">
                          <AlertCircle className="h-3 w-3" />
                          <span>Slightly above target</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-1 text-sm">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback>JD</AvatarFallback>
                          </Avatar>
                          <span>John Doe</span>
                        </div>
                        <span className="font-medium">1.5 hrs/week</span>
                      </div>
                      <Progress value={30} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1 text-sm">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback>AS</AvatarFallback>
                          </Avatar>
                          <span>Alice Smith</span>
                        </div>
                        <span className="font-medium text-amber-600">4.5 hrs/week</span>
                      </div>
                      <Progress value={90} className="h-2 bg-amber-100" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1 text-sm">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback>RJ</AvatarFallback>
                          </Avatar>
                          <span>Robert Johnson</span>
                        </div>
                        <span className="font-medium">2.0 hrs/week</span>
                      </div>
                      <Progress value={40} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1 text-sm">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback>EW</AvatarFallback>
                          </Avatar>
                          <span>Emily Wilson</span>
                        </div>
                        <span className="font-medium">2.0 hrs/week</span>
                      </div>
                      <Progress value={40} className="h-2" />
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t pt-4">
                <Button variant="outline" size="sm" className="w-full gap-1" onClick={handleSetOvertimeLimits}>
                  <Shield className="h-4 w-4" />
                  <span>Set Overtime Limits</span>
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </section>

      {/* Ethical Governance Actions */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Governance Actions</h2>
          <Badge>AI Recommended</Badge>
        </div>

        <Card className="bg-primary/5 border-primary/20 mb-6">
          <CardHeader className="pb-2">
            <CardTitle>Recommended Actions</CardTitle>
            <CardDescription>Based on current ethical metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center mt-1 flex-shrink-0">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-medium">Redistribute High-Visibility Tasks</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Ensure team members from underrepresented groups are assigned to high-visibility tasks.
                  </p>
                  <Button size="sm" onClick={handleApplyRecommendation}>Apply Recommendation</Button>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center mt-1 flex-shrink-0">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-medium">Reduce Alice's Workload</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Alice is consistently working overtime. Redistribute 2-3 tasks to team members with capacity.
                  </p>
                  <Button size="sm" onClick={handleApplyRecommendation}>Apply Recommendation</Button>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center mt-1 flex-shrink-0">
                  <Zap className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium">Implement "No Meeting Friday Afternoons"</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Reduce after-hours work by creating focused work time during regular hours.
                  </p>
                  <Button size="sm" variant="outline">
                    Consider
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Governance Policies</CardTitle>
              <CardDescription>Active ethical guidelines</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                      <Check className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <div className="font-medium">Maximum 5 Hours Overtime</div>
                      <div className="text-sm text-muted-foreground">Per week, per team member</div>
                    </div>
                  </div>
                  <Badge variant="outline">Active</Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                      <Check className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <div className="font-medium">Equal Pay for Equal Work</div>
                      <div className="text-sm text-muted-foreground">Across all demographics</div>
                    </div>
                  </div>
                  <Badge variant="outline">Active</Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                      <Check className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <div className="font-medium">Balanced Task Distribution</div>
                      <div className="text-sm text-muted-foreground">Across team demographics</div>
                    </div>
                  </div>
                  <Badge variant="outline">Active</Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                      <Check className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <div className="font-medium">No After-Hours Communication</div>
                      <div className="text-sm text-muted-foreground">Unless urgent</div>
                    </div>
                  </div>
                  <Badge variant="outline">Active</Badge>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t pt-4">
              <Button variant="outline" size="sm" className="w-full gap-1">
                <Settings className="h-4 w-4" />
                <span>Manage Policies</span>
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Compliance History</CardTitle>
              <CardDescription>Recent ethical governance events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center mt-1 flex-shrink-0">
                    <Check className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">Workload Rebalanced</h3>
                      <Badge variant="outline" className="text-xs">
                        2 days ago
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Tasks redistributed to balance workload across the team.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center mt-1 flex-shrink-0">
                    <Check className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">Pay Equity Audit Completed</h3>
                      <Badge variant="outline" className="text-xs">
                        1 week ago
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Quarterly audit confirmed 100% pay equity compliance.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center mt-1 flex-shrink-0">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">Overtime Alert Triggered</h3>
                      <Badge variant="outline" className="text-xs">
                        2 weeks ago
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Alice Smith exceeded overtime limits. Workload adjusted.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center mt-1 flex-shrink-0">
                    <Check className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">DEI Task Distribution Improved</h3>
                      <Badge variant="outline" className="text-xs">
                        3 weeks ago
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      High-visibility tasks redistributed to improve DEI metrics.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t pt-4">
              <Button variant="outline" size="sm" className="w-full gap-1">
                <FileText className="h-4 w-4" />
                <span>View Full History</span>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </section>
    </div>
  )
}
