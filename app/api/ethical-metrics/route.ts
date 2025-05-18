import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ethicalMetrics, users, wellbeingMetrics } from "@/drizzle/schema";
import { sql, desc, eq, and, gte, lte } from "drizzle-orm";
import { getSession } from "@/lib/auth-actions";

// Type for ethical metrics data
export type EthicalMetricsData = {
  id: number;
  date: string;
  payEquityScore: number;
  workloadBalanceScore: number;
  deiTaskDistributionScore: number;
  overtimeCompliance: number;
  createdAt: string;
  recommendations?: EthicalRecommendation[];
  complianceHistory?: ComplianceEvent[];
  teamWorkloadData?: TeamWorkloadData[];
};

export type EthicalRecommendation = {
  id: number;
  title: string;
  description: string;
  status: "pending" | "applied" | "dismissed";
  type: "critical" | "warning" | "suggestion";
  createdAt: string;
};

export type ComplianceEvent = {
  id: number;
  title: string;
  description: string;
  type: "success" | "warning" | "error";
  date: string;
};

export type TeamWorkloadData = {
  userId: number;
  name: string;
  avatar: string | null;
  workloadPercentage: number;
  status: "balanced" | "high" | "low";
  overtimeHours: number;
};

export type EthicalMetricsConfig = {
  maxOvertimeHours: number;
  enablePayEquityTracking: boolean;
  enableWorkloadBalanceTracking: boolean;
  enableDeiTaskDistributionTracking: boolean;
  enableOvertimeMonitoring: boolean;
  alertThresholds: {
    payEquityAlertThreshold: number;
    workloadBalanceAlertThreshold: number;
    deiTaskDistributionAlertThreshold: number;
    overtimeAlertThreshold: number;
  }
};

// GET handler to fetch ethical metrics data
export async function GET(request: Request) {
  try {
    console.log("Ethical Metrics API: GET request received");
    
    // Get authenticated session
    const session = await getSession();
    
    if (!session || !session.id) {
      console.log("Ethical Metrics API: No valid session found");
      
      // In development mode, return sample data
      if (process.env.NODE_ENV === 'development') {
        console.log("Ethical Metrics API: Development mode, using sample data");
        return NextResponse.json({
          success: true,
          metrics: getSampleEthicalMetricsData()
        });
      }
      
      // In production, require authentication
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    console.log(`Ethical Metrics API: Fetching metrics with date range - startDate: ${startDate}, endDate: ${endDate}`);
    
    // Query ethical metrics data
    let query = db
      .select({
        id: ethicalMetrics.id,
        date: ethicalMetrics.date,
        payEquityScore: ethicalMetrics.payEquityScore,
        workloadBalanceScore: ethicalMetrics.workloadBalanceScore,
        deiTaskDistributionScore: ethicalMetrics.deiTaskDistributionScore,
        overtimeCompliance: ethicalMetrics.overtimeCompliance,
        createdAt: ethicalMetrics.createdAt,
      })
      .from(ethicalMetrics)
      .orderBy(desc(ethicalMetrics.date));

    // Apply date filters if provided
    if (startDate && endDate) {
      query = query.where(
        and(
          gte(ethicalMetrics.date, startDate),
          lte(ethicalMetrics.date, endDate)
        )
      );
    }

    const metricsData = await query.limit(30);
    
    if (metricsData.length === 0) {
      console.log("No ethical metrics data found, returning sample data");
      return NextResponse.json({
        success: true,
        metrics: getSampleEthicalMetricsData()
      });
    }
    
    // Get team workload data
    const teamWorkloadData = await getTeamWorkloadData();
    
    // Format the metrics data
    const formattedMetrics = {
      ...metricsData[0],
      recommendations: await getRecommendations(),
      complianceHistory: await getComplianceHistory(),
      teamWorkloadData,
    };

    return NextResponse.json({ 
      success: true, 
      metrics: formattedMetrics 
    });
  } catch (error: any) {
    console.error("Error fetching ethical metrics:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error?.message || "Unknown error fetching ethical metrics",
        details: error?.stack?.toString() || ""
      },
      { status: 500 }
    );
  }
}

// POST handler to update ethical metrics configuration
export async function POST(request: Request) {
  try {
    // Get authenticated session
    const session = await getSession();
    if (!session || !session.id) {
      console.log("Ethical Metrics API (POST): No valid session found");
      // In development, continue with a default user ID
      // For production, uncomment the following code:
      /*
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
      */
    }

    // Parse request body
    const body = await request.json();
    console.log("Ethical Metrics API: Received POST data:", JSON.stringify(body, null, 2));
    
    // For now, just return success response as we're simulating the API
    return NextResponse.json({ 
      success: true, 
      message: "Configuration updated successfully"
    });
  } catch (error: any) {
    console.error("Error updating ethical metrics configuration:", error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error?.message || "Unknown error updating configuration",
        details: error?.stack?.toString() || ""
      },
      { status: 500 }
    );
  }
}

