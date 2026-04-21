-- PSA RocketLine - Rich Demo Data for 250 Employee Company with 35 Projects
-- This script populates realistic data for a large organization

-- First, clear existing demo data (keep the initial 4 test users)
DELETE FROM time_entries WHERE user_id IN (SELECT id FROM users WHERE organization_id = '550e8400-e29b-41d4-a716-446655440000' AND role NOT IN ('admin', 'project_manager', 'team_member', 'resource_manager'));
DELETE FROM timesheets WHERE user_id IN (SELECT id FROM users WHERE organization_id = '550e8400-e29b-41d4-a716-446655440000' AND role NOT IN ('admin', 'project_manager', 'team_member', 'resource_manager'));
DELETE FROM invoices WHERE project_id IN (SELECT id FROM projects WHERE organization_id = '550e8400-e29b-41d4-a716-446655440000');
DELETE FROM tasks WHERE project_id IN (SELECT id FROM projects WHERE organization_id = '550e8400-e29b-41d4-a716-446655440000');
DELETE FROM phases WHERE project_id IN (SELECT id FROM projects WHERE organization_id = '550e8400-e29b-41d4-a716-446655440000');
DELETE FROM project_members WHERE project_id IN (SELECT id FROM projects WHERE organization_id = '550e8400-e29b-41d4-a716-446655440000');
DELETE FROM projects WHERE organization_id = '550e8400-e29b-41d4-a716-446655440000' AND status != 'archived' OR status IS NOT NULL;

-- Insert 250 team members (keeping the original 4 test users)
INSERT INTO users (id, auth_id, organization_id, email, full_name, role, is_active, hourly_cost)
SELECT 
  uuid_generate_v4(),
  NULL,
  '550e8400-e29b-41d4-a716-446655440000',
  'user' || (ROW_NUMBER() OVER (ORDER BY seq)) || '@example.com',
  'Team Member ' || (ROW_NUMBER() OVER (ORDER BY seq)),
  CASE (ROW_NUMBER() OVER (ORDER BY seq)) % 5
    WHEN 0 THEN 'admin'::user_role
    WHEN 1 THEN 'project_manager'::user_role
    WHEN 2 THEN 'resource_manager'::user_role
    ELSE 'team_member'::user_role
  END,
  true,
  CASE (ROW_NUMBER() OVER (ORDER BY seq)) % 5
    WHEN 0 THEN 150
    WHEN 1 THEN 130
    WHEN 2 THEN 120
    ELSE 100 + ((ROW_NUMBER() OVER (ORDER BY seq)) % 50)
  END
FROM (
  SELECT generate_series(1, 246) as seq
) numbers
ON CONFLICT DO NOTHING;

-- Create 35 projects with diverse characteristics
WITH project_data AS (
  SELECT
    i,
    '550e8400-e29b-41d4-a716-446655440000' as org_id,
    CASE i
      WHEN 1 THEN 'E-Commerce Platform Redesign'
      WHEN 2 THEN 'Mobile App Development'
      WHEN 3 THEN 'Cloud Infrastructure Migration'
      WHEN 4 THEN 'Customer Portal Enhancement'
      WHEN 5 THEN 'Analytics Dashboard'
      WHEN 6 THEN 'Real-time Notification System'
      WHEN 7 THEN 'API Gateway Implementation'
      WHEN 8 THEN 'Database Optimization'
      WHEN 9 THEN 'Security Audit & Enhancement'
      WHEN 10 THEN 'Load Balancing Solution'
      WHEN 11 THEN 'Data Migration Pipeline'
      WHEN 12 THEN 'AI Chatbot Integration'
      WHEN 13 THEN 'Mobile Payment Gateway'
      WHEN 14 THEN 'CRM System Integration'
      WHEN 15 THEN 'Marketing Automation Platform'
      WHEN 16 THEN 'Supply Chain Management'
      WHEN 17 THEN 'Inventory System Overhaul'
      WHEN 18 THEN 'HR Management Platform'
      WHEN 19 THEN 'Employee Onboarding Portal'
      WHEN 20 THEN 'Financial Reporting Dashboard'
      WHEN 21 THEN 'Contract Management System'
      WHEN 22 THEN 'Document Management Solution'
      WHEN 23 THEN 'Email Marketing Platform'
      WHEN 24 THEN 'Social Media Integration'
      WHEN 25 THEN 'Video Streaming Solution'
      WHEN 26 THEN 'Voice Over IP System'
      WHEN 27 THEN 'Quality Assurance Automation'
      WHEN 28 THEN 'Performance Monitoring Tool'
      WHEN 29 THEN 'Compliance Management System'
      WHEN 30 THEN 'Disaster Recovery Setup'
      WHEN 31 THEN 'Customer Feedback Platform'
      WHEN 32 THEN 'Competitor Analysis Tool'
      WHEN 33 THEN 'Pricing Optimization Engine'
      WHEN 34 THEN 'Recommendation Engine'
      ELSE 'Strategic Initiative ' || i
    END as name,
    'Project ' || i || ' - Strategic initiative for business transformation' as description,
    CASE (i % 3)
      WHEN 0 THEN 'active'::project_status
      WHEN 1 THEN 'completed'::project_status
      ELSE 'planning'::project_status
    END as status,
    (NOW() - INTERVAL '1 day' * (i * 30))::date as start_date,
    (NOW() + INTERVAL '1 day' * ((35 - i) * 20))::date as end_date,
    (50000 + (i * 15000))::numeric as budget,
    CASE (i % 3)
      WHEN 0 THEN 'fixed_fee'::billing_method
      WHEN 1 THEN 'time_and_materials'::billing_method
      ELSE 'subscription'::billing_method
    END as billing_method
  FROM generate_series(1, 35) i
)
INSERT INTO projects (id, organization_id, name, description, owner_id, status, start_date, end_date, expected_budget, billing_method, currency)
SELECT
  uuid_generate_v4(),
  org_id,
  name,
  description,
  '550e8400-e29b-41d4-a716-446655440002',
  status,
  start_date,
  end_date,
  budget,
  billing_method,
  'USD'
