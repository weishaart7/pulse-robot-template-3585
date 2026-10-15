import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { FicheClientForm } from './components/FicheClientForm';
import { useFamilyProfile } from '@/hooks/useFamilyData';
import { ageEnAnnees } from '@/lib/family/age';
import { useFamilleSubNav } from './useFamilleSubNav';

export default function ClientPage() {
  const navigate = useNavigate();
  const { data: familyProfile, refetch: refetchProfile } = useFamilyProfile();
  useFamilleSubNav('foyer');

  const clientName = familyProfile?.prenom && familyProfile?.nom
    ? `${familyProfile.prenom} ${familyProfile.nom}`
    : 'Utilisateur';

  const dateStr = familyProfile?.date_naissance;
  const summary = ['Fiche personnelle', dateStr && `${format(new Date(dateStr), 'dd/MM/yyyy')} · ${ageEnAnnees(dateStr)} ans`]
    .filter(Boolean).join(' · ');

  return (
    <div>
      <FicheClientForm
        title={clientName}
        summary={summary}
        onBack={() => navigate('/dashboard/famille')}
        onSuccess={() => {
          refetchProfile();
          navigate('/dashboard/famille');
        }}
      />
    </div>
  );
}