async function getTeamWorkloadData(): Promise<TeamWorkloadData[]> {
  // In a real implementation, we would query the database for this data
  // For now, return mock data
  return [
    {
      userId: 1,
      name: "John Doe",
      avatar: null,
      workloadPercentage: 95,
      status: "balanced",
      overtimeHours: 1.5
    },
    {
      userId: 2,
      name: "Alice Smith",
      avatar: null,
      workloadPercentage: 120,
      status: "high",
      overtimeHours: 4.5
    },
    {
      userId: 3,
      name: "Robert Johnson",
      avatar: null,
      workloadPercentage: 90,
      status: "balanced",
      overtimeHours: 2.0
    },
    {
      userId: 4,
      name: "Emily Wilson",
      avatar: null,
      workloadPercentage: 85,
      status: "balanced",
      overtimeHours: 2.0
    }
  ];
}

async function getRecommendations(): Promise<EthicalRecommendation[]> {
  // In a real implementation, we would query the database for this data
  // For now, return mock data
  return [
    {
      id: 1,
      title: "Redistribute High-Visibility Tasks",
      description: "Ensure team members from underrepresented groups are assigned to high-visibility tasks.",
      status: "pending",
      type: "warning",
      createdAt: new Date().toISOString()
    },
    {
      id: 2,
      title: "Reduce Alice's Workload",
      description: "Alice is consistently working overtime. Redistribute 2-3 tasks to team members with capacity.",
      status: "pending",
      type: "warning",
      createdAt: new Date().toISOString()
    },
    {
      id: 3,
      title: "Implement \"No Meeting Friday Afternoons\"",
      description: "Reduce after-hours work by creating focused work time during regular hours.",
      status: "pending",
      type: "suggestion",
      createdAt: new Date().toISOString()
    }
  ];
}

async function getComplianceHistory(): Promise<ComplianceEvent[]> {
  // In a real implementation, we would query the database for this data
  // For now, return mock data
  const now = new Date();
  
  return [
    {
      id: 1,
      title: "Workload Rebalanced",
      description: "Tasks redistributed to balance workload across the team.",
      type: "success",
      date: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days ago
    },
    {
      id: 2,
      title: "Pay Equity Audit Completed",
      description: "Quarterly audit confirmed 100% pay equity compliance.",
      type: "success",
      date: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString() // 1 week ago
    },
    {
      id: 3,
      title: "Overtime Alert Triggered",
      description: "Alice Smith exceeded overtime limits. Workload adjusted.",
      type: "warning",
      date: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString() // 2 weeks ago
    },
    {
      id: 4,
      title: "DEI Task Distribution Improved",
      description: "High-visibility tasks redistributed to improve DEI metrics.",
      type: "success",
      date: new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000).toISOString() // 3 weeks ago
    }
  ];
}

function getSampleEthicalMetricsData(): EthicalMetricsData {
  return {
    id: 1,
    date: new Date().toISOString().split('T')[0],
    payEquityScore: 100,
    workloadBalanceScore: 92,
    deiTaskDistributionScore: 88,
    overtimeCompliance: 95,
    createdAt: new Date().toISOString(),
    recommendations: [
      {
        id: 1,
        title: "Redistribute High-Visibility Tasks",
        description: "Ensure team members from underrepresented groups are assigned to high-visibility tasks.",
        status: "pending",
        type: "warning",
        createdAt: new Date().toISOString()
      },
      {
        id: 2,
        title: "Reduce Alice's Workload",
        description: "Alice is consistently working overtime. Redistribute 2-3 tasks to team members with capacity.",
        status: "pending",
        type: "warning",
        createdAt: new Date().toISOString()
      },
      {
        id: 3,
        title: "Implement \"No Meeting Friday Afternoons\"",
        description: "Reduce after-hours work by creating focused work time during regular hours.",
        status: "pending",
        type: "suggestion",
        createdAt: new Date().toISOString()
      }
    ],
    complianceHistory: [
      {
        id: 1,
        title: "Workload Rebalanced",
        description: "Tasks redistributed to balance workload across the team.",
        type: "success",
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days ago
      },
      {
        id: 2,
        title: "Pay Equity Audit Completed",
        description: "Quarterly audit confirmed 100% pay equity compliance.",
        type: "success",
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() // 1 week ago
      },
      {
        id: 3,
        title: "Overtime Alert Triggered",
        description: "Alice Smith exceeded overtime limits. Workload adjusted.",
        type: "warning",
        date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString() // 2 weeks ago
      },
      {
        id: 4,
        title: "DEI Task Distribution Improved",
        description: "High-visibility tasks redistributed to improve DEI metrics.",
        type: "success",
        date: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString() // 3 weeks ago
      }
    ],
    teamWorkloadData: [
      {
        userId: 1,
        name: "John Doe",
        avatar: null,
        workloadPercentage: 95,
        status: "balanced",
        overtimeHours: 1.5
      },
      {
        userId: 2,
        name: "Alice Smith",
        avatar: null,
        workloadPercentage: 120,
        status: "high",
        overtimeHours: 4.5
      },
      {
        userId: 3,
        name: "Robert Johnson",
        avatar: null,
        workloadPercentage: 90,
        status: "balanced",
        overtimeHours: 2.0
      },
      {
        userId: 4,
        name: "Emily Wilson",
        avatar: null,
        workloadPercentage: 85,
        status: "balanced",
        overtimeHours: 2.0
      }
    ]
  };
}
