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

// Demo users configuration
const DEMO_USERS = [
  {
    email: 'admin@example.com',
    full_name: 'Admin User',
    role: 'admin'
  },
  {
    email: 'pm@example.com',
    full_name: 'Project Manager',
    role: 'project_manager'
  },
  {
    email: 'developer@example.com',
    full_name: 'Team Member',
    role: 'team_member'
  },
  {
    email: 'resource@example.com',
    full_name: 'Resource Manager',
    role: 'resource_manager'
  }
]

const DEFAULT_ORG_ID = '550e8400-e29b-41d4-a716-446655440000'

async function ensureOrgExists() {
  try {
    const { data: existingOrg } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .eq('id', DEFAULT_ORG_ID)
      .single()

    if (!existingOrg) {
      // Create the organization
      await supabaseAdmin.from('organizations').insert({
        id: DEFAULT_ORG_ID,
        name: 'Demo Organization',
        slug: 'demo-org',
        currency: 'USD',
        timezone: 'UTC'
      })
      console.log('[v0] Created organization:', DEFAULT_ORG_ID)
    }
  } catch (err) {
    console.error('[v0] Error ensuring org exists:', err)
  }
}

async function ensureDemoUsersExist() {
  try {
    // Ensure org exists first
    await ensureOrgExists()

    // Check if demo users exist, if not create them
    for (const demoUser of DEMO_USERS) {
      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', demoUser.email)

      if (!existingUser || existingUser.length === 0) {
        // Generate a unique ID for the user
        const userId = `550e8400-e29b-41d4-a716-${Math.random().toString(16).slice(2, 14).padStart(12, '0')}`
        
        // Create the user
        const { error } = await supabaseAdmin.from('users').insert({
          id: userId,
          email: demoUser.email,
          full_name: demoUser.full_name,
          role: demoUser.role,
          organization_id: DEFAULT_ORG_ID,
          is_active: true,
          hourly_cost: demoUser.role === 'admin' ? 150 : 100
        })

        if (error) {
          console.error('[v0] Error creating user', demoUser.email, ':', error)
        } else {
          console.log('[v0] Created demo user:', demoUser.email)
        }
      }
    }
  } catch (err) {
    console.error('[v0] Error ensuring demo users:', err)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    console.log('[v0] Login attempt for:', email)

    // Ensure demo users exist first
    await ensureDemoUsersExist()

    // Query users table with service role key (bypasses RLS)
    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select('id, organization_id, role, email, full_name')
      .eq('email', email)

    if (error) {
      console.error('[v0] User lookup error:', error)
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      )
    }

    const user = users && users.length > 0 ? users[0] : null

    if (!user) {
      console.error('[v0] User not found:', email)
      return NextResponse.json(
        { error: 'User not found' },
        { status: 401 }
      )
    }

    console.log('[v0] User authenticated:', user.email, '- Role:', user.role)

    return NextResponse.json({ user })
  } catch (err) {
    console.error('[v0] Login API error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
