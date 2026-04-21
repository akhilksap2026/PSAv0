'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { FieldGroup, FieldLabel } from '@/components/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Plus, Calendar, DollarSign } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'

type BillingSchedule = Database['public']['Tables']['billing_schedules']['Row']
type BillingScheduleItem = Database['public']['Tables']['billing_schedule_items']['Row']

export default function BillingSchedulesPage() {
  const params = useParams()
  const projectId = params.id as string
  const { userProfile } = useAuth()
  const [schedules, setSchedules] = useState<BillingSchedule[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showNewSchedule, setShowNewSchedule] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    billing_method: 'milestone',
  })

  useEffect(() => {
    const fetchSchedules = async () => {
      if (!projectId) return

      setIsLoading(true)
      try {
        const { data } = await supabase
          .from('billing_schedules')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false })

        setSchedules(data || [])
      } catch (error) {
        console.error('[v0] Error fetching schedules:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchSchedules()
  }, [projectId])

  const handleCreateSchedule = async () => {
    if (!formData.name.trim() || !projectId) {
      alert('Please fill in all required fields')
      return
    }

    try {
      const { data } = await supabase
        .from('billing_schedules')
        .insert([
          {
            project_id: projectId,
            name: formData.name,
            billing_method: formData.billing_method,
            created_by: userProfile?.id,
            is_active: true,
          },
        ])
        .select()

      if (data?.[0]) {
        setSchedules([data[0], ...schedules])
        setFormData({ name: '', billing_method: 'milestone' })
        setShowNewSchedule(false)
      }
    } catch (error) {
      console.error('[v0] Error creating schedule:', error)
    }
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-2">
        <Link href={`/dashboard/projects/${projectId}`}>
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Project
          </Button>
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Billing Schedules</h1>
          <p className="text-muted-foreground mt-1">Define milestone-based billing and auto-invoice generation</p>
        </div>
        <Button onClick={() => setShowNewSchedule(!showNewSchedule)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Schedule
        </Button>
      </div>

      {showNewSchedule && (
        <Card>
          <CardHeader>
            <CardTitle>Create Billing Schedule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FieldGroup>
              <FieldLabel>Schedule Name</FieldLabel>
              <Input
                placeholder="e.g., Standard 3-Phase Billing"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </FieldGroup>

            <FieldGroup>
              <FieldLabel>Billing Method</FieldLabel>
              <Select value={formData.billing_method} onValueChange={(value) => setFormData({ ...formData, billing_method: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="milestone">Milestone-Based</SelectItem>
                  <SelectItem value="date">Date-Based</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </FieldGroup>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowNewSchedule(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateSchedule}>Create Schedule</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-center py-8">Loading schedules...</p>
          </CardContent>
        </Card>
      ) : schedules.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-center py-8">No billing schedules created yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {schedules.map((schedule) => (
            <Card key={schedule.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{schedule.name}</CardTitle>
                    <CardDescription className="mt-1">{schedule.billing_method}</CardDescription>
                  </div>
                  <Badge variant={schedule.is_active ? 'default' : 'secondary'}>
                    {schedule.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 bg-muted rounded text-sm space-y-2">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <p>Milestone-based invoicing configured</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <p>Auto-triggers on phase completion</p>
                  </div>
                </div>

                <Button variant="outline" className="w-full" size="sm">
                  Configure Milestones
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
