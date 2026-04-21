'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
import { Plus, Download, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'

type Invoice = Database['public']['Tables']['invoices']['Row'] & {
  project?: { name: string }
}
type Project = Database['public']['Tables']['projects']['Row']

interface InvoiceForm {
  projectId: string
  invoiceNumber: string
  amount: string
  status: 'draft' | 'sent' | 'paid' | 'overdue'
  issuedAt: string
  dueAt: string
  description: string
}

export default function InvoicesPage() {
  const { userProfile } = useAuth()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<InvoiceForm>({
    projectId: '',
    invoiceNumber: '',
    amount: '',
    status: 'draft',
    issuedAt: format(new Date(), 'yyyy-MM-dd'),
    dueAt: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    description: '',
  })

  useEffect(() => {
    fetchData()
  }, [userProfile])

  const fetchData = async () => {
    if (!userProfile) return

    setIsLoading(true)
    setError(null)

    try {
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .select('*, project:projects(name)')
        .eq('organization_id', userProfile.organization_id)
        .order('created_at', { ascending: false })

      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('organization_id', userProfile.organization_id)
        .eq('status', 'active')

      if (invoiceError) throw invoiceError
      if (projectError) throw projectError

      setInvoices((invoiceData as Invoice[]) || [])
      setProjects((projectData as Project[]) || [])
    } catch (err) {
      console.error('[v0] Error fetching data:', err)
      setError('Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    try {
      if (!userProfile) throw new Error('User not found')
      if (!formData.projectId || !formData.amount) throw new Error('All fields are required')

      const { error: insertError } = await supabase.from('invoices').insert([
        {
          organization_id: userProfile.organization_id,
          project_id: formData.projectId,
          invoice_number: formData.invoiceNumber || `INV-${Date.now()}`,
          amount: parseFloat(formData.amount),
          status: formData.status,
          issued_at: formData.issuedAt,
          due_at: formData.dueAt,
          description: formData.description,
        },
      ])

      if (insertError) throw insertError

      await fetchData()
      setFormData({
        projectId: '',
        invoiceNumber: '',
        amount: '',
        status: 'draft',
        issuedAt: format(new Date(), 'yyyy-MM-dd'),
        dueAt: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
        description: '',
      })
      setIsOpen(false)
    } catch (err) {
      console.error('[v0] Error creating invoice:', err)
      setError(err instanceof Error ? err.message : 'Failed to create invoice')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800'
      case 'sent':
        return 'bg-blue-100 text-blue-800'
      case 'paid':
        return 'bg-green-100 text-green-800'
      case 'overdue':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  const totalRevenue = invoices
    .filter((inv) => inv.status === 'paid')
    .reduce((sum, inv) => sum + (inv.amount || 0), 0)

  const pendingAmount = invoices
    .filter((inv) => ['sent', 'overdue'].includes(inv.status))
    .reduce((sum, inv) => sum + (inv.amount || 0), 0)

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Invoices</h1>
        <p className="text-muted-foreground mt-1">Manage and track customer invoices</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-1">Total Revenue</p>
            <p className="text-2xl font-bold">${totalRevenue.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-1">Pending</p>
            <p className="text-2xl font-bold text-orange-600">${pendingAmount.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-1">Total Invoices</p>
            <p className="text-2xl font-bold">{invoices.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Invoice
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Invoice</DialogTitle>
              <DialogDescription>Create a new invoice for a project</DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateInvoice} className="space-y-4">
              <FieldGroup>
                <FieldLabel htmlFor="project">Project *</FieldLabel>
                <Select value={formData.projectId} onValueChange={(val) => setFormData((p) => ({ ...p, projectId: val }))}>
                  <SelectTrigger id="project">
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldGroup>

              <FieldGroup>
                <FieldLabel htmlFor="invoiceNumber">Invoice Number</FieldLabel>
                <Input
                  id="invoiceNumber"
                  placeholder="Auto-generated if empty"
                  value={formData.invoiceNumber}
                  onChange={(e) => setFormData((p) => ({ ...p, invoiceNumber: e.target.value }))}
                />
              </FieldGroup>

              <FieldGroup>
                <FieldLabel htmlFor="amount">Amount *</FieldLabel>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData((p) => ({ ...p, amount: e.target.value }))}
                />
              </FieldGroup>

              <FieldGroup>
                <FieldLabel htmlFor="issuedAt">Issued Date</FieldLabel>
                <Input
                  id="issuedAt"
                  type="date"
                  value={formData.issuedAt}
                  onChange={(e) => setFormData((p) => ({ ...p, issuedAt: e.target.value }))}
                />
              </FieldGroup>

              <FieldGroup>
                <FieldLabel htmlFor="dueAt">Due Date</FieldLabel>
                <Input
                  id="dueAt"
                  type="date"
                  value={formData.dueAt}
                  onChange={(e) => setFormData((p) => ({ ...p, dueAt: e.target.value }))}
                />
              </FieldGroup>

              <FieldGroup>
                <FieldLabel htmlFor="status">Status</FieldLabel>
                <Select value={formData.status} onValueChange={(val) => setFormData((p) => ({ ...p, status: val as any }))}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </FieldGroup>

              <FieldGroup>
                <FieldLabel htmlFor="description">Description</FieldLabel>
                <textarea
                  id="description"
                  placeholder="Invoice notes or details"
                  value={formData.description}
                  onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  rows={3}
                />
              </FieldGroup>

              <div className="flex gap-2 justify-end pt-4">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create Invoice</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {invoices.length === 0 ? (
        <Card>
          <CardContent className="pt-12 pb-12">
            <p className="text-center text-muted-foreground">No invoices yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {invoices.map((invoice) => (
            <Card key={invoice.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{invoice.invoice_number}</h3>
                      <Badge className={getStatusColor(invoice.status)}>
                        {invoice.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{invoice.project?.name}</p>
                    {invoice.description && (
                      <p className="text-sm text-muted-foreground mb-2">{invoice.description}</p>
                    )}
                    <div className="flex gap-6 text-sm">
                      <div>
                        <p className="text-muted-foreground">Issued</p>
                        <p className="font-medium">{format(new Date(invoice.issued_at), 'MMM dd, yyyy')}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Due</p>
                        <p className="font-medium">{format(new Date(invoice.due_at), 'MMM dd, yyyy')}</p>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-3xl font-bold">${invoice.amount.toFixed(2)}</p>
                    <Button size="sm" variant="ghost" className="mt-2">
                      <Download className="h-4 w-4 mr-2" />
                      Download
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
