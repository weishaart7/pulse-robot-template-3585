-- Fix search path security warnings for all functions

-- Fix validate_email function
CREATE OR REPLACE FUNCTION public.validate_email(email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Fix validate_financial_amount function
CREATE OR REPLACE FUNCTION public.validate_financial_amount(amount NUMERIC)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if amount is positive and within reasonable limits
  RETURN amount IS NOT NULL 
    AND amount >= 0 
    AND amount <= 999999999999 
    AND scale(amount) <= 2; -- Max 2 decimal places
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Fix log_security_event function
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Fix validate_asset_data function
CREATE OR REPLACE FUNCTION public.validate_asset_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate financial amounts using qualified function name
  IF NEW.valeur_estimee IS NOT NULL AND NOT public.validate_financial_amount(NEW.valeur_estimee) THEN
    RAISE EXCEPTION 'Invalid estimated value: must be positive and within reasonable limits';
  END IF;
  
  IF NEW.valeur_acquisition IS NOT NULL AND NOT public.validate_financial_amount(NEW.valeur_acquisition) THEN
    RAISE EXCEPTION 'Invalid acquisition value: must be positive and within reasonable limits';
  END IF;
  
  -- Log the data modification using qualified function name
  PERFORM public.log_security_event(
    'asset_data_validation',
    NEW.user_id,
    'assets',
    TRUE,
    'medium',
    jsonb_build_object('asset_id', NEW.id, 'action', TG_OP)
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Fix validate_financial_data function
CREATE OR REPLACE FUNCTION public.validate_financial_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Generic validation for tables with financial amounts using qualified function name
  IF TG_TABLE_NAME = 'emprunts' THEN
    IF NEW.capital_restant_du IS NOT NULL AND NOT public.validate_financial_amount(NEW.capital_restant_du) THEN
      RAISE EXCEPTION 'Invalid remaining capital amount';
    END IF;
    IF NEW.mensualite IS NOT NULL AND NOT public.validate_financial_amount(NEW.mensualite) THEN
      RAISE EXCEPTION 'Invalid monthly payment amount';
    END IF;
  ELSIF TG_TABLE_NAME = 'charges' THEN
    IF NEW.montant IS NOT NULL AND NOT public.validate_financial_amount(NEW.montant) THEN
      RAISE EXCEPTION 'Invalid charge amount';
    END IF;
  ELSIF TG_TABLE_NAME = 'revenus' THEN
    IF NEW.montant IS NOT NULL AND NOT public.validate_financial_amount(NEW.montant) THEN
      RAISE EXCEPTION 'Invalid revenue amount';
    END IF;
  END IF;
  
  -- Log validation event using qualified function name
  PERFORM public.log_security_event(
    'financial_data_validation',
    NEW.user_id,
    TG_TABLE_NAME,
    TRUE,
    'high',
    jsonb_build_object('table', TG_TABLE_NAME, 'action', TG_OP)
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';