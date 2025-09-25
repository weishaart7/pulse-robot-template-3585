-- Fix security audit log RLS policy to allow admin access
DROP POLICY IF EXISTS "Admin can view audit logs" ON public.security_audit_log;

-- Create proper RLS policy for security audit logs with admin access
CREATE POLICY "System can insert audit logs" 
ON public.security_audit_log 
FOR INSERT 
WITH CHECK (true);

-- Allow users to view their own audit logs
CREATE POLICY "Users can view their own audit logs" 
ON public.security_audit_log 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create admin function to check if user has admin role
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN AS $$
BEGIN
  -- For now, return false until proper admin system is implemented
  -- This can be enhanced later with proper admin role checking
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Admin policy (disabled for now, can be enabled when admin system is ready)
CREATE POLICY "Admins can view all audit logs" 
ON public.security_audit_log 
FOR SELECT 
USING (public.is_admin_user());