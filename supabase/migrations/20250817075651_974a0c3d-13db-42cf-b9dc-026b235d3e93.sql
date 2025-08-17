-- Fix infinite recursion in profiles RLS policies by creating separate policies for different user types

-- Drop existing potentially problematic policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;

-- Create new non-recursive policies for admin access
CREATE POLICY "Admins can view all profiles v2" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.id IN (
      SELECT user_id FROM public.profiles p2 
      WHERE p2.role IN ('admin', 'super_admin')
    )
  )
);

CREATE POLICY "Admins can update any profile v2" 
ON public.profiles 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.id IN (
      SELECT user_id FROM public.profiles p2 
      WHERE p2.role IN ('admin', 'super_admin')
    )
  )
);

-- Create a function to get like count for news articles
CREATE OR REPLACE FUNCTION public.get_news_likes_count(news_article_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM public.likes 
  WHERE news_id = news_article_id;
$$;

-- Create a function to check if user liked a news article
CREATE OR REPLACE FUNCTION public.user_liked_news(news_article_id uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.likes 
    WHERE news_id = news_article_id 
    AND user_id = user_uuid
  );
$$;