FROM project_data
ON CONFLICT DO NOTHING;

-- Add project members (5-15 team members per project)
INSERT INTO project_members (project_id, user_id, role)
SELECT DISTINCT
  p.id,
  u.id,
  CASE (ROW_NUMBER() OVER (PARTITION BY p.id ORDER BY u.id) % 4)
    WHEN 1 THEN 'owner'
    WHEN 2 THEN 'lead'
    ELSE 'member'
  END
FROM projects p
CROSS JOIN users u
WHERE p.organization_id = '550e8400-e29b-41d4-a716-446655440000'
  AND (ROW_NUMBER() OVER (PARTITION BY p.id ORDER BY u.id) BETWEEN 1 AND 10)
  AND u.organization_id = '550e8400-e29b-41d4-a716-446655440000'
ON CONFLICT DO NOTHING;

-- Create phases for each project (3-5 phases per project)
INSERT INTO phases (id, project_id, name, description, start_date, end_date, sequence_number)
SELECT
  uuid_generate_v4(),
  p.id,
  CASE phase_seq
    WHEN 1 THEN 'Planning & Discovery'
    WHEN 2 THEN 'Design & Architecture'
    WHEN 3 THEN 'Development'
    WHEN 4 THEN 'Testing & QA'
    WHEN 5 THEN 'Deployment & Launch'
  END,
  'Phase ' || phase_seq || ' of project',
  (p.start_date + INTERVAL '1 day' * ((phase_seq - 1) * 30))::date,
  (p.start_date + INTERVAL '1 day' * (phase_seq * 30))::date,
  phase_seq
FROM projects p
CROSS JOIN generate_series(1, 4) as phase_seq
WHERE p.organization_id = '550e8400-e29b-41d4-a716-446655440000'
ON CONFLICT DO NOTHING;

-- Create tasks for each phase (8-12 tasks per phase)
INSERT INTO tasks (id, project_id, phase_id, name, description, status, priority, start_date, due_date, estimated_hours, is_billable, assigned_to, created_by)
SELECT
  uuid_generate_v4(),
  ph.project_id,
  ph.id,
  'Task ' || task_seq || ' - ' || CASE (task_seq % 5)
    WHEN 0 THEN 'Development work'
    WHEN 1 THEN 'Testing and validation'
    WHEN 2 THEN 'Documentation'
    WHEN 3 THEN 'Code review'
    ELSE 'Deployment preparation'
  END,
  'Task ' || task_seq || ' description for phase',
  CASE (task_seq % 5)
    WHEN 0 THEN 'completed'::task_status
    WHEN 1 THEN 'in_progress'::task_status
    ELSE 'not_started'::task_status
  END,
  CASE (task_seq % 3)
    WHEN 0 THEN 'critical'::task_priority
    WHEN 1 THEN 'high'::task_priority
    ELSE 'medium'::task_priority
  END,
  ph.start_date,
  (ph.start_date + INTERVAL '1 day' * (task_seq * 3))::date,
  (task_seq * 8)::numeric,
  true,
  (SELECT id FROM users WHERE organization_id = '550e8400-e29b-41d4-a716-446655440000' AND role = 'team_member'::user_role ORDER BY id LIMIT 1 OFFSET (task_seq % 245)),
  '550e8400-e29b-41d4-a716-446655440002'
FROM phases ph
CROSS JOIN generate_series(1, 10) as task_seq
WHERE ph.project_id IN (SELECT id FROM projects WHERE organization_id = '550e8400-e29b-41d4-a716-446655440000')
ON CONFLICT DO NOTHING;

