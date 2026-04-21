'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ChevronLeft, ChevronRight, Plus, Check, X, Clock } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { formatISO, subWeeks, addWeeks, startOfWeek, format } from 'date-fns'

type Timesheet = Database['public']['Tables']['timesheets']['Row']
type TimeEntry = Database['public']['Tables']['time_entries']['Row']
type Project = Database['public']['Tables']['projects']['Row']

interface WeekData {
  timesheet: Timesheet | null
  entries: TimeEntry[]
  weekTotal: number
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

type User = Database['public']['Tables']['users']['Row']

interface TimesheetWithUser extends Timesheet {
  user?: User
}

export default function TimesheetsPage() {
  const { userProfile } = useAuth()
  const [currentWeekStart, setCurrentWeekStart] = useState(new Date())
  const [weekData, setWeekData] = useState<WeekData | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState<Record<string, number>>({})
  const [pendingTimesheets, setPendingTimesheets] = useState<TimesheetWithUser[]>([])
  const [historyTimesheets, setHistoryTimesheets] = useState<Timesheet[]>([])
  const [approvalComment, setApprovalComment] = useState('')
  const [processingId, setProcessingId] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      if (!userProfile) return

      setIsLoading(true)
      try {
        const weekStart = startOfWeek(currentWeekStart)
        const weekStartISO = formatISO(weekStart, { representation: 'date' })

        // Fetch or create timesheet
        const { data: timesheetData } = await supabase
          .from('timesheets')
          .select('*')
          .eq('user_id', userProfile.id)
          .eq('week_starting', weekStartISO)
          .single()

        // Fetch time entries for this week
        const { data: entriesData } = await supabase
          .from('time_entries')
          .select('*')
          .eq('user_id', userProfile.id)
          .gte('date', weekStartISO)
          .lt('date', formatISO(addWeeks(weekStart, 1), { representation: 'date' }))

        // Fetch user's projects
        const { data: projectsData } = await supabase
          .from('projects')
          .select('*')
          .eq('organization_id', userProfile.organization_id)

        const entries = entriesData || []
        let weekTotal = 0
        const formDataInit: Record<string, number> = {}

        entries.forEach((entry) => {
          formDataInit[entry.id] = entry.hours
          weekTotal += entry.hours
        })

        setWeekData({
          timesheet: timesheetData || null,
          entries,
          weekTotal,
        })
        setFormData(formDataInit)
        setProjects(projectsData || [])

        // Fetch pending timesheets for approval (admin/PM only)
        if (userProfile.role === 'admin' || userProfile.role === 'project_manager') {
          const { data: pendingData } = await supabase
            .from('timesheets')
            .select('*')
            .eq('organization_id', userProfile.organization_id)
            .eq('status', 'submitted')
            .neq('user_id', userProfile.id)
            .order('submitted_at', { ascending: false })

          if (pendingData) {
            // Fetch user details for each timesheet
            const userIds = [...new Set(pendingData.map(t => t.user_id))]
            const { data: usersData } = await supabase
              .from('users')
              .select('*')
              .in('id', userIds)

            const timesheetsWithUsers = pendingData.map(ts => ({
              ...ts,
              user: usersData?.find(u => u.id === ts.user_id),
            }))
            setPendingTimesheets(timesheetsWithUsers)
          }
        }

        // Fetch user's timesheet history
        const { data: historyData } = await supabase
          .from('timesheets')
          .select('*')
          .eq('user_id', userProfile.id)
          .order('week_starting', { ascending: false })
          .limit(10)

        setHistoryTimesheets(historyData || [])
      } catch (error) {
        console.error('Error fetching timesheet:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [currentWeekStart, userProfile])

  const weekStart = startOfWeek(currentWeekStart)
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart)
    date.setDate(date.getDate() + i)
    return date
  })

  const handleHoursChange = async (projectId: string, dayIndex: number, hours: number) => {
    const date = new Date(weekStart)
    date.setDate(date.getDate() + dayIndex)
    const dateISO = formatISO(date, { representation: 'date' })

    if (!userProfile) return

    const key = `${projectId}-${dayIndex}`
    setFormData((prev) => ({
      ...prev,
      [key]: hours,
    }))

    // Calculate new week total
    if (weekData?.entries) {
      const newFormData = {
        ...formData,
        [key]: hours,
      }
      const newTotal = Object.values(newFormData).reduce((sum, h) => sum + (h || 0), 0)

      setWeekData((prev) => ({
        ...prev!,
        weekTotal: newTotal,
      }))
    }

    // Auto-save to database
    try {
      const existingEntry = weekData?.entries.find(
        e => e.project_id === projectId && e.date === dateISO && e.user_id === userProfile.id
      )

      if (hours === 0 || hours === null) {
        // Delete if 0
        if (existingEntry) {
          await supabase.from('time_entries').delete().eq('id', existingEntry.id)
        }
      } else {
        // Insert or update
        if (existingEntry) {
          await supabase
            .from('time_entries')
            .update({ hours, updated_at: new Date().toISOString() })
            .eq('id', existingEntry.id)
        } else {
          // First get or create timesheet for this week
          const weekStartISO = formatISO(weekStart, { representation: 'date' })
          let timesheetId = weekData?.timesheet?.id

          if (!timesheetId) {
            const { data: newTimesheet } = await supabase
              .from('timesheets')
              .insert([{
                user_id: userProfile.id,
                organization_id: userProfile.organization_id,
                week_starting: weekStartISO,
                status: 'draft',
                total_hours: 0,
              }])
              .select()
              .single()

            timesheetId = newTimesheet?.id
          }

          if (timesheetId) {
            await supabase.from('time_entries').insert([
              {
                timesheet_id: timesheetId,
                user_id: userProfile.id,
                project_id: projectId,
                task_id: null,
                date: dateISO,
                hours,
                is_billable: true,
              },
            ])
          }
        }
      }
    } catch (error) {
      console.error('[v0] Error saving time entry:', error)
    }
  }

