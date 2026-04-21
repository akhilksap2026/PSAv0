-- Verify users were created successfully
SELECT 
  id,
  email,
  full_name,
  role,
  organization_id,
  is_active,
  created_at
FROM users
ORDER BY created_at DESC;
