import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFamilyProfile, useMaritalStatus } from '@/hooks/useFamilyData';
import { FicheClientForm } from './components/FicheClientForm';
import { LiensFamiliauxForm, LiensFamiliauxFormHandle } from './components/LiensFamiliauxForm';
import { getInitials } from '@/lib/family/initials';
import { childrenLinkedToSpouse, leavesCouple } from '@/lib/family/statutTransition';
import { FamilyLink } from '@/services/familyService';
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
import { ArrowLeft, ChevronRight, Scale, Plus } from 'lucide-react';
import profilHomme from '@/assets/Profil homme.png';
import profilFemme from '@/assets/Profil femme.png';

type EditView = 'client';

const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

const STATUTS = ['Célibataire', 'Concubinage', 'Pacsé(e)', 'Marié(e)', 'Divorcé(e)', 'Veuf/Veuve'];

const profileImage = (civility?: string) => (civility === 'Mme' || civility === 'Mlle' ? profilFemme : profilHomme);

const FamilleSection = () => {
  const navigate = useNavigate();
  const [editView, setEditView] = useState<EditView | null>(null);
  const { data: familyProfile, refetch: refetchProfile } = useFamilyProfile();
  const { data: maritalData, setStatutCouple } = useMaritalStatus();
  const liensRef = useRef<LiensFamiliauxFormHandle>(null);

  const relationStatus = (maritalData?.statut_couple as string) || '';
  const hasPartner = ['Concubinage', 'Pacsé(e)', 'Marié(e)'].includes(relationStatus);
  const isDivorcedOrWidowed = ['Divorcé(e)', 'Veuf/Veuve'].includes(relationStatus);

  const regimeTabLabel = relationStatus === 'Marié(e)' ? 'Régime matrimonial'
    : relationStatus === 'Pacsé(e)' ? 'PACS'
    : relationStatus === 'Concubinage' ? 'Concubinage'
    : 'Régime matrimonial';

  // Transition en attente de confirmation (sortie d'un statut en couple).
  const [pendingStatut, setPendingStatut] = useState<{ statut: string; children: FamilyLink[] } | null>(null);

  const applyStatut = async (statut: string) => {
    if (statut === 'Célibataire') {
      await setStatutCouple('Célibataire', { parent_isole: false });
    } else {
      await setStatutCouple(statut);
    }
    liensRef.current?.refreshMaritalStatus();
  };

  const handleStatutChange = async (statut: string) => {
    if (statut === relationStatus) return;
    if (leavesCouple(relationStatus, statut)) {
      setPendingStatut({ statut, children: childrenLinkedToSpouse(liensRef.current?.getFamilyLinks() ?? []) });
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

  const ageFromBirthDate = (dateStr?: string) => {
    if (!dateStr) return undefined;
    const birth = new Date(dateStr);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const beforeBirthday =
      today.getMonth() < birth.getMonth() ||
      (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate());
    if (beforeBirthday) age--;
    return age;
  };

  const secondaryLine = (dateStr?: string) => {
    if (!dateStr) return '—';
    const age = ageFromBirthDate(dateStr);
    return `${format(new Date(dateStr), 'dd/MM/yyyy')} · ${age} ans`;
  };

  // Full-screen edit view (fiche client uniquement — partenaire/relation vivent désormais sur leur propre page)
  if (editView === 'client') {
    return (
      <div>
        <div className="w-full mx-auto px-4 sm:px-6 pt-8">
          <button
            onClick={() => setEditView(null)}
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
              {getInitials(familyProfile?.prenom, familyProfile?.nom)}
            </div>
            <div>
              <h1 className="ds-display text-3xl sm:text-4xl">
                {clientName}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Fiche personnelle · {secondaryLine(familyProfile?.date_naissance)}
              </p>
            </div>
          </div>
        </div>

        <div className="w-full mx-auto px-4 sm:px-6 pb-12">
          <FicheClientForm onSuccess={() => {
            setEditView(null);
            refetchProfile();
          }} />
        </div>
      </div>
    );
  }

  const { regimeStatusLine, regimeDetailLabel } = (() => {
    if (!hasPartner) return { regimeStatusLine: '', regimeDetailLabel: '' };
    let statusLine = relationStatus;
    const startDateStr = relationStatus === 'Marié(e)' ? maritalData?.date_mariage
      : relationStatus === 'Pacsé(e)' ? maritalData?.date_pacs
      : undefined;
    if (startDateStr) {
      statusLine += ` depuis ${new Date(startDateStr).getFullYear()}`;
    }
    const detailLabel = relationStatus === 'Marié(e)' ? maritalData?.regime_matrimonial
      : relationStatus === 'Pacsé(e)' ? maritalData?.convention_pacs
      : undefined;
    return { regimeStatusLine: statusLine, regimeDetailLabel: detailLabel || '' };
  })();

  return (
    <div className="p-6 pt-0 space-y-5">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        {hasPartner ? (
          <div className="flex flex-col gap-1 w-60">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Statut
            </label>
            {statutSelect}
          </div>
        ) : <div />}
        <button
          onClick={() => liensRef.current?.openForAdd()}
          className="inline-flex items-center gap-2 rounded-full bg-foreground hover:bg-foreground/85 text-background shadow-whisper pl-1 pr-4 py-1 text-sm font-medium transition-colors"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-background/15">
            <Plus className="h-4 w-4 text-background" />
          </span>
          Ajouter un membre
        </button>
      </div>

      {/* Foyer — identité */}
      <div className="flex flex-wrap gap-5">
        <div
          className="relative w-60 h-[420px] shrink-0 rounded-[22px] overflow-hidden cursor-pointer group"
          role="button"
          tabIndex={0}
          onClick={() => setEditView('client')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setEditView('client'); } }}
        >
          <img
            src={profileImage(familyProfile?.civility)}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-5">
            <p className="text-white text-[15px] font-semibold leading-tight">{clientName}</p>
            <p className="text-white/70 text-xs mt-1">{secondaryLine(familyProfile?.date_naissance)}</p>
            <p className="text-white/60 text-[13px] mt-2">{familyProfile?.profession || 'Vous'}</p>
          </div>
        </div>

        {hasPartner ? (
          <div
            className="relative w-60 h-[420px] shrink-0 rounded-[22px] overflow-hidden cursor-pointer group"
            role="button"
            tabIndex={0}
            onClick={() => navigate('/dashboard/famille/conjoint')}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/dashboard/famille/conjoint'); } }}
          >
            <img
              src={profileImage(maritalData?.civilite_conjoint)}
              alt=""
              className="absolute inset-0 h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-5">
              <p className="text-white text-[15px] font-semibold leading-tight">{partnerName || 'Partenaire'}</p>
              <p className="text-white/70 text-xs mt-1">{secondaryLine(maritalData?.date_naissance_conjoint)}</p>
              <p className="text-white/60 text-[13px] mt-2">Conjoint(e)</p>
            </div>
          </div>
        ) : (
          <div className="w-60 h-[420px] shrink-0 rounded-card border border-border bg-card p-6 flex flex-col gap-3 justify-center">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Statut
              </label>
              {statutSelect}
            </div>
            {isDivorcedOrWidowed && (
              <button
                onClick={() => navigate('/dashboard/famille/situation-matrimoniale')}
                className={`group inline-flex w-fit items-center gap-1.5 rounded-full bg-foreground px-3.5 py-1.5 text-[12px] font-medium text-background shadow-whisper transition-opacity duration-200 hover:opacity-85 ${FOCUS_RING}`}
              >
                Voir le détail
                <ChevronRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={2} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Régime matrimonial / PACS — carte distincte */}
      {hasPartner && (
        <div className="flex items-center justify-between gap-5 flex-wrap rounded-card border border-border bg-card p-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-full bg-foreground/10 flex items-center justify-center shrink-0">
              <Scale className="w-4 h-4 text-foreground" strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {regimeTabLabel}
              </p>
              <p className="text-sm font-semibold text-foreground truncate">{regimeStatusLine}</p>
              {regimeDetailLabel && (
                <p className="text-sm mt-0.5 text-muted-foreground truncate">{regimeDetailLabel}</p>
              )}
            </div>
          </div>
          <button
            onClick={() => navigate('/dashboard/famille/situation-matrimoniale')}
            className={`group inline-flex shrink-0 items-center gap-1.5 rounded-full bg-foreground px-3.5 py-1.5 text-[12px] font-medium text-background shadow-whisper transition-opacity duration-200 hover:opacity-85 ${FOCUS_RING}`}
          >
            Voir le détail
            <ChevronRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={2} />
          </button>
        </div>
      )}

      <LiensFamiliauxForm ref={liensRef} onSelectMain={() => setEditView('client')} />

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
