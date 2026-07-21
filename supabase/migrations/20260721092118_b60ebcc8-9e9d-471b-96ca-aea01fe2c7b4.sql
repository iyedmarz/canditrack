
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_touch_updated_at() FROM PUBLIC, anon, authenticated;
-- Deny-all default: table already has no policies, add explicit deny for clarity
CREATE POLICY "no client access" ON public.unmatched_email_logs FOR ALL USING (false) WITH CHECK (false);
