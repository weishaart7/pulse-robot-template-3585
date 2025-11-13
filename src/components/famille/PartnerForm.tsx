import { useEffect } from "react";
import { z } from "zod";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/contexts/AuthContext";
import { useMaritalStatus } from "@/hooks/useFamilyData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  statutCouple: z.enum(['Célibataire', 'Concubinage', 'Pacsé(e)', 'Marié(e)']).optional(),
  parentIsole: z.boolean().default(false),
  
  civilitePartenaire: z.string().optional(),
  nomPartenaire: z.string().optional(),
  prenomPartenaire: z.string().optional(),
  dateNaissancePartenaire: z.date().optional(),
  lieuNaissancePartenaire: z.string().optional(),
  professionCSP: z.string().optional(),
  professionLibelle: z.string().optional(),
  nationalitePartenaire: z.string().optional(),
  personneHandicapee: z.boolean().default(false),
  
  mariagePrecedentPersonne: z.boolean().default(false),
  mariagePrecedentConjoint: z.boolean().default(false),
});

type FormData = z.infer<typeof formSchema>;

export function PartnerForm() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: maritalData, loading, saving, saveData } = useMaritalStatus();

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
      mariagePrecedentPersonne: false,
      mariagePrecedentConjoint: false,
    },
  });

  const statutCouple = useWatch({
    control: form.control,
    name: "statutCouple"
  });

  useEffect(() => {
    if (maritalData) {
      form.reset({
        statutCouple: maritalData.statut_couple as any,
        parentIsole: maritalData.parent_isole || false,
        civilitePartenaire: maritalData.civilite_conjoint || "",
        nomPartenaire: maritalData.nom_conjoint || "",
        prenomPartenaire: maritalData.prenom_conjoint || "",
        dateNaissancePartenaire: maritalData.date_naissance_conjoint ? new Date(maritalData.date_naissance_conjoint) : undefined,
        lieuNaissancePartenaire: maritalData.lieu_naissance_conjoint || "",
        professionCSP: maritalData.profession_csp_conjoint || "",
        professionLibelle: maritalData.profession_conjoint || "",
        nationalitePartenaire: maritalData.nationalite_conjoint || "",
        personneHandicapee: maritalData.personne_handicapee_conjoint || false,
        mariagePrecedentPersonne: maritalData.mariage_precedent_personne || false,
        mariagePrecedentConjoint: maritalData.mariage_precedent_conjoint || false,
      });
    }
  }, [maritalData, form]);

  const onSubmit = async (formData: FormData) => {
    try {
      const supabaseData = {
        statut_couple: formData.statutCouple,
        parent_isole: formData.parentIsole,
        civilite_conjoint: formData.civilitePartenaire,
        nom_conjoint: formData.nomPartenaire,
        prenom_conjoint: formData.prenomPartenaire,
        date_naissance_conjoint: formData.dateNaissancePartenaire?.toISOString().split('T')[0],
        lieu_naissance_conjoint: formData.lieuNaissancePartenaire,
        profession_csp_conjoint: formData.professionCSP,
        profession_conjoint: formData.professionLibelle,
        nationalite_conjoint: formData.nationalitePartenaire,
        personne_handicapee_conjoint: formData.personneHandicapee,
        mariage_precedent_personne: formData.mariagePrecedentPersonne,
        mariage_precedent_conjoint: formData.mariagePrecedentConjoint,
      };

      await saveData(supabaseData);
      toast({
        title: "Succès",
        description: "Les informations ont été sauvegardées avec succès.",
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
      <div className="flex items-center justify-center p-6">
        <Loader2 className="h-6 w-6 animate-spin" />
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
              <FormLabel>Statut matrimonial</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || ""}>
                <FormControl>
                  <SelectTrigger>
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

        {(statutCouple === 'Concubinage' || statutCouple === 'Pacsé(e)' || statutCouple === 'Marié(e)') && (
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
                            disabled={(date) => date > new Date()}
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
                      <FormLabel>Commune de naissance</FormLabel>
                      <FormControl>
                        <Input placeholder="Commune de naissance" {...field} />
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

                <FormField
                  control={form.control}
                  name="professionCSP"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Profession (CSP)</FormLabel>
                      <FormControl>
                        <Input placeholder="Catégorie socio-professionnelle" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="professionLibelle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Profession (Libellé)</FormLabel>
                      <FormControl>
                        <Input placeholder="Intitulé du poste" {...field} />
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
                      <FormLabel>
                        Personne handicapée
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Historique matrimonial</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
                      <FormLabel>
                        Mariage précédent pour vous
                      </FormLabel>
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
                      <FormLabel>
                        Mariage précédent pour le conjoint
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end pt-6">
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enregistrement...
              </>
            ) : (
              "Enregistrer"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
