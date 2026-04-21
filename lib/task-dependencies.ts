import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/supabase'
import { addDays, max as dateMax } from 'date-fns'

type Task = Database['public']['Tables']['tasks']['Row']

/**
 * Calculate the new start date for a task based on its dependencies
 * using the Critical Path Method
 */
export async function calculateTaskStartDate(taskId: string): Promise<Date | null> {
  try {
    // Get all predecessors for this task
    const { data: dependencies } = await supabase
      .from('task_dependencies')
      .select('predecessor_task_id, lag_days')
      .eq('successor_task_id', taskId)

    if (!dependencies || dependencies.length === 0) {
      return null
    }

    // Get all predecessor tasks
    const predecessorIds = dependencies.map(d => d.predecessor_task_id)
    const { data: predecessors } = await supabase
      .from('tasks')
      .select('id, due_date')
      .in('id', predecessorIds)

    if (!predecessors || predecessors.length === 0) {
      return null
    }

    // Find the latest due date among predecessors
    const latestDueDate = predecessors.reduce((max, task) => {
      if (!task.due_date) return max
      const dueDate = new Date(task.due_date)
      const dep = dependencies.find(d => d.predecessor_task_id === task.id)
      const lagDays = dep?.lag_days || 0
      const adjustedDate = addDays(dueDate, lagDays)
      return !max || adjustedDate > max ? adjustedDate : max
    }, null as Date | null)

    return latestDueDate
  } catch (error) {
    console.error('[v0] Error calculating task start date:', error)
    return null
  }
}

/**
 * Cascade date updates when a task's due date changes
 */
export async function cascadeDateUpdates(taskId: string, newDueDate: string): Promise<void> {
  try {
    // Get all successor tasks (tasks that depend on this one)
    const { data: successors } = await supabase
      .from('task_dependencies')
      .select('successor_task_id, lag_days')
      .eq('predecessor_task_id', taskId)

    if (!successors || successors.length === 0) {
      return
    }

    // Update each successor's start date if necessary
    for (const successor of successors) {
      const newStartDate = addDays(new Date(newDueDate), successor.lag_days || 0)

      const { data: task } = await supabase
        .from('tasks')
        .select('start_date, duration_days')
        .eq('id', successor.successor_task_id)
        .single()

      if (task) {
        const currentStartDate = task.start_date ? new Date(task.start_date) : new Date()
        
        // Only update if the new date is later than current start date
        if (newStartDate > currentStartDate) {
          const newTaskDueDate = addDays(newStartDate, task.duration_days || 1)
          
          await supabase
            .from('tasks')
            .update({
              start_date: newStartDate.toISOString().split('T')[0],
              due_date: newTaskDueDate.toISOString().split('T')[0],
              updated_at: new Date().toISOString(),
            })
            .eq('id', successor.successor_task_id)

          // Recursively cascade updates to successors of successors
          await cascadeDateUpdates(
            successor.successor_task_id,
            newTaskDueDate.toISOString().split('T')[0]
          )
        }
      }
    }
  } catch (error) {
    console.error('[v0] Error cascading date updates:', error)
  }
}

/**
 * Calculate critical path (longest sequence of dependent tasks)
 */
export async function calculateCriticalPath(projectId: string): Promise<string[]> {
  try {
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, start_date, due_date')
      .eq('project_id', projectId)

    if (!tasks) return []

    const criticalTasks: string[] = []
    
    // Find tasks with no predecessors (start nodes)
    const { data: startTasks } = await supabase
      .from('tasks')
      .select('id')
      .eq('project_id', projectId)
      .not('id', 'in', `(${tasks.map(t => `'${t.id}'`).join(',')})`)

    // For now, return empty - full critical path algorithm would go here
    // This is a simplified version
    
    return criticalTasks
  } catch (error) {
    console.error('[v0] Error calculating critical path:', error)
    return []
  }
}
