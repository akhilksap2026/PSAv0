import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase URL or Anon Key')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          slug: string
          timezone: string
          currency: string
          logo_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['organizations']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['organizations']['Insert']>
      }
      users: {
        Row: {
          id: string
          auth_id: string | null
          organization_id: string
          email: string
          full_name: string
          avatar_url: string | null
          role: 'admin' | 'project_manager' | 'team_member' | 'resource_manager' | 'finance' | 'customer'
          is_active: boolean
          hourly_cost: number | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['users']['Insert']>
      }
      projects: {
        Row: {
          id: string
          organization_id: string
          name: string
          description: string | null
          customer_id: string | null
          owner_id: string
          status: 'active' | 'on_hold' | 'completed' | 'archived' | 'planning'
          start_date: string | null
          end_date: string | null
          expected_budget: number | null
          billing_method: 'fixed_fee' | 'time_and_materials' | 'subscription' | 'non_billable'
          currency: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['projects']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['projects']['Insert']>
      }
      phases: {
        Row: {
          id: string
          project_id: string
          name: string
          description: string | null
          start_date: string | null
          end_date: string | null
          sequence_number: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['phases']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['phases']['Insert']>
      }
      tasks: {
        Row: {
          id: string
          project_id: string
          phase_id: string | null
          parent_task_id: string | null
          name: string
          description: string | null
          status: 'not_started' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled'
          priority: 'low' | 'medium' | 'high' | 'critical'
          start_date: string | null
          due_date: string | null
          estimated_hours: number | null
          is_billable: boolean
          assigned_to: string | null
          sequence_number: number | null
          is_visible_to_customer: boolean
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['tasks']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['tasks']['Insert']>
      }
      timesheets: {
        Row: {
          id: string
          user_id: string
          organization_id: string
          week_starting: string
          status: 'draft' | 'submitted' | 'approved' | 'rejected'
          total_hours: number
          submitted_at: string | null
          approved_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['timesheets']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['timesheets']['Insert']>
      }
      time_entries: {
        Row: {
          id: string
          timesheet_id: string
          task_id: string | null
          project_id: string
          user_id: string
          date: string
          hours: number
          category: string
          is_billable: boolean
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['time_entries']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['time_entries']['Insert']>
      }
    }
  }
}
