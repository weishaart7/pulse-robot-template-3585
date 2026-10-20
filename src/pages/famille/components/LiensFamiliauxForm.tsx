import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Trash2, Pencil, MoreHorizontal, Users } from 'lucide-react';
import { FamilyTreeCards } from '@/components/famille/FamilyTreeCards';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { useFamilyLinks, useFamilyProfile, useMaritalStatus } from '@/hooks/useFamilyData';
import { FamilyLink, familyService, type FamilyLinkUsage } from '@/services/familyService';
import { FamilyMemberFormDialog, FamilyMemberFormDialogHandle } from '@/components/family/FamilyMemberFormDialog';
import { cn } from '@/lib/utils';
import { formatAgeCourt } from '@/lib/family/age';
import { getInitials } from '@/lib/family/initials';
import { grouperMembres, type GroupeMembres } from '@/lib/family/groupesMembres';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { AddButton, Chip, WorkspaceHeader } from '@/components/layout/workspace-panel';
import { SectionHeader } from '@/components/family/SectionHeader';
import { getGroupeTone } from '@/components/famille/groupeTones';

const LIBELLES_USAGE: Record<string, string> = {
  liberalite: 'Libéralité',
  indivision: 'Indivision',
  demembrement: 'Démembrement',
  assurance_vie: 'Clause bénéficiaire',
};

// Tag de la liste des membres — accent (lagon) = avantage fiscal.
function FamilyTag({ children, accent = false }: { children: React.ReactNode; accent?: boolean }) {
  return <Chip tone={accent ? 'lagon' : 'neutral'}>{children}</Chip>;
}

interface LiensFamiliauxFormProps {
  // « arbre » : arbre familial du Foyer ; « membres » : tableau de la sous-section Membres.
  // Le dialogue d'ajout/modification est commun aux deux vues.
  view: 'arbre' | 'membres';
}

// Répartit les groupes sur deux colonnes en équilibrant le nombre de membres (ordre conservé dans
// chaque colonne) : Descendants et Collatéraux, souvent courts, se partagent une colonne face aux
// Ascendants.
function repartirEnColonnes(groupes: GroupeMembres[]): [GroupeMembres[], GroupeMembres[]] {
  const colonnes: [GroupeMembres[], GroupeMembres[]] = [[], []];
  const hauteurs = [0, 0];
  for (const groupe of groupes) {
    const cible = hauteurs[0] <= hauteurs[1] ? 0 : 1;
    colonnes[cible].push(groupe);
    hauteurs[cible] += groupe.membres.length + 2; // + en-tête de section
  }
  return colonnes;
}

