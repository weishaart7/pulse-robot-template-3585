import React, { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useMaritalStatus } from '@/hooks/useFamilyData';
import { useAuth } from '@/contexts/AuthContext';

const formSchema = z.object({
  statutCouple: z.enum(['Célibataire', 'Concubinage', 'Pacsé(e)', 'Marié(e)']).optional(),
  parentIsole: z.boolean().default(false),
  
  // Informations partenaire
  civilitePartenaire: z.string().optional(),
  nomPartenaire: z.string().optional(),
  prenomPartenaire: z.string().optional(),
  dateNaissancePartenaire: z.date().optional(),
  lieuNaissancePartenaire: z.string().optional(),
  professionCSP: z.string().optional(),
  professionLibelle: z.string().optional(),
  nationalitePartenaire: z.string().optional(),
  personneHandicapee: z.boolean().default(false),
  
  // PACS
  conventionPacs: z.enum(['Régime de la séparation des biens', 'Indivision']).default('Régime de la séparation des biens'),
  datePacs: z.date().optional(),
  
  // Mariage
  regimeMatrimonial: z.enum([
    'Communauté réduite aux acquêts (option sans contrat de mariage)',
    'Communauté de meubles et d\'acquêts',
    'Communauté universelle',
    'Séparation de biens',
    'Participation aux acquêts'
  ]).default('Communauté réduite aux acquêts (option sans contrat de mariage)'),
  dateMariage: z.date().optional(),
  lieuMariage: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export function SituationMatrimonialeForm() {
  const { data, loading, saving, saveData } = useMaritalStatus();
  const { isAuthenticated } = useAuth();
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      parentIsole: false,
      personneHandicapee: false,
      conventionPacs: 'Régime de la séparation des biens',
      regimeMatrimonial: 'Communauté réduite aux acquêts (option sans contrat de mariage)',
    },
  });

  const statutCouple = useWatch({
    control: form.control,
    name: 'statutCouple',
  });

  useEffect(() => {
    if (data) {
      const dataAny = data as any; // Contournement temporaire pour les nouveaux champs
      const formattedData = {
        statutCouple: dataAny.statut_couple,
        parentIsole: dataAny.parent_isole || false,
        civilitePartenaire: dataAny.civilite_conjoint || '',
        nomPartenaire: dataAny.nom_conjoint || '',
        prenomPartenaire: dataAny.prenom_conjoint || '',
        dateNaissancePartenaire: dataAny.date_naissance_conjoint ? new Date(dataAny.date_naissance_conjoint) : undefined,
        lieuNaissancePartenaire: dataAny.lieu_naissance_conjoint || '',
        professionCSP: dataAny.profession_csp_conjoint || '',
        professionLibelle: dataAny.profession_conjoint || '',
        nationalitePartenaire: dataAny.nationalite_conjoint || '',
        personneHandicapee: dataAny.personne_handicapee_conjoint || false,
        conventionPacs: dataAny.convention_pacs || 'Régime de la séparation des biens',
        datePacs: dataAny.date_pacs ? new Date(dataAny.date_pacs) : undefined,
        regimeMatrimonial: dataAny.regime_matrimonial || 'Communauté réduite aux acquêts (option sans contrat de mariage)',
        dateMariage: dataAny.date_mariage ? new Date(dataAny.date_mariage) : undefined,
        lieuMariage: dataAny.lieu_mariage || '',
      };
      form.reset(formattedData);
    }
  }, [data, form]);

  const onSubmit = async (formData: FormData) => {
    if (!isAuthenticated) {
      console.error('Utilisateur non connecté');
      return;
    }

    try {
      const supabaseData = {
        statut_couple: formData.statutCouple,
        parent_isole: formData.parentIsole,
        civilite_conjoint: formData.civilitePartenaire,
        nom_conjoint: formData.nomPartenaire,
        prenom_conjoint: formData.prenomPartenaire,
        date_naissance_conjoint: formData.dateNaissancePartenaire ? formData.dateNaissancePartenaire.toISOString().split('T')[0] : undefined,
        lieu_naissance_conjoint: formData.lieuNaissancePartenaire,
        profession_csp_conjoint: formData.professionCSP,
        profession_conjoint: formData.professionLibelle,
        nationalite_conjoint: formData.nationalitePartenaire,
        personne_handicapee_conjoint: formData.personneHandicapee,
        convention_pacs: formData.conventionPacs,
        date_pacs: formData.datePacs ? formData.datePacs.toISOString().split('T')[0] : undefined,
        regime_matrimonial: formData.regimeMatrimonial,
        date_mariage: formData.dateMariage ? formData.dateMariage.toISOString().split('T')[0] : undefined,
        lieu_mariage: formData.lieuMariage,
      };

      await saveData(supabaseData);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
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
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Sélection du statut principal */}
        <FormField
          control={form.control}
          name="statutCouple"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Statut matrimonial</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger size="lg">
                    <SelectValue placeholder="Choisir un statut" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Célibataire">Célibataire</SelectItem>
                  <SelectItem value="Concubinage">Concubinage</SelectItem>
                  <SelectItem value="Pacsé(e)">Pacsé(e)</SelectItem>
                  <SelectItem value="Marié(e)">Marié(e)</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Célibataire */}
        {statutCouple === 'Célibataire' && (
          <Card>
            <CardContent className="pt-6">
              <FormField
                control={form.control}
                name="parentIsole"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Parent isolé</FormLabel>
                    </div>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        )}

        {/* Formulaires pour Concubinage, PACS et Mariage */}
        {(statutCouple === 'Concubinage' || statutCouple === 'Pacsé(e)' || statutCouple === 'Marié(e)') && (
          <>
            {/* Fiche du partenaire */}
            <Card>
              <CardHeader>
                <CardTitle>Fiche du partenaire</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="civilitePartenaire"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Civilité</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="M.">M.</SelectItem>
                            <SelectItem value="Mme">Mme</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="nomPartenaire"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom</FormLabel>
                        <FormControl>
                          <Input placeholder="Nom" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="prenomPartenaire"
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

                  <FormField
                    control={form.control}
                    name="dateNaissancePartenaire"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date de naissance</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "dd/MM/yyyy")
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
                                date > new Date() || date < new Date("1900-01-01")
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

                  <FormField
                    control={form.control}
                    name="lieuNaissancePartenaire"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lieu de naissance</FormLabel>
                        <FormControl>
                          <Input placeholder="Lieu de naissance" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="professionCSP"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Profession (CSP)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner une CSP" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Agriculteurs exploitants">Agriculteurs exploitants</SelectItem>
                            <SelectItem value="Artisans, commerçants et chefs d'entreprise">Artisans, commerçants et chefs d'entreprise</SelectItem>
                            <SelectItem value="Cadres et professions intellectuelles supérieures">Cadres et professions intellectuelles supérieures</SelectItem>
                            <SelectItem value="Professions intermédiaires">Professions intermédiaires</SelectItem>
                            <SelectItem value="Employés">Employés</SelectItem>
                            <SelectItem value="Ouvriers">Ouvriers</SelectItem>
                            <SelectItem value="Retraités">Retraités</SelectItem>
                            <SelectItem value="Autres personnes sans activité professionnelle">Autres personnes sans activité professionnelle</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="professionLibelle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Profession (libellé libre)</FormLabel>
                        <FormControl>
                          <Input placeholder="Profession" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="nationalitePartenaire"
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
                </div>

                <FormField
                  control={form.control}
                  name="personneHandicapee"
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
              </CardContent>
            </Card>

            {/* Informations PACS */}
            {statutCouple === 'Pacsé(e)' && (
              <Card>
                <CardHeader>
                  <CardTitle>Informations PACS</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="conventionPacs"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Convention de PACS</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Régime de la séparation des biens">Régime de la séparation des biens</SelectItem>
                            <SelectItem value="Indivision">Indivision</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="datePacs"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date de PACS</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "dd/MM/yyyy")
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
                                date > new Date() || date < new Date("1900-01-01")
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
                </CardContent>
              </Card>
            )}

            {/* Informations Mariage */}
            {statutCouple === 'Marié(e)' && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Régime matrimonial</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="regimeMatrimonial"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Régime matrimonial</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Communauté réduite aux acquêts (option sans contrat de mariage)">
                                Communauté réduite aux acquêts (option sans contrat de mariage)
                              </SelectItem>
                              <SelectItem value="Communauté de meubles et d'acquêts">
                                Communauté de meubles et d'acquêts
                              </SelectItem>
                              <SelectItem value="Communauté universelle">
                                Communauté universelle
                              </SelectItem>
                              <SelectItem value="Séparation de biens">
                                Séparation de biens
                              </SelectItem>
                              <SelectItem value="Participation aux acquêts">
                                Participation aux acquêts
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="dateMariage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Date du mariage</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      "w-full pl-3 text-left font-normal",
                                      !field.value && "text-muted-foreground"
                                    )}
                                  >
                                    {field.value ? (
                                      format(field.value, "dd/MM/yyyy")
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
                                    date > new Date() || date < new Date("1900-01-01")
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

                      <FormField
                        control={form.control}
                        name="lieuMariage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Lieu du mariage</FormLabel>
                            <FormControl>
                              <Input placeholder="Lieu du mariage" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Options relatives au régime choisi</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">Cette section sera complétée ultérieurement.</p>
                  </CardContent>
                </Card>
              </>
            )}
          </>
        )}

        {/* Bouton de sauvegarde */}
        {statutCouple && (
          <Button type="submit" disabled={saving} className="w-full">
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enregistrement...
              </>
            ) : (
              'Enregistrer'
            )}
          </Button>
        )}
      </form>
    </Form>
  );
}