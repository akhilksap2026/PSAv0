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
          <TabsTrigger value="budgetForecast">Budget Forecast</TabsTrigger>
          <TabsTrigger value="skillsUtilization">Skills Matrix</TabsTrigger>
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
              <CardTitle>Team Utilization Report</CardTitle>
              <CardDescription>Workforce allocation and capacity analysis</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Team utilization metrics */}
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Avg Utilization</p>
                    <p className="text-2xl font-bold">75%</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Over-allocated</p>
                    <p className="text-2xl font-bold text-orange-600">2</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Capacity Available</p>
                    <p className="text-2xl font-bold text-blue-600">25%</p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Team Members by Utilization</h4>
                <div className="space-y-3">
                  {[
                    { name: 'Alice Johnson', util: 95, status: 'Over-allocated' },
                    { name: 'Bob Smith', util: 80, status: 'Well-allocated' },
                    { name: 'Carol White', util: 60, status: 'Available capacity' },
                    { name: 'David Brown', util: 70, status: 'Well-allocated' },
                  ].map((member) => (
                    <div key={member.name} className="flex items-center gap-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{member.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 bg-muted rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                member.util > 90
                                  ? 'bg-red-500'
                                  : member.util > 75
                                    ? 'bg-orange-500'
                                    : 'bg-green-500'
                              }`}
                              style={{ width: `${member.util}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-muted-foreground w-8 text-right">{member.util}%</span>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {member.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Export button */}
              <div className="pt-4 border-t">
                <Button variant="outline" className="gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Export Report
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Skills Utilization Report */}
          <Card>
            <CardHeader>
              <CardTitle>Skills Utilization Report</CardTitle>
              <CardDescription>In-demand skills and expertise gaps</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {[
                  { skill: 'React', count: 8, needed: 3, match: 73 },
                  { skill: 'Project Management', count: 5, needed: 4, match: 56 },
                  { skill: 'AWS', count: 3, needed: 5, match: 38 },
                  { skill: 'DevOps', count: 2, needed: 3, match: 67 },
                ].map((item) => (
                  <div key={item.skill} className="border rounded p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-sm">{item.skill}</p>
                      <Badge variant="outline">{item.count} experts</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <p className="text-muted-foreground">Available</p>
                        <p className="font-semibold">{item.count}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Needed</p>
                        <p className="font-semibold">{item.needed}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Capacity Planning */}
          <Card>
            <CardHeader>
              <CardTitle>Capacity Planning (Next 3 Months)</CardTitle>
              <CardDescription>Forecast resource needs and availability</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {['January', 'February', 'March'].map((month) => (
                  <div key={month} className="border rounded p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-sm">{month}</p>
                      <span className="text-xs text-muted-foreground">15 slots available</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-primary"
                        style={{ width: '60%' }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="budgetForecast" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Budget Forecast</CardTitle>
              <CardDescription>Projected spending based on current trends</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Current Quarter</p>
                  <p className="text-2xl font-bold">$45,230</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Forecast Q2</p>
                  <p className="text-2xl font-bold">$52,100</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Annual Budget</p>
                  <p className="text-2xl font-bold">$180,000</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Remaining</p>
                  <p className="text-2xl font-bold text-blue-600">$134,770</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Spending by Project</h4>
                <div className="space-y-3">
                  {[
                    { name: 'Website Redesign', spent: 18000, budget: 25000, progress: 72 },
                    { name: 'Mobile App', spent: 12500, budget: 20000, progress: 63 },
                    { name: 'API Integration', spent: 8200, budget: 15000, progress: 55 },
                    { name: 'Infrastructure', spent: 6530, budget: 10000, progress: 65 },
                  ].map((project) => (
                    <div key={project.name} className="border rounded p-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium text-sm">{project.name}</p>
                        <span className="text-xs text-muted-foreground">
                          ${project.spent.toLocaleString()} / ${project.budget.toLocaleString()}
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            project.progress > 80 ? 'bg-red-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${project.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="skillsUtilization" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Skills & Expertise Report</CardTitle>
              <CardDescription>Team capabilities and expertise matrix</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                {[
                  { skill: 'React / Frontend', experts: 8, intermediate: 3, beginners: 1, demand: 'High' },
                  { skill: 'Node.js / Backend', experts: 5, intermediate: 4, beginners: 2, demand: 'High' },
                  { skill: 'AWS / Cloud', experts: 3, intermediate: 2, beginners: 1, demand: 'Very High' },
                  { skill: 'DevOps / CI-CD', experts: 2, intermediate: 3, beginners: 0, demand: 'Medium' },
                  { skill: 'Database Design', experts: 4, intermediate: 5, beginners: 2, demand: 'High' },
                  { skill: 'Project Management', experts: 3, intermediate: 4, beginners: 3, demand: 'Medium' },
                ].map((item) => (
                  <div key={item.skill} className="border rounded p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="font-medium">{item.skill}</p>
                      <Badge variant={item.demand === 'Very High' ? 'destructive' : 'secondary'}>
                        Demand: {item.demand}
                      </Badge>
                    </div>
                    <div className="flex gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Expert:</span>{' '}
                        <span className="font-semibold text-green-600">{item.experts}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Intermediate:</span>{' '}
                        <span className="font-semibold text-blue-600">{item.intermediate}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Beginner:</span>{' '}
                        <span className="font-semibold text-yellow-600">{item.beginners}</span>
                      </div>
                      <div className="ml-auto">
                        <span className="text-muted-foreground">Total:</span>{' '}
                        <span className="font-semibold">{item.experts + item.intermediate + item.beginners}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t">
                <Button variant="outline" className="gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Export Skills Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
