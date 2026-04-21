'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, CheckCircle, Clock } from 'lucide-react'

type Notification = Database['public']['Tables']['notifications']['Row']

interface ApprovalItem {
  id: string
  type: 'timesheet' | 'invoice' | 'time_off'
  title: string
  description: string
  status: 'pending' | 'approved' | 'rejected'
  submittedBy: string
  submittedDate: string
  amount?: number
}

export default function ApprovalsPage() {
  const { userProfile } = useAuth()
  const [approvals, setApprovals] = useState<ApprovalItem[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchApprovals()
  }, [userProfile])

  const fetchApprovals = async () => {
    if (!userProfile) return

    setIsLoading(true)
    setError(null)

    try {
      // Fetch pending timesheets
      const { data: timesheetData } = await supabase
        .from('timesheets')
        .select('*, user:users(full_name)')
        .eq('organization_id', userProfile.organization_id)
        .eq('status', 'submitted')

      // Fetch pending invoices
      const { data: invoiceData } = await supabase
        .from('invoices')
        .select('*, project:projects(name)')
        .eq('organization_id', userProfile.organization_id)
        .in('status', ['draft', 'sent'])

      // Fetch pending time-off requests
      const { data: timeOffData } = await supabase
        .from('time_off_requests')
        .select('*, user:users(full_name)')
        .eq('organization_id', userProfile.organization_id)
        .eq('status', 'pending')

      // Fetch notifications
      const { data: notificationData } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userProfile.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false })

      const approvalItems: ApprovalItem[] = []

      // Add timesheets
      timesheetData?.forEach((ts: any) => {
        approvalItems.push({
          id: ts.id,
          type: 'timesheet',
          title: `Timesheet - ${ts.user.full_name}`,
          description: `Week of ${ts.week_starting} (${ts.total_hours}h)`,
          status: 'pending',
          submittedBy: ts.user.full_name,
          submittedDate: ts.submitted_at,
        })
      })

      // Add invoices
      invoiceData?.forEach((inv: any) => {
        approvalItems.push({
          id: inv.id,
          type: 'invoice',
          title: `Invoice - ${inv.project.name}`,
          description: inv.invoice_number,
          status: inv.status as any,
          submittedBy: 'System',
          submittedDate: inv.created_at,
          amount: inv.amount,
        })
      })

      // Add time-off requests
      timeOffData?.forEach((toff: any) => {
        approvalItems.push({
          id: toff.id,
          type: 'time_off',
          title: `Time-Off - ${toff.user.full_name}`,
          description: `${toff.type.replace(/_/g, ' ')} (${toff.number_of_days} days)`,
          status: 'pending',
          submittedBy: toff.user.full_name,
          submittedDate: toff.created_at,
        })
      })

      setApprovals(approvalItems)
      setNotifications(notificationData || [])
    } catch (err) {
      console.error('[v0] Error fetching approvals:', err)
      setError('Failed to load approvals')
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-blue-500" />
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'rejected':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return null
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge>Pending</Badge>
      case 'approved':
        return <Badge variant="default" className="bg-green-600">Approved</Badge>
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>
      default:
        return null
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  const pendingApprovals = approvals.filter((a) => a.status === 'pending')
  const approvedApprovals = approvals.filter((a) => a.status === 'approved')
  const rejectedApprovals = approvals.filter((a) => a.status === 'rejected')

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Approvals Dashboard</h1>
        <p className="text-muted-foreground mt-1">Manage timesheets, invoices, and time-off requests</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-1">Pending Approval</p>
            <p className="text-3xl font-bold text-blue-600">{pendingApprovals.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-1">Approved</p>
            <p className="text-3xl font-bold text-green-600">{approvedApprovals.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-1">Rejected</p>
            <p className="text-3xl font-bold text-red-600">{rejectedApprovals.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-1">Notifications</p>
            <p className="text-3xl font-bold">{notifications.length}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">Pending ({pendingApprovals.length})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({approvedApprovals.length})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({rejectedApprovals.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pendingApprovals.length === 0 ? (
            <Card>
              <CardContent className="pt-12 pb-12 text-center">
                <p className="text-muted-foreground">No pending approvals</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {pendingApprovals.map((approval) => (
                <Card key={approval.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 flex items-start gap-3">
                        {getStatusIcon(approval.status)}
                        <div>
                          <h3 className="font-semibold">{approval.title}</h3>
                          <p className="text-sm text-muted-foreground">{approval.description}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Submitted by: {approval.submittedBy}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        {approval.amount && (
                          <p className="font-semibold text-lg mb-2">${approval.amount.toFixed(2)}</p>
                        )}
                        {getStatusBadge(approval.status)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="approved" className="space-y-4">
          {approvedApprovals.length === 0 ? (
            <Card>
              <CardContent className="pt-12 pb-12 text-center">
                <p className="text-muted-foreground">No approved items</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {approvedApprovals.map((approval) => (
                <Card key={approval.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 flex items-start gap-3">
                        {getStatusIcon(approval.status)}
                        <div>
                          <h3 className="font-semibold">{approval.title}</h3>
                          <p className="text-sm text-muted-foreground">{approval.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        {getStatusBadge(approval.status)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="rejected" className="space-y-4">
          {rejectedApprovals.length === 0 ? (
            <Card>
              <CardContent className="pt-12 pb-12 text-center">
                <p className="text-muted-foreground">No rejected items</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {rejectedApprovals.map((approval) => (
                <Card key={approval.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 flex items-start gap-3">
                        {getStatusIcon(approval.status)}
                        <div>
                          <h3 className="font-semibold">{approval.title}</h3>
                          <p className="text-sm text-muted-foreground">{approval.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        {getStatusBadge(approval.status)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
