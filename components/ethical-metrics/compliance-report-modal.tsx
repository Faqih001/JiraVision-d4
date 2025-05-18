import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Check, Download, FileText, Shield } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

// Compliance Report Modal props
interface ComplianceReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ComplianceReportModal({
  isOpen,
  onClose,
}: ComplianceReportModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  
  const handleExportReport = () => {
    toast({
      title: "Exporting Report",
      description: "Generating and downloading compliance report...",
    });
    
    // This would typically generate and download a PDF or Excel file
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <span>Ethical Compliance Report</span>
          </DialogTitle>
          <DialogDescription>
            Detailed report on ethical governance compliance.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="summary" className="flex-1 overflow-hidden flex flex-col">
          <div className="flex justify-between items-center">
            <TabsList className="mb-4">
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="pay">Pay Equity</TabsTrigger>
              <TabsTrigger value="workload">Workload</TabsTrigger>
              <TabsTrigger value="dei">DEI</TabsTrigger>
            </TabsList>
            
            <Button variant="outline" size="sm" className="gap-1" onClick={handleExportReport}>
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          </div>

          <ScrollArea className="flex-1">
            <TabsContent value="summary" className="mt-0 h-[400px]">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border rounded-md p-4">
                    <h3 className="text-lg font-medium mb-2">Overall Compliance</h3>
                    <div className="text-3xl font-bold text-green-600 mb-2">92%</div>
                    <Progress value={92} className="h-2" />
                    <p className="text-sm text-muted-foreground mt-2">
                      Compliance score based on all ethical metrics.
                    </p>
                  </div>
                  
                  <div className="border rounded-md p-4">
                    <h3 className="text-lg font-medium mb-2">Current Status</h3>
                    <div className="flex items-center gap-2 mb-4">
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                        Compliant
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        Last updated: {new Date().toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Your team is currently meeting all mandatory ethical requirements.
                    </p>
                  </div>
                </div>
                
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Pay Equity</TableCell>
                      <TableCell>100%</TableCell>
                      <TableCell>
                        <Badge className="bg-green-100 text-green-800">
                          <Check className="h-3 w-3 mr-1" />
                          Compliant
                        </Badge>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Workload Balance</TableCell>
                      <TableCell>92%</TableCell>
                      <TableCell>
                        <Badge className="bg-green-100 text-green-800">
                          <Check className="h-3 w-3 mr-1" />
                          Compliant
                        </Badge>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">DEI Task Distribution</TableCell>
                      <TableCell>88%</TableCell>
                      <TableCell>
                        <Badge className="bg-amber-100 text-amber-800">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Needs Attention
                        </Badge>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Overtime Compliance</TableCell>
                      <TableCell>95%</TableCell>
                      <TableCell>
                        <Badge className="bg-green-100 text-green-800">
                          <Check className="h-3 w-3 mr-1" />
                          Compliant
                        </Badge>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
                
                <div className="border rounded-md p-4">
                  <h3 className="text-lg font-medium mb-2">Recommendation Summary</h3>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-500 mt-1" />
                      <span className="text-sm">Improve distribution of high-visibility tasks across team demographics.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-500 mt-1" />
                      <span className="text-sm">Balance workload for team member Alice Smith (currently at 120%).</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <FileText className="h-4 w-4 text-primary mt-1" />
                      <span className="text-sm">Consider implementing "No Meeting Friday Afternoons" to reduce after-hours work.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="pay" className="mt-0 h-[400px]">
              <div className="space-y-6">
                <div className="border rounded-md p-4">
                  <h3 className="text-lg font-medium mb-2">Pay Equity Score</h3>
                  <div className="text-3xl font-bold text-green-600 mb-2">100%</div>
                  <Progress value={100} className="h-2" />
                  <p className="text-sm text-muted-foreground mt-2">
                    Perfect pay equity achieved across all demographics.
                  </p>
                </div>
                
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Demographic Group</TableHead>
                      <TableHead>Equity Ratio</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Gender</TableCell>
                      <TableCell>1.00</TableCell>
                      <TableCell>
                        <Badge className="bg-green-100 text-green-800">
                          <Check className="h-3 w-3 mr-1" />
                          Compliant
                        </Badge>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Ethnicity</TableCell>
                      <TableCell>1.00</TableCell>
                      <TableCell>
                        <Badge className="bg-green-100 text-green-800">
                          <Check className="h-3 w-3 mr-1" />
                          Compliant
                        </Badge>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Experience Level</TableCell>
                      <TableCell>1.00</TableCell>
                      <TableCell>
                        <Badge className="bg-green-100 text-green-800">
                          <Check className="h-3 w-3 mr-1" />
                          Compliant
                        </Badge>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Location</TableCell>
                      <TableCell>1.00</TableCell>
                      <TableCell>
                        <Badge className="bg-green-100 text-green-800">
                          <Check className="h-3 w-3 mr-1" />
                          Compliant
                        </Badge>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
                
                <div className="border rounded-md p-4">
                  <h3 className="text-lg font-medium mb-2">Audit History</h3>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-500 mt-1" />
                      <div>
                        <div className="text-sm font-medium">Quarterly Audit Completed</div>
                        <div className="text-xs text-muted-foreground">1 week ago</div>
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-500 mt-1" />
                      <div>
                        <div className="text-sm font-medium">Annual Pay Review</div>
                        <div className="text-xs text-muted-foreground">3 months ago</div>
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-500 mt-1" />
                      <div>
                        <div className="text-sm font-medium">Pay Adjustment for Role Parity</div>
                        <div className="text-xs text-muted-foreground">6 months ago</div>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="workload" className="mt-0 h-[400px]">
              <div className="space-y-6">
                <div className="border rounded-md p-4">
                  <h3 className="text-lg font-medium mb-2">Workload Balance Score</h3>
                  <div className="text-3xl font-bold text-green-600 mb-2">92%</div>
                  <Progress value={92} className="h-2" />
                  <p className="text-sm text-muted-foreground mt-2">
                    Task distribution is well-balanced with minor adjustments needed for one team member.
                  </p>
                </div>
                
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Team Member</TableHead>
                      <TableHead>Workload</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">John Doe</TableCell>
                      <TableCell>95%</TableCell>
                      <TableCell>
                        <Badge className="bg-green-100 text-green-800">
                          Balanced
                        </Badge>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Alice Smith</TableCell>
                      <TableCell>120%</TableCell>
                      <TableCell>
                        <Badge className="bg-amber-100 text-amber-800">
                          High
                        </Badge>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Robert Johnson</TableCell>
                      <TableCell>90%</TableCell>
                      <TableCell>
                        <Badge className="bg-green-100 text-green-800">
                          Balanced
                        </Badge>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Emily Wilson</TableCell>
                      <TableCell>85%</TableCell>
                      <TableCell>
                        <Badge className="bg-green-100 text-green-800">
                          Balanced
                        </Badge>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
                
                <div className="border rounded-md p-4">
                  <h3 className="text-lg font-medium mb-2">Action Items</h3>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-500 mt-1" />
                      <div>
                        <div className="text-sm font-medium">Redistribute Tasks from Alice Smith</div>
                        <div className="text-xs text-muted-foreground">Reduce workload by 2-3 tasks to bring back to balanced levels.</div>
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <FileText className="h-4 w-4 text-primary mt-1" />
                      <div>
                        <div className="text-sm font-medium">Monitor Team Capacity</div>
                        <div className="text-xs text-muted-foreground">Schedule bi-weekly capacity reviews during sprint planning.</div>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="dei" className="mt-0 h-[400px]">
              <div className="space-y-6">
                <div className="border rounded-md p-4">
                  <h3 className="text-lg font-medium mb-2">DEI Task Distribution Score</h3>
                  <div className="text-3xl font-bold text-amber-600 mb-2">88%</div>
                  <Progress value={88} className="h-2 bg-amber-100" />
                  <p className="text-sm text-muted-foreground mt-2">
                    High-visibility tasks need more equitable distribution across team demographics.
                  </p>
                </div>
                
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Task Category</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">High-Visibility Tasks</TableCell>
                      <TableCell>85%</TableCell>
                      <TableCell>
                        <Badge className="bg-amber-100 text-amber-800">
                          Needs Attention
                        </Badge>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Technical Leadership</TableCell>
                      <TableCell>80%</TableCell>
                      <TableCell>
                        <Badge className="bg-amber-100 text-amber-800">
                          Needs Attention
                        </Badge>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Career Growth Opportunities</TableCell>
                      <TableCell>95%</TableCell>
                      <TableCell>
                        <Badge className="bg-green-100 text-green-800">
                          Compliant
                        </Badge>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Administrative Tasks</TableCell>
                      <TableCell>90%</TableCell>
                      <TableCell>
                        <Badge className="bg-green-100 text-green-800">
                          Compliant
                        </Badge>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
                
                <div className="border rounded-md p-4">
                  <h3 className="text-lg font-medium mb-2">Recommendations</h3>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-500 mt-1" />
                      <div>
                        <div className="text-sm font-medium">Redistribute High-Visibility Tasks</div>
                        <div className="text-xs text-muted-foreground">Ensure equitable distribution across all demographic groups.</div>
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-500 mt-1" />
                      <div>
                        <div className="text-sm font-medium">Balance Technical Leadership Opportunities</div>
                        <div className="text-xs text-muted-foreground">Provide more opportunities for technical leadership across diverse team members.</div>
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <FileText className="h-4 w-4 text-primary mt-1" />
                      <div>
                        <div className="text-sm font-medium">Implement DEI Task Rotation</div>
                        <div className="text-xs text-muted-foreground">Create a rotation system for high-visibility and leadership tasks.</div>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <DialogFooter className="mt-6">
          <Button onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
