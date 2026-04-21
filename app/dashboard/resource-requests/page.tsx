'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FieldGroup, FieldLabel } from '@/components/ui/field'
import { ArrowLeft, Plus, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'

type ResourceRequest = Database['public']['Tables']['resource_requests']['Row']

export default function ResourceRequestsPage() {
  const { userProfile } = useAuth()
  const [requests, setRequests] = useState<ResourceRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showNewRequest, setShowNewRequest] = useState(false)
  const [formData, setFormData] = useState({
    skill_name: '',
    quantity: 1,
    start_date: '',
    end_date: '',
    priority: 'medium',
    project_id: '',
  })

  useEffect(() => {
    const fetchRequests = async () => {
      if (!userProfile) return

      setIsLoading(true)
      try {
        const { data } = await supabase
          .from('resource_requests')
          .select('*, projects(name)')
          .eq('organization_id', userProfile.organization_id)
          .order('created_at', { ascending: false })

        setRequests(data || [])
      } catch (error) {
        console.error('[v0] Error fetching requests:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchRequests()
  }, [userProfile])

  const handleSubmit = async () => {
    if (!userProfile || !formData.skill_name.trim() || !formData.start_date || !formData.end_date) {
      alert('Please fill in all required fields')
      return
    }

    try {
      const { data } = await supabase
        .from('resource_requests')
        .insert([
          {
            project_id: formData.project_id || null,
            requested_by: userProfile.id,
            skill_name: formData.skill_name,
            quantity: formData.quantity,
            start_date: formData.start_date,
            end_date: formData.end_date,
            priority: formData.priority,
            status: 'pending',
          },
        ])
        .select()

      if (data?.[0]) {
        setRequests([data[0], ...requests])
        setFormData({
          skill_name: '',
          quantity: 1,
          start_date: '',
          end_date: '',
          priority: 'medium',
          project_id: '',
        })
        setShowNewRequest(false)
      }
    } catch (error) {
      console.error('[v0] Error creating request:', error)
    }
  }

  const pendingRequests = requests.filter((r) => r.status === 'pending')
  const fulfilledRequests = requests.filter((r) => r.status === 'fulfilled')
  const allocatedRequests = requests.filter((r) => r.status === 'partially_allocated')

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-900'
      case 'high':
        return 'bg-orange-100 text-orange-900'
      case 'medium':
        return 'bg-blue-100 text-blue-900'
      default:
        return 'bg-gray-100 text-gray-900'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'default'
      case 'partially_allocated':
        return 'secondary'
      case 'fulfilled':
        return 'outline'
      default:
        return 'muted'
    }
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/dashboard/resources">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Resources
          </Button>
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Resource Requests</h1>
          <p className="text-muted-foreground mt-1">Request team members with specific skills for your projects</p>
        </div>
        <Button onClick={() => setShowNewRequest(!showNewRequest)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Request
        </Button>
      </div>

      {showNewRequest && (
        <Card>
          <CardHeader>
            <CardTitle>Create Resource Request</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FieldGroup>
              <FieldLabel>Required Skill</FieldLabel>
              <Input
                placeholder="e.g., React Developer, DevOps Engineer"
                value={formData.skill_name}
                onChange={(e) => setFormData({ ...formData, skill_name: e.target.value })}
              />
            </FieldGroup>

            <div className="grid grid-cols-3 gap-4">
              <FieldGroup>
                <FieldLabel>Quantity</FieldLabel>
                <Input
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                />
              </FieldGroup>

              <FieldGroup>
                <FieldLabel>Start Date</FieldLabel>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </FieldGroup>

              <FieldGroup>
                <FieldLabel>End Date</FieldLabel>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </FieldGroup>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FieldGroup>
                <FieldLabel>Priority</FieldLabel>
                <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </FieldGroup>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowNewRequest(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit}>Submit Request</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">Pending ({pendingRequests.length})</TabsTrigger>
          <TabsTrigger value="allocated">Allocated ({allocatedRequests.length})</TabsTrigger>
          <TabsTrigger value="fulfilled">Fulfilled ({fulfilledRequests.length})</TabsTrigger>
        </TabsList>

        {['pending', 'allocated', 'fulfilled'].map((status) => {
          const statusRequests =
            status === 'pending'
              ? pendingRequests
              : status === 'allocated'
                ? allocatedRequests
                : fulfilledRequests

          return (
            <TabsContent key={status} value={status} className="space-y-4">
              {statusRequests.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-muted-foreground text-center py-8">No {status} requests</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {statusRequests.map((request) => (
                    <Card key={request.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-lg">{request.skill_name}</h3>
                              <Badge className={getPriorityColor(request.priority)} variant="secondary">
                                {request.priority}
                              </Badge>
                              <Badge variant={getStatusColor(request.status)}>{request.status}</Badge>
                            </div>

                            <div className="grid grid-cols-4 gap-4 text-sm text-muted-foreground mt-3">
                              <div>
                                <p className="text-xs font-medium">Quantity</p>
                                <p>{request.quantity} people</p>
                              </div>
                              <div>
                                <p className="text-xs font-medium">Start Date</p>
                                <p>{format(new Date(request.start_date), 'MMM dd, yyyy')}</p>
                              </div>
                              <div>
                                <p className="text-xs font-medium">End Date</p>
                                <p>{format(new Date(request.end_date), 'MMM dd, yyyy')}</p>
                              </div>
                              <div>
                                <p className="text-xs font-medium">Duration</p>
                                <p>{Math.ceil((new Date(request.end_date).getTime() - new Date(request.start_date).getTime()) / (1000 * 60 * 60 * 24))} days</p>
                              </div>
                            </div>
                          </div>

                          {status === 'pending' && (
                            <Button variant="outline" size="sm">
                              Review
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          )
        })}
      </Tabs>
    </div>
  )
}
