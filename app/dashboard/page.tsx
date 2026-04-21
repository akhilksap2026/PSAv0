'use client'

import { useAuth } from '@/lib/auth-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function DashboardPage() {
  const { userProfile } = useAuth()

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
            <div className="text-3xl font-bold">0</div>
            <p className="text-xs text-muted-foreground mt-1">Coming soon</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">0</div>
            <p className="text-xs text-muted-foreground mt-1">Assigned to you</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Hours Logged</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">0</div>
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
