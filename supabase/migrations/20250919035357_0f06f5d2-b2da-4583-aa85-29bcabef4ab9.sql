-- Enhanced security functions for input validation

-- Function to validate email format server-side
CREATE OR REPLACE FUNCTION public.validate_email(email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate financial amounts
CREATE OR REPLACE FUNCTION public.validate_financial_amount(amount NUMERIC)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if amount is positive and within reasonable limits
  RETURN amount IS NOT NULL 
    AND amount >= 0 
    AND amount <= 999999999999 
    AND scale(amount) <= 2; -- Max 2 decimal places
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log security events in database
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  action TEXT NOT NULL,
  user_id UUID,
  resource TEXT,
  success BOOLEAN NOT NULL,
  severity TEXT DEFAULT 'medium',
  ip_address INET,
  user_agent TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on security audit log
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Only allow admin users to view audit logs (for now, restrict to specific user IDs)
-- In production, you would create proper admin roles
CREATE POLICY "Admin can view audit logs" 
ON public.security_audit_log 
FOR SELECT 
USING (false); -- Restrict for now, enable when admin system is ready

-- Function to insert security audit log
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_action TEXT,
  p_user_id UUID DEFAULT NULL,
  p_resource TEXT DEFAULT NULL,
  p_success BOOLEAN DEFAULT TRUE,
  p_severity TEXT DEFAULT 'medium',
  p_details JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.security_audit_log (
    action, user_id, resource, success, severity, details
  ) VALUES (
    p_action, p_user_id, p_resource, p_success, p_severity, p_details
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add validation triggers for financial data
CREATE OR REPLACE FUNCTION public.validate_asset_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate financial amounts
  IF NEW.valeur_estimee IS NOT NULL AND NOT validate_financial_amount(NEW.valeur_estimee) THEN
    RAISE EXCEPTION 'Invalid estimated value: must be positive and within reasonable limits';
  END IF;
  
  IF NEW.valeur_acquisition IS NOT NULL AND NOT validate_financial_amount(NEW.valeur_acquisition) THEN
    RAISE EXCEPTION 'Invalid acquisition value: must be positive and within reasonable limits';
  END IF;
  
  -- Log the data modification
  PERFORM log_security_event(
    'asset_data_validation',
    NEW.user_id,
    'assets',
    TRUE,
    'medium',
    jsonb_build_object('asset_id', NEW.id, 'action', TG_OP)
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply validation trigger to assets table
DROP TRIGGER IF EXISTS validate_asset_data_trigger ON public.assets;
CREATE TRIGGER validate_asset_data_trigger
  BEFORE INSERT OR UPDATE ON public.assets
  FOR EACH ROW EXECUTE FUNCTION validate_asset_data();

-- Add similar validation for other financial tables
CREATE OR REPLACE FUNCTION public.validate_financial_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Generic validation for tables with financial amounts
  IF TG_TABLE_NAME = 'emprunts' THEN
    IF NEW.capital_restant_du IS NOT NULL AND NOT validate_financial_amount(NEW.capital_restant_du) THEN
      RAISE EXCEPTION 'Invalid remaining capital amount';
    END IF;
    IF NEW.mensualite IS NOT NULL AND NOT validate_financial_amount(NEW.mensualite) THEN
      RAISE EXCEPTION 'Invalid monthly payment amount';
    END IF;
  ELSIF TG_TABLE_NAME = 'charges' THEN
    IF NEW.montant IS NOT NULL AND NOT validate_financial_amount(NEW.montant) THEN
      RAISE EXCEPTION 'Invalid charge amount';
    END IF;
  ELSIF TG_TABLE_NAME = 'revenus' THEN
    IF NEW.montant IS NOT NULL AND NOT validate_financial_amount(NEW.montant) THEN
      RAISE EXCEPTION 'Invalid revenue amount';
    END IF;
  END IF;
  
  -- Log validation event
  PERFORM log_security_event(
    'financial_data_validation',
    NEW.user_id,
    TG_TABLE_NAME,
    TRUE,
    'high',
    jsonb_build_object('table', TG_TABLE_NAME, 'action', TG_OP)
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply validation triggers to financial tables
DROP TRIGGER IF EXISTS validate_emprunts_trigger ON public.emprunts;
CREATE TRIGGER validate_emprunts_trigger
  BEFORE INSERT OR UPDATE ON public.emprunts
  FOR EACH ROW EXECUTE FUNCTION validate_financial_data();

DROP TRIGGER IF EXISTS validate_charges_trigger ON public.charges;
CREATE TRIGGER validate_charges_trigger
  BEFORE INSERT OR UPDATE ON public.charges
  FOR EACH ROW EXECUTE FUNCTION validate_financial_data();

DROP TRIGGER IF EXISTS validate_revenus_trigger ON public.revenus;
CREATE TRIGGER validate_revenus_trigger
  BEFORE INSERT OR UPDATE ON public.revenus
  FOR EACH ROW EXECUTE FUNCTION validate_financial_data();