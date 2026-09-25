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
      <div className="w-full mx-auto px-4 sm:px-6 pt-8 pb-4">
        <h1 className="ds-display text-3xl sm:text-4xl leading-tight">
          {title}
        </h1>
        {summary && <p className="text-sm text-muted-foreground mt-1">{summary}</p>}
      </div>

      <div className="w-full mx-auto px-4 sm:px-6 pb-12 space-y-6">
        <RelationInfoForm relationStatus={relationStatus} />
      </div>
    </div>
  );
}
