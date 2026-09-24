import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowLeft } from 'lucide-react';
import { PartnerForm } from '@/components/famille/PartnerForm';
import { useMaritalStatus } from '@/hooks/useFamilyData';
import { getInitials } from '@/lib/family/initials';
import { ageEnAnnees } from '@/lib/family/age';

export default function ConjointPage() {
  const navigate = useNavigate();
  const { data: maritalData } = useMaritalStatus();

  const partnerName = maritalData?.prenom_conjoint && maritalData?.nom_conjoint
    ? `${maritalData.prenom_conjoint} ${maritalData.nom_conjoint}`
    : 'Conjoint';

  const secondaryLine = (() => {
    const dateStr = maritalData?.date_naissance_conjoint;
    if (!dateStr) return null;
    const age = ageEnAnnees(dateStr);
    return `${format(new Date(dateStr), 'dd/MM/yyyy')} · ${age} ans`;
  })();

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

      <div className="w-full mx-auto px-4 sm:px-6 pt-6 pb-8">
        <div className="flex items-center gap-4">
          <div
            className="bg-foreground h-14 w-14 rounded-full flex items-center justify-center shrink-0 text-background text-lg font-semibold"
            
          >
            {getInitials(maritalData?.prenom_conjoint, maritalData?.nom_conjoint)}
          </div>
          <div>
            <h1 className="ds-display text-3xl sm:text-4xl leading-tight">
              {partnerName}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Identité du partenaire{secondaryLine ? ` · ${secondaryLine}` : ''}
            </p>
          </div>
        </div>
      </div>

      <div className="w-full mx-auto px-4 sm:px-6 pb-12">
        <PartnerForm />
      </div>
    </div>
  );
}
