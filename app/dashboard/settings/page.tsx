"use client"

import { Badge } from "@/components/ui/badge"

import { useState, useEffect, useRef } from "react"
import { useTheme } from "next-themes"
import { Bell, Globe, Lock, Moon, Save, Shield, Sun, User, Camera, Brush, Loader2, X, Upload } from "lucide-react"
import { allTimezones, languages } from "@/lib/timezones"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useMobile } from "@/hooks/use-mobile"
import { useToast } from "@/hooks/use-toast"
import { DashboardLoader } from "@/components/ui/loader"
import { useAuth } from "@/context/auth-context"

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const { toast } = useToast()
  const { user } = useAuth()
  const isMobile = useMobile()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [slackNotifications, setSlackNotifications] = useState(true)
  const [browserNotifications, setBrowserNotifications] = useState(false)
  const [viewportWidth, setViewportWidth] = useState(0)
  
  // Profile state
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    avatar: '',
    jobTitle: '',
    department: '',
    location: '',
    bio: '',
    language: 'en-US',
    timezone: 'Africa/Nairobi'
  })
  
  // Fetch user profile data
  useEffect(() => {
    async function fetchUserProfile() {
      try {
        setIsLoading(true)
        const response = await fetch('/api/user/profile')
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to fetch profile')
        }
        
        const data = await response.json()
        
        if (data.success && data.profile) {
          setProfileData({
            name: data.profile.name || '',
            email: data.profile.email || '',
            avatar: data.profile.avatar || '',
            jobTitle: data.profile.jobTitle || '',
            department: data.profile.department || '',
            location: data.profile.location || '',
            bio: data.profile.bio || '',
            language: data.profile.language || 'en-US',
            timezone: data.profile.timezone || 'Africa/Nairobi'
          })
        }
      } catch (error) {
        console.error('Error fetching profile:', error)
        toast({
          title: 'Error',
          description: 'Failed to load profile data',
          variant: 'destructive'
        })
      } finally {
        setIsLoading(false)
      }
    }
    
    if (user) {
      fetchUserProfile()
    }
  }, [user, toast])
  
  // Handle profile update
  const handleProfileUpdate = async () => {
    try {
      if (!profileData.name || profileData.name.trim() === "") {
        toast({
          title: 'Error',
          description: 'Name is required',
          variant: 'destructive'
        })
        return
      }
      
      setIsSaving(true)
      
      let response;
      try {
        response = await fetch('/api/user/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: profileData.name,
            avatar: profileData.avatar,
            jobTitle: profileData.jobTitle,
            department: profileData.department,
            location: profileData.location,
            bio: profileData.bio,
            language: profileData.language,
            timezone: profileData.timezone
          }),
        });
      } catch (networkError) {
        console.error("Network error when updating profile:", networkError);
        throw new Error('Network error when updating profile. Please check your connection and try again.');
      }
      
      let errorData;
      let data;
      
      try {
        // Clone the response to read it twice if needed
        const responseClone = response.clone();
        
        if (!response.ok) {
          try {
            errorData = await response.json();
            throw new Error(errorData.error || 'Failed to update profile');
          } catch (jsonError) {
            if (jsonError instanceof SyntaxError) {
              // If response is not JSON, get text instead
              const errorText = await responseClone.text();
              throw new Error(errorText || 'Failed to update profile (server returned non-JSON response)');
            }
            throw jsonError;
          }
        }
        
        data = await response.json();
      } catch (parseError) {
        console.error("Error parsing profile update response:", parseError);
        throw new Error('Failed to process server response: ' + parseError.message);
      }
      
      if (data.success) {
        toast({
          title: 'Success',
          description: 'Profile updated successfully',
          variant: 'default'
        })
        
        // Refresh the profile data to show updated information
        try {
          const fetchResponse = await fetch('/api/user/profile')
          
          if (!fetchResponse.ok) {
            console.warn("Failed to refresh profile data after update:", await fetchResponse.text())
            // We can still consider the update successful even if refresh fails
          } else {
            const refreshedData = await fetchResponse.json()
            if (refreshedData.success && refreshedData.profile) {
              setProfileData({
                name: refreshedData.profile.name || '',
                email: refreshedData.profile.email || '',
                avatar: refreshedData.profile.avatar || '',
                jobTitle: refreshedData.profile.jobTitle || '',
                department: refreshedData.profile.department || '',
                location: refreshedData.profile.location || '',
                bio: refreshedData.profile.bio || '',
                language: refreshedData.profile.language || 'en-US',
                timezone: refreshedData.profile.timezone || 'Africa/Nairobi'
              })
            }
          }
        } catch (refreshError) {
          // Log but don't throw - the update was still successful
          console.warn("Error refreshing profile data:", refreshError)
        }
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      
      // Extract the error message for the toast
      let errorMessage = 'Failed to update profile data';
      
      if (error instanceof Error) {
        errorMessage = error.message || errorMessage;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      })
    } finally {
      setIsSaving(false)
    }
  }
  
  // Handle form field changes
  const handleInputChange = (field: string, value: string) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }))
  }
  
  // Handle avatar upload
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    try {
      setIsUploading(true)
      
      // Validate file type
      const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"]
      if (!validTypes.includes(file.type)) {
        toast({
          title: 'Error',
          description: 'Please select a valid image file (JPG, PNG, GIF, WEBP)',
          variant: 'destructive'
        })
        return
      }
      
      // Validate file size (max 2MB)
      const maxSize = 2 * 1024 * 1024 // 2MB
      if (file.size > maxSize) {
        toast({
          title: 'Error',
          description: 'Image file size should be less than 2MB',
          variant: 'destructive'
        })
        return
      }
      
      // Create form data
      const formData = new FormData()
      formData.append('avatar', file)
      
      // Use WebP format for better compression if available in browser
      const useWebP = window.navigator.userAgent.indexOf("Safari") === -1 || 
                     window.navigator.userAgent.indexOf("Chrome") !== -1
      formData.append('useWebp', useWebP.toString())
      
      // Send to server
      let response;
      try {
        response = await fetch('/api/user/avatar/upload', {
          method: 'POST',
          body: formData
        })
      } catch (networkError) {
        console.error("Network error when uploading avatar:", networkError);
        throw new Error('Network error when uploading profile picture. Please check your connection and try again.');
      }
      
      let errorData;
      let data;
      
      try {
        // Clone the response to read it twice if needed
        const responseClone = response.clone();
        
        if (!response.ok) {
          try {
            errorData = await response.json();
            throw new Error(errorData.error || 'Failed to upload avatar');
          } catch (jsonError) {
            if (jsonError instanceof SyntaxError) {
              // If response is not JSON, get text instead
              const errorText = await responseClone.text();
              throw new Error(errorText || 'Failed to upload avatar (server returned non-JSON response)');
            }
            throw jsonError;
          }
        }
        
        data = await response.json();
      } catch (parseError) {
        console.error("Error parsing avatar upload response:", parseError);
        throw new Error('Failed to process server response: ' + parseError.message);
      }
      
      if (data.success) {
        setProfileData(prev => ({
          ...prev,
          avatar: data.avatar
        }))
        
        toast({
          title: 'Success',
          description: 'Profile picture updated successfully',
          variant: 'default'
        })
      }
    } catch (error) {
      console.error('Error uploading avatar:', error)
      
      // Extract the error message for the toast
      let errorMessage = 'Failed to upload profile picture';
      
      if (error instanceof Error) {
        errorMessage = error.message || errorMessage;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      // Show more specific error message to the user
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      })
    } finally {
      setIsUploading(false)
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }
  
  // Handle avatar removal
  const handleRemoveAvatar = async () => {
    if (!profileData.avatar) return
    
    try {
      setIsUploading(true)
      
      let response;
      try {
        response = await fetch('/api/user/avatar/remove', {
          method: 'DELETE'
        });
      } catch (networkError) {
        console.error("Network error when removing avatar:", networkError);
        throw new Error('Network error when removing profile picture. Please check your connection and try again.');
      }
      
      let errorData;
      let data;
      
      try {
        // Clone the response to read it twice if needed
        const responseClone = response.clone();
        
        if (!response.ok) {
          try {
            errorData = await response.json();
            throw new Error(errorData.error || 'Failed to remove avatar');
          } catch (jsonError) {
            if (jsonError instanceof SyntaxError) {
              // If response is not JSON, get text instead
              const errorText = await responseClone.text();
              throw new Error(errorText || 'Failed to remove avatar (server returned non-JSON response)');
            }
            throw jsonError;
          }
        }
        
        data = await response.json();
      } catch (parseError) {
        console.error("Error parsing avatar removal response:", parseError);
        throw new Error('Failed to process server response: ' + parseError.message);
      }
      
      if (data.success) {
        setProfileData(prev => ({
          ...prev,
          avatar: ''
        }))
        
        toast({
          title: 'Success',
          description: 'Profile picture removed successfully',
          variant: 'default'
        })
      }
    } catch (error) {
      console.error('Error removing avatar:', error)
      
      // Extract the error message for the toast
      let errorMessage = 'Failed to remove profile picture';
      
      if (error instanceof Error) {
        errorMessage = error.message || errorMessage;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      })
    } finally {
      setIsUploading(false)
    }
  }
  
  useEffect(() => {
    // Set initial viewport width
    setViewportWidth(window.innerWidth)
    
    // Update viewport width on resize
    const handleResize = () => {
      setViewportWidth(window.innerWidth)
    }
    
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your account and preferences</p>
        </div>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="grid grid-cols-4 h-auto md:h-10 p-1">
          <TabsTrigger value="profile" className="flex items-center gap-2 px-3 py-2">
            <User className="h-4 w-4" />
            <span className="hidden md:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex items-center gap-2 px-3 py-2">
            <Sun className="h-4 w-4" />
            <span className="hidden md:inline">Appearance</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2 px-3 py-2">
            <Bell className="h-4 w-4" />
            <span className="hidden md:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2 px-3 py-2">
            <Shield className="h-4 w-4" />
            <span className="hidden md:inline">Security</span>
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          {isLoading ? (
            <div className="min-h-[400px] flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Loading profile data...</p>
              </div>
            </div>
          ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Update your personal information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input 
                    id="name" 
                    value={profileData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={profileData.email}
                    disabled
                    title="Email cannot be changed"
                  />
                  <p className="text-xs text-muted-foreground">Email address cannot be changed</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="avatar">Avatar URL</Label>
                  <Input 
                    id="avatar" 
                    value={profileData.avatar || ''}
                    onChange={(e) => handleInputChange('avatar', e.target.value)}
                    placeholder="https://example.com/avatar.jpg" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jobTitle">Job Title</Label>
                  <Input 
                    id="jobTitle" 
                    value={profileData.jobTitle}
                    onChange={(e) => handleInputChange('jobTitle', e.target.value)}
                    placeholder="e.g. Frontend Developer" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input 
                    id="department" 
                    value={profileData.department}
                    onChange={(e) => handleInputChange('department', e.target.value)}
                    placeholder="e.g. Engineering" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input 
                    id="location" 
                    value={profileData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    placeholder="e.g. San Francisco, CA" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <textarea
                    id="bio"
                    className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Write a short bio about yourself"
                    value={profileData.bio || ''}
                    onChange={(e) => handleInputChange('bio', e.target.value)}
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={handleProfileUpdate} 
                  disabled={isSaving}
                  className="ml-auto"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
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
                    {profileData.avatar ? (
                      <img 
                        src={profileData.avatar + '?t=' + new Date().getTime()} // Add timestamp to prevent caching
                        alt={profileData.name || "User avatar"}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          // If avatar image fails to load, show fallback
                          e.currentTarget.style.display = 'none';
                          console.error('Failed to load profile image:', profileData.avatar);
                          
                          // Notify user about the broken image
                          toast({
                            title: 'Image Error',
                            description: 'Failed to load profile image. Try uploading a new one.',
                            variant: 'destructive',
                          });
                          
                          // Auto-clear the broken avatar URL
                          if (profileData.avatar && profileData.avatar.startsWith('/uploads/')) {
                            // For local uploads, automatically clear the broken link
                            setProfileData(prev => ({
                              ...prev,
                              avatar: ''
                            }));
                          }
                        }}
                      />
                    ) : null}
                    <AvatarFallback className="text-2xl">
                      {profileData.name ? profileData.name.substring(0, 2).toUpperCase() : 'JV'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex gap-2">
                    <input 
                      type="file" 
                      id="avatar-upload" 
                      className="hidden" 
                      accept="image/png,image/jpeg,image/gif,image/webp"
                      onChange={handleAvatarUpload}
                      ref={fileInputRef}
                      aria-label="Upload profile picture"
                    />
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="gap-1" 
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span className="hidden sm:inline">Uploading...</span>
                        </>
                      ) : (
                        <>
                          <Camera className="h-3 w-3" />
                          <span className="hidden sm:inline">Upload</span>
                        </>
                      )}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="gap-1"
                      onClick={handleRemoveAvatar}
                      disabled={!profileData.avatar || isUploading}
                    >
                      <X className="h-3 w-3" />
                      <span className="hidden sm:inline">Remove</span>
                    </Button>
                  </div>
                  {profileData.avatar && (
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      Current avatar: {profileData.avatar.split('/').pop()}
                      <br />
                      <span className="text-xs text-primary">
                        {profileData.avatar.includes('webp') ? '(Optimized WebP format)' : ''}
                      </span>
                    </p>
                  )}
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
                      value={profileData.language}
                      onChange={(e) => handleInputChange('language', e.target.value)}
                    >
                      {languages.map((lang) => (
                        <option key={lang.value} value={lang.value}>
                          {lang.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <select
                      id="timezone"
                      aria-label="Select timezone"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      value={profileData.timezone}
                      onChange={(e) => handleInputChange('timezone', e.target.value)}
                    >
                      {allTimezones.map((group) => (
                        <optgroup key={group.label} label={group.label}>
                          {group.options.map((tz) => (
                            <option key={tz.value} value={tz.value}>
                              {tz.label}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    variant="outline" 
                    className="w-full gap-1"
                    onClick={handleProfileUpdate}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Updating...</span>
                      </>
                    ) : (
                      <>
                        <Globe className="h-4 w-4" />
                        <span className="hidden sm:inline">Update Preferences</span>
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
          )}
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
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
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
                      <span className="hidden sm:inline">Light</span>
                    </Button>
                    <Button
                      variant={theme === "dark" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTheme("dark")}
                      className="gap-1"
                    >
                      <Moon className="h-4 w-4" />
                      <span className="hidden sm:inline">Dark</span>
                    </Button>
                    <Button
                      variant={theme === "system" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTheme("system")}
                      className="gap-1"
                    >
                      <div className="h-4 w-4 rounded-full bg-gradient-to-r from-slate-100 to-slate-900" />
                      <span className="hidden sm:inline ml-1">System</span>
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Dashboard Layout</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="border rounded-md p-4 cursor-pointer bg-primary/5 border-primary">
                    <div className="h-24 sm:h-32 bg-muted/50 rounded-md mb-2 flex items-center justify-center text-sm">Layout 1</div>
                    <div className="text-sm font-medium">Default</div>
                  </div>
                  <div className="border rounded-md p-4 cursor-pointer hover:bg-muted/10">
                    <div className="h-24 sm:h-32 bg-muted/50 rounded-md mb-2 flex items-center justify-center text-sm">Layout 2</div>
                    <div className="text-sm font-medium">Compact</div>
                  </div>
                  <div className="border rounded-md p-4 cursor-pointer hover:bg-muted/10">
                    <div className="h-24 sm:h-32 bg-muted/50 rounded-md mb-2 flex items-center justify-center text-sm">Layout 3</div>
                    <div className="text-sm font-medium">Expanded</div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Sidebar Position</h3>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="border rounded-md p-3 sm:p-4 cursor-pointer bg-primary/5 border-primary">
                    <div className="h-16 sm:h-20 w-24 sm:w-32 bg-muted/50 rounded-md flex">
                      <div className="w-1/4 bg-primary/20 h-full rounded-l-md"></div>
                      <div className="w-3/4 flex items-center justify-center text-xs">Left</div>
                    </div>
                  </div>
                  <div className="border rounded-md p-3 sm:p-4 cursor-pointer hover:bg-muted/10">
                    <div className="h-16 sm:h-20 w-24 sm:w-32 bg-muted/50 rounded-md flex">
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
                <span className="hidden sm:inline">Save Preferences</span>
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
                <span className="hidden sm:inline">Save Notification Settings</span>
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
                  <span className="hidden sm:inline">Update Password</span>
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
                  <span className="hidden sm:inline">Setup Two-Factor Authentication</span>
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
                      <Button variant="outline" size="sm" className="gap-1">
                        <Shield className="h-3 w-3" />
                        <span className="hidden sm:inline">Revoke</span>
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
                      <Button variant="outline" size="sm" className="gap-1">
                        <Shield className="h-3 w-3" />
                        <span className="hidden sm:inline">Revoke</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="text-destructive border-destructive hover:bg-destructive/10 gap-1">
                  <Shield className="h-4 w-4" />
                  <span className="hidden sm:inline">Revoke All Other Sessions</span>
                  <span className="inline sm:hidden">Revoke All</span>
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
