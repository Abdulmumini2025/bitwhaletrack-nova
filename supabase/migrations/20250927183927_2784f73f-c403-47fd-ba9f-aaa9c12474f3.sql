-- Update default status for news table to be 'approved' instead of 'pending'
-- This makes all submitted news auto-approved
ALTER TABLE public.news ALTER COLUMN status SET DEFAULT 'approved';