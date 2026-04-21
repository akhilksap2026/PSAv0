'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { TimesheetApprovalList } from '@/components/timesheets/timesheet-approval-list'
import { TimesheetHistory } from '@/components/timesheets/timesheet-history'
import { TimeOffRequestForm } from '@/components/timesheets/time-off-request-form'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
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

export default function TimesheetsPage() {
  const { userProfile } = useAuth()
  const [currentWeekStart, setCurrentWeekStart] = useState(new Date())
  const [weekData, setWeekData] = useState<WeekData | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState<Record<string, number>>({})

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
          await supabase.from('time_entries').insert([
            {
              user_id: userProfile.id,
              project_id: projectId,
              task_id: null,
              date: dateISO,
              hours,
              is_billable: true,
              description: '',
            },
          ])
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
        await supabase.from('timesheets').insert([
          {
            user_id: userProfile.id,
            organization_id: userProfile.organization_id,
            week_starting: weekStartISO,
            status: 'submitted',
            total_hours: weekData.weekTotal,
            submitted_at: new Date().toISOString(),
          },
        ])
      } else {
        await supabase
          .from('timesheets')
          .update({
            status: 'submitted',
            total_hours: weekData.weekTotal,
            submitted_at: new Date().toISOString(),
          })
          .eq('id', weekData.timesheet.id)
      }

      alert('Timesheet submitted successfully!')
    } catch (error) {
      console.error('Error submitting timesheet:', error)
      alert('Failed to submit timesheet')
    } finally {
      setIsSaving(false)
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

              <div className="flex gap-3 justify-between pt-4">
                <TimeOffRequestForm />
                <div className="flex gap-3">
                  <Button variant="outline">Save as Draft</Button>
                  <Button onClick={handleSubmitTimesheet} disabled={isSaving}>
                    {isSaving ? 'Submitting...' : 'Submit Timesheet'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approvals">
          {userProfile?.role === 'admin' || userProfile?.role === 'manager' ? (
            <TimesheetApprovalList />
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-muted-foreground text-center py-8">Only managers can approve timesheets</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history">
          <TimesheetHistory />
        </TabsContent>
      </Tabs>
    </div>
  )
}
