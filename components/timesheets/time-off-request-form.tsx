'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { FieldGroup, FieldLabel } from '@/components/ui/field'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertCircle, Calendar } from 'lucide-react'

interface TimeOffRequest {
  type: 'vacation' | 'sick_leave' | 'personal' | 'bereavement' | 'other'
  startDate: string
  endDate: string
  reason: string
}

export function TimeOffRequestForm({ onSuccess }: { onSuccess?: () => void }) {
  const { userProfile } = useAuth()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<TimeOffRequest>({
    type: 'vacation',
    startDate: '',
    endDate: '',
    reason: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      if (!userProfile) throw new Error('User profile not found')
      if (!formData.startDate || !formData.endDate) throw new Error('Please select start and end dates')

      const startDate = new Date(formData.startDate)
      const endDate = new Date(formData.endDate)

      if (endDate < startDate) {
        throw new Error('End date must be after start date')
      }

      const response = await fetch('/api/time-off/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userProfile.id,
          organizationId: userProfile.organization_id,
          type: formData.type,
          startDate: formData.startDate,
          endDate: formData.endDate,
          reason: formData.reason,
          numberOfDays: Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to submit time-off request')
      }

      alert('Time-off request submitted successfully!')
      setOpen(false)
      setFormData({
        type: 'vacation',
        startDate: '',
        endDate: '',
        reason: '',
      })

      if (onSuccess) onSuccess()
    } catch (err) {
      console.error('[v0] Error submitting time-off request:', err)
      setError(err instanceof Error ? err.message : 'Failed to submit request')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Calendar className="h-4 w-4" />
          Request Time Off
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request Time Off</DialogTitle>
          <DialogDescription>Submit a time-off request for approval</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <FieldGroup>
            <FieldLabel htmlFor="type">Type of Leave *</FieldLabel>
            <Select
              value={formData.type}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, type: value as TimeOffRequest['type'] }))
              }
            >
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vacation">Vacation</SelectItem>
                <SelectItem value="sick_leave">Sick Leave</SelectItem>
                <SelectItem value="personal">Personal</SelectItem>
                <SelectItem value="bereavement">Bereavement</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </FieldGroup>

          <div className="grid grid-cols-2 gap-4">
            <FieldGroup>
              <FieldLabel htmlFor="startDate">Start Date *</FieldLabel>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData((prev) => ({ ...prev, startDate: e.target.value }))}
                disabled={isLoading}
                required
              />
            </FieldGroup>

            <FieldGroup>
              <FieldLabel htmlFor="endDate">End Date *</FieldLabel>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData((prev) => ({ ...prev, endDate: e.target.value }))}
                disabled={isLoading}
                required
              />
            </FieldGroup>
          </div>

          <FieldGroup>
            <FieldLabel htmlFor="reason">Reason</FieldLabel>
            <textarea
              id="reason"
              placeholder="Optional reason for your request"
              value={formData.reason}
              onChange={(e) => setFormData((prev) => ({ ...prev, reason: e.target.value }))}
              disabled={isLoading}
              className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              rows={3}
            />
          </FieldGroup>

          <div className="flex gap-3 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
