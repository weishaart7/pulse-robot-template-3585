import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useMaritalStatus } from '@/hooks/useFamilyData';
import { RelationInfoForm } from '@/components/famille/RelationInfoForm';

export default function SituationMatrimonialePage() {
  const navigate = useNavigate();
  const { data: maritalData } = useMaritalStatus();
  const relationStatus = (maritalData?.statut_couple as string) || '';
  const title = relationStatus === 'Pacsé(e)' ? 'PACS'
    : relationStatus === 'Concubinage' ? 'Concubinage'
    : relationStatus === 'Divorcé(e)' ? 'Mariage dissous'
    : relationStatus === 'Veuf/Veuve' ? 'Mariage (veuvage)'
    : 'Régime matrimonial';

  return (
    <div>
      <div className="w-full mx-auto px-4 sm:px-6 pt-8">
        <button
          onClick={() => navigate('/dashboard/famille')}
          className="group inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" strokeWidth={1.5} />
          Retour
        </button>
      </div>

      <div className="w-full mx-auto px-4 sm:px-6 pt-6 pb-4">
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
