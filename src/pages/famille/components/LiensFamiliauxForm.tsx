import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Plus, Trash2, Edit, Loader2, CalendarIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useFamilyLinks, useFamilyProfile, useMaritalStatus } from '@/hooks/useFamilyData';
import { FamilyLink } from '@/services/familyService';
import { FamilyTree } from '@/components/FamilyTree';
import { useFamilyLinkLogic } from '@/hooks/useFamilyLinkLogic';
import { DynamicFamilyForm } from '@/components/family/DynamicFamilyForm';

const membreFamilleSchema = z.object({
  lien_familial: z.string().min(1, 'Le lien familial est obligatoire'),
  civilite: z.string().optional(),
  nom: z.string().min(1, 'Le nom est obligatoire'),
  prenom: z.string().optional(),
  date_naissance: z.date().optional(),
  est_decede: z.boolean().default(false),
  date_deces: z.date().optional(),
  handicap: z.boolean().default(false),
  enfant_adopte: z.string().default('Non'),
  enfant_renoncant: z.boolean().default(false),
  enfant_renoncant_de: z.string().optional(),
  branche_familiale: z.string().optional(),
  enfant_de: z.string().optional(),
  exoneration_succession: z.boolean().default(false),
});

type MembreFamille = z.infer<typeof membreFamilleSchema>;

export function LiensFamiliauxForm() {
  const { data: familyLinks, loading, saving, addLink, updateLink, deleteLink } = useFamilyLinks();
  const { data: familyProfile } = useFamilyProfile();
  const { data: maritalStatus } = useMaritalStatus();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<FamilyLink | null>(null);
  const [selectedLinkType, setSelectedLinkType] = useState<string>('');
  
  const familyLinkLogic = useFamilyLinkLogic(familyLinks, familyProfile, maritalStatus);
  
  const memberForm = useForm<MembreFamille>({
    resolver: zodResolver(membreFamilleSchema),
    defaultValues: {
      est_decede: false,
      handicap: false,
      enfant_adopte: 'Non',
      enfant_renoncant: false,
      exoneration_succession: false,
    },
  });

  const handleAddMember = () => {
    setEditingMember(null);
    setSelectedLinkType('');
    memberForm.reset({
      est_decede: false,
      handicap: false,
      enfant_adopte: 'Non',
      enfant_renoncant: false,
      exoneration_succession: false,
    });
    setDialogOpen(true);
  };

  const handleEditMember = (member: FamilyLink) => {
    setEditingMember(member);
    setSelectedLinkType(member.lien_familial);
    memberForm.reset({
      lien_familial: member.lien_familial,
      civilite: member.civilite || '',
      nom: member.nom,
      prenom: member.prenom || '',
      date_naissance: member.date_naissance ? new Date(member.date_naissance) : undefined,
      est_decede: member.est_decede || false,
      date_deces: member.date_deces ? new Date(member.date_deces) : undefined,
      handicap: member.handicap || false,
      enfant_adopte: member.enfant_adopte || 'Non',
      enfant_renoncant: member.enfant_renoncant || false,
      enfant_renoncant_de: member.enfant_renoncant_de || '',
      branche_familiale: member.branche_familiale || '',
      enfant_de: member.enfant_de || '',
      exoneration_succession: member.exoneration_succession || false,
    });
    setDialogOpen(true);
  };

  const handleDeleteMember = async (id: string) => {
    try {
      await deleteLink(id);
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
    }
  };

  const handleMemberSubmit = async (data: MembreFamille) => {
    try {
      const memberData = {
        lien_familial: data.lien_familial,
        civilite: data.civilite,
        nom: data.nom,
        prenom: data.prenom,
        date_naissance: data.date_naissance ? data.date_naissance.toISOString().split('T')[0] : undefined,
        est_decede: data.est_decede,
        date_deces: data.date_deces ? data.date_deces.toISOString().split('T')[0] : undefined,
        handicap: data.handicap,
        enfant_adopte: data.enfant_adopte,
        enfant_renoncant: data.enfant_renoncant,
        enfant_renoncant_de: data.enfant_renoncant_de,
        branche_familiale: data.branche_familiale,
        enfant_de: data.enfant_de,
        parent_de: data.enfant_de, // Copy for backward compatibility
        exoneration_succession: data.exoneration_succession,
      };

      if (editingMember) {
        await updateLink(editingMember.id!, memberData);
      } else {
        await addLink(memberData);
      }

      setDialogOpen(false);
      setEditingMember(null);
      setSelectedLinkType('');
      memberForm.reset();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du membre:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Chargement des données...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Liste des membres existants */}
      {familyLinks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>Membres de la famille</span>
              <Badge variant="secondary">{familyLinks.length}</Badge>
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
                  <TableHead>Statut</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {familyLinks.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <Badge variant="outline">{member.lien_familial}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{member.nom}</TableCell>
                    <TableCell>{member.prenom || '-'}</TableCell>
                    <TableCell>
                      {member.date_naissance ? 
                        format(new Date(member.date_naissance), 'dd/MM/yyyy') : 
                        '-'
                      }
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {member.est_decede && <Badge variant="destructive" className="text-xs">Décédé</Badge>}
                        {member.handicap && <Badge variant="secondary" className="text-xs">Handicap</Badge>}
                        {member.enfant_adopte && member.enfant_adopte !== 'Non' && <Badge variant="outline" className="text-xs">{member.enfant_adopte}</Badge>}
                        {member.enfant_renoncant && <Badge variant="outline" className="text-xs">Renonçant</Badge>}
                        {member.exoneration_succession && <Badge variant="secondary" className="text-xs">Exonération</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditMember(member)}
                          disabled={saving}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteMember(member.id!)}
                          disabled={saving}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Bouton d'ajout avec Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button onClick={handleAddMember} className="w-full" variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            Ajouter un membre de la famille
          </Button>
        </DialogTrigger>

        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingMember ? 'Modifier un membre' : 'Ajouter un membre de la famille'}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-6">
            <Form {...memberForm}>
              <form onSubmit={memberForm.handleSubmit(handleMemberSubmit)} className="space-y-6">
                {/* Sélection du lien familial */}
                <FormField
                  control={memberForm.control}
                  name="lien_familial"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lien familial *</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          setSelectedLinkType(value);
                        }} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner un lien" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {familyLinkLogic.availableLinks.map((linkOption) => (
                            <SelectItem 
                              key={linkOption.value} 
                              value={linkOption.value}
                              disabled={!linkOption.enabled}
                            >
                              {linkOption.label}
                              {!linkOption.enabled && ' (non disponible)'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Formulaire dynamique selon le type */}
                {(selectedLinkType || editingMember) && (
                  <DynamicFamilyForm 
                    linkType={selectedLinkType || editingMember?.lien_familial || ''}
                    parentOptions={familyLinkLogic.getParentOptions(selectedLinkType || editingMember?.lien_familial || '')}
                    parentsForRenunciation={familyLinkLogic.getParentsForRenunciation()}
                  />
                )}

                {/* Boutons */}
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setDialogOpen(false);
                      setEditingMember(null);
                      memberForm.reset();
                    }}
                    disabled={saving}
                  >
                    Annuler
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enregistrement...
                      </>
                    ) : (
                      editingMember ? 'Modifier' : 'Ajouter'
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Placeholder pour l'arbre familial */}
      {familyLinks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Arbre familial</CardTitle>
          </CardHeader>
          <CardContent>
            <FamilyTree 
              familyProfile={familyProfile}
              maritalStatus={maritalStatus}
              familyMembers={familyLinks}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}