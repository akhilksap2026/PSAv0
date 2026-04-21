// Debug script to check users in database
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('[v0] Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkUsers() {
  console.log('[v0] Fetching all users from database...')
  
  const { data, error, count } = await supabase
    .from('users')
    .select('*', { count: 'exact' })

  if (error) {
    console.error('[v0] Error fetching users:', error)
    return
  }

  console.log(`[v0] Found ${count} users in database`)
  console.log('[v0] Users:', JSON.stringify(data, null, 2))

  // Try to fetch specific test user
  console.log('\n[v0] Attempting to fetch admin@example.com...')
  const { data: adminUser, error: adminError } = await supabase
    .from('users')
    .select('*')
    .eq('email', 'admin@example.com')
    .single()

  if (adminError) {
    console.error('[v0] Error fetching admin user:', adminError)
  } else {
    console.log('[v0] Admin user found:', JSON.stringify(adminUser, null, 2))
  }
}

checkUsers().catch(console.error)
