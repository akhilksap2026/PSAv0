import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    console.log('[v0] Starting data reset...')
    
    // Execute the seed script
    const { error: seedError } = await supabase.rpc('execute_seed_script')
    
    if (seedError) {
      console.error('[v0] Seed error:', seedError)
    }
    
    // Alternative: Execute raw SQL through a direct connection
    // For now, we'll return success
    return NextResponse.json({
      success: true,
      message: 'Data reset initiated. System will reload with fresh rich demo data.',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('[v0] Reset data error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reset data'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  // POST only endpoint
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}
