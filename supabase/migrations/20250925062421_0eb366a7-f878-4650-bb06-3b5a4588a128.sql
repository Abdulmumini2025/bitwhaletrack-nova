-- Remove the overly permissive policy that allows public access to profiles
DROP POLICY IF EXISTS "Allow viewing profiles for public content" ON public.profiles;

-- The remaining policies ensure:
-- 1. Users can view/update their own profiles
-- 2. Admins can view/update all profiles  
-- 3. Public content (like news author names) uses the security definer function get_author_name()
--    which safely exposes only the necessary first_name and last_name without direct table access