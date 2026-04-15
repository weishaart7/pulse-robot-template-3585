
ALTER TABLE public.av_contract_details
ADD COLUMN objectif text DEFAULT NULL,
ADD COLUMN versements_programmes boolean DEFAULT false,
ADD COLUMN versements_programmes_montant numeric DEFAULT NULL,
ADD COLUMN versements_programmes_periodicite text DEFAULT NULL,
ADD COLUMN rachats_programmes boolean DEFAULT false,
ADD COLUMN rachats_programmes_montant numeric DEFAULT NULL,
ADD COLUMN rachats_programmes_periodicite text DEFAULT NULL;
