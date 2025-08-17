-- Allow super admins to delete any contact messages
CREATE POLICY "Super admins can delete contact messages" 
ON public.contact_messages 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() 
  AND role = 'super_admin'
));

-- Update news default status to approved for automatic approval
ALTER TABLE public.news ALTER COLUMN status SET DEFAULT 'approved';