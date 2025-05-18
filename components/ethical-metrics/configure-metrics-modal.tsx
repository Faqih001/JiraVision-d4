import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { AlertCircle, Check, Info } from "lucide-react";

// Configuration Modal props
interface ConfigureEthicalMetricsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ConfigureEthicalMetricsModal({
  isOpen,
  onClose,
}: ConfigureEthicalMetricsModalProps) {
  // State for configuration
  const [isLoading, setIsLoading] = useState(false);
  const [config, setConfig] = useState({
    maxOvertimeHours: 5,
    enablePayEquityTracking: true,
    enableWorkloadBalanceTracking: true,
    enableDeiTaskDistributionTracking: true,
    enableOvertimeMonitoring: true,
    alertThresholds: {
      payEquityAlertThreshold: 95,
      workloadBalanceAlertThreshold: 85,
      deiTaskDistributionAlertThreshold: 90,
      overtimeAlertThreshold: 4
    }
  });

  // Fetch the configuration when the modal opens
  useEffect(() => {
    if (isOpen) {
      fetchConfiguration();
    }
  }, [isOpen]);

  const fetchConfiguration = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/ethical-metrics/config');
      const data = await response.json();
      
      if (data.success && data.config) {
        setConfig(data.config);
      }
    } catch (error) {
      console.error("Error fetching configuration:", error);
      toast({
        title: "Error",
        description: "Failed to load configuration. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveConfiguration = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/ethical-metrics/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Success",
          description: "Configuration updated successfully.",
        });
        onClose();
      } else {
        throw new Error(data.error || "Unknown error");
      }
    } catch (error) {
      console.error("Error saving configuration:", error);
      toast({
        title: "Error",
        description: "Failed to save configuration. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Update the configuration state
  const updateConfig = (key: string, value: any) => {
    setConfig((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Update the threshold configuration state
  const updateThreshold = (key: string, value: any) => {
    setConfig((prev) => ({
      ...prev,
      alertThresholds: {
        ...prev.alertThresholds,
        [key]: value,
      },
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Ethical Metrics Configuration</DialogTitle>
          <DialogDescription>
            Configure the ethical metrics tracking and monitoring settings for your team.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="mt-4">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="thresholds">Alert Thresholds</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base" htmlFor="enablePayEquityTracking">Pay Equity Tracking</Label>
                  <p className="text-sm text-muted-foreground">Track and enforce pay equity across team demographics</p>
                </div>
                <Switch
                  id="enablePayEquityTracking"
                  checked={config.enablePayEquityTracking}
                  onCheckedChange={(checked) => updateConfig("enablePayEquityTracking", checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base" htmlFor="enableWorkloadBalanceTracking">Workload Balance Tracking</Label>
                  <p className="text-sm text-muted-foreground">Monitor and balance workload distribution across team members</p>
                </div>
                <Switch
                  id="enableWorkloadBalanceTracking"
                  checked={config.enableWorkloadBalanceTracking}
                  onCheckedChange={(checked) => updateConfig("enableWorkloadBalanceTracking", checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base" htmlFor="enableDeiTaskDistributionTracking">DEI Task Distribution</Label>
                  <p className="text-sm text-muted-foreground">Track diversity, equity, and inclusion in task assignments</p>
                </div>
                <Switch
                  id="enableDeiTaskDistributionTracking"
                  checked={config.enableDeiTaskDistributionTracking}
                  onCheckedChange={(checked) => updateConfig("enableDeiTaskDistributionTracking", checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base" htmlFor="enableOvertimeMonitoring">Overtime Monitoring</Label>
                  <p className="text-sm text-muted-foreground">Track and enforce overtime limits for team members</p>
                </div>
                <Switch
                  id="enableOvertimeMonitoring"
                  checked={config.enableOvertimeMonitoring}
                  onCheckedChange={(checked) => updateConfig("enableOvertimeMonitoring", checked)}
                />
              </div>
              
              <div className="border-t pt-4">
                <Label className="text-base" htmlFor="maxOvertimeHours">Maximum Overtime Hours (Per Week)</Label>
                <div className="flex items-center gap-4 mt-2">
                  <Slider
                    id="maxOvertimeHours"
                    min={0}
                    max={20}
                    step={1}
                    value={[config.maxOvertimeHours]}
                    onValueChange={(value) => updateConfig("maxOvertimeHours", value[0])}
                    disabled={!config.enableOvertimeMonitoring}
                    className="flex-1"
                  />
                  <div className="w-12 text-center">
                    <Badge variant="outline">{config.maxOvertimeHours}</Badge>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="thresholds" className="space-y-6">
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-base" htmlFor="payEquityAlertThreshold">
                    Pay Equity Alert Threshold
                  </Label>
                  <Badge variant="outline">{config.alertThresholds.payEquityAlertThreshold}%</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground w-8">80%</span>
                  <Slider
                    id="payEquityAlertThreshold"
                    min={80}
                    max={100}
                    step={1}
                    value={[config.alertThresholds.payEquityAlertThreshold]}
                    onValueChange={(value) => updateThreshold("payEquityAlertThreshold", value[0])}
                    disabled={!config.enablePayEquityTracking}
                    className="flex-1"
                  />
                  <span className="text-sm text-muted-foreground w-8">100%</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Alert when pay equity score falls below this threshold</p>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-base" htmlFor="workloadBalanceAlertThreshold">
                    Workload Balance Alert Threshold
                  </Label>
                  <Badge variant="outline">{config.alertThresholds.workloadBalanceAlertThreshold}%</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground w-8">70%</span>
                  <Slider
                    id="workloadBalanceAlertThreshold"
                    min={70}
                    max={100}
                    step={1}
                    value={[config.alertThresholds.workloadBalanceAlertThreshold]}
                    onValueChange={(value) => updateThreshold("workloadBalanceAlertThreshold", value[0])}
                    disabled={!config.enableWorkloadBalanceTracking}
                    className="flex-1"
                  />
                  <span className="text-sm text-muted-foreground w-8">100%</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Alert when workload balance score falls below this threshold</p>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-base" htmlFor="deiTaskDistributionAlertThreshold">
                    DEI Task Distribution Alert Threshold
                  </Label>
                  <Badge variant="outline">{config.alertThresholds.deiTaskDistributionAlertThreshold}%</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground w-8">70%</span>
                  <Slider
                    id="deiTaskDistributionAlertThreshold"
                    min={70}
                    max={100}
                    step={1}
                    value={[config.alertThresholds.deiTaskDistributionAlertThreshold]}
                    onValueChange={(value) => updateThreshold("deiTaskDistributionAlertThreshold", value[0])}
                    disabled={!config.enableDeiTaskDistributionTracking}
                    className="flex-1"
                  />
                  <span className="text-sm text-muted-foreground w-8">100%</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Alert when DEI task distribution score falls below this threshold</p>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-base" htmlFor="overtimeAlertThreshold">
                    Overtime Alert Threshold (Hours)
                  </Label>
                  <Badge variant="outline">{config.alertThresholds.overtimeAlertThreshold}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground w-8">0</span>
                  <Slider
                    id="overtimeAlertThreshold"
                    min={0}
                    max={config.maxOvertimeHours}
                    step={0.5}
                    value={[config.alertThresholds.overtimeAlertThreshold]}
                    onValueChange={(value) => updateThreshold("overtimeAlertThreshold", value[0])}
                    disabled={!config.enableOvertimeMonitoring}
                    className="flex-1"
                  />
                  <span className="text-sm text-muted-foreground w-8">{config.maxOvertimeHours}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Alert when overtime hours exceed this threshold</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <div className="bg-muted/30 p-4 rounded-md flex items-start gap-3 mb-4">
              <Info className="h-5 w-5 text-primary mt-0.5" />
              <p className="text-sm">
                Notifications settings will be available in the next update. Currently, all alerts are sent to workspace administrators and team leads.
              </p>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3 border p-3 rounded-md">
                <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                  <Check className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Email Notifications</p>
                  <p className="text-sm text-muted-foreground">Daily digest of ethical metrics alerts</p>
                </div>
                <Switch checked={true} disabled />
              </div>
              
              <div className="flex items-center gap-3 border p-3 rounded-md">
                <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                  <Check className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">In-App Notifications</p>
                  <p className="text-sm text-muted-foreground">Real-time alerts for critical issues</p>
                </div>
                <Switch checked={true} disabled />
              </div>
              
              <div className="flex items-center gap-3 border p-3 rounded-md">
                <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Weekly Reports</p>
                  <p className="text-sm text-muted-foreground">Comprehensive weekly ethical metrics reports</p>
                </div>
                <Switch checked={false} disabled />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={saveConfiguration} disabled={isLoading}>
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
