import { useState } from 'react';
import { MenageForm } from '@/components/fiscalite/MenageForm';
import { SyntheseFoyerFiscal } from '@/components/fiscalite/SyntheseFoyerFiscal';
import { FoyerFiscalInput } from '@/lib/fiscalite';

const FOYER_INITIAL: FoyerFiscalInput = {
  situationFamille: 'celibataire',
  lieuResidence: 'metropole',
  enfantsCharge: [],
  personnesInvalidesCharge: [],
  enfantsMajeursRattaches: 0,
  parentIsole: false,
  ancienParentIsole: false,
  invaliditeDeclarant1: false,
  invaliditeDeclarant2: false,
  ancienCombattantDeclarant1: false,
  ancienCombattantDeclarant2: false,
  veufAncienCombattant: false,
  veuveDeGuerre: false,
};

const MenageSection = () => {
  const [foyerDraft, setFoyerDraft] = useState<FoyerFiscalInput>(FOYER_INITIAL);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <MenageForm onChange={setFoyerDraft} />
      </div>
      <div className="lg:col-span-1">
        <SyntheseFoyerFiscal foyer={foyerDraft} />
      </div>
    </div>
  );
};

export default MenageSection;
