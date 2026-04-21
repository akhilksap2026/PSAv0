'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import type { Database } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { FieldGroup, FieldLabel } from '@/components/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { ArrowLeft, Check } from 'lucide-react'
import Link from 'next/link'

type User = Database['public']['Tables']['users']['Row']

const STEPS = [
  { id: 1, label: 'Basics', description: 'Project name & description' },
  { id: 2, label: 'Timeline', description: 'Dates & milestones' },
  { id: 3, label: 'Billing', description: 'Budget & billing method' },
  { id: 4, label: 'Team', description: 'Add team members' },
] as const

export default function NewProjectPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    expected_budget: '',
    billing_method: 'time_and_materials' as const,
    currency: 'USD',
  })
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [teamMembers, setTeamMembers] = useState<User[]>([])
  const [templates, setTemplates] = useState<any[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { userProfile } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!userProfile) return
    
    const fetchData = async () => {
      try {
        // Fetch team members
        const { data: membersData } = await supabase
          .from('users')
          .select('*')
          .eq('organization_id', userProfile.organization_id)
          .neq('id', userProfile.id)
          .order('full_name', { ascending: true })
        
        setTeamMembers(membersData || [])

        // Fetch templates
        const { data: templatesData } = await supabase
          .from('project_templates')
          .select('*')
          .eq('organization_id', userProfile.organization_id)
          .eq('is_active', true)
          .order('created_at', { ascending: false })

        setTemplates(templatesData || [])
      } catch (err) {
        console.error('Error fetching data:', err)
      }
    }
    
    fetchData()
  }, [userProfile])

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const toggleMember = (memberId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    )
  }

  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 1:
        return formData.name.trim().length > 0
      case 2:
        return true
      case 3:
        return true
      case 4:
        return true
      default:
        return false
    }
  }

  const handleNext = () => {
    if (isStepValid(currentStep) && currentStep < 4) {
      setCurrentStep(currentStep + 1)
      setError(null)
    }
  }

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
      setError(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      if (!userProfile) throw new Error('User profile not found')
      if (!formData.name.trim()) throw new Error('Project name is required')

      // Create project
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
      if (!data?.[0]) throw new Error('Failed to create project')

      const projectId = data[0].id

      // Apply template if selected
      if (selectedTemplate) {
        try {
          await fetch('/api/templates/apply', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              templateId: selectedTemplate,
              projectId,
              templateDates: {
                startDate: formData.start_date,
              },
            }),
          })
        } catch (err) {
          console.error('Error applying template:', err)
          // Don't fail project creation if template apply fails
        }
      }

      // Add team members if selected
      if (selectedMembers.length > 0) {
        const projectMembers = [
          { user_id: userProfile.id, project_id: projectId, role: 'owner' },
          ...selectedMembers.map((memberId) => ({
            user_id: memberId,
            project_id: projectId,
            role: 'team_member',
          })),
        ]

        const { error: membersError } = await supabase
          .from('project_members')
          .insert(projectMembers)

        if (membersError) {
          console.error('Error adding team members:', membersError)
          // Don't fail the project creation if team members fail
        }
      } else {
        // Add project owner at minimum
        await supabase
          .from('project_members')
          .insert({
            user_id: userProfile.id,
            project_id: projectId,
            role: 'owner',
          })
      }

      router.push(`/dashboard/projects/${projectId}`)
    } catch (err) {
      console.error('[v0] Create project error:', err)
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
        <p className="text-muted-foreground mt-1">Follow the steps below to create your project</p>
      </div>

      {/* Progress Steps */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            {STEPS.map((step, idx) => (
              <div key={step.id} className="flex flex-col items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold mb-2 ${
                    currentStep > step.id
                      ? 'bg-green-500 text-white'
                      : currentStep === step.id
                        ? 'bg-primary text-white'
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {currentStep > step.id ? <Check className="h-5 w-5" /> : step.id}
                </div>
                <p className="text-sm font-medium text-center">{step.label}</p>
                <p className="text-xs text-muted-foreground text-center">{step.description}</p>
                {idx < STEPS.length - 1 && (
                  <div
                    className={`absolute w-20 h-1 mt-5 ml-10 ${
                      currentStep > step.id ? 'bg-green-500' : 'bg-muted'
                    }`}
                    style={{
                      width: 'calc(100vw / 5)',
                      left: 'calc(50% + 20px)',
                    }}
                  ></div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Form Steps */}
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>{STEPS.find((s) => s.id === currentStep)?.label}</CardTitle>
          <CardDescription>{STEPS.find((s) => s.id === currentStep)?.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Step 1: Basics */}
            {currentStep === 1 && (
              <div className="space-y-6">
                {templates.length > 0 && (
                  <FieldGroup>
                    <FieldLabel htmlFor="template">Start from Template (Optional)</FieldLabel>
                    <Select value={selectedTemplate || ''} onValueChange={setSelectedTemplate}>
                      <SelectTrigger id="template">
                        <SelectValue placeholder="Select a template or start from scratch" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Blank Project</SelectItem>
                        {templates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FieldGroup>
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
              </div>
            )}

            {/* Step 2: Timeline */}
            {currentStep === 2 && (
              <div className="space-y-6">
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

                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Tip: Set realistic timelines for your project. You can always adjust these later.
                  </p>
                </div>
              </div>
            )}

            {/* Step 3: Billing */}
            {currentStep === 3 && (
              <div className="space-y-6">
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
              </div>
            )}

            {/* Step 4: Team */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div>
                  <p className="text-sm font-medium mb-4">Select team members to add to this project</p>
                  {teamMembers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No other team members available</p>
                  ) : (
                    <div className="space-y-3">
                      {teamMembers.map((member) => (
                        <div key={member.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50">
                          <Checkbox
                            id={member.id}
                            checked={selectedMembers.includes(member.id)}
                            onCheckedChange={() => toggleMember(member.id)}
                          />
                          <div className="flex-1 min-w-0">
                            <label htmlFor={member.id} className="font-medium text-sm cursor-pointer">
                              {member.full_name}
                            </label>
                            <p className="text-xs text-muted-foreground">{member.email}</p>
                          </div>
                          <span className="text-xs bg-muted px-2 py-1 rounded capitalize">
                            {member.role.replace(/_/g, ' ')}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    You can add or remove team members after creating the project.
                  </p>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex gap-3 pt-4 justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={handlePrev}
                disabled={currentStep === 1 || isLoading}
              >
                Previous
              </Button>

              {currentStep < 4 ? (
                <Button type="button" onClick={handleNext} disabled={!isStepValid(currentStep) || isLoading}>
                  Next
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Link href="/dashboard/projects">
                    <Button type="button" variant="outline" disabled={isLoading}>
                      Cancel
                    </Button>
                  </Link>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Creating...' : 'Create Project'}
                  </Button>
                </div>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
