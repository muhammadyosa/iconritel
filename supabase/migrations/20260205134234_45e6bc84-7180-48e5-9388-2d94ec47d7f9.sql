-- Add last_online column to profiles table for tracking user activity
ALTER TABLE public.profiles ADD COLUMN last_online timestamp with time zone;