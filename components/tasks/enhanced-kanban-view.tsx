'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/supabase'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

type Task = Database['public']['Tables']['tasks']['Row']
type TaskStatus = Task['status']

interface DroppableColumnProps {
  id: TaskStatus
  children: React.ReactNode
  label: string
  count: number
}

function DroppableColumn({ id, children, label, count }: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <div
      ref={setNodeRef}
      className={`bg-muted rounded-lg p-4 min-h-96 flex flex-col transition-colors ${isOver ? 'bg-primary/10 ring-2 ring-primary/50' : ''}`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm">{label}</h3>
        <Badge variant="outline" className="text-xs">
          {count}
        </Badge>
      </div>
      {children}
    </div>
  )
}

interface KanbanCardProps {
  task: Task
  isDragging?: boolean
  onEdit?: (task: Task) => void
}

function KanbanCard({ task, isDragging, onEdit }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
  }

  const priorityColors: Record<Task['priority'], string> = {
    low: 'border-t-2 border-gray-400',
    medium: 'border-t-2 border-blue-400',
    high: 'border-t-2 border-orange-400',
    critical: 'border-t-2 border-red-500',
  }

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`p-3 cursor-move hover:shadow-md transition-shadow ${priorityColors[task.priority]} ${isDragging ? 'opacity-50 shadow-lg' : ''}`}
      {...attributes}
      {...listeners}
    >
      <h4 className="font-medium text-sm truncate hover:text-primary" onClick={() => onEdit?.(task)}>
        {task.name}
      </h4>
      {task.description && (
        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{task.description}</p>
      )}
      <div className="flex items-center justify-between gap-2 mt-2">
        {task.estimated_hours && (
          <Badge variant="outline" className="text-xs">
            {task.estimated_hours}h
          </Badge>
        )}
        {task.due_date && (
          <span className="text-xs text-muted-foreground">{task.due_date}</span>
        )}
      </div>
    </Card>
  )
}

interface EnhancedKanbanViewProps {
  projectId: string
  tasks: Task[]
  onTaskUpdate?: () => void
  onTaskEdit?: (task: Task) => void
}

export function EnhancedKanbanView({
  projectId,
  tasks,
  onTaskUpdate,
  onTaskEdit,
}: EnhancedKanbanViewProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null)

  const statuses: TaskStatus[] = ['not_started', 'in_progress', 'on_hold', 'completed']
  const statusLabels: Record<TaskStatus, string> = {
    'not_started': 'Not Started',
    'in_progress': 'In Progress',
    'on_hold': 'On Hold',
    'completed': 'Completed',
    'cancelled': 'Cancelled',
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      distance: 8,
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    const draggedTaskId = active.id as string
    const draggedTask = tasks.find(t => t.id === draggedTaskId)
    if (!draggedTask) return

    // Determine new status - check if dropped on column or another task
    let newStatus: TaskStatus

    // If over.id is a status (column), use it directly
    if (statuses.includes(over.id as TaskStatus)) {
      newStatus = over.id as TaskStatus
    } else {
      // Otherwise, find the task that was dropped on and get its status
      const overTask = tasks.find(t => t.id === over.id)
      if (!overTask) return
      newStatus = overTask.status
    }

    // Skip if status unchanged
    if (draggedTask.status === newStatus) return

    setUpdatingTaskId(draggedTaskId)
    setError(null)

    try {
      const { error: updateError } = await supabase
        .from('tasks')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', draggedTaskId)

      if (updateError) throw updateError
      onTaskUpdate?.()
    } catch (err) {
      console.error('[v0] Update task status error:', err)
      setError(err instanceof Error ? err.message : 'Failed to update task status')
    } finally {
      setUpdatingTaskId(null)
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-4 gap-4 pb-4">
          {statuses.map(status => {
            const statusTasks = tasks.filter(t => t.status === status)

            return (
              <DroppableColumn
                key={status}
                id={status}
                label={statusLabels[status]}
                count={statusTasks.length}
              >
                <SortableContext items={statusTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-3 flex-1 overflow-y-auto">
                    {statusTasks.map(task => (
                      <KanbanCard
                        key={task.id}
                        task={task}
                        isDragging={activeId === task.id}
                        onEdit={onTaskEdit}
                      />
                    ))}

                    {statusTasks.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed border-muted-foreground/20 rounded-lg">
                        Drop tasks here
                      </div>
                    )}
                  </div>
                </SortableContext>
              </DroppableColumn>
            )
          })}
        </div>

        <DragOverlay>
          {activeId ? (
            <KanbanCard
              task={tasks.find(t => t.id === activeId)!}
              isDragging
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      <p className="text-xs text-muted-foreground">
        Drag tasks between columns to change status
      </p>
    </div>
  )
}
