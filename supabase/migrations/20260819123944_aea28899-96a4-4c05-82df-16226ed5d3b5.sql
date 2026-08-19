CREATE TABLE public.email_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender text,
  sender_raw text,
  subject text,
  snippet text,
  classification text,
  application_id uuid REFERENCES public.applications(id) ON DELETE SET NULL,
  match_reason text,
  status text NOT NULL DEFAULT 'unmatched',
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX email_notifications_user_created_idx ON public.email_notifications (user_id, created_at DESC);

GRANT SELECT, UPDATE, DELETE ON public.email_notifications TO authenticated;
GRANT ALL ON public.email_notifications TO service_role;

ALTER TABLE public.email_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own notifications read" ON public.email_notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own notifications update" ON public.email_notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own notifications delete" ON public.email_notifications FOR DELETE TO authenticated USING (auth.uid() = user_id);