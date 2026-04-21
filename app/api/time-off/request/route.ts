import { createClient } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase credentials')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, organizationId, type, startDate, endDate, reason, numberOfDays } = body

    if (!userId || !type || !startDate || !endDate) {
      return Response.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create time-off request
    const { data, error } = await supabase
      .from('time_off_requests')
      .insert({
        user_id: userId,
        organization_id: organizationId,
        type,
        start_date: startDate,
        end_date: endDate,
        reason,
        number_of_days: numberOfDays,
        status: 'pending',
        created_at: new Date().toISOString(),
      })
      .select()

    if (error) {
      console.error('[v0] Time-off creation error:', error)
      return Response.json(
        { error: 'Failed to create time-off request' },
        { status: 400 }
      )
    }

    // Create notification for managers
    const { data: managers } = await supabase
      .from('users')
      .select('id')
      .eq('organization_id', organizationId)
      .in('role', ['admin', 'manager'])

    if (managers && managers.length > 0) {
      const notifications = managers.map((manager) => ({
        user_id: manager.id,
        organization_id: organizationId,
        title: 'New Time-Off Request',
        message: `A new time-off request has been submitted for approval.`,
        type: 'time_off',
        related_id: data?.[0]?.id,
        is_read: false,
      }))

      await supabase.from('notifications').insert(notifications)
    }

    return Response.json(
      { success: true, message: 'Time-off request submitted successfully', data: data?.[0] },
      { status: 201 }
    )
  } catch (error) {
    console.error('[v0] Time-off request error:', error)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
