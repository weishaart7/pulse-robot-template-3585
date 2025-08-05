import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, Plus, Trash2, Users } from 'lucide-react';

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
import { useToast } from '@/hooks/use-toast';

const membreFamilleSchema = z.object({
  id: z.string(),
  lienFamilial: z.string().min(1, 'Le lien familial est obligatoire'),
  lienAvecEpoux: z.enum(['un', 'autre', 'couple'], {
    required_error: 'Veuillez préciser le lien avec les époux',
  }),
  civilite: z.enum(['M', 'Mme', 'Autre']),
  nom: z.string().min(1, 'Le nom est obligatoire'),
  prenom: z.string().min(1, 'Le prénom est obligatoire'),
  dateNaissance: z.date({
    required_error: 'La date de naissance est obligatoire',
  }),
  lieuNaissance: z.string().min(1, 'Le lieu de naissance est obligatoire'),
  decede: z.boolean().default(false),
  fiscalementCharge: z.number().default(25),
  niveauScolaire: z.string().optional(),
  handicape: z.boolean().default(false),
  adopte: z.boolean().default(false),
  indigniteSuccessorale: z.boolean().default(false),
  renoncantSuccession: z.boolean().default(false),
});

const formSchema = z.object({
  membres: z.array(membreFamilleSchema),
});

