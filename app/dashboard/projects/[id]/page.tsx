'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { TaskListView } from '@/components/tasks/task-views'
import { RichTextEditor } from '@/components/documents/rich-text-editor'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { AlertDescription, Alert } from '@/components/ui/alert'
import { ArrowLeft, Plus, FileText, Lock, Globe, Trash2 } from 'lucide-react'
import Link from 'next/link'

type Project = Database['public']['Tables']['projects']['Row']
type Phase = Database['public']['Tables']['phases']['Row']
type Task = Database['public']['Tables']['tasks']['Row']

interface DocumentSpace {
  id: string
  name: string
  type: 'private' | 'shared'
  documents: Array<{
    id: string
    title: string
    updated_at: string
  }>
}

export default function ProjectDetailPage() {
  const params = useParams()
  const projectId = params.id as string
  const { userProfile } = useAuth()
  const [project, setProject] = useState<Project | null>(null)
  const [phases, setPhases] = useState<Phase[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [spaces, setSpaces] = useState<DocumentSpace[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeSpace, setActiveSpace] = useState<string | null>(null)
  const [newSpaceName, setNewSpaceName] = useState('')
  const [newSpaceType, setNewSpaceType] = useState<'private' | 'shared'>('private')

  useEffect(() => {
    const fetchProjectData = async () => {
      if (!projectId) return

      setIsLoading(true)
      try {
        // Fetch project
        const { data: projectData } = await supabase
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .single()

        setProject(projectData || null)

        // Fetch phases
        const { data: phasesData } = await supabase
          .from('phases')
          .select('*')
          .eq('project_id', projectId)
          .order('start_date', { ascending: true })

        setPhases(phasesData || [])

        // Fetch tasks
        const { data: tasksData } = await supabase
          .from('tasks')
          .select('*')
          .eq('project_id', projectId)
          .order('due_date', { ascending: true })

        setTasks(tasksData || [])

        // Fetch spaces
        const { data: spacesData } = await supabase
          .from('project_spaces')
          .select('*, space_documents(*)')
          .eq('project_id', projectId)

        setSpaces(spacesData as any[] || [])
      } catch (error) {
        console.error('[v0] Error fetching project:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProjectData()
  }, [projectId])

  const handleCreateSpace = async () => {
    if (!newSpaceName.trim() || !projectId) return

    try {
      const { data } = await supabase
        .from('project_spaces')
        .insert([
          {
            project_id: projectId,
            name: newSpaceName,
            type: newSpaceType,
            created_by: userProfile?.id,
          },
        ])
        .select()

      if (data?.[0]) {
        setSpaces([...spaces, { ...data[0], documents: [] }])
        setNewSpaceName('')
      }
    } catch (error) {
      console.error('[v0] Error creating space:', error)
    }
  }

  if (isLoading) {
    return <div className="p-8 text-center">Loading...</div>
  }

  if (!project) {
    return <div className="p-8 text-center">Project not found</div>
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/dashboard/projects">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Projects
          </Button>
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{project.name}</h1>
          <p className="text-muted-foreground mt-1">{project.description}</p>
        </div>
        <Badge variant="secondary">{project.status}</Badge>
      </div>

      <Tabs defaultValue="tasks" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="spaces">Spaces</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks">
          <TaskListView projectId={projectId} tasks={tasks} />
        </TabsContent>

        <TabsContent value="spaces" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create New Space</CardTitle>
              <CardDescription>Organize project documents and collaboration materials</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Space name (e.g., Design Specs, Requirements)"
                  value={newSpaceName}
                  onChange={(e) => setNewSpaceName(e.target.value)}
                  className="flex-1"
                />
                <select
                  value={newSpaceType}
                  onChange={(e) => setNewSpaceType(e.target.value as 'private' | 'shared')}
                  className="px-3 py-2 border rounded-md text-sm"
                >
                  <option value="private">Private</option>
                  <option value="shared">Shared</option>
                </select>
                <Button onClick={handleCreateSpace} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Space
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {spaces.map((space) => (
              <Card key={space.id}>
                <CardHeader className="flex flex-row items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{space.name}</CardTitle>
                      <Badge variant={space.type === 'private' ? 'secondary' : 'outline'} className="text-xs">
                        {space.type === 'private' ? (
                          <>
                            <Lock className="h-3 w-3 mr-1" />
                            Private
                          </>
                        ) : (
                          <>
                            <Globe className="h-3 w-3 mr-1" />
                            Shared
                          </>
                        )}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {space.documents && space.documents.length > 0 ? (
                    <div className="space-y-2">
                      {space.documents.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between p-2 bg-muted rounded text-sm">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span>{doc.title}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No documents yet</p>
                  )}

                  <Button variant="outline" className="w-full gap-2" size="sm">
                    <Plus className="h-4 w-4" />
                    Add Document
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
