import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { PartnerForm } from '@/components/famille/PartnerForm';
import { useMaritalStatus } from '@/hooks/useFamilyData';
import { ageEnAnnees } from '@/lib/family/age';
import { useFamilleSubNav } from './useFamilleSubNav';

export default function ConjointPage() {
  const navigate = useNavigate();
  const { data: maritalData } = useMaritalStatus();
  useFamilleSubNav('foyer');

  const partnerName = maritalData?.prenom_conjoint && maritalData?.nom_conjoint
    ? `${maritalData.prenom_conjoint} ${maritalData.nom_conjoint}`
    : 'Conjoint';

  const dateStr = maritalData?.date_naissance_conjoint;
  const summary = ['Identité du partenaire', dateStr && `${format(new Date(dateStr), 'dd/MM/yyyy')} · ${ageEnAnnees(dateStr)} ans`]
    .filter(Boolean).join(' · ');

  return (
    <div>
      <PartnerForm title={partnerName} summary={summary} onBack={() => navigate('/dashboard/famille')} />
    </div>
  );
}
