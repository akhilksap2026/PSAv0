'use client'

import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/supabase'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { formatDate, addDays, differenceInDays, parseISO, isAfter } from 'date-fns'

type Task = Database['public']['Tables']['tasks']['Row']

interface GanttChartProps {
  tasks: Task[]
  projectId: string
  onTaskUpdate?: () => void
}

interface DraggedTask {
  id: string
  startX: number
  offsetX: number
}

export function GanttChart({ tasks, projectId, onTaskUpdate }: GanttChartProps) {
  const [draggingTask, setDraggingTask] = useState<DraggedTask | null>(null)
  const [resizingTask, setResizingTask] = useState<{ id: string; startX: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null)

  // Get date range for the timeline
  const allDates = tasks
    .filter(t => t.start_date && t.due_date)
    .flatMap(t => [parseISO(t.start_date!), parseISO(t.due_date!)])

  const minDate = allDates.length > 0 ? new Date(Math.min(...allDates.map(d => d.getTime()))) : new Date()
  const maxDate = allDates.length > 0 ? new Date(Math.max(...allDates.map(d => d.getTime()))) : addDays(new Date(), 30)

  const totalDays = differenceInDays(maxDate, minDate) + 1
  const pixelsPerDay = 40

  const getTaskPosition = (task: Task) => {
    if (!task.start_date || !task.due_date) return null

    const taskStart = parseISO(task.start_date)
    const taskEnd = parseISO(task.due_date)
    const startOffset = differenceInDays(taskStart, minDate)
    const duration = differenceInDays(taskEnd, taskStart) + 1

    return {
      left: startOffset * pixelsPerDay,
      width: Math.max(duration * pixelsPerDay, 40),
      duration,
    }
  }

  const handleTaskDragStart = (e: React.MouseEvent, taskId: string) => {
    e.preventDefault()
    setDraggingTask({
      id: taskId,
      startX: e.clientX,
      offsetX: (e.currentTarget as HTMLElement).offsetLeft,
    })
  }

  const handleTaskResizeStart = (e: React.MouseEvent, taskId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setResizingTask({
      id: taskId,
      startX: e.clientX,
    })
  }

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (draggingTask) {
        const deltaX = e.clientX - draggingTask.startX
        const daysDelta = Math.round(deltaX / pixelsPerDay)

        if (Math.abs(daysDelta) >= 1) {
          const task = tasks.find(t => t.id === draggingTask.id)
          if (task && task.start_date && task.due_date) {
            const newStart = addDays(parseISO(task.start_date), daysDelta)
            const newEnd = addDays(parseISO(task.due_date), daysDelta)

            handleUpdateTaskDates(draggingTask.id, newStart, newEnd)
            setDraggingTask(null)
          }
        }
      }

      if (resizingTask) {
        const deltaX = e.clientX - resizingTask.startX
        const daysDelta = Math.round(deltaX / pixelsPerDay)

        if (Math.abs(daysDelta) >= 1) {
          const task = tasks.find(t => t.id === resizingTask.id)
          if (task && task.due_date) {
            const currentEnd = parseISO(task.due_date)
            const newEnd = addDays(currentEnd, daysDelta)

            handleUpdateTaskDates(resizingTask.id, parseISO(task.start_date!), newEnd)
            setResizingTask(null)
          }
        }
      }
    },
    [draggingTask, resizingTask, tasks, pixelsPerDay]
  )

  const handleMouseUp = () => {
    setDraggingTask(null)
    setResizingTask(null)
  }

  const handleUpdateTaskDates = async (taskId: string, newStart: Date, newEnd: Date) => {
    if (!isAfter(newEnd, newStart)) {
      setError('End date must be after start date')
      return
    }

    setUpdatingTaskId(taskId)
    setError(null)

    try {
      const { error: updateError } = await supabase
        .from('tasks')
        .update({
          start_date: formatDate(newStart, 'yyyy-MM-dd'),
          due_date: formatDate(newEnd, 'yyyy-MM-dd'),
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskId)

      if (updateError) throw updateError
      onTaskUpdate?.()
    } catch (err) {
      console.error('[v0] Update task dates error:', err)
      setError(err instanceof Error ? err.message : 'Failed to update task dates')
    } finally {
      setUpdatingTaskId(null)
    }
  }

  const sortedTasks = [...tasks].sort((a, b) => {
    if (!a.start_date) return 1
    if (!b.start_date) return -1
    return a.start_date.localeCompare(b.start_date)
  })

  // Month headers
  const monthHeaders = []
  let currentDate = new Date(minDate)

  while (currentDate <= maxDate) {
    monthHeaders.push(new Date(currentDate))
    currentDate.setMonth(currentDate.getMonth() + 1)
  }

  return (
    <div
      className="space-y-4"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="overflow-x-auto bg-white rounded-lg border">
        {/* Timeline Header */}
        <div className="inline-block min-w-full">
          {/* Task Name Column + Timeline */}
          <div className="grid" style={{ gridTemplateColumns: `280px 1fr` }}>
            {/* Left: Task Names */}
            <div className="border-r">
              <div className="sticky left-0 h-16 bg-muted border-b px-4 py-3 font-semibold text-sm flex items-center">
                Task Name
              </div>
              {sortedTasks.map(task => (
                <div
                  key={task.id}
                  className="border-b px-4 py-3 h-12 flex items-center text-sm truncate hover:bg-muted/50"
                  title={task.name}
                >
                  <span className="truncate">{task.name}</span>
                </div>
              ))}
            </div>

            {/* Right: Gantt Timeline */}
            <div className="relative bg-muted/20" style={{ minWidth: `${totalDays * pixelsPerDay}px` }}>
              {/* Month Headers */}
              <div className="sticky top-0 flex border-b bg-background z-10">
                {monthHeaders.map((date, idx) => {
                  const nextMonth = new Date(date)
                  nextMonth.setMonth(nextMonth.getMonth() + 1)
                  const daysInMonth = differenceInDays(
                    nextMonth > maxDate ? maxDate : nextMonth,
                    date
                  ) + 1

                  return (
                    <div
                      key={idx}
                      className="border-r font-medium text-xs text-center bg-muted"
                      style={{ width: `${daysInMonth * pixelsPerDay}px`, minWidth: '40px' }}
                    >
                      {formatDate(date, 'MMM yyyy')}
                    </div>
                  )
                })}
              </div>

              {/* Grid Lines and Tasks */}
              <div className="relative">
                {/* Day grid lines */}
                {Array.from({ length: totalDays }).map((_, idx) => (
                  <div
                    key={idx}
                    className="absolute top-0 bottom-0 border-r border-gray-100"
                    style={{
                      left: `${idx * pixelsPerDay}px`,
                      width: `${pixelsPerDay}px`,
                    }}
                  />
                ))}

                {/* Tasks */}
                {sortedTasks.map(task => {
                  const position = getTaskPosition(task)
                  if (!position) {
                    return (
                      <div key={task.id} className="h-12 border-b flex items-center px-2">
                        <span className="text-xs text-muted-foreground">No dates set</span>
                      </div>
                    )
                  }

                  const statusColors: Record<string, string> = {
                    'not_started': 'bg-gray-300',
                    'in_progress': 'bg-blue-400',
                    'on_hold': 'bg-yellow-400',
                    'completed': 'bg-green-400',
                    'cancelled': 'bg-red-300',
                  }

                  return (
                    <div
                      key={task.id}
                      className="absolute h-12 top-0 flex items-center group cursor-move border-b"
                      style={{
                        left: `${position.left}px`,
                        width: `100%`,
                        height: '48px',
                      }}
                      onMouseDown={e => handleTaskDragStart(e, task.id)}
                    >
                      <div
                        className={`relative h-8 rounded px-2 flex items-center text-white text-xs font-medium shadow-sm hover:shadow-md transition-shadow ${statusColors[task.status] || 'bg-primary'}`}
                        style={{
                          width: `${position.width}px`,
                          minWidth: '40px',
                        }}
                      >
                        <span className="truncate">{task.name}</span>

                        {/* Resize Handle */}
                        <div
                          className="absolute right-0 top-0 bottom-0 w-1 bg-white/30 hover:bg-white/60 cursor-ew-resize group-hover:visible opacity-0 hover:opacity-100"
                          onMouseDown={e => handleTaskResizeStart(e, task.id)}
                          title="Drag to resize"
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-300 rounded"></div>
          <span>Not Started</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-400 rounded"></div>
          <span>In Progress</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-400 rounded"></div>
          <span>Completed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-400 rounded"></div>
          <span>On Hold</span>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Drag tasks left/right to change dates. Drag the right edge to resize duration.
      </p>
    </div>
  )
}
