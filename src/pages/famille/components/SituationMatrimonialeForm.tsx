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
import { cn } from '@/lib/utils';
import { useMaritalStatus } from '@/hooks/useFamilyData';

const formSchema = z.object({
  statutCouple: z.enum(['CELIBATAIRE', 'PACS', 'MARIE', 'CONCUBINAGE']),
  nomConjoint: z.string().optional(),
  prenomConjoint: z.string().optional(),
  dateNaissanceConjoint: z.date().optional(),
  nationaliteConjoint: z.string().optional(),
  professionConjoint: z.string().optional(),
  datePacs: z.date().optional(),
  lieuPacs: z.string().optional(),
  dateMariage: z.date().optional(),
  lieuMariage: z.string().optional(),
  nomNotaire: z.string().optional(),
  adresseNotaire: z.string().optional(),
  contratMariage: z.string().optional(),
  parentIsole: z.boolean().default(false),
  nombreEnfantsCharges: z.number().min(0).default(0),
  mariagePrecedentPersonne: z.boolean().default(false),
  mariagePrecedentConjoint: z.boolean().default(false),
});

type FormData = z.infer<typeof formSchema>;

export function SituationMatrimonialeForm() {
  const { data, loading, saving, saveData } = useMaritalStatus();
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      statutCouple: 'CELIBATAIRE',
      parentIsole: false,
      nombreEnfantsCharges: 0,
      mariagePrecedentPersonne: false,
      mariagePrecedentConjoint: false,
    },
  });

  const statutCouple = useWatch({
    control: form.control,
    name: 'statutCouple',
  });

  useEffect(() => {
    if (data) {
      const formattedData = {
        statutCouple: (data.statut_couple as any) || 'CELIBATAIRE',
        nomConjoint: data.nom_conjoint || '',
        prenomConjoint: data.prenom_conjoint || '',
        dateNaissanceConjoint: data.date_naissance_conjoint ? new Date(data.date_naissance_conjoint) : undefined,
        nationaliteConjoint: data.nationalite_conjoint || '',
        professionConjoint: data.profession_conjoint || '',
        datePacs: data.date_pacs ? new Date(data.date_pacs) : undefined,
        lieuPacs: data.lieu_pacs || '',
        dateMariage: data.date_mariage ? new Date(data.date_mariage) : undefined,
        lieuMariage: data.lieu_mariage || '',
        nomNotaire: data.nom_notaire || '',
        adresseNotaire: data.adresse_notaire || '',
        contratMariage: data.contrat_mariage || '',
        parentIsole: data.parent_isole || false,
        nombreEnfantsCharges: data.nombre_enfants_charges || 0,
        mariagePrecedentPersonne: data.mariage_precedent_personne || false,
        mariagePrecedentConjoint: data.mariage_precedent_conjoint || false,
      };
      form.reset(formattedData);
    }
  }, [data, form]);

  const onSubmit = async (formData: FormData) => {
    try {
      const supabaseData = {
        statut_couple: formData.statutCouple,
        nom_conjoint: formData.nomConjoint,
        prenom_conjoint: formData.prenomConjoint,
        date_naissance_conjoint: formData.dateNaissanceConjoint ? formData.dateNaissanceConjoint.toISOString().split('T')[0] : undefined,
        nationalite_conjoint: formData.nationaliteConjoint,
        profession_conjoint: formData.professionConjoint,
        date_pacs: formData.datePacs ? formData.datePacs.toISOString().split('T')[0] : undefined,
        lieu_pacs: formData.lieuPacs,
        date_mariage: formData.dateMariage ? formData.dateMariage.toISOString().split('T')[0] : undefined,
        lieu_mariage: formData.lieuMariage,
        nom_notaire: formData.nomNotaire,
        adresse_notaire: formData.adresseNotaire,
        contrat_mariage: formData.contratMariage,
        parent_isole: formData.parentIsole,
        nombre_enfants_charges: formData.nombreEnfantsCharges,
        mariage_precedent_personne: formData.mariagePrecedentPersonne,
        mariage_precedent_conjoint: formData.mariagePrecedentConjoint,
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
        <FormField
          control={form.control}
          name="statutCouple"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Statut du couple</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger size="lg">
                    <SelectValue placeholder="Choisir un statut" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="CELIBATAIRE">Célibataire</SelectItem>
                  <SelectItem value="PACS">PACS</SelectItem>
                  <SelectItem value="MARIE">Marié(e)</SelectItem>
                  <SelectItem value="CONCUBINAGE">Concubinage</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {statutCouple !== 'CELIBATAIRE' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Nom du conjoint */}
              <FormField
                control={form.control}
                name="nomConjoint"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom du conjoint</FormLabel>
                    <FormControl>
                      <Input placeholder="Nom du conjoint" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Prénom du conjoint */}
              <FormField
                control={form.control}
                name="prenomConjoint"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prénom du conjoint</FormLabel>
                    <FormControl>
                      <Input placeholder="Prénom du conjoint" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Date de naissance du conjoint */}
              <FormField
                control={form.control}
                name="dateNaissanceConjoint"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date de naissance du conjoint</FormLabel>
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

              {/* Nationalité du conjoint */}
              <FormField
                control={form.control}
                name="nationaliteConjoint"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nationalité du conjoint</FormLabel>
                    <FormControl>
                      <Input placeholder="Nationalité du conjoint" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Profession du conjoint */}
              <FormField
                control={form.control}
                name="professionConjoint"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Profession du conjoint</FormLabel>
                    <FormControl>
                      <Input placeholder="Profession du conjoint" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {statutCouple === 'PACS' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Date du PACS */}
                <FormField
                  control={form.control}
                  name="datePacs"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date du PACS</FormLabel>
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

                {/* Lieu du PACS */}
                <FormField
                  control={form.control}
                  name="lieuPacs"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lieu du PACS</FormLabel>
                      <FormControl>
                        <Input placeholder="Lieu du PACS" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {statutCouple === 'MARIE' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Date du mariage */}
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

                {/* Lieu du mariage */}
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

                {/* Nom du notaire */}
                <FormField
                  control={form.control}
                  name="nomNotaire"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom du notaire</FormLabel>
                      <FormControl>
                        <Input placeholder="Nom du notaire" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Adresse du notaire */}
                <FormField
                  control={form.control}
                  name="adresseNotaire"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Adresse du notaire</FormLabel>
                      <FormControl>
                        <Input placeholder="Adresse du notaire" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Contrat de mariage */}
                <FormField
                  control={form.control}
                  name="contratMariage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contrat de mariage</FormLabel>
                      <FormControl>
                        <Input placeholder="Contrat de mariage" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
          </>
        )}

        {/* Parent isolé */}
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

        {/* Nombre d'enfants à charge */}
        <FormField
          control={form.control}
          name="nombreEnfantsCharges"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre d'enfants à charge</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="Nombre d'enfants à charge"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Mariage précédent de la personne */}
        <FormField
          control={form.control}
          name="mariagePrecedentPersonne"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Mariage précédent de la personne</FormLabel>
              </div>
            </FormItem>
          )}
        />

        {/* Mariage précédent du conjoint */}
        <FormField
          control={form.control}
          name="mariagePrecedentConjoint"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Mariage précédent du conjoint</FormLabel>
              </div>
            </FormItem>
          )}
        />

        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enregistrement...
              </>
            ) : (
              'Enregistrer'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
