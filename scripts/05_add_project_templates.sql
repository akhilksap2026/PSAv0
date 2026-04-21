-- Project Templates Tables
-- Feature 1: Project Templates

-- Create project_templates table
CREATE TABLE IF NOT EXISTS project_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  phases_config JSONB DEFAULT '[]',
  tasks_config JSONB DEFAULT '[]',
  custom_fields_config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(organization_id, name)
);

-- Create template_tasks table for detailed task definitions
CREATE TABLE IF NOT EXISTS template_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES project_templates(id) ON DELETE CASCADE,
  phase_sequence INTEGER NOT NULL,
  relative_start_days INTEGER DEFAULT 0,
  relative_end_days INTEGER,
  task_name TEXT NOT NULL,
  task_description TEXT,
  estimated_hours NUMERIC(8,2),
  is_billable BOOLEAN DEFAULT TRUE,
  default_assignee_role TEXT,
  priority INTEGER DEFAULT 2,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX idx_templates_org ON project_templates(organization_id);
CREATE INDEX idx_templates_created_by ON project_templates(created_by);
CREATE INDEX idx_template_tasks_template ON template_tasks(template_id);

-- Enable RLS on templates
ALTER TABLE project_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for project_templates
CREATE POLICY "Users can view templates in their org" ON project_templates
  FOR SELECT USING (organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Admins and PMs can create templates" ON project_templates
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    ) AND (
      (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'project_manager')
    )
  );

CREATE POLICY "Users can update their org templates" ON project_templates
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can delete templates" ON project_templates
  FOR DELETE USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- RLS Policies for template_tasks
CREATE POLICY "Users can view template tasks" ON template_tasks
  FOR SELECT USING (
    template_id IN (
      SELECT id FROM project_templates 
      WHERE organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- Resource Requests Tables
-- Feature 2: Resource Requests Workflow

CREATE TABLE IF NOT EXISTS resource_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES users(id),
  skill_id UUID REFERENCES skills(id),
  skill_name TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'partially_allocated', 'fulfilled', 'cancelled')),
  allocated_user_ids UUID[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_resource_requests_project ON resource_requests(project_id);
CREATE INDEX idx_resource_requests_status ON resource_requests(status);
CREATE INDEX idx_resource_requests_dates ON resource_requests(start_date, end_date);

ALTER TABLE resource_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view requests in their org" ON resource_requests
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- Document Spaces & Documents Tables
-- Feature 3: Document Spaces

CREATE TABLE IF NOT EXISTS project_spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'private' CHECK (type IN ('private', 'shared')),
  description TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(project_id, name)
);

CREATE TABLE IF NOT EXISTS space_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES project_spaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content_html TEXT,
  content_json JSONB,
  version INTEGER DEFAULT 1,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES space_documents(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  content_html TEXT,
  content_json JSONB,
  created_by UUID NOT NULL REFERENCES users(id),
  change_summary TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS document_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES space_documents(id) ON DELETE CASCADE,
  approver_id UUID NOT NULL REFERENCES users(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'changes_requested', 'rejected')),
  requested_by UUID NOT NULL REFERENCES users(id),
  feedback TEXT,
  requested_at TIMESTAMP DEFAULT NOW(),
  response_date TIMESTAMP
);

CREATE INDEX idx_spaces_project ON project_spaces(project_id);
CREATE INDEX idx_documents_space ON space_documents(space_id);
CREATE INDEX idx_versions_document ON document_versions(document_id);
CREATE INDEX idx_approvals_document ON document_approvals(document_id);

ALTER TABLE project_spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE space_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_approvals ENABLE ROW LEVEL SECURITY;

-- Billing Schedules Tables
-- Feature 4: Billing Schedules & Auto-Invoice

CREATE TABLE IF NOT EXISTS billing_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  billing_method TEXT DEFAULT 'time_and_materials' CHECK (billing_method IN ('fixed_fee', 'time_and_materials', 'milestone', 'hybrid')),
  rate_card_id UUID REFERENCES rate_cards(id),
  created_by UUID NOT NULL REFERENCES users(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS billing_schedule_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES billing_schedules(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  milestone_trigger TEXT CHECK (milestone_trigger IN ('date', 'phase_completion', 'manual')),
  milestone_date DATE,
  phase_id UUID REFERENCES phases(id),
  amount_or_percentage NUMERIC(10,2),
  is_percentage BOOLEAN DEFAULT FALSE,
  invoice_template_id UUID,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'triggered', 'invoiced', 'paid')),
  triggered_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_schedules_project ON billing_schedules(project_id);
CREATE INDEX idx_schedule_items_schedule ON billing_schedule_items(schedule_id);
CREATE INDEX idx_schedule_items_status ON billing_schedule_items(status);

ALTER TABLE billing_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_schedule_items ENABLE ROW LEVEL SECURITY;

-- Sprint Planning Tables
-- Feature 5: Sprint Planning

CREATE TABLE IF NOT EXISTS sprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'completed', 'archived')),
  sprint_number INTEGER NOT NULL,
  goal TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(project_id, sprint_number)
);

-- Add sprint_id column to tasks table if not exists
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS sprint_id UUID REFERENCES sprints(id) ON DELETE SET NULL;

CREATE INDEX idx_sprints_project ON sprints(project_id);
CREATE INDEX idx_sprints_status ON sprints(status);
CREATE INDEX idx_tasks_sprint ON tasks(sprint_id);

ALTER TABLE sprints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view sprints in their org" ON sprints
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );
