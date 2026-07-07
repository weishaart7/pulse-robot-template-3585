import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PartnerForm } from '@/components/famille/PartnerForm';

export default function ConjointPage() {
  const navigate = useNavigate();

  return (
    <div className="bg-white">
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
          Conjoint
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Identité et coordonnées du partenaire
        </p>
      </div>

      <div className="w-full mx-auto px-4 sm:px-6 pb-12">
        <PartnerForm />
      </div>
    </div>
  );
}
