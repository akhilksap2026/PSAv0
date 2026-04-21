'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, TrendingUp } from 'lucide-react'
import { format } from 'date-fns'

type RevenueRecognition = Database['public']['Tables']['revenue_recognitions']['Row'] & {
  project?: { name: string }
  invoice?: { invoice_number: string; amount: number }
}

const METHOD_DESCRIPTIONS: Record<string, string> = {
  milestone: 'Revenue recognized at project milestones',
  time_based: 'Revenue recognized over project duration',
  hybrid: 'Combination of milestone and time-based',
  subscription: 'Monthly recurring revenue',
}

export default function RevenueRecognitionPage() {
  const { userProfile } = useAuth()
  const [revenues, setRevenues] = useState<RevenueRecognition[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchRevenues()
  }, [userProfile])

  const fetchRevenues = async () => {
    if (!userProfile) return

    setIsLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await supabase
        .from('revenue_recognitions')
        .select('*, project:projects(name), invoice:invoices(invoice_number, amount)')
        .eq('organization_id', userProfile.organization_id)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      setRevenues((data as RevenueRecognition[]) || [])
    } catch (err) {
      console.error('[v0] Error fetching revenues:', err)
      setError('Failed to load revenue data')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  const totalRevenue = revenues.reduce((sum, r) => sum + (r.amount_recognized || 0), 0)
  const pendingRevenue = revenues
    .filter((r) => r.status === 'pending')
    .reduce((sum, r) => sum + (r.amount_pending || 0), 0)
  const recognizedRevenue = revenues
    .filter((r) => r.status === 'recognized')
    .reduce((sum, r) => sum + (r.amount_recognized || 0), 0)

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Revenue Recognition</h1>
        <p className="text-muted-foreground mt-1">Track and manage revenue recognition policies</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-1">Total Revenue</p>
            <p className="text-2xl font-bold">${totalRevenue.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-1">Recognized</p>
            <p className="text-2xl font-bold text-green-600">${recognizedRevenue.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-1">Pending</p>
            <p className="text-2xl font-bold text-blue-600">${pendingRevenue.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-1">Recognition Rate</p>
            <p className="text-2xl font-bold">
              {totalRevenue > 0 ? ((recognizedRevenue / totalRevenue) * 100).toFixed(1) : '0'}%
            </p>
          </CardContent>
        </Card>
      </div>

      {revenues.length === 0 ? (
        <Card>
          <CardContent className="pt-12 pb-12">
            <div className="text-center">
              <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">No revenue recognition records yet</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {revenues.map((revenue) => (
            <Card key={revenue.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold">{revenue.project?.name}</h3>
                      <Badge variant={revenue.status === 'recognized' ? 'default' : 'secondary'}>
                        {revenue.status}
                      </Badge>
                    </div>

                    {revenue.invoice && (
                      <p className="text-sm text-muted-foreground mb-2">
                        Invoice: {revenue.invoice.invoice_number} (${revenue.invoice.amount.toFixed(2)})
                      </p>
                    )}

                    <p className="text-sm text-muted-foreground mb-3">
                      Method: {METHOD_DESCRIPTIONS[revenue.recognition_method] || revenue.recognition_method}
                    </p>

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Amount Recognized</p>
                        <p className="font-semibold text-green-600">${revenue.amount_recognized.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Amount Pending</p>
                        <p className="font-semibold text-blue-600">${revenue.amount_pending.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Recognition Date</p>
                        <p className="font-semibold">
                          {revenue.recognition_date
                            ? format(new Date(revenue.recognition_date), 'MMM dd, yyyy')
                            : 'Pending'}
                        </p>
                      </div>
                    </div>

                    {revenue.notes && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs text-muted-foreground">{revenue.notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div className="w-32">
                    <div className="text-xs text-muted-foreground text-right mb-1">
                      {((revenue.amount_recognized / (revenue.amount_recognized + revenue.amount_pending)) * 100).toFixed(0)}%
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-green-500"
                        style={{
                          width: `${(revenue.amount_recognized / (revenue.amount_recognized + revenue.amount_pending)) * 100}%`,
                        }}
                      ></div>
                    </div>
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
