import React, { useRef, useState } from 'react';
import { format } from 'date-fns';
import { Plus, Trash2, Edit, Loader2, MoreHorizontal } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';
import { FamilyLink } from '@/services/familyService';
import { FamilyMemberFormDialog, FamilyMemberFormDialogHandle } from '@/components/family/FamilyMemberFormDialog';
import { cn } from '@/lib/utils';

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

function calculateAge(date_naissance?: string, date_deces?: string): string {
  if (!date_naissance) return '-';
  const birth = new Date(date_naissance);
  const end = date_deces ? new Date(date_deces) : new Date();
  const diffMs = end.getTime() - birth.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days < 30) return `${days} jour${days > 1 ? 's' : ''}`;
  const months = Math.floor(days / 30.4375);
  if (months < 12) return `${months} mois`;
  const years = Math.floor(days / 365.25);
  return `${years} an${years > 1 ? 's' : ''}`;
}

export function LiensFamiliauxForm() {
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
  const { toast } = useToast();
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
      toast({ title: "Succès", description: "Le membre de la famille a été supprimé." });
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Erreur lors de la suppression:', error);
      }
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la suppression.",
        variant: "destructive",
      });
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
      <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
            <CardTitle className="flex items-center gap-2 text-lg">
              <span>Membres de la famille</span>
              {familyLinks.length > 0 && <Badge variant="secondary">{familyLinks.length}</Badge>}
            </CardTitle>
            <Button onClick={() => dialogRef.current?.openForAdd()} size="sm" variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Ajouter un membre de la famille
            </Button>
          </CardHeader>
          {familyLinks.length > 0 && <CardContent>
            <Table className="text-xs">
              <TableHeader>
                <TableRow>
                  <TableHead>Lien familial</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>Prénom</TableHead>
                  <TableHead>Date de naissance</TableHead>
                  <TableHead>Âge</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {familyLinks.map(member => <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex gap-1.5 flex-wrap items-center">
                        <FamilyTag>{member.lien_familial}</FamilyTag>
                        {member.lien_familial === 'Enfant' && member.parent_de === 'spouse' && (
                          <FamilyTag>Beau-fils/belle-fille</FamilyTag>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{member.nom}</TableCell>
                    <TableCell>{member.prenom || '-'}</TableCell>
                    <TableCell>
                      {member.date_naissance ? format(new Date(member.date_naissance), 'dd/MM/yyyy') : '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {member.est_decede ? '-' : calculateAge(member.date_naissance, member.date_deces)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1.5 flex-wrap">
                        {member.est_decede && <FamilyTag>Décédé</FamilyTag>}
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
        </Card>

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
