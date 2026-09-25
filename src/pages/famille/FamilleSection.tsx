import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFamilyLinks, useFamilyProfile, useMaritalStatus } from '@/hooks/useFamilyData';
import { LiensFamiliauxForm } from './components/LiensFamiliauxForm';
import { ageEnAnnees } from '@/lib/family/age';
import { childrenLinkedToSpouse, leavesCouple } from '@/lib/family/statutTransition';
import { FamilyLink } from '@/services/familyService';
import { ChevronRight } from 'lucide-react';
import { useFamilleSubNav } from './useFamilleSubNav';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import profilHomme from '@/assets/Profil homme.png';
import profilFemme from '@/assets/Profil femme.png';

const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

const STATUTS = ['Célibataire', 'Concubinage', 'Pacsé(e)', 'Marié(e)', 'Divorcé(e)', 'Veuf/Veuve'];

const profileImage = (civility?: string) => (civility === 'Mme' || civility === 'Mlle' ? profilFemme : profilHomme);

// Carte d'identité du Foyer (client ou conjoint) : ouvre la fiche au clic.
function PersonCard({ image, eyebrow, name, details, onClick, className = '' }: {
  className?: string;
  image: string;
  eyebrow: string;
  name: string;
  details: string[];
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex w-full items-center gap-4 ${className} rounded-card border border-border bg-card p-4 text-left transition-colors hover:border-foreground/25 ${FOCUS_RING}`}
    >
      <img src={image} alt="" className="h-14 w-14 shrink-0 rounded-full object-cover object-top ring-1 ring-border" />
      <div className="min-w-0 flex-1">
        <p className="ds-eyebrow text-muted-foreground">{eyebrow}</p>
        <p className="mt-1 text-base font-semibold leading-tight text-foreground truncate">{name}</p>
        <p className="mt-1 text-xs text-muted-foreground truncate">
          {details.length > 0 ? details.join(' · ') : 'Fiche à compléter'}
        </p>
      </div>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors group-hover:bg-muted group-hover:text-foreground">
        <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2} />
      </span>
    </button>
  );
}

const FamilleSection = () => {
  const navigate = useNavigate();
  const { data: familyProfile } = useFamilyProfile();
  const { data: maritalData, setStatutCouple } = useMaritalStatus();
  const { data: familyLinks } = useFamilyLinks();
  useFamilleSubNav('foyer');

  const relationStatus = (maritalData?.statut_couple as string) || '';
  const hasPartner = ['Concubinage', 'Pacsé(e)', 'Marié(e)'].includes(relationStatus);

  // Transition en attente de confirmation (sortie d'un statut en couple).
  const [pendingStatut, setPendingStatut] = useState<{ statut: string; children: FamilyLink[] } | null>(null);

  const applyStatut = async (statut: string) => {
    if (statut === 'Célibataire') {
      await setStatutCouple('Célibataire', { parent_isole: false });
    } else {
      await setStatutCouple(statut);
    }
  };

  const handleStatutChange = async (statut: string) => {
    if (statut === relationStatus) return;
    if (leavesCouple(relationStatus, statut)) {
      setPendingStatut({ statut, children: childrenLinkedToSpouse(familyLinks) });
      return;
    }
    await applyStatut(statut);
  };

  const statutSelect = (
    <Select value={relationStatus || 'Célibataire'} onValueChange={handleStatutChange}>
      <SelectTrigger size="lg" className="bg-background border-border shadow-none rounded-md focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/20">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUTS.map(statut => (
          <SelectItem key={statut} value={statut}>{statut}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const partnerName = maritalData?.prenom_conjoint && maritalData?.nom_conjoint
    ? `${maritalData.prenom_conjoint} ${maritalData.nom_conjoint}`
    : undefined;

  const clientName = familyProfile?.prenom && familyProfile?.nom
    ? `${familyProfile.prenom} ${familyProfile.nom}`
    : 'Utilisateur';

  // Naissance · âge · profession, en omettant ce qui n'est pas renseigné.
  const personDetails = (dateStr?: string, profession?: string) => [
    ...(dateStr ? [`${format(new Date(dateStr), 'dd/MM/yyyy')}`, `${ageEnAnnees(dateStr)} ans`] : []),
    ...(profession ? [profession] : []),
  ];

  return (
    <div className="pb-6 md:px-6 space-y-5">
      {/* Foyer : client, conjoint et statut ; le détail du régime vit dans sa sous-section */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
        <PersonCard
          image={profileImage(familyProfile?.civility)}
          eyebrow="Client"
          className={hasPartner ? '' : 'sm:col-span-2 lg:col-span-2'}
          name={clientName}
          details={personDetails(familyProfile?.date_naissance, familyProfile?.profession)}
          onClick={() => navigate('/dashboard/famille/client')}
        />
        {hasPartner ? (
          <PersonCard
            image={profileImage(maritalData?.civilite_conjoint)}
            eyebrow={relationStatus === 'Marié(e)' ? 'Conjoint(e)' : 'Partenaire'}
            name={partnerName || 'Partenaire'}
            details={personDetails(maritalData?.date_naissance_conjoint, maritalData?.profession_conjoint)}
            onClick={() => navigate('/dashboard/famille/conjoint')}
          />
        ) : null}
        <div className="flex flex-col justify-center gap-1.5 rounded-card border border-border bg-card p-4 sm:col-span-2 lg:col-span-1 lg:w-56">
          <label className="ds-eyebrow text-muted-foreground">Statut</label>
          {statutSelect}
        </div>
      </div>

      <LiensFamiliauxForm view="arbre" />

      <AlertDialog open={!!pendingStatut} onOpenChange={(open) => { if (!open) setPendingStatut(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Passer au statut « {pendingStatut?.statut} » ?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  Le partenaire n'apparaîtra plus dans l'arbre familial ni dans les calculs.
                  Ses informations et celles du régime restent enregistrées.
                </p>
                {pendingStatut && pendingStatut.children.length > 0 && (
                  <>
                    <p>
                      {pendingStatut.children.length} enfant(s) sont rattachés au partenaire. Leur
                      rattachement n'est pas modifié : vérifiez-le après le changement.
                    </p>
                    <ul className="list-disc pl-5">
                      {pendingStatut.children.map(child => (
                        <li key={child.id}>{child.prenom ? `${child.prenom} ` : ''}{child.nom}</li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const statut = pendingStatut?.statut;
                setPendingStatut(null);
                if (statut) applyStatut(statut);
              }}
            >
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FamilleSection;
