-- PSA RocketLine MVP+ Database Schema
-- Sprint 1: Foundation Tables

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================================
-- TABLE: organizations
-- ============================================================================
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  timezone TEXT DEFAULT 'UTC',
  currency TEXT DEFAULT 'USD',
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- TABLE: users with role-based access
-- ============================================================================
CREATE TYPE user_role AS ENUM ('admin', 'project_manager', 'team_member', 'resource_manager', 'finance', 'customer');

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'team_member',
  is_active BOOLEAN DEFAULT true,
  hourly_cost DECIMAL(10, 2),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, email)
);

CREATE INDEX idx_users_org_email ON users(organization_id, email);
CREATE INDEX idx_users_auth_id ON users(auth_id);

-- ============================================================================
-- TABLE: projects
-- ============================================================================
CREATE TYPE project_status AS ENUM ('active', 'on_hold', 'completed', 'archived', 'planning');
CREATE TYPE billing_method AS ENUM ('fixed_fee', 'time_and_materials', 'subscription', 'non_billable');

CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  customer_id UUID REFERENCES users(id),
  owner_id UUID NOT NULL REFERENCES users(id),
  status project_status DEFAULT 'active',
  start_date DATE,
  end_date DATE,
  expected_budget DECIMAL(15, 2),
  billing_method billing_method DEFAULT 'time_and_materials',
  currency TEXT DEFAULT 'USD',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_projects_org ON projects(organization_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_dates ON projects(start_date, end_date);

-- ============================================================================
-- TABLE: project_members
-- ============================================================================
CREATE TABLE project_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member', -- 'owner', 'lead', 'member'
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, user_id)
);

CREATE INDEX idx_project_members_project ON project_members(project_id);
CREATE INDEX idx_project_members_user ON project_members(user_id);

-- ============================================================================
-- TABLE: phases
-- ============================================================================
CREATE TABLE phases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  sequence_number INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_phases_project ON phases(project_id);
CREATE INDEX idx_phases_dates ON phases(start_date, end_date);

-- ============================================================================
-- TABLE: tasks (with hierarchy support)
-- ============================================================================
CREATE TYPE task_status AS ENUM ('not_started', 'in_progress', 'on_hold', 'completed', 'cancelled');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'critical');

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  phase_id UUID REFERENCES phases(id) ON DELETE SET NULL,
  parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status task_status DEFAULT 'not_started',
  priority task_priority DEFAULT 'medium',
  start_date DATE,
  due_date DATE,
  estimated_hours DECIMAL(10, 2),
  is_billable BOOLEAN DEFAULT true,
  assigned_to UUID REFERENCES users(id),
  sequence_number INT,
  is_visible_to_customer BOOLEAN DEFAULT false,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_phase ON tasks(phase_id);
CREATE INDEX idx_tasks_parent ON tasks(parent_task_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_dates ON tasks(start_date, due_date);

-- ============================================================================
-- TABLE: task_assignees (multi-user assignment)
-- ============================================================================
CREATE TABLE task_assignees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(task_id, user_id)
);

CREATE INDEX idx_task_assignees_task ON task_assignees(task_id);
CREATE INDEX idx_task_assignees_user ON task_assignees(user_id);

-- ============================================================================
-- TABLE: task_dependencies
-- ============================================================================
CREATE TYPE dependency_type AS ENUM ('finish_to_start');

CREATE TABLE task_dependencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  predecessor_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  successor_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  dependency_type dependency_type DEFAULT 'finish_to_start',
  lag_days INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(predecessor_task_id, successor_task_id)
);

CREATE INDEX idx_dependencies_predecessor ON task_dependencies(predecessor_task_id);
CREATE INDEX idx_dependencies_successor ON task_dependencies(successor_task_id);

-- ============================================================================
-- TABLE: task_comments
-- ============================================================================
CREATE TABLE task_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_task_comments_task ON task_comments(task_id);

-- ============================================================================
-- TABLE: timesheets
-- ============================================================================
CREATE TYPE timesheet_status AS ENUM ('draft', 'submitted', 'approved', 'rejected');

CREATE TABLE timesheets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  week_starting DATE NOT NULL,
  status timesheet_status DEFAULT 'draft',
  total_hours DECIMAL(10, 2) DEFAULT 0,
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, week_starting)
);

CREATE INDEX idx_timesheets_user ON timesheets(user_id);
CREATE INDEX idx_timesheets_org ON timesheets(organization_id);
CREATE INDEX idx_timesheets_week ON timesheets(week_starting);
CREATE INDEX idx_timesheets_status ON timesheets(status);