  const handlePreviousWeek = () => {
    setCurrentWeekStart((prev) => subWeeks(prev, 1))
  }

  const handleNextWeek = () => {
    setCurrentWeekStart((prev) => addWeeks(prev, 1))
  }

  const handleSubmitTimesheet = async () => {
    if (!userProfile || !weekData) return

    setIsSaving(true)
    try {
      const weekStart = startOfWeek(currentWeekStart)
      const weekStartISO = formatISO(weekStart, { representation: 'date' })

      // Create or update timesheet
      if (!weekData.timesheet) {
        const { data: newTs } = await supabase.from('timesheets').insert([
          {
            user_id: userProfile.id,
            organization_id: userProfile.organization_id,
            week_starting: weekStartISO,
            status: 'submitted',
            total_hours: weekData.weekTotal,
            submitted_at: new Date().toISOString(),
          },
        ]).select().single()

        if (newTs) {
          setWeekData(prev => prev ? { ...prev, timesheet: newTs } : null)
        }
      } else {
        await supabase
          .from('timesheets')
          .update({
            status: 'submitted',
            total_hours: weekData.weekTotal,
            submitted_at: new Date().toISOString(),
          })
          .eq('id', weekData.timesheet.id)

        setWeekData(prev => prev && prev.timesheet ? {
          ...prev,
          timesheet: { ...prev.timesheet, status: 'submitted' }
        } : null)
      }

      alert('Timesheet submitted successfully!')
    } catch (error) {
      console.error('Error submitting timesheet:', error)
      alert('Failed to submit timesheet')
    } finally {
      setIsSaving(false)
    }
  }

  const handleApproveTimesheet = async (timesheetId: string) => {
    setProcessingId(timesheetId)
    try {
      const { error } = await supabase
        .from('timesheets')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
        })
        .eq('id', timesheetId)

      if (error) throw error

