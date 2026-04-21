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
    const { timesheetId, action, approvedBy, rejectedBy } = body

    if (!timesheetId || !action) {
      return Response.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get timesheet details
    const { data: timesheet, error: fetchError } = await supabase
      .from('timesheets')
      .select('*')
      .eq('id', timesheetId)
      .single()

    if (fetchError || !timesheet) {
      return Response.json(
        { error: 'Timesheet not found' },
        { status: 404 }
      )
    }

    // Update timesheet status
    const updateData =
      action === 'approve'
        ? {
            status: 'approved',
            approved_at: new Date().toISOString(),
            approved_by: approvedBy,
          }
        : {
            status: 'rejected',
            rejected_at: new Date().toISOString(),
            rejected_by: rejectedBy,
          }

    const { error: updateError } = await supabase
      .from('timesheets')
      .update(updateData)
      .eq('id', timesheetId)

    if (updateError) throw updateError

    // Create notification for user
    await supabase.from('notifications').insert({
      user_id: timesheet.user_id,
      organization_id: timesheet.organization_id,
      title: `Timesheet ${action === 'approve' ? 'Approved' : 'Rejected'}`,
      message: `Your timesheet for the week of ${timesheet.week_starting} has been ${action === 'approve' ? 'approved' : 'rejected'}.`,
      type: 'timesheet',
      related_id: timesheetId,
      is_read: false,
    })

    return Response.json(
      { success: true, message: `Timesheet ${action === 'approve' ? 'approved' : 'rejected'} successfully` },
      { status: 200 }
    )
  } catch (error) {
    console.error('[v0] Timesheet approval error:', error)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
