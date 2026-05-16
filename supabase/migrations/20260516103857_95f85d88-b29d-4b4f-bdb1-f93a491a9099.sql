
-- Fix security_audit_log open INSERT policy
DROP POLICY IF EXISTS "System can insert audit logs" ON public.security_audit_log;

CREATE POLICY "Authenticated users can insert their own audit logs"
ON public.security_audit_log
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Fix blog_articles SELECT exposing drafts to authenticated users
DROP POLICY IF EXISTS "Anyone can view published articles" ON public.blog_articles;

CREATE POLICY "Anyone can view published articles"
ON public.blog_articles
FOR SELECT
USING (published = true);