-- Create rate cards for different roles
INSERT INTO rate_cards (id, organization_id, role_name, hourly_rate, currency, is_active)
VALUES
  (uuid_generate_v4(), '550e8400-e29b-41d4-a716-446655440000', 'Senior Developer', 180, 'USD', true),
  (uuid_generate_v4(), '550e8400-e29b-41d4-a716-446655440000', 'Developer', 120, 'USD', true),
  (uuid_generate_v4(), '550e8400-e29b-41d4-a716-446655440000', 'Junior Developer', 80, 'USD', true),
  (uuid_generate_v4(), '550e8400-e29b-41d4-a716-446655440000', 'QA Engineer', 100, 'USD', true),
  (uuid_generate_v4(), '550e8400-e29b-41d4-a716-446655440000', 'Product Manager', 150, 'USD', true),
  (uuid_generate_v4(), '550e8400-e29b-41d4-a716-446655440000', 'Project Manager', 140, 'USD', true),
  (uuid_generate_v4(), '550e8400-e29b-41d4-a716-446655440000', 'Designer', 110, 'USD', true)
ON CONFLICT DO NOTHING;

-- Create timesheets for the last 4 weeks
INSERT INTO timesheets (id, user_id, week_starting, status)
SELECT
  uuid_generate_v4(),
  u.id,
  (CURRENT_DATE - INTERVAL '1 day' * ((7 - EXTRACT(DOW FROM CURRENT_DATE)) + 7 * week_offset))::date,
  CASE week_offset
    WHEN 0 THEN 'draft'::timesheet_status
    WHEN 1 THEN 'submitted'::timesheet_status
    ELSE 'approved'::timesheet_status
  END
FROM users u
CROSS JOIN generate_series(0, 3) as week_offset
WHERE u.organization_id = '550e8400-e29b-41d4-a716-446655440000'
ON CONFLICT DO NOTHING;

-- Create time entries for timesheets
INSERT INTO time_entries (id, timesheet_id, project_id, task_id, date, hours, description)
SELECT
  uuid_generate_v4(),
  t.id,
  p.id,
  ta.id,
  (t.week_starting + INTERVAL '1 day' * day_of_week)::date,
  (4 + RANDOM() * 4)::numeric,
  'Work on ' || ta.name
FROM timesheets t
JOIN users u ON t.user_id = u.id
JOIN projects p ON p.organization_id = u.organization_id
JOIN tasks ta ON ta.project_id = p.id
CROSS JOIN generate_series(0, 4) as day_of_week
WHERE u.organization_id = '550e8400-e29b-41d4-a716-446655440000'
  AND RANDOM() > 0.6
ON CONFLICT DO NOTHING;

-- Create invoices for completed projects
INSERT INTO invoices (id, project_id, invoice_number, status, total_amount, currency, billing_period_start, billing_period_end, due_date)
SELECT
  uuid_generate_v4(),
  p.id,
  'INV-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD((ROW_NUMBER() OVER (ORDER BY p.id))::text, 4, '0'),
  CASE (ROW_NUMBER() OVER (ORDER BY p.id) % 4)
    WHEN 0 THEN 'paid'::invoice_status
    WHEN 1 THEN 'approved'::invoice_status
    WHEN 2 THEN 'pending'::invoice_status
    ELSE 'draft'::invoice_status
  END,
  p.expected_budget * (0.7 + RANDOM() * 0.3),
  'USD',
  p.start_date,
  LEAST(p.end_date, CURRENT_DATE),
  CURRENT_DATE + INTERVAL '30 days'
FROM projects p
WHERE p.organization_id = '550e8400-e29b-41d4-a716-446655440000'
  AND p.status IN ('active'::project_status, 'completed'::project_status)
ON CONFLICT DO NOTHING;

-- Create skills for users
INSERT INTO user_skills (id, user_id, skill_name, proficiency_level, years_of_experience)
SELECT
  uuid_generate_v4(),
  u.id,
  skill,
  CASE (RANDOM() * 3)::int
    WHEN 0 THEN 'beginner'
    WHEN 1 THEN 'intermediate'
    ELSE 'expert'
  END,
  (1 + RANDOM() * 20)::numeric
FROM users u
CROSS JOIN (
  VALUES 
    ('React'), ('Node.js'), ('TypeScript'), ('Python'), ('AWS'), ('Docker'), 
    ('PostgreSQL'), ('MongoDB'), ('Figma'), ('UI/UX Design'), ('Project Management'),
    ('Agile'), ('Scrum'), ('SQL'), ('GraphQL'), ('REST APIs'), ('Testing'),
    ('DevOps'), ('CI/CD'), ('Git'), ('Linux'), ('Windows Server')
) skills(skill)
WHERE u.organization_id = '550e8400-e29b-41d4-a716-446655440000'
  AND RANDOM() > 0.7
ON CONFLICT DO NOTHING;

-- Create allocations
INSERT INTO allocations (id, user_id, project_id, start_date, end_date, allocation_percentage, allocation_type)
SELECT
  uuid_generate_v4(),
  u.id,
  p.id,
  GREATEST(p.start_date, CURRENT_DATE),
  p.end_date,
  (50 + RANDOM() * 50)::numeric,
  CASE (RANDOM() * 2)::int WHEN 0 THEN 'full_time'::allocation_type ELSE 'part_time'::allocation_type END
FROM users u
JOIN projects p ON p.organization_id = u.organization_id
WHERE u.organization_id = '550e8400-e29b-41d4-a716-446655440000'
  AND RANDOM() > 0.7
ON CONFLICT DO NOTHING;