type FormData = z.infer<typeof formSchema>;
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
  const { toast } = useToast();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMember, setEditingMember] = useState<MembreFamille | null>(null);
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      membres: [],
    },
  });

  const memberForm = useForm<MembreFamille>({
    resolver: zodResolver(membreFamilleSchema),
    defaultValues: {
      id: '',
      decede: false,
      fiscalementCharge: 25,
      handicape: false,
      adopte: false,
      indigniteSuccessorale: false,
      renoncantSuccession: false,
    },
  });

  const membres = form.watch('membres');

  const onSubmit = (data: FormData) => {
    console.log('Liens familiaux:', data);
    
    localStorage.setItem('liensFamiliaux', JSON.stringify(data));
    
    toast({
      title: 'Liens familiaux enregistrés',
      description: 'Les informations ont été sauvegardées avec succès.',
    });
  };

  const addMember = (data: Omit<MembreFamille, 'id'>) => {
    const newMember = {
      ...data,
      id: Date.now().toString(),
    };
    
    const currentMembers = form.getValues('membres');
    form.setValue('membres', [...currentMembers, newMember]);
    
    memberForm.reset();
    setShowAddForm(false);
    setEditingMember(null);
    
    toast({
      title: 'Membre ajouté',
      description: 'Le membre de la famille a été ajouté avec succès.',
    });
  };

  const editMember = (member: MembreFamille) => {
    setEditingMember(member);
    memberForm.reset(member);
    setShowAddForm(true);
  };

  const updateMember = (data: Omit<MembreFamille, 'id'>) => {
    if (!editingMember) return;
    
    const updatedMember = { ...data, id: editingMember.id };
    const currentMembers = form.getValues('membres');
    const updatedMembers = currentMembers.map(m => 
      m.id === editingMember.id ? updatedMember : m
    );
    
    form.setValue('membres', updatedMembers);
    
    memberForm.reset();
    setShowAddForm(false);
    setEditingMember(null);
    
    toast({
      title: 'Membre modifié',
      description: 'Les informations ont été mises à jour.',
    });
  };

  const deleteMember = (id: string) => {
    const currentMembers = form.getValues('membres');
    const filteredMembers = currentMembers.filter(m => m.id !== id);
    form.setValue('membres', filteredMembers);
    
    toast({
      title: 'Membre supprimé',
      description: 'Le membre a été retiré de la liste.',
    });
  };

  const handleMemberSubmit = (data: Omit<MembreFamille, 'id'>) => {
    if (editingMember) {
      updateMember(data);
    } else {
      addMember(data);
    }
  };

  return (
    <div className="space-y-6">
      {/* Liste des membres */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Membres de la famille</CardTitle>
            <Button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Ajouter un membre
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {membres.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Aucun membre de famille ajouté. Cliquez sur "Ajouter un membre" pour commencer.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Lien familial</TableHead>
                  <TableHead>Date de naissance</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {membres.map((membre) => (
                  <TableRow key={membre.id}>
                    <TableCell>
                      {membre.civilite} {membre.prenom} {membre.nom}
                    </TableCell>
                    <TableCell>{membre.lienFamilial}</TableCell>
                    <TableCell>
                      {format(membre.dateNaissance, 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {membre.decede && <Badge variant="secondary">Décédé</Badge>}
                        {membre.handicape && <Badge variant="outline">Handicapé</Badge>}
                        {membre.adopte && <Badge variant="outline">Adopté</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => editMember(membre)}
                        >
                          Modifier
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteMember(membre.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Formulaire d'ajout/modification */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingMember ? 'Modifier le membre' : 'Ajouter un membre de la famille'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...memberForm}>
              <form onSubmit={memberForm.handleSubmit(handleMemberSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Lien familial */}
                  <FormField
                    control={memberForm.control}
                    name="lienFamilial"
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

                  {/* Lien avec époux */}
                  <FormField
                    control={memberForm.control}
                    name="lienAvecEpoux"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lien avec les époux *</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex flex-row space-x-4"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="un" id="un" />
                              <label htmlFor="un">L'un</label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="autre" id="autre" />
                              <label htmlFor="autre">L'autre</label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="couple" id="couple" />
                              <label htmlFor="couple">Le couple</label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Civilité */}
                  <FormField
                    control={memberForm.control}
                    name="civilite"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Civilité *</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex flex-row space-x-4"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="M" id="m-membre" />
                              <label htmlFor="m-membre">M.</label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="Mme" id="mme-membre" />
                              <label htmlFor="mme-membre">Mme</label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="Autre" id="autre-membre" />
                              <label htmlFor="autre-membre">Autre</label>
                            </div>
                          </RadioGroup>
                        </FormControl>
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
                        <FormLabel>Prénom *</FormLabel>
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
                    name="dateNaissance"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date de naissance *</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  'w-full pl-3 text-left font-normal',
                                  !field.value && 'text-muted-foreground'
                                )}
                              >
                                {field.value ? (
                                  format(field.value, 'dd/MM/yyyy')
                                ) : (
                                  <span>Sélectionner une date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) =>
                                date > new Date() || date < new Date('1900-01-01')
                              }
                              initialFocus
                              className="p-3 pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Lieu de naissance */}
                  <FormField
                    control={memberForm.control}
                    name="lieuNaissance"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lieu de naissance *</FormLabel>
                        <FormControl>
                          <Input placeholder="Lieu de naissance" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Fiscalement à charge */}
                  <FormField
                    control={memberForm.control}
                    name="fiscalementCharge"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fiscalement à charge jusqu'à (ans)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0" 
                            max="50" 
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Niveau scolaire */}
                  <FormField
                    control={memberForm.control}
                    name="niveauScolaire"
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

                {/* Cases à cocher */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <FormField
                    control={memberForm.control}
                    name="decede"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel>Décédé</FormLabel>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={memberForm.control}
                    name="handicape"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel>Handicapé</FormLabel>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={memberForm.control}
                    name="adopte"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel>Adopté</FormLabel>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={memberForm.control}
                    name="indigniteSuccessorale"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel>Frappé d'indignité successorale</FormLabel>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={memberForm.control}
                    name="renoncantSuccession"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel>Renonçant à la succession</FormLabel>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowAddForm(false);
                      setEditingMember(null);
                      memberForm.reset();
                    }}
                  >
                    Annuler
                  </Button>
                  <Button type="submit">
                    {editingMember ? 'Modifier' : 'Ajouter'}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* Arbre généalogique - placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Arbre généalogique
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>L'arbre généalogique interactif sera disponible prochainement.</p>
            <p className="text-sm">Il permettra de visualiser les relations familiales de manière hiérarchique.</p>
          </div>
        </CardContent>
      </Card>

      {/* Bouton de sauvegarde globale */}
      <Form {...form}>
        <div className="flex justify-end">
          <Button onClick={form.handleSubmit(onSubmit)}>
            Enregistrer les liens familiaux
          </Button>
        </div>
      </Form>
    </div>
  );
}