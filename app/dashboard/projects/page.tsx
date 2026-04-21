'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/lib/auth-context'
import Link from 'next/link'
import { Plus } from 'lucide-react'

type Project = Database['public']['Tables']['projects']['Row']

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { userProfile } = useAuth()

  useEffect(() => {
    const fetchProjects = async () => {
      console.log('[v0] Projects useEffect running, userProfile:', userProfile)
      
      if (!userProfile) {
        console.log('[v0] No userProfile yet, skipping fetch')
        return
      }

      console.log('[v0] Fetching projects for org:', userProfile.organization_id)

      try {
        const response = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ organizationId: userProfile.organization_id })
        })
        
        console.log('[v0] API response status:', response.status)
        const result = await response.json()
        
        console.log('[v0] API response object:', JSON.stringify(result))
        
        if (result.error) {
          console.error('[v0] API error:', result.error)
          setProjects([])
        } else {
          const projectsData = result.data || []
          console.log('[v0] Projects received:', projectsData?.length || 0, projectsData)
          setProjects(projectsData)
        }
      } catch (err) {
        console.error('[v0] Fetch error:', err)
        setProjects([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchProjects()
  }, [userProfile])

  const getStatusColor = (status: Project['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'on_hold':
        return 'bg-yellow-100 text-yellow-800'
      case 'completed':
        return 'bg-blue-100 text-blue-800'
      case 'archived':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-muted-foreground mt-1">Manage your projects and track progress</p>
        </div>
        <Link href="/dashboard/projects/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : projects.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-3">
              <p className="text-muted-foreground">No projects yet</p>
              <Link href="/dashboard/projects/new">
                <Button variant="outline">Create your first project</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <Link key={project.id} href={`/dashboard/projects/${project.id}`}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="truncate">{project.name}</CardTitle>
                      <CardDescription className="line-clamp-2 mt-1">
                        {project.description || 'No description'}
                      </CardDescription>
                    </div>
                    <Badge className={getStatusColor(project.status)}>
                      {project.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Start Date</p>
                      <p className="font-medium">{project.start_date || 'Not set'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">End Date</p>
                      <p className="font-medium">{project.end_date || 'Not set'}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Budget</p>
                    <p className="font-medium">
                      {project.expected_budget
                        ? `${project.currency} ${project.expected_budget.toLocaleString()}`
                        : 'Not set'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Billing Method</p>
                    <p className="font-medium capitalize">{(project.billing_method || 'not_set').replace(/_/g, ' ')}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
