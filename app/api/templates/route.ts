import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('project_templates')
      .select(`
        *,
        created_by:users(full_name, email)
      `)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ templates: data || [] })
  } catch (error) {
    console.error('[v0] Error fetching templates:', error)
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { organizationId, name, description, phasesConfig, tasksConfig, customFieldsConfig, createdBy } = body

    if (!organizationId || !name) {
      return NextResponse.json({ error: 'Organization ID and name required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('project_templates')
      .insert([
        {
          organization_id: organizationId,
          name,
          description,
          phases_config: phasesConfig || [],
          tasks_config: tasksConfig || [],
          custom_fields_config: customFieldsConfig || {},
          created_by: createdBy,
        },
      ])
      .select()

    if (error) throw error

    return NextResponse.json({ template: data?.[0] }, { status: 201 })
  } catch (error) {
    console.error('[v0] Error creating template:', error)
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 })
  }
}
