-- Fix function search path security warnings
-- Update the update_updated_at_column function to include proper search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Update the get_author_name function to include proper search_path
CREATE OR REPLACE FUNCTION public.get_author_name(author_user_id uuid)
 RETURNS TABLE(first_name text, last_name text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $function$
  SELECT p.first_name, p.last_name 
  FROM public.profiles p 
  WHERE p.user_id = author_user_id;
$function$;