import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, Plus, Trash2, Edit, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useFamilyLinks, useFamilyProfile, useMaritalStatus } from '@/hooks/useFamilyData';
import { FamilyLink } from '@/services/familyService';
import { FamilyTree } from '@/components/FamilyTree';

const membreFamilleSchema = z.object({
  lien_familial: z.string().min(1, 'Le lien familial est obligatoire'),
  nom: z.string().min(1, 'Le nom est obligatoire'),
  prenom: z.string().optional(),
  date_naissance: z.date().optional(),
  nationalite: z.string().optional(),
  niveau_scolaire: z.string().optional(),
  a_charge: z.boolean().default(false),
  handicap: z.boolean().default(false),
  enfant_mineur: z.boolean().default(false),
});

type MembreFamille = z.infer<typeof membreFamilleSchema>;

const liensFamiliaux = [
  'Enfant',
  'Petit-enfant',
  'Arrière petit-enfant',
  'Parent',
  'Grand-parent',
  'Arrière grand-parent',
  'Frère/Sœur',
  'Oncle/Tante',
  'Neveu/Nièce',
  'Cousin/Cousine',
  'Beau-parent',
  'Beau-frère/Belle-sœur',
  'Autre',
];

const niveauxScolaires = [
  'Primaire',
  'Collège',
  'Lycée',
  'Supérieur',
];

export function LiensFamiliauxForm() {
  const { data: familyLinks, loading, saving, addLink, updateLink, deleteLink } = useFamilyLinks();
  const { data: familyProfile } = useFamilyProfile();
  const { data: maritalStatus } = useMaritalStatus();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMember, setEditingMember] = useState<FamilyLink | null>(null);
  
  const memberForm = useForm<MembreFamille>({
    resolver: zodResolver(membreFamilleSchema),
    defaultValues: {
      a_charge: false,
      handicap: false,
      enfant_mineur: false,
    },
  });

  const handleAddMember = () => {
    setEditingMember(null);
    memberForm.reset({
      a_charge: false,
      handicap: false,
      enfant_mineur: false,
    });
    setShowAddForm(true);
  };

  const handleEditMember = (member: FamilyLink) => {
    setEditingMember(member);
    memberForm.reset({
      lien_familial: member.lien_familial,
      nom: member.nom,
      prenom: member.prenom || '',
      date_naissance: member.date_naissance ? new Date(member.date_naissance) : undefined,
      nationalite: member.nationalite || '',
      niveau_scolaire: member.niveau_scolaire || '',
      a_charge: member.a_charge || false,
      handicap: member.handicap || false,
      enfant_mineur: member.enfant_mineur || false,
    });
    setShowAddForm(true);
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
        nom: data.nom,
        prenom: data.prenom,
        date_naissance: data.date_naissance ? data.date_naissance.toISOString().split('T')[0] : undefined,
        nationalite: data.nationalite,
        niveau_scolaire: data.niveau_scolaire,
        a_charge: data.a_charge,
        handicap: data.handicap,
        enfant_mineur: data.enfant_mineur,
      };

      if (editingMember) {
        await updateLink(editingMember.id!, memberData);
      } else {
        await addLink(memberData);
      }

      setShowAddForm(false);
      setEditingMember(null);
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
                        {member.a_charge && <Badge variant="secondary" className="text-xs">À charge</Badge>}
                        {member.handicap && <Badge variant="secondary" className="text-xs">Handicap</Badge>}
                        {member.enfant_mineur && <Badge variant="secondary" className="text-xs">Mineur</Badge>}
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

      {/* Bouton d'ajout */}
      {!showAddForm && (
        <Button onClick={handleAddMember} className="w-full" variant="outline">
          <Plus className="mr-2 h-4 w-4" />
          Ajouter un membre de la famille
        </Button>
      )}

      {/* Formulaire d'ajout/modification */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingMember ? 'Modifier un membre' : 'Ajouter un membre de la famille'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...memberForm}>
              <form onSubmit={memberForm.handleSubmit(handleMemberSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Lien familial */}
                  <FormField
                    control={memberForm.control}
                    name="lien_familial"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lien familial *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner un lien" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {liensFamiliaux.map((lien) => (
                              <SelectItem key={lien} value={lien}>
                                {lien}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Nom */}
                  <FormField
                    control={memberForm.control}
                    name="nom"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom *</FormLabel>
                        <FormControl>
                          <Input placeholder="Nom de famille" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Prénom */}
                  <FormField
                    control={memberForm.control}
                    name="prenom"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prénom</FormLabel>
                        <FormControl>
                          <Input placeholder="Prénom" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Date de naissance */}
                  <FormField
                    control={memberForm.control}
                    name="date_naissance"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date de naissance</FormLabel>
                        <div className="flex gap-2">
                          <FormControl className="flex-1">
                            <Input
                              placeholder="JJ/MM/AAAA"
                              value={field.value ? format(field.value, 'dd/MM/yyyy') : ''}
                              onChange={(e) => {
                                const value = e.target.value;
                                // Permettre la saisie libre
                                if (value.length <= 10) {
                                  // Si le format est complet, essayer de convertir en date
                                  if (value.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
                                    try {
                                      const [day, month, year] = value.split('/');
                                      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                                      if (!isNaN(date.getTime()) && date.getFullYear() == parseInt(year)) {
                                        field.onChange(date);
                                        return;
                                      }
                                    } catch (error) {
                                      // Ignorer l'erreur et laisser l'utilisateur continuer à taper
                                    }
                                  }
                                  // Pour la saisie en cours, garder la valeur comme string
                                  field.onChange(value);
                                }
                              }}
                            />
                          </FormControl>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                className="shrink-0"
                                type="button"
                              >
                                <CalendarIcon className="h-4 w-4" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value instanceof Date ? field.value : undefined}
                                onSelect={(date) => date && field.onChange(date)}
                                disabled={(date) => date > new Date() || date < new Date('1900-01-01')}
                                initialFocus
                                className="p-3 pointer-events-auto"
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Nationalité */}
                  <FormField
                    control={memberForm.control}
                    name="nationalite"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nationalité</FormLabel>
                        <FormControl>
                          <Input placeholder="Nationalité" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Niveau scolaire */}
                  <FormField
                    control={memberForm.control}
                    name="niveau_scolaire"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Niveau scolaire</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner un niveau" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {niveauxScolaires.map((niveau) => (
                              <SelectItem key={niveau} value={niveau}>
                                {niveau}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Checkboxes */}
                <div className="space-y-4">
                  <FormField
                    control={memberForm.control}
                    name="a_charge"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>À charge</FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={memberForm.control}
                    name="handicap"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Personne handicapée</FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={memberForm.control}
                    name="enfant_mineur"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Enfant mineur</FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                {/* Boutons */}
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowAddForm(false);
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
          </CardContent>
        </Card>
      )}

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