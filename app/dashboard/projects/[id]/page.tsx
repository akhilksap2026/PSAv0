'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import type { Database } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Plus } from 'lucide-react'
import { TaskListView, TaskKanbanView, TaskGanttView } from '@/components/tasks/task-views'
import { EnhancedKanbanView } from '@/components/tasks/enhanced-kanban-view'
import { GanttChart } from '@/components/tasks/gantt-chart'
import { TaskFormModal } from '@/components/tasks/task-form-modal'

type Project = Database['public']['Tables']['projects']['Row']
type Task = Database['public']['Tables']['tasks']['Row']

export default function ProjectDetailPage() {
  const params = useParams()
  const { userProfile } = useAuth()
  const projectId = params.id as string
  const [project, setProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [projectData, tasksData] = await Promise.all([
          supabase
            .from('projects')
            .select('*')
            .eq('id', projectId)
            .single(),
          supabase
            .from('tasks')
            .select('*')
            .eq('project_id', projectId)
            .order('sequence_number', { ascending: true }),
        ])

        if (projectData.data) setProject(projectData.data)
        if (tasksData.data) setTasks(tasksData.data)
      } catch (error) {
        console.error('Error fetching project:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [projectId])

  const handleAddTask = () => {
    setSelectedTask(null)
    setTaskModalOpen(true)
  }

  const handleEditTask = (task: Task) => {
    setSelectedTask(task)
    setTaskModalOpen(true)
  }

  const handleRefreshTasks = async () => {
    try {
      const { data } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('sequence_number', { ascending: true })

      if (data) setTasks(data)
    } catch (error) {
      console.error('Error refreshing tasks:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">Project not found</p>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-8">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">{project.name}</h1>
            <p className="text-muted-foreground mt-1">{project.description}</p>
          </div>
          <Badge className="h-fit">{project.status}</Badge>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Start Date</p>
            <p className="font-medium">{project.start_date || 'Not set'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">End Date</p>
            <p className="font-medium">{project.end_date || 'Not set'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Budget</p>
            <p className="font-medium">
              {project.expected_budget
                ? `${project.currency} ${project.expected_budget.toLocaleString()}`
                : 'Not set'}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Billing Method</p>
            <p className="font-medium capitalize">{project.billing_method.replace(/_/g, ' ')}</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="list" className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">List View</TabsTrigger>
          <TabsTrigger value="kanban">Kanban Board</TabsTrigger>
          <TabsTrigger value="gantt">Timeline</TabsTrigger>
          <TabsTrigger value="phases">Phases</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Tasks - List View</h2>
            <Button className="gap-2" size="sm" onClick={handleAddTask}>
              <Plus className="h-4 w-4" />
              Add Task
            </Button>
          </div>

          {tasks.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">No tasks yet</p>
              </CardContent>
            </Card>
          ) : (
            <TaskListView
              projectId={projectId}
              tasks={tasks}
              onTaskUpdate={handleRefreshTasks}
              onTaskEdit={handleEditTask}
            />
          )}
        </TabsContent>

        <TabsContent value="kanban" className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Tasks - Kanban Board</h2>
            <Button className="gap-2" size="sm" onClick={handleAddTask}>
              <Plus className="h-4 w-4" />
              Add Task
            </Button>
          </div>

          {tasks.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">No tasks yet</p>
              </CardContent>
            </Card>
          ) : (
            <EnhancedKanbanView
              projectId={projectId}
              tasks={tasks}
              onTaskUpdate={handleRefreshTasks}
              onTaskEdit={handleEditTask}
            />
          )}
        </TabsContent>

        <TabsContent value="gantt" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Tasks - Timeline</h2>
            <Button className="gap-2" size="sm" onClick={handleAddTask}>
              <Plus className="h-4 w-4" />
              Add Task
            </Button>
          </div>

          {tasks.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">No tasks yet</p>
              </CardContent>
            </Card>
          ) : (
            <GanttChart projectId={projectId} tasks={tasks} onTaskUpdate={handleRefreshTasks} />
          )}
        </TabsContent>

        <TabsContent value="phases">
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground">Phase management coming soon</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {userProfile && (
        <TaskFormModal
          open={taskModalOpen}
          task={selectedTask}
          projectId={projectId}
          userId={userProfile.id}
          onClose={() => {
            setTaskModalOpen(false)
            setSelectedTask(null)
          }}
          onSuccess={handleRefreshTasks}
        />
      )}
    </div>
  )
}
