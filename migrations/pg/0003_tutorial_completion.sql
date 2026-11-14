-- Persist tutorial completion/skip for each authenticated user.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS tutorial_completed_at TIMESTAMP;
