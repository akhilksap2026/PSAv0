'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BarChart3, TrendingUp, Users, Briefcase } from 'lucide-react'

type Project = Database['public']['Tables']['projects']['Row']
type Task = Database['public']['Tables']['tasks']['Row']
type TimeEntry = Database['public']['Tables']['time_entries']['Row']
type User = Database['public']['Tables']['users']['Row']

interface ReportData {
  totalProjects: number
  activeProjects: number
  completedProjects: number
  totalTasks: number
  completedTasks: number
  totalHours: number
  totalUsers: number
  budgetUtilization: number
}

export default function ReportsPage() {
  const { userProfile } = useAuth()
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchReportData = async () => {
      if (!userProfile) return

      try {
        // Fetch all data needed for reports
        const [projectsRes, tasksRes, entriesRes, usersRes] = await Promise.all([
          supabase
            .from('projects')
            .select('*')
            .eq('organization_id', userProfile.organization_id),
          supabase
            .from('tasks')
            .select('*'),
          supabase
            .from('time_entries')
            .select('*'),
          supabase
            .from('users')
            .select('*')
            .eq('organization_id', userProfile.organization_id),
        ])

        const projectsList = projectsRes.data || []
        const tasksList = tasksRes.data || []
        const entriesList = entriesRes.data || []
        const usersList = usersRes.data || []

        const activeCount = projectsList.filter((p) => p.status === 'active').length
        const completedCount = projectsList.filter((p) => p.status === 'completed').length
        const completedTasksCount = tasksList.filter((t) => t.status === 'completed').length
        const totalHours = entriesList.reduce((sum, e) => sum + (e.hours || 0), 0)
        const totalBudget = projectsList.reduce((sum, p) => sum + (p.expected_budget || 0), 0)

        setProjects(projectsList)
        setReportData({
          totalProjects: projectsList.length,
          activeProjects: activeCount,
          completedProjects: completedCount,
          totalTasks: tasksList.length,
          completedTasks: completedTasksCount,
          totalHours,
          totalUsers: usersList.length,
          budgetUtilization: totalBudget > 0 ? (totalHours * (userProfile.hourly_cost || 100)) / totalBudget : 0,
        })
      } catch (error) {
        console.error('Error fetching report data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchReportData()
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
        <h1 className="text-3xl font-bold">Reports & Dashboards</h1>
        <p className="text-muted-foreground mt-1">Project performance, team utilization, and financial insights</p>
      </div>

      {/* Key Metrics */}
      {reportData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Active Projects
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{reportData.activeProjects}</div>
              <p className="text-xs text-muted-foreground mt-1">of {reportData.totalProjects} total</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Tasks Completed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{reportData.completedTasks}</div>
              <p className="text-xs text-muted-foreground mt-1">of {reportData.totalTasks} total</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{reportData.totalHours}</div>
              <p className="text-xs text-muted-foreground mt-1">tracked this period</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Team Members
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{reportData.totalUsers}</div>
              <p className="text-xs text-muted-foreground mt-1">in organization</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="projects" className="space-y-4">
        <TabsList>
          <TabsTrigger value="projects">Project Performance</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="team">Team Utilization</TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Project Status Overview</CardTitle>
              <CardDescription>Summary of all projects by status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {projects.length === 0 ? (
                  <p className="text-muted-foreground">No projects to report</p>
                ) : (
                  projects.slice(0, 10).map((project) => (
                    <div key={project.id} className="flex items-center justify-between border-b pb-3 last:border-b-0">
                      <div className="flex-1">
                        <h3 className="font-medium">{project.name}</h3>
                        <p className="text-sm text-muted-foreground">{project.description}</p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <Badge variant="outline">{project.status}</Badge>
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {project.expected_budget ? `${project.currency} ${project.expected_budget.toLocaleString()}` : 'N/A'}
                          </p>
                          <p className="text-xs text-muted-foreground">{project.billing_method}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financial" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Financial Summary</CardTitle>
              <CardDescription>Budget and revenue tracking</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Total Budget Allocated</p>
                  <p className="text-2xl font-bold">
                    $
                    {projects
                      .reduce((sum, p) => sum + (p.expected_budget || 0), 0)
                      .toLocaleString()}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Budget Utilization</p>
                  <p className="text-2xl font-bold">
                    {reportData?.budgetUtilization.toFixed(1) || 0}%
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Active Billing</p>
                  <p className="text-2xl font-bold">
                    {projects.filter((p) => p.billing_method !== 'non_billable').length}
                  </p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Billing Method Distribution</h4>
                <div className="space-y-2">
                  {['fixed_fee', 'time_and_materials', 'subscription', 'non_billable'].map((method) => {
                    const count = projects.filter((p) => p.billing_method === method).length
                    return (
                      <div key={method} className="flex justify-between">
                        <span className="capitalize text-sm">{method.replace(/_/g, ' ')}</span>
                        <span className="font-medium">{count} projects</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team">
          <Card>
            <CardHeader>
              <CardTitle>Team Utilization</CardTitle>
              <CardDescription>Workforce allocation and capacity analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-muted-foreground">
                <p>Team utilization metrics and analytics coming soon</p>
                <p className="text-xs mt-2">Track individual team member allocation across projects and capacity planning</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
