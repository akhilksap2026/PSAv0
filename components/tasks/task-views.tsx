'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/supabase'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TaskActions } from './task-actions'
import { Drag2, ListTodo, Grid3x3 } from 'lucide-react'

type Task = Database['public']['Tables']['tasks']['Row']
type TaskStatus = Task['status']

interface TaskListViewProps {
  projectId: string
  tasks: Task[]
  onTaskUpdate?: () => void
  onTaskEdit?: (task: Task) => void
}

export function TaskListView({ projectId, tasks, onTaskUpdate, onTaskEdit }: TaskListViewProps) {
  const [filteredTasks, setFilteredTasks] = useState(tasks)
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    let filtered = tasks

    if (statusFilter !== 'all') {
      filtered = filtered.filter(t => t.status === statusFilter)
    }

    if (searchTerm) {
      filtered = filtered.filter(t =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredTasks(filtered)
  }, [tasks, statusFilter, searchTerm])

  const getStatusColor = (status: TaskStatus) => {
    const colors: Record<TaskStatus, string> = {
      'not_started': 'bg-gray-100 text-gray-800',
      'in_progress': 'bg-blue-100 text-blue-800',
      'on_hold': 'bg-yellow-100 text-yellow-800',
      'completed': 'bg-green-100 text-green-800',
      'cancelled': 'bg-red-100 text-red-800',
    }
    return colors[status]
  }

  const getPriorityColor = (priority: Task['priority']) => {
    const colors: Record<Task['priority'], string> = {
      'low': 'border-l-2 border-gray-400',
      'medium': 'border-l-2 border-blue-400',
      'high': 'border-l-2 border-orange-400',
      'critical': 'border-l-2 border-red-500',
    }
    return colors[priority]
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Search tasks..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="not_started">Not Started</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="on_hold">On Hold</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        {filteredTasks.map((task) => (
          <Card key={task.id} className={`p-4 hover:shadow-md transition-shadow ${getPriorityColor(task.priority)}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onTaskEdit?.(task)}>
                <h3 className="font-medium truncate hover:text-primary">{task.name}</h3>
                {task.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{task.description}</p>
                )}
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <Badge className={getStatusColor(task.status)}>
                  {task.status}
                </Badge>
                {task.due_date && (
                  <div className="text-xs text-right">
                    <p className="text-muted-foreground">Due</p>
                    <p className="font-medium">{task.due_date}</p>
                  </div>
                )}
                {task.estimated_hours && (
                  <div className="text-xs text-right">
                    <p className="text-muted-foreground">Hours</p>
                    <p className="font-medium">{task.estimated_hours}h</p>
                  </div>
                )}
                <TaskActions
                  taskId={task.id}
                  onEdit={() => onTaskEdit?.(task)}
                  onDelete={() => onTaskUpdate?.()}
                />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredTasks.length === 0 && (
        <Card className="p-8">
          <p className="text-center text-muted-foreground">No tasks match your filters</p>
        </Card>
      )}
    </div>
  )
}

export function TaskKanbanView({ projectId, tasks }: TaskListViewProps) {
  const statuses: TaskStatus[] = ['not_started', 'in_progress', 'on_hold', 'completed']
  const statusLabels: Record<TaskStatus, string> = {
    'not_started': 'Not Started',
    'in_progress': 'In Progress',
    'on_hold': 'On Hold',
    'completed': 'Completed',
    'cancelled': 'Cancelled',
  }

  const getPriorityBorder = (priority: Task['priority']) => {
    const colors: Record<Task['priority'], string> = {
      'low': 'border-t-2 border-gray-400',
      'medium': 'border-t-2 border-blue-400',
      'high': 'border-t-2 border-orange-400',
      'critical': 'border-t-2 border-red-500',
    }
    return colors[priority]
  }

  return (
    <div className="grid grid-cols-4 gap-4 pb-4">
      {statuses.map((status) => (
        <div key={status} className="bg-muted rounded-lg p-4 min-h-96 flex flex-col">
          <h3 className="font-semibold text-sm mb-4">{statusLabels[status]}</h3>
          <div className="space-y-3 flex-1">
            {tasks
              .filter(t => t.status === status)
              .map((task) => (
                <Card key={task.id} className={`p-3 cursor-move hover:shadow-md transition-shadow ${getPriorityBorder(task.priority)}`}>
                  <h4 className="font-medium text-sm truncate">{task.name}</h4>
                  {task.due_date && (
                    <p className="text-xs text-muted-foreground mt-2">{task.due_date}</p>
                  )}
                  {task.estimated_hours && (
                    <p className="text-xs text-muted-foreground">{task.estimated_hours}h</p>
                  )}
                </Card>
              ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export function TaskGanttView({ projectId, tasks }: TaskListViewProps) {
  // Simplified Gantt view - shows a timeline representation
  const sortedTasks = [...tasks].sort((a, b) => {
    if (!a.start_date) return 1
    if (!b.start_date) return -1
    return a.start_date.localeCompare(b.start_date)
  })

  return (
    <div className="space-y-2 overflow-x-auto pb-4">
      <div className="inline-block min-w-full">
        <div className="grid grid-cols-12 gap-1 px-4 py-2 bg-muted rounded text-xs font-medium mb-2">
          <div className="col-span-3">Task Name</div>
          <div className="col-span-9 text-center">Timeline</div>
        </div>
        
        {sortedTasks.map((task) => (
          <Card key={task.id} className="mb-2 p-3">
            <div className="grid grid-cols-12 gap-1 items-center">
              <div className="col-span-3">
                <h4 className="font-medium text-sm truncate">{task.name}</h4>
              </div>
              <div className="col-span-9">
                {task.start_date && task.due_date ? (
                  <div className="relative h-6 bg-muted rounded">
                    <div className="absolute h-full bg-primary rounded flex items-center px-2 text-xs text-white font-medium">
                      {task.due_date}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No dates set</p>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
