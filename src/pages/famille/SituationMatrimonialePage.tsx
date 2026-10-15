import { useMaritalStatus } from '@/hooks/useFamilyData';
import { RelationInfoForm } from '@/components/famille/RelationInfoForm';
import { useFamilleSubNav } from './useFamilleSubNav';

export default function SituationMatrimonialePage() {
  const { data: maritalData } = useMaritalStatus();
  useFamilleSubNav('regime');
  const relationStatus = (maritalData?.statut_couple as string) || '';
  const title = relationStatus === 'Pacsé(e)' ? 'PACS'
    : relationStatus === 'Concubinage' ? 'Concubinage'
    : relationStatus === 'Divorcé(e)' ? 'Mariage dissous'
    : relationStatus === 'Veuf/Veuve' ? 'Mariage (veuvage)'
    : 'Régime matrimonial';

  // Rappel compact de l'union : « Marié(e) depuis 2025 · Communauté réduite aux acquêts ».
  const startDate = relationStatus === 'Marié(e)' ? maritalData?.date_mariage
    : relationStatus === 'Pacsé(e)' ? maritalData?.date_pacs
    : undefined;
  const regimeLabel = relationStatus === 'Marié(e)' ? maritalData?.regime_matrimonial
    : relationStatus === 'Pacsé(e)' ? maritalData?.convention_pacs
    : undefined;
  const summary = [
    relationStatus && (startDate ? `${relationStatus} depuis ${new Date(startDate).getFullYear()}` : relationStatus),
    regimeLabel,
  ].filter(Boolean).join(' · ');

  return (
    <div>
      <RelationInfoForm relationStatus={relationStatus} title={title} summary={summary} />
    </div>
  );
}
