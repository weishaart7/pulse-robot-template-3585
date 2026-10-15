import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFamilyLinks, useFamilyProfile, useMaritalStatus } from '@/hooks/useFamilyData';
import { LiensFamiliauxForm } from './components/LiensFamiliauxForm';
import { ageEnAnnees } from '@/lib/family/age';
import { childrenLinkedToSpouse, leavesCouple } from '@/lib/family/statutTransition';
import { FamilyLink } from '@/services/familyService';
import { Users } from 'lucide-react';
import { grouperMembres } from '@/lib/family/groupesMembres';
import { PanelTitle, SummaryRow, WorkspaceHeader } from '@/components/layout/workspace-panel';
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

const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

const STATUTS = ['Célibataire', 'Concubinage', 'Pacsé(e)', 'Marié(e)', 'Divorcé(e)', 'Veuf/Veuve'];

// Bloc d'une personne du foyer dans le panneau latéral : titre + lien vers la fiche, puis
// lignes libellé / valeur.
function PersonBlock({ title, name, birth, profession, onOpen }: {
  title: string;
  name?: string;
  birth?: string;
  profession?: string;
  onOpen: () => void;
}) {
  return (
    <section>
      <PanelTitle
        action={
          <button type="button" onClick={onOpen} className={`text-[13px] text-muted-foreground hover:text-foreground rounded-[4px] ${FOCUS_RING}`}>
            Voir la fiche
          </button>
        }
      >
        {title}
      </PanelTitle>
      <dl className="mt-3">
        <SummaryRow label="Nom">{name}</SummaryRow>
        <SummaryRow label="Naissance">{birth ? format(new Date(birth), 'dd/MM/yyyy') : undefined}</SummaryRow>
        <SummaryRow label="Âge">{birth ? `${ageEnAnnees(birth)} ans` : undefined}</SummaryRow>
        <SummaryRow label="Profession">{profession || undefined}</SummaryRow>
      </dl>
    </section>
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
      <SelectTrigger size="lg" className="bg-background border-border shadow-none rounded-[2px] focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/20">
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
    : undefined;

  const membres = familyLinks ?? [];
  const groupes = grouperMembres(membres);
  const summary = [relationStatus || 'Célibataire', `${membres.length} membre${membres.length > 1 ? 's' : ''}`].join(' · ');

  return (
    <div className="pb-6">
      <div className="workspace-panel rounded-card border border-border bg-card overflow-hidden">
        <WorkspaceHeader
          icon={<Users strokeWidth={1.75} />}
          trail={['Famille', 'Foyer']}
          actions={
            <button
              type="button"
              onClick={() => navigate('/dashboard/famille/membres')}
              className={`inline-flex h-9 items-center rounded-[2px] border border-border px-3.5 text-[13px] font-medium text-foreground transition-colors hover:bg-secondary ${FOCUS_RING}`}
            >
              {membres.length === 0 ? 'Ajouter des membres' : 'Gérer les membres'}
            </button>
          }
        />

        <div className="px-6 pt-6 pb-5">
          <h1 className="text-[26px] font-medium leading-tight tracking-[-0.02em]">Foyer</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">{summary}</p>
        </div>

        {/* Bandeau : le couple, son statut et la composition de la famille, en colonnes filetées */}
        <div className="grid grid-cols-1 border-y border-border md:grid-cols-2 xl:grid-cols-3 divide-y divide-border md:divide-y-0 md:divide-x">
          <div className="px-6 py-5">
            <PersonBlock
              title="Client"
              name={clientName}
              birth={familyProfile?.date_naissance}
              profession={familyProfile?.profession}
              onOpen={() => navigate('/dashboard/famille/client')}
            />
          </div>
          {hasPartner ? (
            <div className="px-6 py-5">
              <PersonBlock
                title={relationStatus === 'Marié(e)' ? 'Conjoint(e)' : 'Partenaire'}
                name={partnerName}
                birth={maritalData?.date_naissance_conjoint}
                profession={maritalData?.profession_conjoint}
                onOpen={() => navigate('/dashboard/famille/conjoint')}
              />
            </div>
          ) : null}
          <div className={`px-6 py-5 ${hasPartner ? 'md:col-span-2 md:border-t md:border-border xl:col-span-1 xl:border-t-0' : 'xl:col-span-2'}`}>
            <PanelTitle>Statut du couple</PanelTitle>
            <div className="mt-3 max-w-xs">{statutSelect}</div>
            <div className="mt-5">
              <PanelTitle>Composition</PanelTitle>
              {groupes.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-x-7 gap-y-3">
                  {groupes.map(g => (
                    <div key={g.id}>
                      <p className="text-[22px] font-medium leading-none tracking-[-0.02em] text-foreground">{g.membres.length}</p>
                      <p className="mt-1.5 text-[13px] text-muted-foreground">{g.label}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-[14px] text-muted-foreground">Aucun membre renseigné.</p>
              )}
            </div>
          </div>
        </div>

        {/* Arbre familial, pleine largeur */}
        <div className="px-6 py-6">
          <PanelTitle>Arbre familial</PanelTitle>
          <div className="mt-5">
            <LiensFamiliauxForm view="arbre" />
          </div>
        </div>
      </div>

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
