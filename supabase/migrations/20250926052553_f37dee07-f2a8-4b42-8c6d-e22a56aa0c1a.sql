-- Remove delete permission for admins on news table
-- They can still reject posts by updating status to 'rejected'
DROP POLICY IF EXISTS "Admins can delete any news" ON public.news;

-- Keep the update permission so admins can reject posts by changing status
-- The existing "Admins can update any news" policy already allows this