"use client"

import { Draggable } from "@hello-pangea/dnd"
import { 
  CalendarClock, 
  MessageSquare, 
  Paperclip, 
  CheckSquare,
  ArrowUpRight, 
  ArrowDownRight, 
  ArrowRight,
  MoreHorizontal
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { KanbanTask as KanbanTaskType } from "@/app/dashboard/kanban/page"

type KanbanTaskProps = {
  task: KanbanTaskType
  index: number
}

export default function KanbanTask({ task, index }: KanbanTaskProps) {
  const formattedDueDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  }) : null

  // Determine priority icon and color
  const getPriorityDetails = (priority: string) => {
    switch (priority) {
      case 'high':
        return {
          icon: <ArrowUpRight className="h-3 w-3" />,
          color: 'text-red-600 bg-red-100 dark:bg-red-900/20 border-red-200 dark:border-red-800',
        }
      case 'medium':
        return {
          icon: <ArrowRight className="h-3 w-3" />,
          color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
        }
      case 'low':
        return {
          icon: <ArrowDownRight className="h-3 w-3" />,
          color: 'text-green-600 bg-green-100 dark:bg-green-900/20 border-green-200 dark:border-green-800',
        }
      default:
        return {
          icon: <ArrowRight className="h-3 w-3" />,
          color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
        }
    }
  }

  const priorityDetails = getPriorityDetails(task.priority)

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={cn(
            "transition-shadow rounded-md",
            snapshot.isDragging && "shadow-lg"
          )}
        >
          <Card className="border overflow-hidden">
            <CardContent className="p-3">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-medium text-sm line-clamp-2">{task.title}</h3>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2 -mt-1 flex-shrink-0">
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>Edit</DropdownMenuItem>
                    <DropdownMenuItem>Move</DropdownMenuItem>
                    <DropdownMenuItem>Copy Link</DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              {task.description && (
                <p className="text-muted-foreground text-xs mb-3 line-clamp-2">
                  {task.description}
                </p>
              )}
              
              {task.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {task.tags.map((tag, i) => (
                    <Badge key={i} variant="outline" className="text-xs py-0 truncate max-w-[120px]">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
              
              <div className="flex flex-wrap gap-1.5 mt-3">
                <Badge variant="outline" className={cn("text-xs py-0 px-1.5 flex items-center gap-0.5", priorityDetails.color)}>
                  {priorityDetails.icon}
                  <span className="capitalize">{task.priority}</span>
                </Badge>
                
                {formattedDueDate && (
                  <Badge variant="outline" className="text-xs py-0 flex items-center gap-1 border-amber-200 dark:border-amber-800">
                    <CalendarClock className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                    {formattedDueDate}
                  </Badge>
                )}
              </div>
            </CardContent>
            
            <CardFooter className="p-3 pt-0 flex justify-between items-center">
              <div className="flex items-center gap-2.5 flex-wrap">
                {task.attachments ? (
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Paperclip className="h-3.5 w-3.5 mr-0.5" />
                    {task.attachments}
                  </div>
                ) : null}
                
                {task.comments ? (
                  <div className="flex items-center text-xs text-muted-foreground">
                    <MessageSquare className="h-3.5 w-3.5 mr-0.5" />
                    {task.comments}
                  </div>
                ) : null}
                
                {task.subtasks ? (
                  <div className="flex items-center text-xs text-muted-foreground">
                    <CheckSquare className="h-3.5 w-3.5 mr-0.5" />
                    {task.subtasks.completed}/{task.subtasks.total}
                  </div>
                ) : null}
              </div>
              
              {task.assignee && (
                <Avatar className="h-6 w-6 flex-shrink-0">
                  <AvatarImage src={task.assignee.avatar || "/placeholder-user.jpg"} />
                  <AvatarFallback className="text-xs">
                    {task.assignee.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              )}
            </CardFooter>
          </Card>
        </div>
      )}
    </Draggable>
  )
}
