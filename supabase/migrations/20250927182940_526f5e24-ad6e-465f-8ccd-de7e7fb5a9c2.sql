-- Allow everyone to view basic profile info for author display
-- This is needed so news articles can show author names
CREATE POLICY "Allow viewing basic profile info for authors" 
ON public.profiles 
FOR SELECT 
USING (true);

-- Drop the overly restrictive policy that only allowed users to view their own profiles
DROP POLICY IF EXISTS "Allow users to view their own profile" ON public.profiles;