      setPendingTimesheets(prev => prev.filter(ts => ts.id !== timesheetId))
      setApprovalComment('')
    } catch (error) {
      console.error('Error approving timesheet:', error)
      alert('Failed to approve timesheet')
    } finally {
      setProcessingId(null)
    }
  }

  const handleRejectTimesheet = async (timesheetId: string) => {
    if (!approvalComment.trim()) {
      alert('Please provide a reason for rejection')
      return
    }

    setProcessingId(timesheetId)
    try {
      const { error } = await supabase
        .from('timesheets')
        .update({
          status: 'rejected',
        })
        .eq('id', timesheetId)

      if (error) throw error

      setPendingTimesheets(prev => prev.filter(ts => ts.id !== timesheetId))
      setApprovalComment('')
    } catch (error) {
      console.error('Error rejecting timesheet:', error)
      alert('Failed to reject timesheet')
    } finally {
      setProcessingId(null)
    }
  }

  const getStatusBadgeColor = (status: Timesheet['status']) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800'
      case 'submitted': return 'bg-blue-100 text-blue-800'
      case 'approved': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

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
        <h1 className="text-3xl font-bold">Time Tracking</h1>
        <p className="text-muted-foreground mt-1">Log your time and manage timesheets</p>
      </div>

      <Tabs defaultValue="timesheet" className="space-y-4">
        <TabsList>
          <TabsTrigger value="timesheet">My Timesheet</TabsTrigger>
          <TabsTrigger value="approvals">Approvals</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="timesheet" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Weekly Timesheet</CardTitle>
                  <CardDescription>
                    {format(weekStart, 'MMM dd')} - {format(addWeeks(weekStart, 1), 'MMM dd, yyyy')}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handlePreviousWeek}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleNextWeek}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {weekData?.timesheet && (
                <Alert>
                  <AlertDescription>
                    Status: <Badge className="ml-2">{weekData.timesheet.status}</Badge>
                  </AlertDescription>
                </Alert>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left font-medium py-2">Project</th>
                      {DAYS_OF_WEEK.map((day, i) => (
                        <th key={day} className="text-center font-medium py-2 px-2">
                          <div>{day}</div>
                          <div className="text-xs text-muted-foreground">
                            {format(weekDates[i], 'M/d')}
                          </div>
                        </th>
                      ))}
                      <th className="text-center font-medium py-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-4 text-center text-muted-foreground">
                          No projects available
                        </td>
                      </tr>
                    ) : (
                      projects.map((project) => {
                        const projectEntries = weekData?.entries.filter(e => e.project_id === project.id) || []
                        const projectTotal = projectEntries.reduce((sum, e) => sum + (e.hours || 0), 0)

                        return (
                          <tr key={project.id} className="border-b hover:bg-muted/50">
                            <td className="font-medium py-3 pr-4">{project.name}</td>
                            {DAYS_OF_WEEK.map((_, i) => {
                              const date = new Date(weekStart)
                              date.setDate(date.getDate() + i)
                              const dateISO = formatISO(date, { representation: 'date' })

                              const entry = projectEntries.find(e => e.date === dateISO)
                              const key = `${project.id}-${i}`
                              const value = formData[key] ?? entry?.hours ?? ''

                              return (
                                <td key={`${project.id}-${i}`} className="text-center py-3 px-2">
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.5"
                                    value={value}
                                    placeholder="0"
                                    onChange={(e) =>
                                      handleHoursChange(project.id, i, parseFloat(e.target.value) || 0)
                                    }
                                    className="w-12 h-8 text-center"
                                  />
                                </td>
                              )
                            })}
                            <td className="text-center font-medium py-3">{projectTotal}h</td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted border-t-2">
                      <td className="font-semibold py-3 pr-4">Weekly Total</td>
                      {DAYS_OF_WEEK.map((_, i) => {
                        const date = new Date(weekStart)
                        date.setDate(date.getDate() + i)
                        const dateISO = formatISO(date, { representation: 'date' })

                        const dayTotal =
                          weekData?.entries
                            .filter(e => e.date === dateISO)
                            .reduce((sum, e) => sum + (e.hours || 0), 0) ?? 0

                        return (
                          <td key={`total-${i}`} className="text-center font-semibold py-3 px-2">
                            {dayTotal}h
                          </td>
                        )
                      })}
                      <td className="text-center font-semibold py-3">{weekData?.weekTotal ?? 0}h</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <Button variant="outline">Save as Draft</Button>
                <Button onClick={handleSubmitTimesheet} disabled={isSaving}>
                  {isSaving ? 'Submitting...' : 'Submit Timesheet'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approvals" className="space-y-4">
          {userProfile?.role !== 'admin' && userProfile?.role !== 'project_manager' ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-muted-foreground text-center">You don&apos;t have permission to approve timesheets</p>
              </CardContent>
            </Card>
          ) : pendingTimesheets.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-2">
                  <Check className="h-12 w-12 mx-auto text-green-500" />
                  <p className="text-muted-foreground">No pending timesheets to approve</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            pendingTimesheets.map(timesheet => (
              <Card key={timesheet.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{timesheet.user?.full_name || 'Unknown User'}</CardTitle>
                      <CardDescription>
                        Week of {timesheet.week_starting} - {timesheet.total_hours}h total
                      </CardDescription>
                    </div>
                    <Badge className={getStatusBadgeColor(timesheet.status)}>
                      {timesheet.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Submitted</p>
                      <p className="font-medium">
                        {timesheet.submitted_at ? format(new Date(timesheet.submitted_at), 'MMM dd, yyyy HH:mm') : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Email</p>
                      <p className="font-medium">{timesheet.user?.email || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Comment (required for rejection)</label>
                    <Textarea
                      placeholder="Add a comment..."
                      value={approvalComment}
                      onChange={(e) => setApprovalComment(e.target.value)}
                      rows={2}
                    />
                  </div>

                  <div className="flex gap-3 justify-end">
                    <Button
                      variant="outline"
                      className="gap-2 text-destructive border-destructive hover:bg-destructive/10"
                      onClick={() => handleRejectTimesheet(timesheet.id)}
                      disabled={processingId === timesheet.id}
                    >
                      <X className="h-4 w-4" />
                      Reject
                    </Button>
                    <Button
                      className="gap-2"
                      onClick={() => handleApproveTimesheet(timesheet.id)}
                      disabled={processingId === timesheet.id}
                    >
                      <Check className="h-4 w-4" />
                      {processingId === timesheet.id ? 'Processing...' : 'Approve'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {historyTimesheets.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-2">
                  <Clock className="h-12 w-12 mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground">No timesheet history yet</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Timesheet History</CardTitle>
                <CardDescription>Your past timesheet submissions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {historyTimesheets.map(ts => (
                    <div key={ts.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Week of {ts.week_starting}</p>
                        <p className="text-sm text-muted-foreground">{ts.total_hours}h logged</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={getStatusBadgeColor(ts.status)}>
                          {ts.status}
                        </Badge>
                        {ts.approved_at && (
                          <span className="text-xs text-muted-foreground">
                            Approved {format(new Date(ts.approved_at), 'MMM dd')}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
