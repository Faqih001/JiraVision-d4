"use client"

import { Droppable } from "@hello-pangea/dnd"
import { CirclePlus, MoreHorizontal } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import KanbanTask from "@/components/kanban/kanban-task"
import { cn } from "@/lib/utils"
import type { KanbanTask as KanbanTaskType } from "@/app/dashboard/kanban/page"

type KanbanColumnProps = {
  column: {
    id: string
    title: string
    color: string
    tasks: KanbanTaskType[]
  }
  onAddTask: () => void
}

export default function KanbanColumn({ column, onAddTask }: KanbanColumnProps) {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="px-3 py-3 flex flex-row items-center justify-between space-y-0 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className={cn("h-3 w-3 rounded-full", column.color)}></div>
          <CardTitle className="text-sm font-medium">
            {column.title} <span className="text-muted-foreground ml-1">({column.tasks.length})</span>
          </CardTitle>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onAddTask}>
            <CirclePlus className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Edit Column</DropdownMenuItem>
              <DropdownMenuItem>Sort Tasks</DropdownMenuItem>
              <DropdownMenuItem className="text-red-600">Delete Column</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="p-3 flex-1 overflow-hidden">
        <Droppable droppableId={column.id}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={cn(
                "h-full min-h-[150px] max-h-[calc(100vh-18rem)] md:max-h-[calc(100vh-15rem)] overflow-y-auto space-y-3 pr-1",
                snapshot.isDraggingOver && "bg-muted/50 rounded-md"
              )}
            >
              {column.tasks.map((task, index) => (
                <KanbanTask key={task.id} task={task} index={index} />
              ))}
              {provided.placeholder}
              {column.tasks.length === 0 && (
                <div className="h-full min-h-[100px] flex items-center justify-center text-muted-foreground text-sm border-2 border-dashed rounded-md">
                  <p>Drop tasks here</p>
                </div>
              )}
            </div>
          )}
        </Droppable>
      </CardContent>
    </Card>
  )
}
