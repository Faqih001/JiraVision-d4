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
  
  // State for modals
  const [isConfigureModalOpen, setIsConfigureModalOpen] = useState(false)
  const [isOvertimeLimitsModalOpen, setIsOvertimeLimitsModalOpen] = useState(false)
  const [isComplianceReportModalOpen, setIsComplianceReportModalOpen] = useState(false)
  
  // State for ethical metrics data
  const [isLoading, setIsLoading] = useState(true)
  const [metricsData, setMetricsData] = useState<{
    payEquityScore: number;
    workloadBalanceScore: number;
    deiTaskDistributionScore: number;
    overtimeCompliance: number;
    recommendations: Array<{
      id: number;
      title: string;
      description: string;
      status: 'pending' | 'applied' | 'dismissed';
      type: 'critical' | 'warning' | 'suggestion';
      createdAt: string;
    }>;
    complianceHistory: Array<{
      id: number;
      title: string;
      description: string;
      type: 'success' | 'warning' | 'error';
      date: string;
      timeAgo: string;
    }>;
    teamWorkloadData: Array<{
      userId: number;
      name: string;
      avatar: string | null;
      workloadPercentage: number;
      status: 'balanced' | 'high' | 'low';
      overtimeHours: number;
    }>;
  }>({
    payEquityScore: 100,
    workloadBalanceScore: 92,
    deiTaskDistributionScore: 88,
    overtimeCompliance: 95,
    recommendations: [],
    complianceHistory: [],
    teamWorkloadData: []
  })
  
  // Format timeAgo for compliance events
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };
  
  // Fetch ethical metrics data
  useEffect(() => {
    const fetchMetricsData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/ethical-metrics');
        const data = await response.json();
        
        if (data.success && data.metrics) {
          // Format compliance history with timeAgo
          const formattedHistory = data.metrics.complianceHistory ? 
            data.metrics.complianceHistory.map((event: { id: number; title: string; description: string; type: "success" | "warning" | "error"; date: string; }) => ({
              ...event,
              timeAgo: formatTimeAgo(event.date)
            })) : [];
          
          setMetricsData({
            ...data.metrics,
            complianceHistory: formattedHistory
          });
        }
      } catch (error) {
        console.error("Error fetching ethical metrics:", error);
        toast({
          title: "Error",
          description: "Failed to load ethical metrics data. Please refresh the page.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchMetricsData();
  }, []);

  const handleExportReport = () => {
    toast({
      title: "Exporting Report",
      description: "Generating and downloading ethical metrics report...",
    });
    
    // This would typically generate and download a PDF or Excel file
  };

  const handleConfigure = () => {
    setIsConfigureModalOpen(true);
  };

  const handleApplyRecommendation = async (recommendationId: number) => {
    try {
      toast({
        title: "Applying Recommendation",
        description: "Implementing ethical recommendation...",
      });
      
      // Make API call to apply the recommendation
      const response = await fetch('/api/ethical-metrics/apply-recommendation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ recommendationId }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Recommendation Applied",
          description: "The ethical recommendation has been implemented successfully.",
        });
        
        // Update the recommendation status in the UI
        setMetricsData(prev => {
          if (!prev.recommendations) return prev;
          
          return {
            ...prev,
            recommendations: prev.recommendations.map(rec => 
              rec.id === recommendationId ? { ...rec, status: 'applied' } : rec
            )
          };
        });
      } else {
        throw new Error(data.error || "Unknown error");
      }
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
    setIsComplianceReportModalOpen(true);
  };

  const handleSetOvertimeLimits = () => {
    setIsOvertimeLimitsModalOpen(true);
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Ethical Metrics</h1>
          <p className="text-muted-foreground">Monitor and enforce ethical standards across your team</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1" onClick={handleExportReport}>
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export Report</span>
          </Button>
          <Button size="sm" className="gap-1" onClick={handleConfigure}>
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Configure</span>
          </Button>
        </div>
      </div>

      {/* Ethical Compliance Overview */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl md:text-2xl font-bold">Compliance Overview</h2>
          <Badge variant="outline" className="gap-1">
            <RefreshCw className="h-3 w-3" />
            <span>Updated hourly</span>
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <ComplianceOverviewCard
            title="Pay Equity"
            description="100% Compliant"
            score={metricsData.payEquityScore}
            icon={<Check className="h-4 w-4 text-green-600" />}
            iconClass="text-green-700"
            bgClass="bg-green-50"
            textClass="text-green-700"
          />

          <ComplianceOverviewCard
            title="Workload Balance"
            description="92% Balanced"
            score={metricsData.workloadBalanceScore}
            icon={<Check className="h-4 w-4 text-blue-600" />}
            iconClass="text-blue-700"
            bgClass="bg-blue-50"
            textClass="text-blue-700"
          />

          <ComplianceOverviewCard
            title="DEI Task Distribution"
            description="88% Compliant"
            score={metricsData.deiTaskDistributionScore}
            icon={<AlertCircle className="h-4 w-4 text-amber-600" />}
            iconClass="text-amber-700"
            bgClass="bg-amber-50"
            textClass="text-amber-700"
          />
        </div>
      </section>

      {/* Detailed Metrics */}
      <section>
        <h2 className="text-xl md:text-2xl font-bold mb-4">Detailed Metrics</h2>

        <Tabs defaultValue="workload" className="space-y-4">
          <TabsList className="w-full sm:w-auto overflow-x-auto">
            <TabsTrigger value="workload">Workload</TabsTrigger>
            <TabsTrigger value="pay">Pay Equity</TabsTrigger>
            <TabsTrigger value="dei">DEI</TabsTrigger>
            <TabsTrigger value="overtime">Overtime</TabsTrigger>
          </TabsList>

          <TabsContent value="workload">
            <WorkloadCard teamMembers={metricsData.teamWorkloadData || []} />
          </TabsContent>

          <TabsContent value="pay">
            <PayEquityCard onViewReport={handleViewComplianceReport} />
          </TabsContent>

          <TabsContent value="dei">
            <DeiTaskCard onTakeAction={() => handleApplyRecommendation(1)} />
          </TabsContent>

          <TabsContent value="overtime">
            <OvertimeCard 
              onSetLimits={handleSetOvertimeLimits} 
              teamMembers={metricsData.teamWorkloadData || []} 
            />
          </TabsContent>
        </Tabs>
      </section>

      {/* Ethical Governance Actions */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl md:text-2xl font-bold">Governance Actions</h2>
          <Badge>AI Recommended</Badge>
        </div>

        <RecommendationsCard
          recommendations={metricsData.recommendations || []}
          onApplyRecommendation={handleApplyRecommendation}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <GovernancePoliciesCard />
          <ComplianceHistoryCard complianceEvents={metricsData.complianceHistory || []} />
        </div>
      </section>

      {/* Modals */}
      <ConfigureEthicalMetricsModal 
        isOpen={isConfigureModalOpen} 
        onClose={() => setIsConfigureModalOpen(false)} 
      />
      
      <OvertimeLimitsModal 
        isOpen={isOvertimeLimitsModalOpen} 
        onClose={() => setIsOvertimeLimitsModalOpen(false)} 
      />
      
      <ComplianceReportModal 
        isOpen={isComplianceReportModalOpen} 
        onClose={() => setIsComplianceReportModalOpen(false)} 
      />
    </div>
  )
}
