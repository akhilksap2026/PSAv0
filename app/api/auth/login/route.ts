import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Use service role key to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    console.log('[v0] Looking up user:', email)

    // Query users table with service role key (bypasses RLS)
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, organization_id, role, email, full_name')
      .eq('email', email)
      .single()

    if (error || !user) {
      console.error('[v0] User lookup error:', error)
      return NextResponse.json(
        { error: 'User not found' },
        { status: 401 }
      )
    }

    console.log('[v0] User found:', user.email, '- Role:', user.role)

    return NextResponse.json({ user })
  } catch (err) {
    console.error('[v0] Login API error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
