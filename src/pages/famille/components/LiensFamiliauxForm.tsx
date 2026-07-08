import React, { useRef } from 'react';
import { format } from 'date-fns';
import { Plus, Trash2, Edit, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useFamilyLinks, useFamilyProfile, useMaritalStatus } from '@/hooks/useFamilyData';
import { FamilyLink } from '@/services/familyService';
import { FamilyMemberFormDialog, FamilyMemberFormDialogHandle } from '@/components/family/FamilyMemberFormDialog';

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
      {/* Liste des membres existants */}
      {familyLinks.length > 0 && <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>Membres de la famille</span>
              <Badge variant="secondary" className="bg-[#362015] text-white hover:bg-[#362015]/90">{familyLinks.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lien familial</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>Prénom</TableHead>
                  <TableHead>Date de naissance</TableHead>
                  <TableHead>Âge</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {familyLinks.map(member => <TableRow key={member.id}>
                    <TableCell>
                      <Badge variant="outline">{member.lien_familial}</Badge>
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
                      <div className="flex gap-1 flex-wrap">
                        {member.est_decede && <Badge variant="secondary" className="text-xs">Décédé</Badge>}
                        {member.handicap && <Badge variant="secondary" className="text-xs">Handicap</Badge>}
                        {member.enfant_a_charge && member.fiscalement_a_charge ? <Badge variant="secondary" className="text-xs">À charge (civil + fiscal)</Badge> : <>
                          {member.enfant_a_charge && <Badge variant="secondary" className="text-xs">À charge (civil)</Badge>}
                          {member.fiscalement_a_charge && <Badge variant="secondary" className="text-xs">À charge (fiscal)</Badge>}
                        </>}
                        {member.enfant_adopte && member.enfant_adopte !== 'Non' && <Badge variant="outline" className="text-xs">{member.enfant_adopte}</Badge>}
                        {member.enfant_renoncant && <Badge variant="outline" className="text-xs">Renonçant</Badge>}
                        {member.exoneration_succession && <Badge variant="secondary" className="text-xs">Exonération</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => dialogRef.current?.openForEdit(member)} disabled={saving} className="hover:bg-[#362015] hover:text-white hover:border-[#362015]">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDeleteMember(member.id!)} disabled={saving} className="hover:bg-[#362015] hover:text-white hover:border-[#362015]">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>)}
              </TableBody>
            </Table>
          </CardContent>
        </Card>}

      <Button onClick={() => dialogRef.current?.openForAdd()} className="w-full hover:bg-[#362015] hover:text-white hover:border-[#362015]" variant="outline">
        <Plus className="mr-2 h-4 w-4" />
        Ajouter un membre de la famille
      </Button>

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
