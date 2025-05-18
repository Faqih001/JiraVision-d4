import React from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, BarChart3, Check, Download, FileText, LineChart, RefreshCw, Settings, Shield, ThumbsUp, Zap } from "lucide-react";

// Type definitions for our components
interface TeamMember {
  id: number;
  name: string;
  avatar: string | null;
  workloadPercentage: number;
  status: 'balanced' | 'high' | 'low';
  overtimeHours: number;
}

interface Recommendation {
  id: number;
  title: string;
  description: string;
  type: 'warning' | 'suggestion' | 'critical';
  status: 'pending' | 'applied' | 'dismissed';
}

interface ComplianceEvent {
  id: number;
  title: string;
  description: string;
  type: 'success' | 'warning' | 'error';
  date: string;
  timeAgo: string;
}

// Workload card component
export function WorkloadCard({ teamMembers }: { teamMembers: TeamMember[] }) {
  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold">Workload Distribution</h3>
        <p className="text-sm text-muted-foreground">Task allocation across team members</p>
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
            {teamMembers.map((member) => (
              <div key={member.id}>
                <div className="flex justify-between mb-1 text-sm">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback>{member.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <span>{member.name}</span>
                  </div>
                  <span className={`font-medium ${
                    member.status === 'high' ? 'text-amber-600' : 
                    member.status === 'low' ? 'text-blue-600' : ''
                  }`}>
                    {member.status === 'balanced' ? 'Balanced' : member.status === 'high' ? 'High' : 'Low'} 
                    ({member.workloadPercentage}%)
                  </span>
                </div>
                <Progress 
                  value={Math.min(member.workloadPercentage, 100)} 
                  className={`h-2 ${
                    member.status === 'high' ? 'bg-amber-100' : 
                    member.status === 'low' ? 'bg-blue-100' : ''
                  }`} 
                />
              </div>
            ))}
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
  );
}

// Pay Equity Card
export function PayEquityCard({ onViewReport }: { onViewReport: () => void }) {
  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold">Pay Equity Analysis</h3>
        <p className="text-sm text-muted-foreground">Compensation fairness across demographics</p>
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
                <h4 className="text-base font-semibold">By Gender</h4>
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
                <h4 className="text-base font-semibold">By Ethnicity</h4>
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
                <h4 className="text-base font-semibold">By Experience</h4>
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
        <Button variant="outline" size="sm" className="gap-1" onClick={onViewReport}>
          <Shield className="h-4 w-4" />
          <span>View Compliance Report</span>
        </Button>
      </CardFooter>
    </Card>
  );
}

// DEI Task Distribution Card
export function DeiTaskCard({ onTakeAction }: { onTakeAction: () => void }) {
  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold">DEI Task Distribution</h3>
        <p className="text-sm text-muted-foreground">Diversity, equity, and inclusion in task allocation</p>
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
      <CardFooter className="border-t pt-4 flex flex-col xs:flex-row justify-between gap-2">
        <div className="text-sm text-muted-foreground w-full xs:w-auto">
          <AlertCircle className="h-4 w-4 inline mr-1 text-amber-500" />
          <span className="text-xs sm:text-sm">Action needed to improve high-visibility task distribution</span>
        </div>
        <Button variant="outline" size="sm" className="w-full xs:w-auto" onClick={onTakeAction}>
          Take Action
        </Button>
      </CardFooter>
    </Card>
  );
}

