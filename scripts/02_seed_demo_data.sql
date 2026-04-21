-- PSA RocketLine - Demo Data Seed Script
-- This script populates the database with sample data for testing

-- Insert demo organization
INSERT INTO organizations (id, name, slug, timezone, currency)
VALUES ('550e8400-e29b-41d4-a716-446655440001', 'Default Organization', 'default-org', 'UTC', 'USD')
ON CONFLICT (slug) DO NOTHING;

-- Note: Users should be created via Supabase Auth first
-- The auth_id will be populated by the application after signup

-- Insert demo users (these require valid auth_id from Supabase Auth)
-- Placeholder - these will be created via the app signup flow
-- INSERT INTO users (id, auth_id, organization_id, email, full_name, role)
-- VALUES
--   ('550e8400-e29b-41d4-a716-446655440002', '<auth-id>', '550e8400-e29b-41d4-a716-446655440001', 'admin@example.com', 'Admin User', 'admin'),
--   ('550e8400-e29b-41d4-a716-446655440003', '<auth-id>', '550e8400-e29b-41d4-a716-446655440001', 'pm@example.com', 'Project Manager', 'project_manager'),
--   ('550e8400-e29b-41d4-a716-446655440004', '<auth-id>', '550e8400-e29b-41d4-a716-446655440001', 'dev@example.com', 'Developer', 'team_member');

-- Insert demo projects (assuming at least one user exists)
INSERT INTO projects (id, organization_id, name, description, owner_id, status, start_date, end_date, expected_budget, billing_method, currency)
SELECT
  '550e8400-e29b-41d4-a716-446655440010',
  '550e8400-e29b-41d4-a716-446655440001',
  'Website Redesign',
  'Complete redesign and modernization of company website',
  id,
  'active',
  '2024-01-15',
  '2024-03-31',
  50000,
  'time_and_materials',
  'USD'
FROM users
WHERE organization_id = '550e8400-e29b-41d4-a716-446655440001'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO projects (id, organization_id, name, description, owner_id, status, start_date, end_date, expected_budget, billing_method, currency)
SELECT
  '550e8400-e29b-41d4-a716-446655440011',
  '550e8400-e29b-41d4-a716-446655440001',
  'Mobile App Development',
  'Native iOS and Android mobile application',
  id,
  'active',
  '2024-02-01',
  '2024-06-30',
  75000,
  'fixed_fee',
  'USD'
FROM users
WHERE organization_id = '550e8400-e29b-41d4-a716-446655440001'
LIMIT 1
ON CONFLICT DO NOTHING;

-- Insert demo phases
INSERT INTO phases (id, project_id, name, description, start_date, end_date, sequence_number)
VALUES
  ('550e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440010', 'Design', 'UI/UX Design Phase', '2024-01-15', '2024-01-31', 1),
  ('550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440010', 'Development', 'Frontend & Backend Development', '2024-02-01', '2024-03-15', 2),
  ('550e8400-e29b-41d4-a716-446655440022', '550e8400-e29b-41d4-a716-446655440010', 'Testing', 'QA and Testing', '2024-03-16', '2024-03-31', 3)
ON CONFLICT DO NOTHING;

-- Insert demo tasks
INSERT INTO tasks (id, project_id, phase_id, name, description, status, priority, start_date, due_date, estimated_hours, is_billable)
SELECT
  '550e8400-e29b-41d4-a716-446655440030',
  '550e8400-e29b-41d4-a716-446655440010',
  '550e8400-e29b-41d4-a716-446655440020',
  'Create Wireframes',
  'Design wireframes for all pages',
  'completed',
  'high',
  '2024-01-15',
  '2024-01-20',
  40,
  true,
  (SELECT id FROM users WHERE organization_id = '550e8400-e29b-41d4-a716-446655440001' AND role = 'team_member' LIMIT 1)
FROM (SELECT 1) t
WHERE EXISTS (SELECT 1 FROM users WHERE organization_id = '550e8400-e29b-41d4-a716-446655440001')
ON CONFLICT DO NOTHING;

INSERT INTO tasks (id, project_id, phase_id, name, description, status, priority, start_date, due_date, estimated_hours, is_billable)
SELECT
  '550e8400-e29b-41d4-a716-446655440031',
  '550e8400-e29b-41d4-a716-446655440010',
  '550e8400-e29b-41d4-a716-446655440021',
  'Frontend Development',
  'Implement responsive frontend using React',
  'in_progress',
  'critical',
  '2024-02-01',
  '2024-03-01',
  80,
  true,
  (SELECT id FROM users WHERE organization_id = '550e8400-e29b-41d4-a716-446655440001' AND role = 'team_member' LIMIT 1)
FROM (SELECT 1) t
WHERE EXISTS (SELECT 1 FROM users WHERE organization_id = '550e8400-e29b-41d4-a716-446655440001')
ON CONFLICT DO NOTHING;

INSERT INTO tasks (id, project_id, phase_id, name, description, status, priority, start_date, due_date, estimated_hours, is_billable)
SELECT
  '550e8400-e29b-41d4-a716-446655440032',
  '550e8400-e29b-41d4-a716-446655440010',
  '550e8400-e29b-41d4-a716-446655440021',
  'Backend API Development',
  'Build RESTful APIs with Node.js',
  'in_progress',
  'critical',
  '2024-02-01',
  '2024-03-10',
  100,
  true,
  (SELECT id FROM users WHERE organization_id = '550e8400-e29b-41d4-a716-446655440001' AND role = 'team_member' LIMIT 1)
FROM (SELECT 1) t
WHERE EXISTS (SELECT 1 FROM users WHERE organization_id = '550e8400-e29b-41d4-a716-446655440001')
ON CONFLICT DO NOTHING;
