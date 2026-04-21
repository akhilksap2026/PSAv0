-- PSA RocketLine - Setup Demo Data and Test Users
-- This script creates demo organizations, users, projects, and tasks
-- Note: auth_id is set to NULL for demo users (not linked to Supabase Auth)

-- First, create the demo organization
INSERT INTO organizations (id, name, slug, timezone, currency)
VALUES ('550e8400-e29b-41d4-a716-446655440000', 'Demo Organization', 'demo-org', 'UTC', 'USD')
ON CONFLICT (slug) DO NOTHING;

-- Insert demo users without auth IDs (demo mode)
INSERT INTO users (id, auth_id, organization_id, email, full_name, role, is_active, hourly_cost)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440001', NULL, '550e8400-e29b-41d4-a716-446655440000', 'admin@example.com', 'Admin User', 'admin', true, 150),
  ('550e8400-e29b-41d4-a716-446655440002', NULL, '550e8400-e29b-41d4-a716-446655440000', 'pm@example.com', 'Project Manager', 'project_manager', true, 130),
  ('550e8400-e29b-41d4-a716-446655440003', NULL, '550e8400-e29b-41d4-a716-446655440000', 'developer@example.com', 'Dev Team Member', 'team_member', true, 100),
  ('550e8400-e29b-41d4-a716-446655440004', NULL, '550e8400-e29b-41d4-a716-446655440000', 'resource@example.com', 'Resource Manager', 'resource_manager', true, 120)
ON CONFLICT (organization_id, email) DO NOTHING;

-- Insert demo projects
INSERT INTO projects (id, organization_id, name, description, owner_id, status, start_date, end_date, expected_budget, billing_method, currency)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440000', 'E-Commerce Platform Redesign', 'Complete redesign of the customer-facing e-commerce platform', '550e8400-e29b-41d4-a716-446655440002', 'active', '2024-01-15', '2024-06-30', 150000, 'fixed_fee', 'USD'),
  ('550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440000', 'Mobile App Development', 'Native iOS and Android application development', '550e8400-e29b-41d4-a716-446655440002', 'active', '2024-02-01', '2024-08-31', 200000, 'time_and_materials', 'USD'),
  ('550e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440000', 'Cloud Infrastructure Migration', 'Migrate on-premise systems to AWS cloud', '550e8400-e29b-41d4-a716-446655440002', 'active', '2024-03-01', '2024-05-31', 75000, 'fixed_fee', 'USD')
ON CONFLICT DO NOTHING;

-- Insert demo phases for first project
INSERT INTO phases (id, project_id, name, description, start_date, end_date, sequence_number)
VALUES
  ('550e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440010', 'Design & Planning', 'UX/UI design and project planning', '2024-01-15', '2024-02-15', 1),
  ('550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440010', 'Development', 'Frontend and backend development', '2024-02-16', '2024-05-15', 2),
  ('550e8400-e29b-41d4-a716-446655440022', '550e8400-e29b-41d4-a716-446655440010', 'Testing & QA', 'Testing and quality assurance', '2024-05-16', '2024-06-15', 3),
  ('550e8400-e29b-41d4-a716-446655440023', '550e8400-e29b-41d4-a716-446655440010', 'Deployment', 'Production deployment and monitoring', '2024-06-16', '2024-06-30', 4)
ON CONFLICT DO NOTHING;

-- Insert demo tasks for first project
INSERT INTO tasks (id, project_id, phase_id, name, description, status, priority, start_date, due_date, estimated_hours, is_billable, assigned_to, created_by)
VALUES
  ('550e8400-e29b-41d4-a716-446655440030', '550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440020', 'User Interface Wireframes', 'Create wireframes for all key pages', 'completed', 'high', '2024-01-15', '2024-01-25', 40, true, '550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440003'),
  ('550e8400-e29b-41d4-a716-446655440031', '550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440020', 'High-Fidelity Mockups', 'Design high-fidelity mockups using Figma', 'in_progress', 'high', '2024-01-26', '2024-02-10', 60, true, '550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440003'),
  ('550e8400-e29b-41d4-a716-446655440032', '550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440021', 'Frontend Component Library', 'Build reusable React components', 'not_started', 'high', '2024-02-16', '2024-03-15', 80, true, '550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440003'),
  ('550e8400-e29b-41d4-a716-446655440033', '550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440021', 'Backend API Development', 'Develop REST APIs for the platform', 'not_started', 'high', '2024-02-16', '2024-04-15', 120, true, '550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440003'),
  ('550e8400-e29b-41d4-a716-446655440034', '550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440022', 'Quality Assurance Testing', 'Comprehensive testing of all features', 'not_started', 'critical', '2024-05-16', '2024-06-10', 60, true, '550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440003')
ON CONFLICT DO NOTHING;

-- Add project members
INSERT INTO project_members (project_id, user_id, role)
VALUES
  ('550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440002', 'owner'),
  ('550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440003', 'member'),
  ('550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440004', 'member'),
  ('550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440002', 'owner'),
  ('550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440003', 'member'),
  ('550e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440002', 'owner'),
  ('550e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440004', 'member')
ON CONFLICT DO NOTHING;
