import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Trash2, Edit, Loader2, MoreHorizontal, Plus } from 'lucide-react';
import { FamilyTreeCards } from '@/components/famille/FamilyTreeCards';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { FamilyLink } from '@/services/familyService';
import { FamilyMemberFormDialog, FamilyMemberFormDialogHandle } from '@/components/family/FamilyMemberFormDialog';
import { cn } from '@/lib/utils';
import { formatAgeCourt } from '@/lib/family/age';

// Tag de la table Liens familiaux — accent = avantage fiscal.
function FamilyTag({ children, accent = false }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap",
        accent ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
      )}
    >
      {children}
    </span>
  );
}

interface LiensFamiliauxFormProps {
  // « arbre » : arbre familial du Foyer ; « membres » : tableau de la sous-section Membres.
  // Le dialogue d'ajout/modification est commun aux deux vues.
  view: 'arbre' | 'membres';
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
    return <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Chargement des données...</span>
      </div>;
  }
  return <div className="space-y-6">
      {view === 'arbre' && <div className="rounded-3xl border border-border bg-card p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Arbre familial
          </p>
          <button
            onClick={() => navigate('/dashboard/famille/membres')}
            className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
          >
            {familyLinks.length === 0 ? 'Ajouter des membres' : 'Gérer les membres'}
          </button>
        </div>
        <FamilyTreeCards
          familyProfile={familyProfile}
          maritalStatus={maritalStatus}
          familyLinks={familyLinks}
          onSelectMain={() => navigate('/dashboard/famille/client')}
          onSelectSpouse={() => navigate('/dashboard/famille/conjoint')}
          onSelectMember={(member) => dialogRef.current?.openForEdit(member)}
        />
      </div>}

      {view === 'membres' && <Card className="rounded-3xl">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4 space-y-0">
            <CardTitle className="flex items-center gap-2 text-lg whitespace-nowrap">
              <span>Membres de la famille</span>
              {familyLinks.length > 0 && <Badge variant="secondary">{familyLinks.length}</Badge>}
            </CardTitle>
            <button
              onClick={() => dialogRef.current?.openForAdd()}
              className="inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-foreground hover:bg-foreground/85 text-background shadow-whisper pl-1 pr-4 py-1 text-sm font-medium transition-colors"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-background/15">
                <Plus className="h-4 w-4 text-background" />
              </span>
              Ajouter un membre
            </button>
          </CardHeader>
          {familyLinks.length === 0 && <CardContent>
            <p className="text-sm text-muted-foreground max-w-xl">
              Aucun membre renseigné. Ajoutez les enfants, parents, frères et sœurs… : ils servent au
              calcul de la succession et des abattements.
            </p>
          </CardContent>}
          {familyLinks.length > 0 && <CardContent>
            <Table className="text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead>Membre</TableHead>
                  <TableHead>Lien familial</TableHead>
                  <TableHead>Date de naissance</TableHead>
                  <TableHead>Âge</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {familyLinks.map(member => <TableRow key={member.id} className={cn(member.est_decede && "text-muted-foreground")}>
                    <TableCell className={cn("font-medium", !member.est_decede && "text-foreground")}>
                      {[member.prenom, member.nom].filter(Boolean).join(' ')}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1.5 flex-wrap items-center">
                        <FamilyTag>{member.lien_familial}</FamilyTag>
                        {member.lien_familial === 'Enfant' && member.parent_de === 'spouse' && (
                          <FamilyTag>Beau-fils/belle-fille</FamilyTag>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {member.date_naissance ? format(new Date(member.date_naissance), 'dd/MM/yyyy') : '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {member.est_decede ? '-' : formatAgeCourt(member.date_naissance)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1.5 flex-wrap">
                        {member.est_decede && <FamilyTag>{member.date_deces ? `† ${new Date(member.date_deces).getFullYear()}` : 'Décédé'}</FamilyTag>}
                        {member.handicap && <FamilyTag>Handicap</FamilyTag>}
                        {member.enfant_a_charge && member.fiscalement_a_charge ? <FamilyTag accent>À charge (civil + fiscal)</FamilyTag> : <>
                          {member.enfant_a_charge && <FamilyTag accent>À charge (civil)</FamilyTag>}
                          {member.fiscalement_a_charge && <FamilyTag accent>À charge (fiscal)</FamilyTag>}
                        </>}
                        {member.enfant_adopte && member.enfant_adopte !== 'Non' && <FamilyTag>{member.enfant_adopte}</FamilyTag>}
                        {member.enfant_renoncant && <FamilyTag>Renonçant</FamilyTag>}
                        {member.exoneration_succession && <FamilyTag accent>Exonération</FamilyTag>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="rounded-full shadow-none"
                            disabled={saving}
                            aria-label="Ouvrir le menu"
                          >
                            <MoreHorizontal size={16} strokeWidth={2} aria-hidden="true" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => dialogRef.current?.openForEdit(member)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setMemberToDelete(member)}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>)}
              </TableBody>
            </Table>
          </CardContent>}
        </Card>}

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
            <AlertDialogTitle>Supprimer ce membre de la famille ?</AlertDialogTitle>
            <AlertDialogDescription>
              {memberToDelete && (
                <>
                  Cette action supprimera définitivement{' '}
                  <strong>{memberToDelete.prenom ? `${memberToDelete.prenom} ` : ''}{memberToDelete.nom}</strong>{' '}
                  ({memberToDelete.lien_familial}). Cette action est irréversible.
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
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setMemberToDelete(null)}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteMember} disabled={saving}>
              {saving ? 'Suppression...' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>;
}
