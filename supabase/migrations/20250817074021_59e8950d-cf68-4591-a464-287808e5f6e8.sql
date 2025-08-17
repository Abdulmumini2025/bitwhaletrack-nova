-- Drop the overly permissive policy that allows anyone to view all profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create more secure policies for profile access
-- Users can view their own profile
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

-- Admins can view all profiles (for admin functionality)
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.profiles admin_check 
  WHERE admin_check.user_id = auth.uid() 
  AND admin_check.role IN ('admin', 'super_admin')
));

-- Allow viewing of basic public info (names only) for displaying article authors
-- This creates a security definer function to safely get author names
CREATE OR REPLACE FUNCTION public.get_author_name(author_user_id uuid)
RETURNS TABLE(first_name text, last_name text)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT p.first_name, p.last_name 
  FROM public.profiles p 
  WHERE p.user_id = author_user_id;
$$;