'use client'

import React from 'react';
import { Bell, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ChatHeaderProps {
  onNotificationClick: () => void;
  onSecurityClick: () => void;
}

export function ChatHeader({ onNotificationClick, onSecurityClick }: ChatHeaderProps) {
  return (
    <div className="border-b px-4 py-3 flex items-center justify-between bg-background">
      <h1 className="text-2xl font-bold">Chat</h1>
      <div className="flex items-center gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                className="h-9 w-9 rounded-full"
                onClick={onNotificationClick}
              >
                <Bell className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Notification Settings</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                className="h-9 w-9 rounded-full"
                onClick={onSecurityClick}
              >
                <Shield className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Privacy & Security</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}