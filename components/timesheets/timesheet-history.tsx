'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Calendar } from 'lucide-react'
import { format } from 'date-fns'

type Timesheet = Database['public']['Tables']['timesheets']['Row']

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft: { bg: 'bg-gray-100', text: 'text-gray-800' },
  submitted: { bg: 'bg-blue-100', text: 'text-blue-800' },
  approved: { bg: 'bg-green-100', text: 'text-green-800' },
  rejected: { bg: 'bg-red-100', text: 'text-red-800' },
}

export function TimesheetHistory() {
  const { userProfile } = useAuth()
  const [timesheets, setTimesheets] = useState<Timesheet[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchHistoryTimesheets = async () => {
      if (!userProfile) return

      setIsLoading(true)
      setError(null)
      try {
        const { data, error: fetchError } = await supabase
          .from('timesheets')
          .select('*')
          .eq('user_id', userProfile.id)
          .in('status', ['approved', 'rejected'])
          .order('week_starting', { ascending: false })
          .limit(20)

        if (fetchError) throw fetchError
        setTimesheets((data as Timesheet[]) || [])
      } catch (err) {
        console.error('[v0] Error fetching timesheet history:', err)
        setError('Failed to load timesheet history')
      } finally {
        setIsLoading(false)
      }
    }

    fetchHistoryTimesheets()
  }, [userProfile])

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {timesheets.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">No past timesheets found</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {timesheets.map((timesheet) => {
            const colors = STATUS_COLORS[timesheet.status] || STATUS_COLORS.draft
            return (
              <Card key={timesheet.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-medium">Week of {format(new Date(timesheet.week_starting), 'MMM dd, yyyy')}</h3>
                        <Badge variant="outline" className={`${colors.bg} ${colors.text} border-0`}>
                          {timesheet.status.charAt(0).toUpperCase() + timesheet.status.slice(1)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Total Hours: <span className="font-semibold">{timesheet.total_hours}h</span>
                      </p>
                      {timesheet.submitted_at && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Submitted: {format(new Date(timesheet.submitted_at), 'MMM dd, h:mm a')}
                        </p>
                      )}
                      {timesheet.approved_at && (
                        <p className="text-xs text-green-600 mt-1">
                          Approved: {format(new Date(timesheet.approved_at), 'MMM dd, h:mm a')}
                        </p>
                      )}
                      {timesheet.rejected_at && (
                        <p className="text-xs text-red-600 mt-1">
                          Rejected: {format(new Date(timesheet.rejected_at), 'MMM dd, h:mm a')}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
