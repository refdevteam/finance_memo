-- Add wallet edit rate limit columns to profiles (server-side enforcement)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS wallet_edit_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS wallet_edit_date DATE;
