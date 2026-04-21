-- PSA RocketLine - Rich Demo Data for 250 Employee Company
-- Simplified seed script with proper UUID and enum handling

-- Disable duplicate key checks for demo data
INSERT INTO users (id, auth_id, organization_id, email, full_name, role, is_active, hourly_cost)
SELECT 
  gen_random_uuid(),
  NULL,
  '550e8400-e29b-41d4-a716-446655440000'::uuid,
  'user' || seq || '@example.com',
  'Team Member ' || seq,
  CASE seq % 5
    WHEN 0 THEN 'admin'::user_role
    WHEN 1 THEN 'project_manager'::user_role
    WHEN 2 THEN 'resource_manager'::user_role
    ELSE 'team_member'::user_role
  END,
  true,
  (80 + (seq % 100))
FROM generate_series(1, 246) seq
ON CONFLICT DO NOTHING;

-- Create 35 projects
INSERT INTO projects (id, organization_id, name, description, owner_id, status, start_date, end_date, expected_budget, billing_method, currency)
SELECT
  gen_random_uuid(),
  '550e8400-e29b-41d4-a716-446655440000'::uuid,
  'Project ' || seq || ' - ' || CASE seq % 10
    WHEN 0 THEN 'E-Commerce Platform'
    WHEN 1 THEN 'Mobile App'
    WHEN 2 THEN 'Cloud Migration'
    WHEN 3 THEN 'Analytics Dashboard'
    WHEN 4 THEN 'API Gateway'
    WHEN 5 THEN 'CRM System'
    WHEN 6 THEN 'Marketing Automation'
    WHEN 7 THEN 'Inventory System'
    WHEN 8 THEN 'Payment Gateway'
    ELSE 'Strategic Initiative'
  END,
  'Project description for ' || seq,
  '550e8400-e29b-41d4-a716-446655440002'::uuid,
  CASE seq % 3
    WHEN 0 THEN 'active'::project_status
    WHEN 1 THEN 'completed'::project_status
    ELSE 'planning'::project_status
  END,
  (CURRENT_DATE - INTERVAL '1 day' * (seq * 30))::date,
  (CURRENT_DATE + INTERVAL '1 day' * ((35 - seq) * 20))::date,
  (50000 + (seq * 15000))::numeric,
  CASE seq % 3
    WHEN 0 THEN 'fixed_fee'::billing_method
    WHEN 1 THEN 'time_and_materials'::billing_method
    ELSE 'subscription'::billing_method
  END,
  'USD'
FROM generate_series(1, 35) seq
ON CONFLICT DO NOTHING;

-- Add project members (12 per project)
WITH project_user_pairs AS (
  SELECT
    p.id as project_id,
    u.id as user_id,
    row_number() OVER (PARTITION BY p.id ORDER BY u.id) as user_rank
  FROM projects p
  CROSS JOIN (SELECT id FROM users WHERE organization_id = '550e8400-e29b-41d4-a716-446655440000'::uuid ORDER BY RANDOM() LIMIT 250) u
)
INSERT INTO project_members (project_id, user_id, role)
SELECT
  project_id,
  user_id,
  CASE (user_rank % 3)
    WHEN 1 THEN 'owner'
    WHEN 2 THEN 'lead'
    ELSE 'member'
  END
FROM project_user_pairs
WHERE user_rank <= 12
ON CONFLICT DO NOTHING;
