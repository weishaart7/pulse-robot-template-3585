
ALTER TABLE public.av_contract_details
ADD COLUMN frais_versement numeric DEFAULT 0,
ADD COLUMN frais_gestion_euros numeric DEFAULT 0,
ADD COLUMN frais_gestion_uc numeric DEFAULT 0,
ADD COLUMN frais_arbitrage numeric DEFAULT 0;
