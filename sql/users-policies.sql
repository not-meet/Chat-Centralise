-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create policy for users to read their own record and admins to read all
CREATE POLICY "Users can read own record and admins read all"
ON public.users
FOR SELECT
USING (
  auth.uid() = id 
  OR 
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);

-- Create policy for users to update their own record
CREATE POLICY "Users can update own record"
ON public.users
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Grant necessary permissions
GRANT SELECT, UPDATE ON public.users TO authenticated;
GRANT USAGE ON SEQUENCE users_id_seq TO authenticated; 