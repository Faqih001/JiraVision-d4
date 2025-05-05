"use client"

import { useState } from "react"
import {
  Archive,
  ArchiveX,
  Clock,
  File,
  Inbox,
  MoreVertical,
  Paperclip,
  Search,
  Send,
  Star,
  Trash2,
  Users,
} from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export default function EmailPage() {
  const [searchQuery, setSearchQuery] = useState("")

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Email</h1>
          <p className="text-muted-foreground">Manage your team communications</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" className="gap-1">
            <Send className="h-4 w-4" />
            <span>Compose</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Email Sidebar */}
        <div className="md:col-span-1 space-y-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search emails..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Button variant="ghost" className="w-full justify-start gap-2">
              <Inbox className="h-4 w-4" />
              <span>Inbox</span>
              <Badge className="ml-auto">24</Badge>
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-2">
              <Star className="h-4 w-4" />
              <span>Starred</span>
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-2">
              <Send className="h-4 w-4" />
              <span>Sent</span>
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-2">
              <File className="h-4 w-4" />
              <span>Drafts</span>
              <Badge className="ml-auto">3</Badge>
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-2">
              <Archive className="h-4 w-4" />
              <span>Archive</span>
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-2">
              <Trash2 className="h-4 w-4" />
              <span>Trash</span>
            </Button>
          </div>

          <Separator />

          <div>
            <h3 className="text-sm font-medium mb-2 px-2">Labels</h3>
            <div className="space-y-1">
              <Button variant="ghost" className="w-full justify-start gap-2">
                <span className="h-2 w-2 rounded-full bg-red-500"></span>
                <span>Important</span>
              </Button>
              <Button variant="ghost" className="w-full justify-start gap-2">
                <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                <span>Work</span>
              </Button>
              <Button variant="ghost" className="w-full justify-start gap-2">
                <span className="h-2 w-2 rounded-full bg-green-500"></span>
                <span>Personal</span>
              </Button>
              <Button variant="ghost" className="w-full justify-start gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                <span>Sprint Planning</span>
              </Button>
              <Button variant="ghost" className="w-full justify-start gap-2">
                <span className="h-2 w-2 rounded-full bg-purple-500"></span>
                <span>Team Updates</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Email Content */}
        <div className="md:col-span-3">
          <Tabs defaultValue="primary">
            <div className="flex justify-between items-center mb-4">
              <TabsList>
                <TabsTrigger value="primary">Primary</TabsTrigger>
                <TabsTrigger value="social">Social</TabsTrigger>
                <TabsTrigger value="updates">Updates</TabsTrigger>
              </TabsList>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <ArchiveX className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm">
                  <Archive className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <TabsContent value="primary" className="space-y-4">
              {/* Email Item 1 */}
              <Card className="cursor-pointer hover:bg-muted/30 transition-colors">
                <CardHeader className="p-4 pb-2">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>EW</AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-base">Emily Wilson</CardTitle>
                        <CardDescription>Sprint Planning Meeting</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge>Important</Badge>
                      <div className="text-xs text-muted-foreground">10:32 AM</div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>Mark as read</DropdownMenuItem>
                          <DropdownMenuItem>Star</DropdownMenuItem>
                          <DropdownMenuItem>Archive</DropdownMenuItem>
                          <DropdownMenuItem>Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    Hi team, I wanted to remind everyone about our sprint planning meeting tomorrow at 10 AM. Please
                    make sure to review the backlog items and come prepared with your estimates. We'll be discussing the
                    upcoming features for the Ethical Metrics dashboard.
                  </p>
                </CardContent>
                <CardFooter className="p-4 pt-0 flex items-center gap-2">
                  <Paperclip className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">sprint-planning-agenda.pdf (245 KB)</span>
                </CardFooter>
              </Card>

              {/* Email Item 2 */}
              <Card className="cursor-pointer hover:bg-muted/30 transition-colors">
                <CardHeader className="p-4 pb-2">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>RJ</AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-base">Robert Johnson</CardTitle>
                        <CardDescription>API Integration Update</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-xs text-muted-foreground">Yesterday</div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>Mark as read</DropdownMenuItem>
                          <DropdownMenuItem>Star</DropdownMenuItem>
                          <DropdownMenuItem>Archive</DropdownMenuItem>
                          <DropdownMenuItem>Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    Hello, I've completed the integration with the IBM Granite API. The authentication issues have been
                    resolved, and we can now proceed with implementing the AI Scrum Master features. I've pushed the
                    changes to the repository, and you can review them at your convenience.
                  </p>
                </CardContent>
                <CardFooter className="p-4 pt-0 flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">To: Development Team</span>
                </CardFooter>
              </Card>

              {/* Email Item 3 */}
              <Card className="cursor-pointer hover:bg-muted/30 transition-colors">
                <CardHeader className="p-4 pb-2">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>AS</AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-base">Alice Smith</CardTitle>
                        <CardDescription>Gamification UI Designs</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-xs text-muted-foreground">May 10</div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>Mark as read</DropdownMenuItem>
                          <DropdownMenuItem>Star</DropdownMenuItem>
                          <DropdownMenuItem>Archive</DropdownMenuItem>
                          <DropdownMenuItem>Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    Hi John, I've attached the latest UI designs for the Gamification dashboard. I've incorporated the
                    feedback from our last meeting and added some new elements for the skill trees and achievements. Let
                    me know what you think!
                  </p>
                </CardContent>
                <CardFooter className="p-4 pt-0 flex items-center gap-2">
                  <Paperclip className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">gamification-designs-v2.fig (3.2 MB)</span>
                </CardFooter>
              </Card>

              {/* Email Item 4 */}
              <Card className="cursor-pointer hover:bg-muted/30 transition-colors">
                <CardHeader className="p-4 pb-2">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>JV</AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-base">JiraVision System</CardTitle>
                        <CardDescription>Weekly Team Performance Report</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-xs text-muted-foreground">May 8</div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>Mark as read</DropdownMenuItem>
                          <DropdownMenuItem>Star</DropdownMenuItem>
                          <DropdownMenuItem>Archive</DropdownMenuItem>
                          <DropdownMenuItem>Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    Your weekly team performance report is now available. This week's highlights: Velocity increased by
                    8%, team wellbeing score is at 85%, and there are 2 potential risks identified by the AI Scrum
                    Master. Click the link below to view the full report.
                  </p>
                </CardContent>
                <CardFooter className="p-4 pt-0 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Automated Report</span>
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="social" className="space-y-4">
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">No social emails to display.</p>
              </Card>
            </TabsContent>

            <TabsContent value="updates" className="space-y-4">
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">No update emails to display.</p>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
