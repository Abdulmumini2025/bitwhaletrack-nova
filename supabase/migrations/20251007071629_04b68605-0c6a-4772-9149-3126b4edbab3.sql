-- Add username field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN username TEXT UNIQUE;

-- Create index on username for fast lookups
CREATE INDEX idx_profiles_username ON public.profiles(username);

-- Create function to search users by username
CREATE OR REPLACE FUNCTION public.search_users_by_username(search_term TEXT)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    user_id,
    username,
    first_name,
    last_name,
    avatar_url
  FROM public.profiles
  WHERE 
    username ILIKE '%' || search_term || '%'
    OR first_name ILIKE '%' || search_term || '%'
    OR last_name ILIKE '%' || search_term || '%'
  LIMIT 20;
$$;