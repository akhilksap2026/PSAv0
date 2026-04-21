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
import { ArrowLeft, Plus, Copy, Edit2, Trash2 } from 'lucide-react'
import Link from 'next/link'

type ProjectTemplate = Database['public']['Tables']['project_templates']['Row']

export default function TemplatesPage() {
  const { userProfile } = useAuth()
  const [templates, setTemplates] = useState<ProjectTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    const fetchTemplates = async () => {
      if (!userProfile) return

      setIsLoading(true)
      try {
        const { data } = await supabase
          .from('project_templates')
          .select('*')
          .eq('organization_id', userProfile.organization_id)
          .eq('is_active', true)
          .order('created_at', { ascending: false })

        setTemplates(data || [])
      } catch (error) {
        console.error('[v0] Error fetching templates:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTemplates()
  }, [userProfile])

  const filteredTemplates = templates.filter((t) =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return

    try {
      await supabase.from('project_templates').update({ is_active: false }).eq('id', templateId)

      setTemplates(templates.filter((t) => t.id !== templateId))
    } catch (error) {
      console.error('[v0] Error deleting template:', error)
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

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Project Templates</h1>
          <p className="text-muted-foreground mt-1">Save and reuse project setups with auto-calculated dates</p>
        </div>
        <Link href="/dashboard/projects/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Project from Template
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </CardContent>
      </Card>

      {isLoading ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-center py-8">Loading templates...</p>
          </CardContent>
        </Card>
      ) : filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-center py-8">
              {searchTerm ? 'No templates match your search' : 'No templates yet. Create one by saving a project setup.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <CardDescription className="mt-1">{template.description}</CardDescription>
                  </div>
                  <Badge variant="outline">Template</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm">
                  <p className="text-muted-foreground">
                    Phases: {template.phases_config ? (template.phases_config as any[]).length : 0}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Link href={`/dashboard/projects/new?templateId=${template.id}`} className="flex-1">
                    <Button variant="outline" className="w-full gap-2" size="sm">
                      <Copy className="h-4 w-4" />
                      Use Template
                    </Button>
                  </Link>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2 text-destructive hover:text-destructive"
                    onClick={() => handleDeleteTemplate(template.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
