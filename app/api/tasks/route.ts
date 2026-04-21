import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { projectId, phase_id } = await request.json()

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID required' },
        { status: 400 }
      )
    }

    let query = supabaseAdmin
      .from('tasks')
      .select('*')
      .eq('project_id', projectId)

    if (phase_id) {
      query = query.eq('phase_id', phase_id)
    }

    const { data, error } = await query
      .order('sequence_number', { ascending: true })

    if (error) {
      console.error('[v0] Supabase error:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })
  } catch (err) {
    console.error('[v0] API error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    )
  }
}
