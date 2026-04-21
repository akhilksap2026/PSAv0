'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Users, Briefcase } from 'lucide-react'

type User = Database['public']['Tables']['users']['Row']
type Project = Database['public']['Tables']['projects']['Row']

interface AllocationSummary {
  user: User
  projectCount: number
  utilization: number
}

export default function ResourcesPage() {
  const { userProfile } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [allocations, setAllocations] = useState<AllocationSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [view, setView] = useState<'people' | 'projects'>('people')

  useEffect(() => {
    const fetchData = async () => {
      if (!userProfile) return

      setIsLoading(true)
      try {
        // Fetch all users in organization
        const { data: usersData } = await supabase
          .from('users')
          .select('*')
          .eq('organization_id', userProfile.organization_id)
          .order('full_name', { ascending: true })

        // Fetch all projects
        const { data: projectsData } = await supabase
          .from('projects')
          .select('*')
          .eq('organization_id', userProfile.organization_id)
          .eq('status', 'active')

        // Fetch project members to calculate allocations
        const { data: membersData } = await supabase
          .from('project_members')
          .select('*')

        if (usersData) {
          setUsers(usersData)

          // Calculate allocations per user
          const allocationMap: Record<string, AllocationSummary> = {}
          usersData.forEach((user) => {
            const projectCount = membersData?.filter((m) => m.user_id === user.id).length || 0
            allocationMap[user.id] = {
              user,
              projectCount,
              utilization: Math.min((projectCount / 3) * 100, 100), // Simplified: 100% = 3 projects
            }
          })

          setAllocations(Object.values(allocationMap))
        }

        if (projectsData) setProjects(projectsData)
      } catch (error) {
        console.error('Error fetching resources:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [userProfile])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Resource Management</h1>
        <p className="text-muted-foreground mt-1">Plan team allocation and track capacity</p>
      </div>

      <Tabs value={view} onValueChange={(v: any) => setView(v)} className="space-y-4">
        <TabsList>
          <TabsTrigger value="people" className="gap-2">
            <Users className="h-4 w-4" />
            People
          </TabsTrigger>
          <TabsTrigger value="projects" className="gap-2">
            <Briefcase className="h-4 w-4" />
            Projects
          </TabsTrigger>
        </TabsList>

        <TabsContent value="people" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Team Capacity</CardTitle>
              <CardDescription>Resource utilization and project allocations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {allocations.length === 0 ? (
                  <p className="text-muted-foreground">No team members found</p>
                ) : (
                  allocations.map((alloc) => (
                    <div key={alloc.user.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">{alloc.user.full_name}</h3>
                          <p className="text-sm text-muted-foreground">{alloc.user.email}</p>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline">
                            {alloc.user.role.replace(/_/g, ' ')}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {alloc.projectCount} active projects
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="text-xs text-muted-foreground mb-1">
                            Utilization: {alloc.utilization.toFixed(0)}%
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${
                                alloc.utilization > 80
                                  ? 'bg-orange-500'
                                  : alloc.utilization > 60
                                    ? 'bg-green-500'
                                    : 'bg-blue-500'
                              }`}
                              style={{ width: `${alloc.utilization}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Skills Matrix</CardTitle>
              <CardDescription>Team member expertise and certifications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-muted-foreground">
                <p>Skills tracking coming soon</p>
                <p className="text-xs mt-2">Define and track team skills, proficiency levels, and certifications</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Projects by Resource</CardTitle>
              <CardDescription>Team allocation across active projects</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {projects.length === 0 ? (
                  <p className="text-muted-foreground">No active projects found</p>
                ) : (
                  projects.map((project) => (
                    <div key={project.id} className="border-l-4 border-primary pl-4 py-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium">{project.name}</h3>
                          <p className="text-sm text-muted-foreground">{project.description}</p>
                        </div>
                        <Badge variant="outline">{project.status}</Badge>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-muted-foreground">Start Date</p>
                          <p className="font-medium">{project.start_date || 'Not set'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">End Date</p>
                          <p className="font-medium">{project.end_date || 'Not set'}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Resource Requests</CardTitle>
              <CardDescription>Pending resource allocation requests</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-muted-foreground">
                <p>Resource request workflow coming soon</p>
                <p className="text-xs mt-2">Submit and manage resource requests across projects</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
