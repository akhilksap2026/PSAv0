-- PSA RocketLine - Setup Auth Users and Demo Data
-- This script creates test users in Supabase Auth and links them to the users table

-- First, create the organization if it doesn't exist
INSERT INTO organizations (id, name, slug, timezone, currency)
VALUES ('550e8400-e29b-41d4-a716-446655440000', 'Demo Organization', 'demo-org', 'UTC', 'USD')
ON CONFLICT (slug) DO NOTHING;

-- Note: Supabase Auth users need to be created via the Auth API
-- However, we can set up the users table with placeholder auth_ids
-- The actual auth users will be created through the dashboard or signup

-- Insert demo users (these will be linked to auth users once created)
INSERT INTO users (auth_id, organization_id, email, full_name, role, is_active, hourly_cost)
VALUES 
  ('00000000-0000-0000-0000-000000000001', '550e8400-e29b-41d4-a716-446655440000', 'admin@example.com', 'Admin User', 'admin', true, 150),
  ('00000000-0000-0000-0000-000000000002', '550e8400-e29b-41d4-a716-446655440000', 'pm@example.com', 'Project Manager', 'project_manager', true, 130),
  ('00000000-0000-0000-0000-000000000003', '550e8400-e29b-41d4-a716-446655440000', 'developer@example.com', 'Dev Team Member', 'team_member', true, 100),
  ('00000000-0000-0000-0000-000000000004', '550e8400-e29b-41d4-a716-446655440000', 'resource@example.com', 'Resource Manager', 'resource_manager', true, 120)
ON CONFLICT (organization_id, email) DO NOTHING;

-- Insert demo projects
INSERT INTO projects (organization_id, name, description, owner_id, status, start_date, end_date, expected_budget, billing_method, currency)
SELECT 
  '550e8400-e29b-41d4-a716-446655440000',
  'E-Commerce Platform Redesign',
  'Complete redesign of the customer-facing e-commerce platform',
  id,
  'active',
  '2024-01-15',
  '2024-06-30',
  150000,
  'fixed_fee',
  'USD'
FROM users 
WHERE email = 'pm@example.com'
LIMIT 1
UNION ALL
SELECT 
  '550e8400-e29b-41d4-a716-446655440000',
  'Mobile App Development',
  'Native iOS and Android application development',
  id,
  'active',
  '2024-02-01',
  '2024-08-31',
  200000,
  'time_and_materials',
  'USD'
FROM users 
WHERE email = 'pm@example.com'
LIMIT 1
UNION ALL
SELECT 
  '550e8400-e29b-41d4-a716-446655440000',
  'Cloud Infrastructure Migration',
  'Migrate on-premise systems to AWS cloud',
  id,
  'active',
  '2024-03-01',
  '2024-05-31',
  75000,
  'fixed_fee',
  'USD'
FROM users 
WHERE email = 'pm@example.com'
LIMIT 1;

-- Insert demo phases for first project
INSERT INTO phases (project_id, name, description, start_date, end_date, sequence_number)
SELECT 
  projects.id,
  'Design & Planning',
  'UX/UI design and project planning',
  '2024-01-15',
  '2024-02-15',
  1
FROM projects
WHERE name = 'E-Commerce Platform Redesign'
LIMIT 1
UNION ALL
SELECT 
  projects.id,
  'Development',
  'Frontend and backend development',
  '2024-02-16',
  '2024-05-15',
  2
FROM projects
WHERE name = 'E-Commerce Platform Redesign'
LIMIT 1
UNION ALL
SELECT 
  projects.id,
  'Testing & QA',
  'Testing and quality assurance',
  '2024-05-16',
  '2024-06-15',
  3
FROM projects
WHERE name = 'E-Commerce Platform Redesign'
LIMIT 1
UNION ALL
SELECT 
  projects.id,
  'Deployment',
  'Production deployment and monitoring',
  '2024-06-16',
  '2024-06-30',
  4
FROM projects
WHERE name = 'E-Commerce Platform Redesign'
LIMIT 1;

-- Insert demo tasks
INSERT INTO tasks (project_id, phase_id, name, description, status, priority, start_date, due_date, estimated_hours, is_billable, assigned_to, created_by)
SELECT 
  projects.id,
  phases.id,
  'User Interface Wireframes',
  'Create wireframes for all key pages',
  'completed',
  'high',
  '2024-01-15',
  '2024-01-25',
  40,
  true,
  users.id,
  users.id
FROM projects
JOIN phases ON projects.id = phases.project_id
JOIN users ON users.email = 'developer@example.com'
WHERE projects.name = 'E-Commerce Platform Redesign' AND phases.name = 'Design & Planning'
LIMIT 1
UNION ALL
SELECT 
  projects.id,
  phases.id,
  'High-Fidelity Mockups',
  'Design high-fidelity mockups using Figma',
  'in_progress',
  'high',
  '2024-01-26',
  '2024-02-10',
  60,
  true,
  users.id,
  users.id
FROM projects
JOIN phases ON projects.id = phases.project_id
JOIN users ON users.email = 'developer@example.com'
WHERE projects.name = 'E-Commerce Platform Redesign' AND phases.name = 'Design & Planning'
LIMIT 1
UNION ALL
SELECT 
  projects.id,
  phases.id,
  'Frontend Component Library',
  'Build reusable React components',
  'not_started',
  'high',
  '2024-02-16',
  '2024-03-15',
  80,
  true,
  users.id,
  users.id
FROM projects
JOIN phases ON projects.id = phases.project_id
JOIN users ON users.email = 'developer@example.com'
WHERE projects.name = 'E-Commerce Platform Redesign' AND phases.name = 'Development'
LIMIT 1
UNION ALL
SELECT 
  projects.id,
  phases.id,
  'Backend API Development',
  'Develop REST APIs for the platform',
  'not_started',
  'high',
  '2024-02-16',
  '2024-04-15',
  120,
  true,
  users.id,
  users.id
FROM projects
JOIN phases ON projects.id = phases.project_id
JOIN users ON users.email = 'developer@example.com'
WHERE projects.name = 'E-Commerce Platform Redesign' AND phases.name = 'Development'
LIMIT 1;
