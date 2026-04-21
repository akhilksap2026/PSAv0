'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import type { Database } from '@/lib/supabase'

type Task = Database['public']['Tables']['tasks']['Row']

const taskFormSchema = z.object({
  name: z.string().min(1, 'Task name is required').max(255),
  description: z.string().max(1000).optional().nullable(),
  status: z.enum(['not_started', 'in_progress', 'on_hold', 'completed', 'cancelled']),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  start_date: z.string().optional().nullable(),
  due_date: z.string().optional().nullable(),
  estimated_hours: z.coerce.number().positive().optional().nullable(),
  is_billable: z.boolean().default(true),
})

type TaskFormData = z.infer<typeof taskFormSchema>

interface TaskFormModalProps {
  open: boolean
  task: Task | null
  projectId: string
  userId: string
  onClose: () => void
  onSuccess: () => void
}

export function TaskFormModal({ open, task, projectId, userId, onClose, onSuccess }: TaskFormModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: task ? {
      name: task.name,
      description: task.description || '',
      status: task.status || 'not_started',
      priority: task.priority || 'medium',
      start_date: task.start_date || '',
      due_date: task.due_date || '',
      estimated_hours: task.estimated_hours || null,
      is_billable: task.is_billable ?? true,
    } : {
      status: 'not_started',
      priority: 'medium',
      is_billable: true,
    },
  })

  const status = watch('status')
  const priority = watch('priority')
  const isBillable = watch('is_billable')

  const onSubmit = async (data: TaskFormData) => {
    setError(null)
    setIsLoading(true)

    try {
      if (task) {
        // Update existing task
        const { error: updateError } = await supabase
          .from('tasks')
          .update({
            name: data.name,
            description: data.description,
            status: data.status,
            priority: data.priority,
            start_date: data.start_date || null,
            due_date: data.due_date || null,
            estimated_hours: data.estimated_hours,
            is_billable: data.is_billable,
            updated_at: new Date().toISOString(),
          })
          .eq('id', task.id)

        if (updateError) throw updateError
      } else {
        // Create new task
        const { error: insertError } = await supabase
          .from('tasks')
          .insert([
            {
              project_id: projectId,
              name: data.name,
              description: data.description,
              status: data.status,
              priority: data.priority,
              start_date: data.start_date || null,
              due_date: data.due_date || null,
              estimated_hours: data.estimated_hours,
              is_billable: data.is_billable,
              created_by: userId,
            },
          ])

        if (insertError) throw insertError
      }

      reset()
      onSuccess()
      onClose()
    } catch (err) {
      console.error('[v0] Task form error:', err)
      setError(err instanceof Error ? err.message : 'Failed to save task')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{task ? 'Edit Task' : 'Create New Task'}</DialogTitle>
          <DialogDescription>
            {task ? 'Update the task details below' : 'Add a new task to your project'}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FieldGroup>
            <FieldLabel htmlFor="name">Task Name</FieldLabel>
            <Input
              id="name"
              placeholder="Enter task name"
              {...register('name')}
              disabled={isLoading}
            />
            {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
          </FieldGroup>

          <FieldGroup>
            <FieldLabel htmlFor="description">Description</FieldLabel>
            <Textarea
              id="description"
              placeholder="Add task details (optional)"
              rows={3}
              {...register('description')}
              disabled={isLoading}
            />
            {errors.description && (
              <p className="text-xs text-destructive mt-1">{errors.description.message}</p>
            )}
          </FieldGroup>

          <div className="grid grid-cols-2 gap-3">
            <FieldGroup>
              <FieldLabel htmlFor="status">Status</FieldLabel>
              <Select value={status} onValueChange={(value: any) => setValue('status', value)}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_started">Not Started</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </FieldGroup>

            <FieldGroup>
              <FieldLabel htmlFor="priority">Priority</FieldLabel>
              <Select value={priority} onValueChange={(value: any) => setValue('priority', value)}>
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </FieldGroup>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FieldGroup>
              <FieldLabel htmlFor="start_date">Start Date</FieldLabel>
              <Input
                id="start_date"
                type="date"
                {...register('start_date')}
                disabled={isLoading}
              />
            </FieldGroup>

            <FieldGroup>
              <FieldLabel htmlFor="due_date">Due Date</FieldLabel>
              <Input
                id="due_date"
                type="date"
                {...register('due_date')}
                disabled={isLoading}
              />
            </FieldGroup>
          </div>

          <FieldGroup>
            <FieldLabel htmlFor="estimated_hours">Estimated Hours</FieldLabel>
            <Input
              id="estimated_hours"
              type="number"
              placeholder="0.5"
              step="0.5"
              min="0"
              {...register('estimated_hours')}
              disabled={isLoading}
            />
          </FieldGroup>

          <FieldGroup>
            <div className="flex items-center gap-2">
              <input
                id="is_billable"
                type="checkbox"
                checked={isBillable}
                onChange={(e) => setValue('is_billable', e.target.checked)}
                disabled={isLoading}
              />
              <FieldLabel htmlFor="is_billable" className="mb-0">
                Billable
              </FieldLabel>
            </div>
          </FieldGroup>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : task ? 'Update Task' : 'Create Task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
