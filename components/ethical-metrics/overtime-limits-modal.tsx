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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "@/components/ui/use-toast";
import { AlertCircle, Clock, UserCheck } from "lucide-react";

// Overtime Limits Modal props
interface OvertimeLimitsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function OvertimeLimitsModal({
  isOpen,
  onClose,
}: OvertimeLimitsModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [limits, setLimits] = useState({
    maxWeeklyHours: 5,
    alertThreshold: 4,
    enableAfterHoursLimit: true,
    afterHoursLimit: 3,
    enableIndividualLimits: false,
    enforcementType: "warning", // "warning" or "blocking"
    excludeWeekends: true,
    excludeHolidays: true,
  });

  const saveSettings = async () => {
    try {
      setIsLoading(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Success",
        description: "Overtime limits updated successfully.",
      });
      
      onClose();
    } catch (error) {
      console.error("Error saving overtime limits:", error);
      toast({
        title: "Error",
        description: "Failed to save overtime limits. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLimitChange = (key: string, value: any) => {
    setLimits(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Clock className="h-5 w-5" />
            <span>Overtime Limits</span>
          </DialogTitle>
          <DialogDescription>
            Set overtime limits for your team to maintain work-life balance.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-4">
            <div>
              <Label htmlFor="maxWeeklyHours">Maximum Weekly Overtime Hours</Label>
              <div className="flex items-center gap-4 mt-2">
                <Slider
                  id="maxWeeklyHours"
                  min={0}
                  max={20}
                  step={0.5}
                  value={[limits.maxWeeklyHours]}
                  onValueChange={(value) => handleLimitChange("maxWeeklyHours", value[0])}
                  className="flex-1"
                />
                <Input
                  type="number"
                  min={0}
                  max={20}
                  step={0.5}
                  value={limits.maxWeeklyHours}
                  onChange={(e) => handleLimitChange("maxWeeklyHours", parseFloat(e.target.value))}
                  className="w-16"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Maximum overtime hours allowed per team member per week
              </p>
            </div>

            <div>
              <Label htmlFor="alertThreshold">Alert Threshold</Label>
              <div className="flex items-center gap-4 mt-2">
                <Slider
                  id="alertThreshold"
                  min={0}
                  max={limits.maxWeeklyHours}
                  step={0.5}
                  value={[limits.alertThreshold]}
                  onValueChange={(value) => handleLimitChange("alertThreshold", value[0])}
                  className="flex-1"
                />
                <Input
                  type="number"
                  min={0}
                  max={limits.maxWeeklyHours}
                  step={0.5}
                  value={limits.alertThreshold}
                  onChange={(e) => handleLimitChange("alertThreshold", Math.min(parseFloat(e.target.value), limits.maxWeeklyHours))}
                  className="w-16"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Send alerts when overtime hours reach this threshold
              </p>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div>
                <Label className="text-base">After-Hours Communication Limit</Label>
                <p className="text-sm text-muted-foreground">Limit communication outside working hours</p>
              </div>
              <Switch
                checked={limits.enableAfterHoursLimit}
                onCheckedChange={(checked) => handleLimitChange("enableAfterHoursLimit", checked)}
              />
            </div>

            {limits.enableAfterHoursLimit && (
              <div className="pl-6 border-l-2 border-muted">
                <Label htmlFor="afterHoursLimit">Maximum After-Hours Communication</Label>
                <div className="flex items-center gap-4 mt-2">
                  <Slider
                    id="afterHoursLimit"
                    min={0}
                    max={10}
                    step={0.5}
                    value={[limits.afterHoursLimit]}
                    onValueChange={(value) => handleLimitChange("afterHoursLimit", value[0])}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    min={0}
                    max={10}
                    step={0.5}
                    value={limits.afterHoursLimit}
                    onChange={(e) => handleLimitChange("afterHoursLimit", parseFloat(e.target.value))}
                    className="w-16"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Hours of communication allowed outside normal working hours
                </p>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <div>
                <Label className="text-base">Individual Limits</Label>
                <p className="text-sm text-muted-foreground">Set different limits for specific team members</p>
              </div>
              <Switch
                checked={limits.enableIndividualLimits}
                onCheckedChange={(checked) => handleLimitChange("enableIndividualLimits", checked)}
              />
            </div>

            {limits.enableIndividualLimits && (
              <div className="pl-6 border-l-2 border-muted flex items-center gap-2">
                <div className="flex-1">
                  <Select defaultValue="select">
                    <SelectTrigger>
                      <SelectValue placeholder="Select team member" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="select" disabled>Select team member</SelectItem>
                      <SelectItem value="john">John Doe</SelectItem>
                      <SelectItem value="alice">Alice Smith</SelectItem>
                      <SelectItem value="robert">Robert Johnson</SelectItem>
                      <SelectItem value="emily">Emily Wilson</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="outline" size="sm" className="h-10">
                  <UserCheck className="h-4 w-4 mr-1" />
                  <span>Add</span>
                </Button>
              </div>
            )}

            <div className="border-t pt-4 mt-4">
              <Label className="text-base mb-2 block">Enforcement Type</Label>
              <RadioGroup
                value={limits.enforcementType}
                onValueChange={(value) => handleLimitChange("enforcementType", value)}
                className="flex flex-col space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="warning" id="warning" />
                  <Label htmlFor="warning" className="cursor-pointer">Warning Only</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="blocking" id="blocking" />
                  <Label htmlFor="blocking" className="cursor-pointer">Blocking (Prevent Task Assignment)</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="flex items-center justify-between border-t pt-4 mt-4">
              <Label>Exclude Weekends</Label>
              <Switch
                checked={limits.excludeWeekends}
                onCheckedChange={(checked) => handleLimitChange("excludeWeekends", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Exclude Holidays</Label>
              <Switch
                checked={limits.excludeHolidays}
                onCheckedChange={(checked) => handleLimitChange("excludeHolidays", checked)}
              />
            </div>

            {limits.enforcementType === "blocking" && (
              <div className="bg-amber-50 border border-amber-200 rounded-md p-3 flex items-start gap-2 mt-4">
                <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-800">Blocking enforcement is active</p>
                  <p className="text-xs text-amber-700 mt-1">
                    When a team member reaches their overtime limit, they will not be able to be assigned new tasks until the next week.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={saveSettings} disabled={isLoading}>
            {isLoading ? "Saving..." : "Save Limits"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
