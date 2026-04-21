'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Check, X, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'

type Timesheet = Database['public']['Tables']['timesheets']['Row'] & {
  user: { full_name: string; email: string }
}

export function TimesheetApprovalList() {
  const { userProfile } = useAuth()
  const [timesheets, setTimesheets] = useState<Timesheet[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPendingTimesheets = async () => {
      if (!userProfile) return

      setIsLoading(true)
      setError(null)
      try {
        const { data, error: fetchError } = await supabase
          .from('timesheets')
          .select('*, user:users(full_name, email)')
          .eq('organization_id', userProfile.organization_id)
          .eq('status', 'submitted')
          .order('submitted_at', { ascending: false })

        if (fetchError) throw fetchError
        setTimesheets((data as unknown as Timesheet[]) || [])
      } catch (err) {
        console.error('[v0] Error fetching pending timesheets:', err)
        setError('Failed to load pending timesheets')
      } finally {
        setIsLoading(false)
      }
    }

    fetchPendingTimesheets()
  }, [userProfile])

  const handleApprove = async (timesheetId: string) => {
    setIsProcessing(timesheetId)
    try {
      const response = await fetch('/api/timesheets/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timesheetId,
          action: 'approve',
          approvedBy: userProfile?.id,
        }),
      })

      if (!response.ok) throw new Error('Failed to approve timesheet')

      setTimesheets((prev) => prev.filter((t) => t.id !== timesheetId))
    } catch (err) {
      console.error('[v0] Error approving timesheet:', err)
      setError('Failed to approve timesheet')
    } finally {
      setIsProcessing(null)
    }
  }

  const handleReject = async (timesheetId: string) => {
    setIsProcessing(timesheetId)
    try {
      const response = await fetch('/api/timesheets/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timesheetId,
          action: 'reject',
          rejectedBy: userProfile?.id,
        }),
      })

      if (!response.ok) throw new Error('Failed to reject timesheet')

      setTimesheets((prev) => prev.filter((t) => t.id !== timesheetId))
    } catch (err) {
      console.error('[v0] Error rejecting timesheet:', err)
      setError('Failed to reject timesheet')
    } finally {
      setIsProcessing(null)
    }
  }

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
            <p className="text-center text-muted-foreground py-8">No pending timesheets to approve</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {timesheets.map((timesheet) => (
            <Card key={timesheet.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{timesheet.user.full_name}</h3>
                      <Badge variant="secondary">{timesheet.total_hours}h</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{timesheet.user.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Week of {format(new Date(timesheet.week_starting), 'MMM dd, yyyy')}
                      {timesheet.submitted_at && ` • Submitted ${format(new Date(timesheet.submitted_at), 'MMM dd, h:mm a')}`}
                    </p>
                  </div>

                  <div className="flex gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReject(timesheet.id)}
                      disabled={isProcessing === timesheet.id}
                      className="text-destructive hover:text-destructive"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleApprove(timesheet.id)}
                      disabled={isProcessing === timesheet.id}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Check className="h-4 w-4 mr-1" />
                      {isProcessing === timesheet.id ? 'Processing...' : 'Approve'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
