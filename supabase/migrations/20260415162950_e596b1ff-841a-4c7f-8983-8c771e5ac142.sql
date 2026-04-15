
-- Table for AV contract details (composition, clause bénéficiaire)
CREATE TABLE public.av_contract_details (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  part_fonds_euros NUMERIC DEFAULT 0,
  part_unites_compte NUMERIC DEFAULT 0,
  clause_beneficiaire TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(asset_id)
);

ALTER TABLE public.av_contract_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own AV details" ON public.av_contract_details
  FOR SELECT TO public USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own AV details" ON public.av_contract_details
  FOR INSERT TO public WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own AV details" ON public.av_contract_details
  FOR UPDATE TO public USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own AV details" ON public.av_contract_details
  FOR DELETE TO public USING (auth.uid() = user_id);

-- Table for AV versements and rachats
CREATE TABLE public.av_operations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  type_operation TEXT NOT NULL CHECK (type_operation IN ('versement', 'rachat')),
  montant NUMERIC NOT NULL,
  date_operation DATE NOT NULL,
  commentaire TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.av_operations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own AV operations" ON public.av_operations
  FOR SELECT TO public USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own AV operations" ON public.av_operations
  FOR INSERT TO public WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own AV operations" ON public.av_operations
  FOR UPDATE TO public USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own AV operations" ON public.av_operations
  FOR DELETE TO public USING (auth.uid() = user_id);