// Overtime Monitoring Card
export function OvertimeCard({ onSetLimits, teamMembers }: { onSetLimits: () => void, teamMembers: TeamMember[] }) {
  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold">Overtime Monitoring</h3>
        <p className="text-sm text-muted-foreground">Work hours beyond standard schedule</p>
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
                <h4 className="text-base font-semibold">Weekly Overtime</h4>
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
                <h4 className="text-base font-semibold">After-Hours Communication</h4>
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
            {teamMembers.map((member) => (
              <div key={member.id}>
                <div className="flex justify-between mb-1 text-sm">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback>{member.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <span>{member.name}</span>
                  </div>
                  <span className={`font-medium ${member.overtimeHours > 4 ? 'text-amber-600' : ''}`}>
                    {member.overtimeHours} hrs/week
                  </span>
                </div>
                <Progress 
                  value={Math.min(member.overtimeHours * 20, 100)} 
                  className={`h-2 ${member.overtimeHours > 4 ? 'bg-amber-100' : ''}`} 
                />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
      <CardFooter className="border-t pt-4">
        <Button variant="outline" size="sm" className="w-full gap-1" onClick={onSetLimits}>
          <Shield className="h-4 w-4" />
          <span>Set Overtime Limits</span>
        </Button>
      </CardFooter>
    </Card>
  );
}

// Recommendations Card
export function RecommendationsCard({ recommendations, onApplyRecommendation }: { 
  recommendations: Recommendation[], 
  onApplyRecommendation: (id: number) => void 
}) {
  return (
    <Card className="bg-primary/5 border-primary/20 mb-6">
      <CardHeader className="pb-2">
        <h3 className="text-lg font-semibold">Recommended Actions</h3>
        <p className="text-sm text-muted-foreground">Based on current ethical metrics</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recommendations.map((rec) => (
            <div key={rec.id} className="flex items-start gap-3">
              <div className={`h-8 w-8 rounded-full ${
                rec.type === 'warning' ? 'bg-amber-100' : 
                rec.type === 'critical' ? 'bg-red-100' : 'bg-blue-100'
              } flex items-center justify-center mt-1 flex-shrink-0`}>
                {rec.type === 'warning' || rec.type === 'critical' ? (
                  <AlertCircle className={`h-4 w-4 ${
                    rec.type === 'warning' ? 'text-amber-600' : 'text-red-600'
                  }`} />
                ) : (
                  <Zap className="h-4 w-4 text-blue-600" />
                )}
              </div>
              <div>
                <h4 className="font-medium">{rec.title}</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  {rec.description}
                </p>
                <Button 
                  size="sm" 
                  variant={rec.type === 'suggestion' ? 'outline' : 'default'}
                  onClick={() => onApplyRecommendation(rec.id)}
                >
                  {rec.type === 'suggestion' ? 'Consider' : 'Apply Recommendation'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Governance Policies Card
export function GovernancePoliciesCard() {
  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold">Governance Policies</h3>
        <p className="text-sm text-muted-foreground">Active ethical guidelines</p>
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
  );
}

// Compliance History Card
export function ComplianceHistoryCard({ complianceEvents }: { complianceEvents: ComplianceEvent[] }) {
  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold">Compliance History</h3>
        <p className="text-sm text-muted-foreground">Recent ethical governance events</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {complianceEvents.map((event) => (
            <div key={event.id} className="flex items-start gap-3">
              <div className={`h-8 w-8 rounded-full ${
                event.type === 'success' ? 'bg-green-100' : 
                event.type === 'warning' ? 'bg-amber-100' : 'bg-red-100'
              } flex items-center justify-center mt-1 flex-shrink-0`}>
                {event.type === 'success' ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className={`h-4 w-4 ${
                    event.type === 'warning' ? 'text-amber-600' : 'text-red-600'
                  }`} />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">{event.title}</h4>
                  <Badge variant="outline" className="text-xs">
                    {event.timeAgo}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {event.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter className="border-t pt-4">
        <Button variant="outline" size="sm" className="w-full gap-1">
          <FileText className="h-4 w-4" />
          <span>View Full History</span>
        </Button>
      </CardFooter>
    </Card>
  );
}

// Compliance Overview Card
export function ComplianceOverviewCard({ 
  title, 
  description, 
  score, 
  icon, 
  iconClass, 
  bgClass,
  textClass 
}: { 
  title: string, 
  description: string, 
  score: number, 
  icon: React.ReactNode,
  iconClass: string,
  bgClass: string,
  textClass: string
}) {
  return (
    <Card className={`${bgClass} border-${textClass.replace('text-', 'border-')}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <h3 className={`text-lg font-semibold ${textClass.replace('-700', '-800')}`}>{title}</h3>
          <div className={`h-8 w-8 rounded-full bg-${textClass.replace('text-', '').replace('-700', '-100')} flex items-center justify-center`}>
            {icon}
          </div>
        </div>
        <p className={`text-sm ${textClass}`}>{description}</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className={`${textClass.replace('-700', '-800')}`}>Compliance Score</span>
            <span className={`font-medium ${textClass.replace('-700', '-800')}`}>{score}%</span>
          </div>
          <Progress value={score} className={`h-2 bg-${textClass.replace('text-', '').replace('-700', '-100')}`} />
          <p className={`text-xs ${textClass}`}>
            {score >= 95 
              ? "Excellent compliance level - all requirements are met." 
              : score >= 90 
                ? "Good compliance level with minor improvements needed." 
                : "Moderate compliance level - action needed."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// Export Components
export { Alert } from "@/components/ui/alert";
export { AlertTitle } from "@/components/ui/alert";
export { AlertDescription } from "@/components/ui/alert";
