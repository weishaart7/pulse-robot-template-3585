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
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_300px]">
      <MenageForm onChange={setFoyerDraft} />
      <div className="px-8 pb-8 xl:pl-0 xl:pt-[88px]">
        <div className="xl:sticky xl:top-8">
          <SyntheseFoyerFiscal foyer={foyerDraft} />
        </div>
      </div>
    </div>
  );
};

export default MenageSection;
