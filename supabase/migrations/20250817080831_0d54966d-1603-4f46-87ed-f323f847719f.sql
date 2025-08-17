-- Fix infinite recursion by completely removing problematic policies and creating simpler ones

-- Drop all existing policies on profiles that might cause recursion
DROP POLICY IF EXISTS "Admins can view all profiles v2" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile v2" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- Create simple, non-recursive policies for profiles
CREATE POLICY "Allow users to view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Allow users to update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Allow users to insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create a security definer function to check if user is admin/super_admin
CREATE OR REPLACE FUNCTION public.is_admin(user_uuid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = user_uuid 
    AND role IN ('admin', 'super_admin')
  );
$$;

-- Allow admins to view all profiles using the function
CREATE POLICY "Allow admins to view all profiles" 
ON public.profiles 
FOR SELECT 
USING (public.is_admin());

-- Allow admins to update all profiles using the function
CREATE POLICY "Allow admins to update all profiles" 
ON public.profiles 
FOR UPDATE 
USING (public.is_admin());

-- Make sure anyone can view profiles for news display (for author names)
CREATE POLICY "Allow viewing profiles for public content" 
ON public.profiles 
FOR SELECT 
USING (true);