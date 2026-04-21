'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function NewProjectPage() {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    expected_budget: '',
    billing_method: 'time_and_materials' as const,
    currency: 'USD',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { userProfile } = useAuth()
  const router = useRouter()

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      if (!userProfile) throw new Error('User profile not found')
      if (!formData.name.trim()) throw new Error('Project name is required')

      const { data, error: insertError } = await supabase
        .from('projects')
        .insert([
          {
            organization_id: userProfile.organization_id,
            name: formData.name,
            description: formData.description || null,
            owner_id: userProfile.id,
            status: 'active',
            start_date: formData.start_date || null,
            end_date: formData.end_date || null,
            expected_budget: formData.expected_budget ? parseFloat(formData.expected_budget) : null,
            billing_method: formData.billing_method,
            currency: formData.currency,
          },
        ])
        .select()

      if (insertError) throw insertError

      if (data?.[0]) {
        router.push(`/dashboard/projects/${data[0].id}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/dashboard/projects">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Projects
          </Button>
        </Link>
      </div>

      <div>
        <h1 className="text-3xl font-bold">Create New Project</h1>
        <p className="text-muted-foreground mt-1">Set up a new project to get started</p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Project Details</CardTitle>
          <CardDescription>Provide basic information about your project</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <FieldGroup>
              <FieldLabel htmlFor="name">Project Name *</FieldLabel>
              <Input
                id="name"
                placeholder="Enter project name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                disabled={isLoading}
                required
              />
            </FieldGroup>

            <FieldGroup>
              <FieldLabel htmlFor="description">Description</FieldLabel>
              <textarea
                id="description"
                placeholder="Describe your project"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                disabled={isLoading}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                rows={4}
              />
            </FieldGroup>

            <div className="grid grid-cols-2 gap-4">
              <FieldGroup>
                <FieldLabel htmlFor="start_date">Start Date</FieldLabel>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => handleChange('start_date', e.target.value)}
                  disabled={isLoading}
                />
              </FieldGroup>

              <FieldGroup>
                <FieldLabel htmlFor="end_date">End Date</FieldLabel>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => handleChange('end_date', e.target.value)}
                  disabled={isLoading}
                />
              </FieldGroup>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FieldGroup>
                <FieldLabel htmlFor="budget">Expected Budget</FieldLabel>
                <Input
                  id="budget"
                  type="number"
                  placeholder="0.00"
                  step="0.01"
                  value={formData.expected_budget}
                  onChange={(e) => handleChange('expected_budget', e.target.value)}
                  disabled={isLoading}
                />
              </FieldGroup>

              <FieldGroup>
                <FieldLabel htmlFor="currency">Currency</FieldLabel>
                <Select value={formData.currency} onValueChange={(value) => handleChange('currency', value)}>
                  <SelectTrigger id="currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="INR">INR</SelectItem>
                  </SelectContent>
                </Select>
              </FieldGroup>
            </div>

            <FieldGroup>
              <FieldLabel htmlFor="billing">Billing Method</FieldLabel>
              <Select value={formData.billing_method} onValueChange={(value) => handleChange('billing_method', value)}>
                <SelectTrigger id="billing">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed_fee">Fixed Fee</SelectItem>
                  <SelectItem value="time_and_materials">Time & Materials</SelectItem>
                  <SelectItem value="subscription">Subscription</SelectItem>
                  <SelectItem value="non_billable">Non-Billable</SelectItem>
                </SelectContent>
              </Select>
            </FieldGroup>

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Creating...' : 'Create Project'}
              </Button>
              <Link href="/dashboard/projects">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