export function LiensFamiliauxForm({ view }: LiensFamiliauxFormProps) {
  const navigate = useNavigate();
  const {
    data: familyLinks,
    loading,
    saving,
    addLink,
    updateLink,
    deleteLinkWithCascade
  } = useFamilyLinks();
  const { data: familyProfile } = useFamilyProfile();
  const { data: maritalStatus } = useMaritalStatus();
  const dialogRef = useRef<FamilyMemberFormDialogHandle>(null);
  const [memberToDelete, setMemberToDelete] = useState<FamilyLink | null>(null);

  // Membres dont enfant_de pointe vers ce membre (Petit-enfant → Enfant,
  // Arrière petit-enfant → Petit-enfant, etc. — cf. useFamilyLinkLogic.ts::
  // getParentOptions) : à afficher dans la confirmation, car leur
  // rattachement sera réinitialisé par deleteLinkWithCascade.
  // Usages hors de la famille (libéralités, indivisions, démembrements, clauses
  // d'assurance-vie) : tant qu'il y en a, la suppression est refusée (la base
  // la refuse aussi) — null pendant le chargement.
  const [usages, setUsages] = useState<FamilyLinkUsage[] | null>(null);
  useEffect(() => {
    setUsages(null);
    if (!memberToDelete?.id) return;
    let annule = false;
    familyService.getFamilyLinkUsages(memberToDelete.id)
      .then(u => { if (!annule) setUsages(u); })
      // Vérification impossible : on laisse la base trancher à la suppression.
      .catch(() => { if (!annule) setUsages([]); });
    return () => { annule = true; };
  }, [memberToDelete?.id]);
  const suppressionBloquee = !!usages && usages.length > 0;

  const dependentsOf = (member: FamilyLink) =>
    familyLinks.filter(link => link.enfant_de === member.id);

  const confirmDeleteMember = async () => {
    if (!memberToDelete?.id) return;
    try {
      await deleteLinkWithCascade(memberToDelete.id);
    } catch (error) {
      // Notification déjà affichée par useFamilyLinks.
      if (import.meta.env.DEV) {
        console.error('Erreur lors de la suppression:', error);
      }
    } finally {
      setMemberToDelete(null);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Chargement des données..." />;
  }
  const groupes = grouperMembres(familyLinks);
  const colonnes = repartirEnColonnes(groupes);

  // Le trait de fin de liste disparaît quand une autre famille suit : le séparateur de section suffit.
  const renderGroupe = (groupe: GroupeMembres) => (
      <section key={groupe.id} className="px-8 py-5 [&:not(:last-child)>ul]:border-b-0">
        <div className="flex items-baseline justify-between">
          <SectionHeader title={groupe.label} markClassName={getGroupeTone(groupe.id).mark} />
          <span className="text-[12px] tabular-nums text-muted-foreground">{groupe.membres.length}</span>
        </div>
        <ul className="-mx-2 border-b border-border">
        {groupe.membres.map(member => (
          <li
            key={member.id}
            role="button"
            tabIndex={0}
            onClick={() => dialogRef.current?.openForEdit(member)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                dialogRef.current?.openForEdit(member);
              }
            }}
            className={cn(
              "flex items-center gap-3 border-t border-border px-2 py-2 cursor-pointer transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:bg-muted/40",
              member.est_decede && "text-muted-foreground"
            )}
          >
            <span className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-[4px] text-[11.5px] font-semibold",
              member.est_decede ? "border border-border text-muted-foreground" : getGroupeTone(groupe.id).avatar
            )}>
              {getInitials(member.prenom, member.nom)}
            </span>
    
            <div className="min-w-0 flex-1">
              <p className={cn("text-sm font-medium truncate", !member.est_decede && "text-foreground")}>
                {[member.prenom, member.nom].filter(Boolean).join(' ')}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-muted-foreground">
                  {member.lien_familial}
                  {member.lien_familial === 'Enfant' && member.parent_de === 'spouse' && ' · beau-fils/belle-fille'}
                </span>
                {member.handicap && <FamilyTag>Handicap</FamilyTag>}
                {member.enfant_a_charge && member.fiscalement_a_charge ? <FamilyTag accent>À charge civil + fiscal</FamilyTag> : <>
                  {member.enfant_a_charge && <FamilyTag accent>À charge civil</FamilyTag>}
                  {member.fiscalement_a_charge && <FamilyTag accent>À charge fiscal</FamilyTag>}
                </>}
                {member.enfant_adopte && member.enfant_adopte !== 'Non' && <FamilyTag>{member.enfant_adopte}</FamilyTag>}
                {member.enfant_renoncant && <FamilyTag>Renonçant</FamilyTag>}
                {member.exoneration_succession && <FamilyTag accent>Exonération</FamilyTag>}
              </div>
            </div>
    
            <div className="shrink-0 text-right">
              {member.date_naissance ? (
                <>
                  <p className={cn("text-sm tabular-nums", !member.est_decede && "text-foreground")}>
                    {format(new Date(member.date_naissance), 'dd/MM/yyyy')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {member.est_decede
                      ? (member.date_deces ? `† ${new Date(member.date_deces).getFullYear()}` : 'Décédé(e)')
                      : formatAgeCourt(member.date_naissance)}
                  </p>
                </>
              ) : (
                <span className="text-sm text-muted-foreground">{member.est_decede ? 'Décédé(e)' : '—'}</span>
              )}
            </div>
    
            <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 rounded-[2px] shadow-none"
                    disabled={saving}
                    aria-label="Ouvrir le menu"
                  >
                    <MoreHorizontal size={16} strokeWidth={2} aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => dialogRef.current?.openForEdit(member)}>
                    <Pencil />
                    Modifier
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={() => setMemberToDelete(member)}>
                    <Trash2 />
                    Supprimer
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </li>
        ))}
        </ul>
      </section>
  );

  return <div className={cn(view === 'arbre' && 'space-y-6')}>
      {/* Arbre seul : le cadre, le titre et l'accès aux membres sont portés par la page Foyer. */}
      {view === 'arbre' && <div>
        <FamilyTreeCards
          familyProfile={familyProfile}
          maritalStatus={maritalStatus}
          familyLinks={familyLinks}
          onSelectMain={() => navigate('/dashboard/famille/client')}
          onSelectSpouse={() => navigate('/dashboard/famille/conjoint')}
          onSelectMember={(member) => dialogRef.current?.openForEdit(member)}
        />
      </div>}

      {view === 'membres' && <div className="workspace-panel -mx-4 -mt-3 md:-m-6">
        <WorkspaceHeader
          icon={<Users strokeWidth={1.75} />}
          trail={['Famille', 'Membres']}
          actions={
                <AddButton tone="citron" onClick={() => dialogRef.current?.openForAdd()}>Ajouter un membre</AddButton>
          }
        />

        <div className="px-8 pt-6 pb-4">
          <h1 className="text-[24px] font-medium leading-tight tracking-[-0.02em]">Membres de la famille</h1>
          <p className="mt-1 text-[12.5px] text-muted-foreground">
            {familyLinks.length === 0
              ? 'Aucun membre renseigné'
              : `${familyLinks.length} membre${familyLinks.length > 1 ? 's' : ''} · base de la dévolution et des abattements`}
          </p>
        </div>

        {familyLinks.length === 0 ? (
          <div className="border-t border-border px-8 py-7">
            <p className="max-w-md text-[13px] text-muted-foreground">
              Ajoutez les enfants, parents, frères et sœurs… : ils servent au calcul de la succession
              et des abattements.
            </p>
          </div>
        ) : (
          <>
            {/* Mobile : groupes dans l'ordre. */}
            <div className="divide-y divide-border border-t border-border lg:hidden">
              {groupes.map(renderGroupe)}
            </div>
            {/* Desktop : deux colonnes indépendantes, les groupes courts s'empilent sans laisser de blanc
                face à un groupe long. */}
            <div className="hidden border-t border-border lg:grid lg:grid-cols-2">
              {colonnes.map((colonne, index) => (
                <div key={index} className={cn('divide-y divide-border', index === 0 && 'border-r border-border')}>
                  {colonne.map(renderGroupe)}
                </div>
              ))}
            </div>
          </>
        )}
      </div>}

      <FamilyMemberFormDialog
        ref={dialogRef}
        familyLinks={familyLinks}
        familyProfile={familyProfile}
        maritalStatus={maritalStatus}
        saving={saving}
        addLink={addLink}
        updateLink={updateLink}
      />

      <AlertDialog open={!!memberToDelete} onOpenChange={(open) => { if (!open) setMemberToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{suppressionBloquee ? 'Suppression impossible' : 'Supprimer ce membre de la famille ?'}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-sm text-muted-foreground">
                {memberToDelete && suppressionBloquee && (<>
                  <p>
                    <strong>{memberToDelete.prenom ? `${memberToDelete.prenom} ` : ''}{memberToDelete.nom}</strong>{' '}
                    est utilisé ailleurs dans le dossier. Le supprimer fausserait ces éléments :
                  </p>
                  <ul className="list-disc pl-5 mt-1">
                    {usages!.map(u => (
                      <li key={`${u.type}-${u.ref_id}`}>{LIBELLES_USAGE[u.type] ?? u.type} : {u.libelle}</li>
                    ))}
                  </ul>
                  <p className="mt-2">
                    Modifiez ou retirez d'abord ces éléments. Si cette personne est décédée, cochez plutôt
                    « Décédé » sur sa fiche : elle reste nécessaire au calcul de la succession.
                  </p>
                </>)}
                {memberToDelete && !suppressionBloquee && (<>
                  <p>
                    Cette action supprimera définitivement{' '}
                    <strong>{memberToDelete.prenom ? `${memberToDelete.prenom} ` : ''}{memberToDelete.nom}</strong>{' '}
                    ({memberToDelete.lien_familial}). Cette action est irréversible.
                  </p>
                  {dependentsOf(memberToDelete).length > 0 && (
                    <>
                      <p className="mt-2">
                        Le rattachement des membres suivants sera réinitialisé, car ils dépendent de ce membre :
                      </p>
                      <ul className="list-disc pl-5 mt-1">
                        {dependentsOf(memberToDelete).map(dep => (
                          <li key={dep.id}>{dep.prenom ? `${dep.prenom} ` : ''}{dep.nom} ({dep.lien_familial})</li>
                        ))}
                      </ul>
                    </>
                  )}
                </>)}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setMemberToDelete(null)}>{suppressionBloquee ? 'Fermer' : 'Annuler'}</AlertDialogCancel>
            {!suppressionBloquee && (
              <AlertDialogAction onClick={confirmDeleteMember} disabled={saving || usages === null}>
                {saving ? 'Suppression...' : usages === null ? 'Vérification...' : 'Supprimer'}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>;
}
