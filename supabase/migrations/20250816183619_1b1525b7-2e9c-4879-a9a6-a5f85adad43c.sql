-- Promote the existing user to super_admin role
UPDATE public.profiles 
SET role = 'super_admin'::user_role 
WHERE user_id = 'b9fc91be-af99-4c3a-8b09-02faffd36db9';