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

  return (
    <div>
      <div className="w-full mx-auto px-4 sm:px-6 pt-8 pb-4">
        <h1 className="ds-display text-3xl sm:text-4xl leading-tight">
          {title}
        </h1>
      </div>

      <div className="w-full mx-auto px-4 sm:px-6 pb-12 space-y-6">
        <RelationInfoForm relationStatus={relationStatus} />
      </div>
    </div>
  );
}
