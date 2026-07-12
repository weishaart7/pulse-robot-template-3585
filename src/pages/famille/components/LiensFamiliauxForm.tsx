import React, { useRef } from 'react';
import { format } from 'date-fns';
import { Plus, Trash2, Edit, Loader2, MoreVertical } from 'lucide-react';
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
import { useFamilyLinks, useFamilyProfile, useMaritalStatus } from '@/hooks/useFamilyData';
import { FamilyLink } from '@/services/familyService';
import { FamilyMemberFormDialog, FamilyMemberFormDialogHandle } from '@/components/family/FamilyMemberFormDialog';
import { THEME_INK, THEME_MONO_FONT } from '@/lib/theme';

// Tag de la table Liens familiaux — même langage graphique que l'arbre familial
// (radius 4px, fond neutre doux, petites majuscules mono ; vert = avantage fiscal).
const TAG_NEUTRAL_BG = '#F8F8F8';
const TAG_ACCENT_BG = '#F9FDEE';
const TAG_ACCENT_INK = '#5b6320';

function FamilyTag({ children, accent = false }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <span
      className="inline-flex items-center rounded-[4px] px-2 py-1 text-[9.5px] font-semibold uppercase tracking-[0.08em] whitespace-nowrap"
      style={{
        backgroundColor: accent ? TAG_ACCENT_BG : TAG_NEUTRAL_BG,
        color: accent ? TAG_ACCENT_INK : THEME_INK,
        fontFamily: THEME_MONO_FONT,
      }}
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
    deleteLink
  } = useFamilyLinks();
  const { data: familyProfile } = useFamilyProfile();
  const { data: maritalStatus } = useMaritalStatus();
  const dialogRef = useRef<FamilyMemberFormDialogHandle>(null);

  const handleDeleteMember = async (id: string) => {
    try {
      await deleteLink(id);
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
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
              {familyLinks.length > 0 && <Badge variant="secondary" className="bg-[#362015] text-white hover:bg-[#362015]/90">{familyLinks.length}</Badge>}
            </CardTitle>
            <Button onClick={() => dialogRef.current?.openForAdd()} size="sm" className="hover:bg-[#362015] hover:text-white hover:border-[#362015]" variant="outline">
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
                      <FamilyTag>{member.lien_familial}</FamilyTag>
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
                            <MoreVertical size={16} strokeWidth={2} aria-hidden="true" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => dialogRef.current?.openForEdit(member)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDeleteMember(member.id!)}>
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
    </div>;
}