-- ============================================================================
-- TABLE: time_entries
-- ============================================================================
CREATE TABLE time_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timesheet_id UUID NOT NULL REFERENCES timesheets(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  date DATE NOT NULL,
  hours DECIMAL(10, 2) NOT NULL,
  category TEXT DEFAULT 'development',
  is_billable BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_time_entries_timesheet ON time_entries(timesheet_id);
CREATE INDEX idx_time_entries_task ON time_entries(task_id);
CREATE INDEX idx_time_entries_project ON time_entries(project_id);
CREATE INDEX idx_time_entries_user ON time_entries(user_id);
CREATE INDEX idx_time_entries_date ON time_entries(date);

-- ============================================================================
-- TABLE: allocations (resource management)
-- ============================================================================
CREATE TYPE allocation_type AS ENUM ('hard', 'soft');

CREATE TABLE allocations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  placeholder_id UUID REFERENCES placeholder_roles(id) ON DELETE SET NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  hours_per_week DECIMAL(10, 2),
  allocation_percentage DECIMAL(5, 2),
  allocation_type allocation_type DEFAULT 'soft',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_allocations_project ON allocations(project_id);
CREATE INDEX idx_allocations_user ON allocations(user_id);
CREATE INDEX idx_allocations_dates ON allocations(start_date, end_date);

-- ============================================================================
-- TABLE: placeholder_roles (for resource requests before assignment)
-- ============================================================================
CREATE TABLE placeholder_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  capacity_hours_per_week DECIMAL(10, 2),
  status TEXT DEFAULT 'open', -- 'open', 'filled', 'archived'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_placeholder_roles_project ON placeholder_roles(project_id);

-- ============================================================================
-- TABLE: skills
-- ============================================================================
CREATE TABLE skill_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, name)
);

CREATE TABLE skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES skill_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, name)
);

CREATE TABLE user_skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  proficiency_level TEXT DEFAULT 'intermediate', -- 'beginner', 'intermediate', 'advanced', 'expert'
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, skill_id)
);

CREATE INDEX idx_user_skills_user ON user_skills(user_id);
CREATE INDEX idx_user_skills_skill ON user_skills(skill_id);

-- ============================================================================
-- TABLE: rate_cards (billing rates)
-- ============================================================================
CREATE TABLE rate_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  currency TEXT DEFAULT 'USD',
  effective_date DATE DEFAULT CURRENT_DATE,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE rate_card_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rate_card_id UUID NOT NULL REFERENCES rate_cards(id) ON DELETE CASCADE,
  role_name TEXT NOT NULL,
  bill_rate DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_rate_card_roles_card ON rate_card_roles(rate_card_id);

-- ============================================================================
-- TABLE: invoices
-- ============================================================================
CREATE TYPE invoice_status AS ENUM ('draft', 'in_review', 'approved', 'sent', 'paid', 'written_off', 'voided');

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  invoice_number TEXT UNIQUE NOT NULL,
  status invoice_status DEFAULT 'draft',
  bill_to TEXT NOT NULL,
  from_org_name TEXT NOT NULL,
  po_number TEXT,
  issue_date DATE,
  due_date DATE,
  subtotal DECIMAL(15, 2) DEFAULT 0,
  tax_amount DECIMAL(15, 2) DEFAULT 0,
  total DECIMAL(15, 2) DEFAULT 0,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_invoices_org ON invoices(organization_id);
CREATE INDEX idx_invoices_project ON invoices(project_id);
CREATE INDEX idx_invoices_status ON invoices(status);

-- ============================================================================
-- TABLE: revenue_recognitions
-- ============================================================================
CREATE TYPE revenue_method AS ENUM ('hours_percentage', 'milestone_based', 'manual');

CREATE TABLE revenue_recognitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  method revenue_method NOT NULL,
  recognized_amount DECIMAL(15, 2) NOT NULL,
  recognized_date DATE NOT NULL,
  triggering_event TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_revenue_recognitions_project ON revenue_recognitions(project_id);

-- ============================================================================
-- TABLE: system_settings
-- ============================================================================
CREATE TABLE system_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, key)
);

-- ============================================================================
-- TABLE: notifications
-- ============================================================================
CREATE TYPE notification_type AS ENUM ('task_assigned', 'task_due', 'comment_mention', 'approval_needed', 'status_update', 'system');

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  related_entity_type TEXT,
  related_entity_id UUID,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_org ON notifications(organization_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);

-- ============================================================================
-- UPDATED: allocations table (with forward reference fix)
-- ============================================================================
-- ALTER TABLE allocations ADD CONSTRAINT fk_allocations_placeholder 
--   FOREIGN KEY (placeholder_id) REFERENCES placeholder_roles(id) ON DELETE SET NULL;
-- This will be handled after placeholder_roles is created

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE timesheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE placeholder_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_recognitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's organization
CREATE OR REPLACE FUNCTION get_current_user_org() RETURNS UUID AS $$
  SELECT organization_id FROM users WHERE auth_id = auth.uid()
$$ LANGUAGE SQL STABLE;

-- ============================================================================
-- Organizations: Allow users in the org to read their own org
-- ============================================================================
CREATE POLICY "org_read" ON organizations FOR SELECT USING (
  id = get_current_user_org()
);

CREATE POLICY "org_update_admin" ON organizations FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.organization_id = organizations.id 
    AND users.auth_id = auth.uid() 
    AND users.role = 'admin'
  )
);

