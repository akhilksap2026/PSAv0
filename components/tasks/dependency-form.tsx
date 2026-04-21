'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { X, AlertCircle } from 'lucide-react'

type Task = Database['public']['Tables']['tasks']['Row']
type TaskDependency = Database['public']['Tables']['task_dependencies']['Row']

interface DependencyFormProps {
  open: boolean
  task: Task
  projectTasks: Task[]
  onClose: () => void
  onSave: () => void
}

export function DependencyForm({ open, task, projectTasks, onClose, onSave }: DependencyFormProps) {
  const [dependencies, setDependencies] = useState<TaskDependency[]>([])
  const [selectedPredecessor, setSelectedPredecessor] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (open) {
      fetchDependencies()
    }
  }, [open, task.id])

  const fetchDependencies = async () => {
    setIsLoading(true)
    try {
      const { data } = await supabase
        .from('task_dependencies')
        .select('*')
        .eq('successor_task_id', task.id)

      if (data) setDependencies(data)
    } catch (error) {
      console.error('[v0] Error fetching dependencies:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddDependency = async () => {
    if (!selectedPredecessor) return

    setIsSaving(true)
    try {
      await supabase.from('task_dependencies').insert([
        {
          predecessor_task_id: selectedPredecessor as any,
          successor_task_id: task.id,
          dependency_type: 'finish_to_start',
          lag_days: 0,
        },
      ])

      setSelectedPredecessor('')
      await fetchDependencies()
      onSave()
    } catch (error) {
      console.error('[v0] Error adding dependency:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleRemoveDependency = async (depId: string) => {
    try {
      await supabase.from('task_dependencies').delete().eq('id', depId)
      await fetchDependencies()
      onSave()
    } catch (error) {
      console.error('[v0] Error removing dependency:', error)
    }
  }

  const availableTasks = projectTasks.filter(t => t.id !== task.id)
  const predecessorIds = dependencies.map(d => d.predecessor_task_id)

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Task Dependencies</DialogTitle>
          <DialogDescription>
            Set tasks that must be completed before "{task.name}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Predecessor Task (Finish-to-Start)</label>
            <div className="flex gap-2 mt-2">
              <Select value={selectedPredecessor} onValueChange={setSelectedPredecessor}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select a task..." />
                </SelectTrigger>
                <SelectContent>
                  {availableTasks
                    .filter(t => !predecessorIds.includes(t.id))
                    .map(t => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Button onClick={handleAddDependency} disabled={!selectedPredecessor || isSaving}>
                Add
              </Button>
            </div>
          </div>

          {dependencies.length > 0 && (
            <div>
              <label className="text-sm font-medium">Dependencies</label>
              <div className="space-y-2 mt-2 max-h-64 overflow-y-auto">
                {dependencies.map(dep => {
                  const predecessorTask = projectTasks.find(t => t.id === dep.predecessor_task_id)
                  return (
                    <div key={dep.id} className="flex items-center justify-between p-2 border rounded bg-muted/50">
                      <div className="text-sm">
                        <p className="font-medium">{predecessorTask?.name}</p>
                        <p className="text-xs text-muted-foreground">Finish-to-Start</p>
                      </div>
                      <button
                        onClick={() => handleRemoveDependency(dep.id)}
                        className="p-1 hover:bg-destructive/10 rounded"
                      >
                        <X className="h-4 w-4 text-destructive" />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {dependencies.length === 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>No dependencies set. This task can start anytime.</AlertDescription>
            </Alert>
          )}
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
