'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { FieldGroup, FieldLabel } from '@/components/ui/field'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Plus, Zap } from 'lucide-react'
import Link from 'next/link'
import { format, differenceInDays } from 'date-fns'

type Sprint = Database['public']['Tables']['sprints']['Row']
type Task = Database['public']['Tables']['tasks']['Row']

interface SprintWithTasks extends Sprint {
  tasks: Task[]
}

export default function SprintPlanningPage() {
  const params = useParams()
  const projectId = params.id as string
  const { userProfile } = useAuth()
  const [sprints, setSprints] = useState<SprintWithTasks[]>([])
  const [unscheduledTasks, setUnscheduledTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showNewSprint, setShowNewSprint] = useState(false)
  const [activeSprint, setActiveSprint] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    start_date: '',
    end_date: '',
    goal: '',
  })

  useEffect(() => {
    const fetchSprintsAndTasks = async () => {
      if (!projectId) return

      setIsLoading(true)
      try {
        // Fetch sprints with their tasks
        const { data: sprintsData } = await supabase
          .from('sprints')
          .select('*, tasks(*)')
          .eq('project_id', projectId)
          .order('sprint_number', { ascending: true })

        setSprints(sprintsData as any[] || [])

        // Set active sprint
        const activeSp = (sprintsData as any[])?.find((s) => s.status === 'active')
        if (activeSp) setActiveSprint(activeSp.id)

        // Fetch unscheduled tasks
        const { data: tasksData } = await supabase
          .from('tasks')
          .select('*')
          .eq('project_id', projectId)
          .is('sprint_id', null)
          .order('created_at', { ascending: false })

        setUnscheduledTasks(tasksData || [])
      } catch (error) {
        console.error('[v0] Error fetching sprints:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchSprintsAndTasks()
  }, [projectId])

  const handleCreateSprint = async () => {
    if (!formData.name.trim() || !formData.start_date || !formData.end_date || !projectId) {
      alert('Please fill in all required fields')
      return
    }

    try {
      // Get the next sprint number
      const maxSprintNumber = Math.max(0, ...sprints.map((s) => s.sprint_number || 0))

      const { data } = await supabase
        .from('sprints')
        .insert([
          {
            project_id: projectId,
            name: formData.name,
            start_date: formData.start_date,
            end_date: formData.end_date,
            goal: formData.goal,
            sprint_number: maxSprintNumber + 1,
            status: 'planning',
            created_by: userProfile?.id,
          },
        ])
        .select()

      if (data?.[0]) {
        setSprints([...sprints, { ...data[0], tasks: [] }])
        setFormData({ name: '', start_date: '', end_date: '', goal: '' })
        setShowNewSprint(false)
      }
    } catch (error) {
      console.error('[v0] Error creating sprint:', error)
    }
  }

  const calculateBurndown = (sprint: SprintWithTasks) => {
    const total = sprint.tasks?.reduce((sum, t) => sum + (t.estimated_hours || 0), 0) || 0
    const completed = sprint.tasks?.filter((t) => t.status === 'completed').reduce((sum, t) => sum + (t.estimated_hours || 0), 0) || 0
    const remaining = total - completed

    const days = differenceInDays(new Date(sprint.end_date), new Date(sprint.start_date)) || 1
    const expectedBurndown = total / days

    return { total, completed, remaining, expectedBurndown, days }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning':
        return 'outline'
      case 'active':
        return 'default'
      case 'completed':
        return 'secondary'
      default:
        return 'muted'
    }
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-2">
        <Link href={`/dashboard/projects/${projectId}`}>
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Project
          </Button>
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sprint Planning</h1>
          <p className="text-muted-foreground mt-1">Organize tasks into sprints and track progress with burndown charts</p>
        </div>
        <Button onClick={() => setShowNewSprint(!showNewSprint)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Sprint
        </Button>
      </div>

      {showNewSprint && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Sprint</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FieldGroup>
              <FieldLabel>Sprint Name</FieldLabel>
              <Input
                placeholder="e.g., Sprint 1 - Authentication"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </FieldGroup>

            <div className="grid grid-cols-2 gap-4">
              <FieldGroup>
                <FieldLabel>Start Date</FieldLabel>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </FieldGroup>

              <FieldGroup>
                <FieldLabel>End Date</FieldLabel>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </FieldGroup>
            </div>

            <FieldGroup>
              <FieldLabel>Sprint Goal (Optional)</FieldLabel>
              <textarea
                placeholder="What is the main goal for this sprint?"
                value={formData.goal}
                onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                rows={3}
              />
            </FieldGroup>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowNewSprint(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateSprint}>Create Sprint</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-center py-8">Loading sprints...</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="sprints" className="space-y-4">
          <TabsList>
            <TabsTrigger value="sprints">Sprints ({sprints.length})</TabsTrigger>
            <TabsTrigger value="backlog">Backlog ({unscheduledTasks.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="sprints" className="space-y-4">
            {sprints.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-muted-foreground text-center py-8">No sprints created yet</p>
                </CardContent>
              </Card>
            ) : (
              sprints.map((sprint) => {
                const burndown = calculateBurndown(sprint)
                return (
                  <Card key={sprint.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <CardTitle>{sprint.name}</CardTitle>
                            <Badge variant={getStatusColor(sprint.status)}>{sprint.status}</Badge>
                          </div>
                          <CardDescription className="mt-2">{sprint.goal}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-4 gap-4">
                        <div className="p-3 bg-muted rounded">
                          <p className="text-sm text-muted-foreground">Duration</p>
                          <p className="text-lg font-semibold">{burndown.days} days</p>
                        </div>
                        <div className="p-3 bg-muted rounded">
                          <p className="text-sm text-muted-foreground">Total Hours</p>
                          <p className="text-lg font-semibold">{burndown.total.toFixed(1)}h</p>
                        </div>
                        <div className="p-3 bg-muted rounded">
                          <p className="text-sm text-muted-foreground">Remaining</p>
                          <p className="text-lg font-semibold text-orange-600">{burndown.remaining.toFixed(1)}h</p>
                        </div>
                        <div className="p-3 bg-muted rounded">
                          <p className="text-sm text-muted-foreground">Completion</p>
                          <p className="text-lg font-semibold text-green-600">
                            {burndown.total === 0 ? '0' : ((burndown.completed / burndown.total) * 100).toFixed(0)}%
                          </p>
                        </div>
                      </div>

                      <div>
                        <p className="text-sm font-medium mb-2">
                          Tasks: {sprint.tasks?.filter((t) => t.status === 'completed').length || 0}/{sprint.tasks?.length || 0}
                        </p>
                        <div className="space-y-2">
                          {sprint.tasks?.slice(0, 5).map((task) => (
                            <div key={task.id} className="flex items-center justify-between text-sm p-2 bg-muted rounded">
                              <span className="truncate">{task.title}</span>
                              <Badge variant={task.status === 'completed' ? 'secondary' : 'outline'} className="text-xs">
                                {task.status}
                              </Badge>
                            </div>
                          ))}
                          {(sprint.tasks?.length || 0) > 5 && (
                            <p className="text-sm text-muted-foreground">
                              +{(sprint.tasks?.length || 0) - 5} more tasks
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </TabsContent>

          <TabsContent value="backlog">
            {unscheduledTasks.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-muted-foreground text-center py-8">All tasks are scheduled in sprints</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Unscheduled Tasks ({unscheduledTasks.length})</CardTitle>
                  <CardDescription>Drag tasks to sprints to schedule them</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {unscheduledTasks.map((task) => (
                      <div key={task.id} className="flex items-center justify-between p-3 bg-muted rounded">
                        <div className="flex-1">
                          <p className="font-medium">{task.title}</p>
                          <p className="text-sm text-muted-foreground">{task.estimated_hours} hours</p>
                        </div>
                        <Badge variant="outline">{task.priority}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