-- ============================================================================
-- Users: Allow users to see other users in their org
-- ============================================================================
CREATE POLICY "users_read" ON users FOR SELECT USING (
  organization_id = get_current_user_org()
);

CREATE POLICY "users_update_self" ON users FOR UPDATE USING (
  auth_id = auth.uid()
);

CREATE POLICY "users_admin_all" ON users FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users AS admin_user
    WHERE admin_user.organization_id = users.organization_id
    AND admin_user.auth_id = auth.uid()
    AND admin_user.role = 'admin'
  )
);

-- ============================================================================
-- Projects: Allow access for team members
-- ============================================================================
CREATE POLICY "projects_read" ON projects FOR SELECT USING (
  organization_id = get_current_user_org() AND (
    owner_id = (SELECT id FROM users WHERE auth_id = auth.uid() AND organization_id = projects.organization_id)
    OR EXISTS (SELECT 1 FROM project_members WHERE project_members.project_id = projects.id AND project_members.user_id = (SELECT id FROM users WHERE auth_id = auth.uid()))
    OR EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND organization_id = projects.organization_id AND role = 'admin')
  )
);

CREATE POLICY "projects_insert" ON projects FOR INSERT WITH CHECK (
  organization_id = get_current_user_org() AND (
    EXISTS (
      SELECT 1 FROM users 
      WHERE auth_id = auth.uid() 
      AND organization_id = projects.organization_id 
      AND role IN ('admin', 'project_manager')
    )
  )
);

CREATE POLICY "projects_update" ON projects FOR UPDATE USING (
  organization_id = get_current_user_org() AND (
    owner_id = (SELECT id FROM users WHERE auth_id = auth.uid() AND organization_id = projects.organization_id)
    OR EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND organization_id = projects.organization_id AND role = 'admin')
  )
);

-- ============================================================================
-- Tasks: Allow access for project members
-- ============================================================================
CREATE POLICY "tasks_read" ON tasks FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM projects 
    WHERE projects.id = tasks.project_id 
    AND (
      projects.owner_id = (SELECT id FROM users WHERE auth_id = auth.uid() AND organization_id = projects.organization_id)
      OR EXISTS (SELECT 1 FROM project_members WHERE project_members.project_id = projects.id AND project_members.user_id = (SELECT id FROM users WHERE auth_id = auth.uid()))
      OR EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND organization_id = projects.organization_id AND role = 'admin')
    )
  )
);

-- ============================================================================
-- Timesheets: Allow users to see their own and admins/managers to see all
-- ============================================================================
CREATE POLICY "timesheets_read" ON timesheets FOR SELECT USING (
  user_id = (SELECT id FROM users WHERE auth_id = auth.uid() AND organization_id = timesheets.organization_id)
  OR EXISTS (
    SELECT 1 FROM users 
    WHERE auth_id = auth.uid() 
    AND organization_id = timesheets.organization_id 
    AND role IN ('admin', 'project_manager', 'resource_manager')
  )
);

CREATE POLICY "timesheets_insert_self" ON timesheets FOR INSERT WITH CHECK (
  user_id = (SELECT id FROM users WHERE auth_id = auth.uid() AND organization_id = timesheets.organization_id)
);

CREATE POLICY "timesheets_update_self" ON timesheets FOR UPDATE USING (
  user_id = (SELECT id FROM users WHERE auth_id = auth.uid() AND organization_id = timesheets.organization_id)
);

-- ============================================================================
-- Time Entries: Allow users to see their own entries and team leads to manage
-- ============================================================================
CREATE POLICY "time_entries_read" ON time_entries FOR SELECT USING (
  user_id = (SELECT id FROM users WHERE auth_id = auth.uid() AND organization_id = (SELECT organization_id FROM users WHERE id = time_entries.user_id))
  OR EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = time_entries.project_id
    AND (
      projects.owner_id = (SELECT id FROM users WHERE auth_id = auth.uid() AND organization_id = projects.organization_id)
      OR EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND organization_id = projects.organization_id AND role IN ('admin', 'project_manager'))
    )
  )
);

-- ============================================================================
-- Notifications: Allow users to see their own notifications
-- ============================================================================
CREATE POLICY "notifications_read" ON notifications FOR SELECT USING (
  user_id = (SELECT id FROM users WHERE auth_id = auth.uid() AND organization_id = notifications.organization_id)
);

CREATE POLICY "notifications_update_self" ON notifications FOR UPDATE USING (
  user_id = (SELECT id FROM users WHERE auth_id = auth.uid() AND organization_id = notifications.organization_id)
);

-- ============================================================================
-- Create indexes for common queries
-- ============================================================================
CREATE INDEX idx_tasks_project_status ON tasks(project_id, status);
CREATE INDEX idx_tasks_assigned_status ON tasks(assigned_to, status);
CREATE INDEX idx_time_entries_user_date ON time_entries(user_id, date);
CREATE INDEX idx_allocations_user_date ON allocations(user_id, start_date, end_date);

COMMIT;
