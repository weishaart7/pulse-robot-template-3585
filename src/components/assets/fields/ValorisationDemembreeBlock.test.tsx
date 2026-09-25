// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { subYears, format } from 'date-fns';
import { ValorisationDemembreeBlock } from './ValorisationDemembreeBlock';
import { getFractionDemembrement } from '@/lib/patrimoine/demembrementFraction';
import { mapDetenteurToDb, FamilyInfo } from '@/lib/patrimoine/utils';
import { DemembrementDraft } from '@/components/assets/DemembrementSection';
import { AssetFormValues } from '@/schemas/assetSchema';

const dateNaissance = (age: number) => format(subYears(new Date(), age), 'yyyy-MM-dd');

const familyData: FamilyInfo = {
  hasPartner: true,
  userFirstName: 'Alice',
  partnerFirstName: 'Bruno',
  userDateNaissance: dateNaissance(45), // tranche 60 % / 40 %
  partnerDateNaissance: dateNaissance(35), // tranche 70 % / 30 %
};
const familyMembers = [{ id: 'enfant-1', nom: 'X', date_naissance: dateNaissance(75) }]; // 30 % / 70 %
const demembrements: DemembrementDraft[] = [{ type_partie: 'famille', family_link_id: 'enfant-1' }];

const Harness = ({ mode, detenteur }: { mode: string; detenteur: string }) => {
  const form = useForm<AssetFormValues>({
    defaultValues: { mode_detention: mode, detenteur, valeur_estimee: 100000 } as Partial<AssetFormValues>,
  });
  return (
    <ValorisationDemembreeBlock
      form={form}
      familyData={familyData}
      familyMembers={familyMembers}
      demembrements={demembrements}
    />
  );
};

// L'aperçu du formulaire et les totaux (getFractionDemembrement, sur la valeur
// persistée du détenteur) doivent toujours retenir la même tranche.
describe('ValorisationDemembreeBlock — concordance avec les totaux', () => {
  afterEach(cleanup);

  const cas: Array<[string, string]> = [
    ['Usufruit', 'Alice'],
    ['Usufruit', 'Bruno'],
    ['Usufruit', 'Le couple'],
    ['Nue-propriété', 'Alice'],
    ['Nue-propriété', 'Le couple'],
  ];

  it.each(cas)('%s détenu par %s', (mode, detenteur) => {
    render(<Harness mode={mode} detenteur={detenteur} />);
    const fraction = getFractionDemembrement(
      { mode_detention: mode, detenteur: mapDetenteurToDb(detenteur, familyData) },
      demembrements,
      {
        familyProfile: { date_naissance: familyData.userDateNaissance },
        maritalStatus: { date_naissance_conjoint: familyData.partnerDateNaissance },
        familyLinks: familyMembers,
      }
    );
    expect(fraction).not.toBeNull();
    const libelle = mode === 'Usufruit' ? 'Valeur usufruit' : 'Valeur nue-propriété';
    expect(screen.getByText(new RegExp(`${libelle} \\(${Math.round(fraction! * 100)}%\\)`))).toBeInTheDocument();
  });
});
