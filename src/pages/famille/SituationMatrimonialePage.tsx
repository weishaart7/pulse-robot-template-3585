import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useMaritalStatus } from '@/hooks/useFamilyData';
import { PartnerForm } from '@/components/famille/PartnerForm';
import { RelationInfoForm } from '@/components/famille/RelationInfoForm';

export default function SituationMatrimonialePage() {
  const navigate = useNavigate();
  const { data: maritalData } = useMaritalStatus();
  const relationStatus = (maritalData?.statut_couple as string) || '';

  return (
    <div className="min-h-screen bg-white">
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
        <h1 className="text-3xl font-semibold tracking-tight text-foreground leading-tight">
          Situation matrimoniale
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Partenaire et détails de la relation
        </p>
      </div>

      <div className="w-full mx-auto px-4 sm:px-6 pb-12 space-y-12">
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Partenaire</h2>
          <PartnerForm />
        </section>

        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Relation</h2>
          <RelationInfoForm relationStatus={relationStatus} />
        </section>
      </div>
    </div>
  );
}
