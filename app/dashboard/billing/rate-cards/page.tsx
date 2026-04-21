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
import { Plus, Edit, Trash2, AlertCircle } from 'lucide-react'

type RateCard = Database['public']['Tables']['rate_cards']['Row']

interface RateCardForm {
  name: string
  description: string
  currency: string
  isActive: boolean
}

export default function RateCardsPage() {
  const { userProfile } = useAuth()
  const [rateCards, setRateCards] = useState<RateCard[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<RateCardForm>({
    name: '',
    description: '',
    currency: 'USD',
    isActive: true,
  })

  useEffect(() => {
    fetchRateCards()
  }, [userProfile])

  const fetchRateCards = async () => {
    if (!userProfile) return

    setIsLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await supabase
        .from('rate_cards')
        .select('*')
        .eq('organization_id', userProfile.organization_id)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      setRateCards((data as RateCard[]) || [])
    } catch (err) {
      console.error('[v0] Error fetching rate cards:', err)
      setError('Failed to load rate cards')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    try {
      if (!userProfile) throw new Error('User not found')
      if (!formData.name.trim()) throw new Error('Name is required')

      if (editingId) {
        const { error: updateError } = await supabase
          .from('rate_cards')
          .update({
            name: formData.name,
            description: formData.description,
            currency: formData.currency,
            is_active: formData.isActive,
          })
          .eq('id', editingId)

        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase.from('rate_cards').insert([
          {
            organization_id: userProfile.organization_id,
            name: formData.name,
            description: formData.description,
            currency: formData.currency,
            is_active: formData.isActive,
          },
        ])

        if (insertError) throw insertError
      }

      await fetchRateCards()
      setFormData({ name: '', description: '', currency: 'USD', isActive: true })
      setEditingId(null)
      setIsOpen(false)
    } catch (err) {
      console.error('[v0] Error saving rate card:', err)
      setError(err instanceof Error ? err.message : 'Failed to save')
    }
  }

  const handleEdit = (card: RateCard) => {
    setFormData({
      name: card.name,
      description: card.description || '',
      currency: card.currency,
      isActive: card.is_active,
    })
    setEditingId(card.id)
    setIsOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this rate card?')) return

    try {
      const { error: deleteError } = await supabase.from('rate_cards').delete().eq('id', id)

      if (deleteError) throw deleteError
      await fetchRateCards()
    } catch (err) {
      console.error('[v0] Error deleting rate card:', err)
      setError('Failed to delete rate card')
    }
  }

  const handleClose = () => {
    setIsOpen(false)
    setEditingId(null)
    setFormData({ name: '', description: '', currency: 'USD', isActive: true })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Rate Cards</h1>
        <p className="text-muted-foreground mt-1">Manage billing rates for different roles and services</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end">
        <Dialog open={isOpen} onOpenChange={handleClose}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Rate Card
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit' : 'Create'} Rate Card</DialogTitle>
              <DialogDescription>
                {editingId ? 'Update the rate card details' : 'Create a new rate card for billing'}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSave} className="space-y-4">
              <FieldGroup>
                <FieldLabel htmlFor="name">Name *</FieldLabel>
                <Input
                  id="name"
                  placeholder="e.g., Senior Developer"
                  value={formData.name}
                  onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                />
              </FieldGroup>

              <FieldGroup>
                <FieldLabel htmlFor="description">Description</FieldLabel>
                <textarea
                  id="description"
                  placeholder="e.g., Experienced developer with 5+ years"
                  value={formData.description}
                  onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  rows={3}
                />
              </FieldGroup>

              <FieldGroup>
                <FieldLabel htmlFor="currency">Currency</FieldLabel>
                <Input
                  id="currency"
                  placeholder="USD"
                  value={formData.currency}
                  onChange={(e) => setFormData((p) => ({ ...p, currency: e.target.value }))}
                />
              </FieldGroup>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="active"
                  checked={formData.isActive}
                  onChange={(e) => setFormData((p) => ({ ...p, isActive: e.target.checked }))}
                />
                <label htmlFor="active" className="text-sm cursor-pointer">
                  Active
                </label>
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button type="submit">{editingId ? 'Update' : 'Create'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {rateCards.length === 0 ? (
        <Card>
          <CardContent className="pt-12 pb-12">
            <p className="text-center text-muted-foreground">No rate cards created yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {rateCards.map((card) => (
            <Card key={card.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold">{card.name}</h3>
                      {card.is_active && <Badge>Active</Badge>}
                      {!card.is_active && <Badge variant="secondary">Inactive</Badge>}
                    </div>
                    {card.description && (
                      <p className="text-sm text-muted-foreground mb-2">{card.description}</p>
                    )}
                    <p className="text-sm text-muted-foreground">Currency: {card.currency}</p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(card)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(card.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
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
