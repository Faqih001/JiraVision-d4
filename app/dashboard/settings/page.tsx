"use client"

import { Badge } from "@/components/ui/badge"

import { useState } from "react"
import { useTheme } from "next-themes"
import { Bell, Globe, Lock, Moon, Save, Shield, Sun, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useMobile } from "@/hooks/use-mobile"

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const isMobile = useMobile()
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [slackNotifications, setSlackNotifications] = useState(true)
  const [browserNotifications, setBrowserNotifications] = useState(false)

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your account and preferences</p>
        </div>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            <span>Profile</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2">
            <Sun className="h-4 w-4" />
            <span>Appearance</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            <span>Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Lock className="h-4 w-4" />
            <span>Security</span>
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Update your personal information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" defaultValue="John" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" defaultValue="Doe" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" defaultValue="john.doe@jiravision.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jobTitle">Job Title</Label>
                  <Input id="jobTitle" defaultValue="Frontend Developer" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input id="department" defaultValue="Engineering" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input id="location" defaultValue="San Francisco, CA" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <textarea
                    id="bio"
                    className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    defaultValue="Frontend developer with 5 years of experience specializing in React and TypeScript."
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button className="gap-1">
                  <Save className="h-4 w-4" />
                  <span>Save Changes</span>
                </Button>
              </CardFooter>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Picture</CardTitle>
                  <CardDescription>Update your profile image</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center">
                  <Avatar className="h-24 w-24 mb-4">
                    <AvatarFallback className="text-2xl">JD</AvatarFallback>
                  </Avatar>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      Upload
                    </Button>
                    <Button variant="outline" size="sm">
                      Remove
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Language & Region</CardTitle>
                  <CardDescription>Set your language preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="language">Language</Label>
                    <select
                      id="language"
                      aria-label="Select language"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      defaultValue="en-US"
                    >
                      <option value="en-US">English (US)</option>
                      <option value="en-GB">English (UK)</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                      <option value="de">German</option>
                      <option value="ja">Japanese</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <select
                      id="timezone"
                      aria-label="Select timezone"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      defaultValue="America/Los_Angeles"
                    >
                      <option value="America/Los_Angeles">Pacific Time (US & Canada)</option>
                      <option value="America/New_York">Eastern Time (US & Canada)</option>
                      <option value="Europe/London">London</option>
                      <option value="Europe/Paris">Paris</option>
                      <option value="Asia/Tokyo">Tokyo</option>
                    </select>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full gap-1">
                    <Globe className="h-4 w-4" />
                    <span>Update Preferences</span>
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Appearance Settings</CardTitle>
              <CardDescription>Customize how JiraVision looks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="theme" className="text-base">
                    Theme
                  </Label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={theme === "light" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTheme("light")}
                      className="gap-1"
                    >
                      <Sun className="h-4 w-4" />
                      <span>Light</span>
                    </Button>
                    <Button
                      variant={theme === "dark" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTheme("dark")}
                      className="gap-1"
                    >
                      <Moon className="h-4 w-4" />
                      <span>Dark</span>
                    </Button>
                    <Button
                      variant={theme === "system" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTheme("system")}
                      className="gap-1"
                    >
                      <span>System</span>
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Dashboard Layout</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="border rounded-md p-4 cursor-pointer bg-primary/5 border-primary">
                    <div className="h-32 bg-muted/50 rounded-md mb-2 flex items-center justify-center">Layout 1</div>
                    <div className="text-sm font-medium">Default</div>
                  </div>
                  <div className="border rounded-md p-4 cursor-pointer hover:bg-muted/10">
                    <div className="h-32 bg-muted/50 rounded-md mb-2 flex items-center justify-center">Layout 2</div>
                    <div className="text-sm font-medium">Compact</div>
                  </div>
                  <div className="border rounded-md p-4 cursor-pointer hover:bg-muted/10">
                    <div className="h-32 bg-muted/50 rounded-md mb-2 flex items-center justify-center">Layout 3</div>
                    <div className="text-sm font-medium">Expanded</div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Sidebar Position</h3>
                <div className="flex items-center gap-4">
                  <div className="border rounded-md p-4 cursor-pointer bg-primary/5 border-primary">
                    <div className="h-20 w-32 bg-muted/50 rounded-md flex">
                      <div className="w-1/4 bg-primary/20 h-full rounded-l-md"></div>
                      <div className="w-3/4 flex items-center justify-center text-xs">Left</div>
                    </div>
                  </div>
                  <div className="border rounded-md p-4 cursor-pointer hover:bg-muted/10">
                    <div className="h-20 w-32 bg-muted/50 rounded-md flex">
                      <div className="w-3/4 flex items-center justify-center text-xs">Right</div>
                      <div className="w-1/4 bg-muted h-full rounded-r-md"></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Other Settings</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="animations">Enable animations</Label>
                    <Switch id="animations" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="compactMode">Compact mode</Label>
                    <Switch id="compactMode" />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="reducedMotion">Reduced motion</Label>
                    <Switch id="reducedMotion" />
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button className="gap-1">
                <Save className="h-4 w-4" />
                <span>Save Preferences</span>
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Control how and when you receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Notification Channels</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="emailNotifications" className="text-base">
                        Email Notifications
                      </Label>
                      <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                    </div>
                    <Switch
                      id="emailNotifications"
                      checked={emailNotifications}
                      onCheckedChange={setEmailNotifications}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="slackNotifications" className="text-base">
                        Slack Notifications
                      </Label>
                      <p className="text-sm text-muted-foreground">Receive notifications in Slack</p>
                    </div>
                    <Switch
                      id="slackNotifications"
                      checked={slackNotifications}
                      onCheckedChange={setSlackNotifications}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="browserNotifications" className="text-base">
                        Browser Notifications
                      </Label>
                      <p className="text-sm text-muted-foreground">Receive notifications in your browser</p>
                    </div>
                    <Switch
                      id="browserNotifications"
                      checked={browserNotifications}
                      onCheckedChange={setBrowserNotifications}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Notification Types</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="taskAssigned" className="text-base">
                        Task Assigned
                      </Label>
                      <p className="text-sm text-muted-foreground">When a task is assigned to you</p>
                    </div>
                    <Switch id="taskAssigned" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="taskUpdated" className="text-base">
                        Task Updated
                      </Label>
                      <p className="text-sm text-muted-foreground">When a task you're assigned to is updated</p>
                    </div>
                    <Switch id="taskUpdated" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="taskCommented" className="text-base">
                        Task Commented
                      </Label>
                      <p className="text-sm text-muted-foreground">When someone comments on your task</p>
                    </div>
                    <Switch id="taskCommented" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="sprintStarted" className="text-base">
                        Sprint Started/Ended
                      </Label>
                      <p className="text-sm text-muted-foreground">When a sprint starts or ends</p>
                    </div>
                    <Switch id="sprintStarted" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="aiInsights" className="text-base">
                        AI Insights
                      </Label>
                      <p className="text-sm text-muted-foreground">When the AI Scrum Master has new insights</p>
                    </div>
                    <Switch id="aiInsights" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="ethicalAlerts" className="text-base">
                        Ethical Governance Alerts
                      </Label>
                      <p className="text-sm text-muted-foreground">When ethical metrics need attention</p>
                    </div>
                    <Switch id="ethicalAlerts" defaultChecked />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Notification Schedule</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="workHours" className="text-base">
                        Work Hours Only
                      </Label>
                      <p className="text-sm text-muted-foreground">Only send notifications during work hours</p>
                    </div>
                    <Switch id="workHours" defaultChecked />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="workHoursStart">Work Hours Start</Label>
                    <Input id="workHoursStart" type="time" defaultValue="09:00" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="workHoursEnd">Work Hours End</Label>
                    <Input id="workHoursEnd" type="time" defaultValue="17:00" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="digestMode" className="text-base">
                        Daily Digest
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Send a daily summary instead of individual notifications
                      </p>
                    </div>
                    <Switch id="digestMode" />
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button className="gap-1">
                <Save className="h-4 w-4" />
                <span>Save Notification Settings</span>
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Password</CardTitle>
                <CardDescription>Update your password</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input id="currentPassword" type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input id="newPassword" type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input id="confirmPassword" type="password" />
                </div>
              </CardContent>
              <CardFooter>
                <Button className="gap-1">
                  <Lock className="h-4 w-4" />
                  <span>Update Password</span>
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Two-Factor Authentication</CardTitle>
                <CardDescription>Add an extra layer of security</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-medium">Two-Factor Authentication</h3>
                    <p className="text-sm text-muted-foreground">Protect your account with 2FA</p>
                  </div>
                  <Switch id="twoFactor" />
                </div>
                <div className="border rounded-md p-4 bg-muted/30">
                  <h4 className="font-medium mb-2" id="2fa-methods-heading">Available Methods</h4>
                  <div className="space-y-2" role="radiogroup" aria-labelledby="2fa-methods-heading">
                    <div className="flex items-center gap-2">
                      <input 
                        type="radio" 
                        id="authenticator" 
                        name="2faMethod" 
                        className="h-4 w-4" 
                        aria-label="Use Authenticator App for two-factor authentication"
                      />
                      <Label htmlFor="authenticator">Authenticator App</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input 
                        type="radio" 
                        id="sms" 
                        name="2faMethod" 
                        className="h-4 w-4" 
                        aria-label="Use SMS for two-factor authentication"
                      />
                      <Label htmlFor="sms">SMS</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input 
                        type="radio" 
                        id="email" 
                        name="2faMethod" 
                        className="h-4 w-4" 
                        aria-label="Use Email for two-factor authentication"
                      />
                      <Label htmlFor="email">Email</Label>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="gap-1">
                  <Shield className="h-4 w-4" />
                  <span>Setup Two-Factor Authentication</span>
                </Button>
              </CardFooter>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Sessions</CardTitle>
                <CardDescription>Manage your active sessions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border rounded-md p-4 bg-primary/5 border-primary">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">Current Session</h4>
                        <p className="text-sm text-muted-foreground">MacBook Pro • San Francisco, CA</p>
                        <p className="text-xs text-muted-foreground mt-1">Last active: Just now</p>
                      </div>
                      <Badge>Current</Badge>
                    </div>
                  </div>
                  <div className="border rounded-md p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">iPhone 13</h4>
                        <p className="text-sm text-muted-foreground">iOS 16 • San Francisco, CA</p>
                        <p className="text-xs text-muted-foreground mt-1">Last active: 2 hours ago</p>
                      </div>
                      <Button variant="outline" size="sm">
                        Revoke
                      </Button>
                    </div>
                  </div>
                  <div className="border rounded-md p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">Windows PC</h4>
                        <p className="text-sm text-muted-foreground">Chrome • New York, NY</p>
                        <p className="text-xs text-muted-foreground mt-1">Last active: 3 days ago</p>
                      </div>
                      <Button variant="outline" size="sm">
                        Revoke
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="text-destructive border-destructive hover:bg-destructive/10">
                  Revoke All Other Sessions
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
