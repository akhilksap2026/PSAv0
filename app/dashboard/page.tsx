'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function DashboardPage() {
  const { userProfile } = useAuth()
  const [stats, setStats] = useState({
    activeProjects: 0,
    activeTasks: 0,
    hoursLogged: 0,
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      if (!userProfile) return

      try {
        // Fetch active projects count
        const { count: projectCount } = await supabase
          .from('projects')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', userProfile.organization_id)
          .eq('status', 'active')

        // Fetch tasks assigned to user
        const { count: taskCount } = await supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .eq('assigned_to', userProfile.id)
          .in('status', ['not_started', 'in_progress'])

        // Fetch hours logged this week
        const startOfWeek = new Date()
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
        startOfWeek.setHours(0, 0, 0, 0)

        const { data: timeEntries } = await supabase
          .from('time_entries')
          .select('hours')
          .eq('user_id', userProfile.id)
          .gte('date', startOfWeek.toISOString().split('T')[0])

        const totalHours = timeEntries?.reduce((sum, entry) => sum + (entry.hours || 0), 0) || 0

        setStats({
          activeProjects: projectCount || 0,
          activeTasks: taskCount || 0,
          hoursLogged: totalHours,
        })
      } catch (error) {
        console.error('[v0] Error fetching dashboard stats:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [userProfile])

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Welcome back, {userProfile?.full_name}!</h1>
        <p className="text-muted-foreground mt-2">Here&apos;s an overview of your projects and tasks.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{isLoading ? '-' : stats.activeProjects}</div>
            <p className="text-xs text-muted-foreground mt-1">In your organization</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{isLoading ? '-' : stats.activeTasks}</div>
            <p className="text-xs text-muted-foreground mt-1">Assigned to you</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Hours Logged</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{isLoading ? '-' : stats.hoursLogged}</div>
            <p className="text-xs text-muted-foreground mt-1">This week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Your Role</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className="mt-2" variant="outline">
              {userProfile?.role}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>Quick actions to get started with PSA RocketLine</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm">
              <p className="font-medium mb-1">📋 Project Management</p>
              <p className="text-muted-foreground text-xs">Create projects, organize tasks by phases, and track progress with multiple views</p>
            </div>
            <div className="text-sm">
              <p className="font-medium mb-1">⏱️ Time Tracking</p>
              <p className="text-muted-foreground text-xs">Log time entries, submit timesheets, and track billable hours</p>
            </div>
            <div className="text-sm">
              <p className="font-medium mb-1">👥 Resource Management</p>
              <p className="text-muted-foreground text-xs">Plan team allocation and manage resource capacity across projects</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your Profile</CardTitle>
            <CardDescription>Account information and settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{userProfile?.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Full Name</p>
              <p className="font-medium">{userProfile?.full_name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">User Role</p>
              <p className="font-medium capitalize">{userProfile?.role.replace(/_/g, ' ')}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
