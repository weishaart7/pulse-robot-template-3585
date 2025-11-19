import { z } from "zod";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/contexts/AuthContext";
import { useMaritalStatus, useFamilyProfile } from "@/hooks/useFamilyData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { MatrimonialRegimeOptions } from "@/components/famille/MatrimonialRegimeOptions";

// Schéma de validation du formulaire
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
  mariagePrecedentPersonne: z.boolean().default(false),
  mariagePrecedentConjoint: z.boolean().default(false),
});

type FormData = z.infer<typeof formSchema>;

export const SituationMatrimonialeForm = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: maritalData, loading, saving, saveData } = useMaritalStatus();
  const { data: familyProfile } = useFamilyProfile();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      parentIsole: false,
      personneHandicapee: false,
      civilitePartenaire: "",
      nomPartenaire: "",
      prenomPartenaire: "",
      lieuNaissancePartenaire: "",
      professionCSP: "",
      professionLibelle: "",
      nationalitePartenaire: "",
      conventionPacs: 'Régime de la séparation des biens',
      regimeMatrimonial: 'Communauté réduite aux acquêts (option sans contrat de mariage)',
      lieuMariage: "",
      mariagePrecedentPersonne: false,
      mariagePrecedentConjoint: false,
    },
  });

  // Watch pour les changements de statut
  const statutCouple = useWatch({
    control: form.control,
    name: "statutCouple"
  });

  const regimeMatrimonial = useWatch({
    control: form.control,
    name: "regimeMatrimonial"
  });

  // Profils pour les options du régime matrimonial
  const userProfile = familyProfile;
  const spouseProfile = {
    prenom: form.watch("prenomPartenaire"),
    nom: form.watch("nomPartenaire")
  };

  // Effet pour charger les données existantes
  useEffect(() => {
    if (maritalData) {
      const dataAny = maritalData as any; // Contournement temporaire pour les nouveaux champs
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
        mariagePrecedentPersonne: dataAny.mariage_precedent_personne || false,
        mariagePrecedentConjoint: dataAny.mariage_precedent_conjoint || false,
      };
      form.reset(formattedData);
    }
  }, [maritalData, form]);

  const onSubmit = async (formData: FormData) => {
    if (!user) {
      toast({
        title: "Erreur",
        description: "Vous devez être connecté pour sauvegarder vos données.",
        variant: "destructive",
      });
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
        mariage_precedent_personne: formData.mariagePrecedentPersonne,
        mariage_precedent_conjoint: formData.mariagePrecedentConjoint,
      };

      await saveData(supabaseData);
      toast({
        title: "Succès",
        description: "Vos informations ont été sauvegardées avec succès.",
      });
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la sauvegarde.",
        variant: "destructive",
      });
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
              <Select onValueChange={field.onChange} value={field.value || ""}>
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
            {/* BLOC 1: Fiche du partenaire */}
            <Card>
              <CardHeader>
                <CardTitle>Informations du conjoint/partenaire</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="civilitePartenaire"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Civilité</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger size="lg">
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
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger size="lg">
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

                {/* Informations spécifiques PACS */}
                {statutCouple === 'Pacsé(e)' && (
                  <div className="space-y-4 mt-6 pt-6 border-t border-border">
                    <h4 className="text-lg font-medium">Informations PACS</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="conventionPacs"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Convention de PACS</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || "Régime de la séparation des biens"}>
                              <FormControl>
                                <SelectTrigger size="lg">
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
                    </div>
                  </div>
                )}

                {/* Informations spécifiques Mariage */}
                {statutCouple === 'Marié(e)' && (
                  <div className="space-y-4 mt-6 pt-6 border-t border-border">
                    <h4 className="text-lg font-medium">Informations Mariage</h4>
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

                    {/* Historique matrimonial */}
                    <div className="space-y-4 mt-4">
                      <h5 className="text-sm font-medium">Historique matrimonial</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                <FormLabel>Mariage précédent pour vous</FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />

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
                                <FormLabel>Mariage précédent pour le conjoint</FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* BLOC 2: Régime matrimonial et options (uniquement pour les mariés) */}
            {statutCouple === 'Marié(e)' && (
              <Card>
                <CardHeader>
                  <CardTitle>Régime matrimonial et options</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="regimeMatrimonial"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Régime matrimonial</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger size="lg">
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

                  {/* Options relatives au régime choisi */}
                  {regimeMatrimonial === "Communauté réduite aux acquêts (option sans contrat de mariage)" && (
                    <MatrimonialRegimeOptions 
                      regimeType="communaute_reduite"
                      userProfile={userProfile}
                      spouseProfile={spouseProfile}
                    />
                  )}
                  {regimeMatrimonial === "Communauté de meubles et d'acquêts" && (
                    <MatrimonialRegimeOptions 
                      regimeType="communaute_meubles"
                      userProfile={userProfile}
                      spouseProfile={spouseProfile}
                    />
                  )}
                  {regimeMatrimonial === "Communauté universelle" && (
                    <MatrimonialRegimeOptions 
                      regimeType="communaute_universelle"
                      userProfile={userProfile}
                      spouseProfile={spouseProfile}
                    />
                  )}
                  {regimeMatrimonial === "Séparation de biens" && (
                    <MatrimonialRegimeOptions 
                      regimeType="separation_biens"
                      userProfile={userProfile}
                      spouseProfile={spouseProfile}
                    />
                  )}
                  {regimeMatrimonial === "Participation aux acquêts" && (
                    <MatrimonialRegimeOptions 
                      regimeType="participation_acquets"
                      userProfile={userProfile}
                      spouseProfile={spouseProfile}
                    />
                  )}
                </CardContent>
              </Card>
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
};