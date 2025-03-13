-- First, create test users in auth.users (this is handled by Supabase Auth)
-- We'll create the corresponding entries in our users table

-- Create an admin user
INSERT INTO public.users (id, email, full_name, role, status, created_at)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'admin@test.com', 'Test Admin', 'admin', 'active', NOW());

-- Create agent users
INSERT INTO public.users (id, email, full_name, role, status, created_at)
VALUES 
  ('00000000-0000-0000-0000-000000000002', 'agent1@test.com', 'Test Agent 1', 'agent', 'active', NOW()),
  ('00000000-0000-0000-0000-000000000003', 'agent2@test.com', 'Test Agent 2', 'agent', 'active', NOW());

-- Add some preferences for the agents
UPDATE public.users
SET preferences = jsonb_build_object(
  'max_concurrent_chats', 5,
  'notifications_enabled', true,
  'metrics', jsonb_build_object(
    'total_messages', 0,
    'response_time_avg', 0,
    'active_chats', 0
  )
)
WHERE role = 'agent'; 