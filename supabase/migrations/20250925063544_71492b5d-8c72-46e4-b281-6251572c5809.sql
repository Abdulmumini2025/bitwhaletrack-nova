-- Grant super admin privileges to Timi Ademi
-- First check if the user exists and update their role
UPDATE public.profiles 
SET role = 'super_admin'::user_role
WHERE LOWER(first_name || ' ' || last_name) LIKE '%timi%ademi%' 
   OR LOWER(first_name || ' ' || last_name) LIKE '%ademi%timi%'
   OR (LOWER(first_name) LIKE '%timi%' AND LOWER(last_name) LIKE '%ademi%')
   OR (LOWER(first_name) LIKE '%ademi%' AND LOWER(last_name) LIKE '%timi%');