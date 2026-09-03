import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/contexts/AuthContext";
import { useMaritalStatus } from "@/hooks/useFamilyData";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import ActionHubInput from "@/components/ui/action-hub-input";
import NationalitySelect from "@/components/ui/nationality-select";
import { Loader2, Info } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { SmartDateInput } from "@/components/family/SmartDateInput";
import { CheckboxWithLabel } from "@/components/family/CheckboxWithLabel";

const formSchema = z.object({
  statutCouple: z.enum(['Célibataire', 'Concubinage', 'Pacsé(e)', 'Marié(e)', 'Divorcé(e)', 'Veuf/Veuve']).optional(),

  civilitePartenaire: z.enum(['M.', 'Mme', 'Mlle', 'Autre']).optional(),
  nomPartenaire: z.string().optional(),
  nomJeuneFillePartenaire: z.string().optional(),
  prenomPartenaire: z.string().optional(),
  dateNaissancePartenaire: z.date().optional(),
  profession: z.string().optional(),
  nationalitePartenaire: z.string().optional(),
  doubleNationalitePartenaire: z.boolean().default(false),
  nationalite2Partenaire: z.string().optional(),
  capaciteJuridique: z.enum([
    'Aucune',
    'Tutelle',
    'Curatelle',
    'Sauvegarde de justice',
    'Habilitation du conjoint',
    'Habilitation familiale',
    "Mesure d'accompagnement",
  ]).default('Aucune'),
  personneHandicapee: z.boolean().default(false),
  residenceFiscaleEtrangerPartenaire: z.boolean().default(false),
  mandatProtectionFuture: z.boolean().default(false),
  dateMandatProtectionFuture: z.union([z.date(), z.literal(''), z.undefined()]).optional(),
}).superRefine((data, ctx) => {
  // Mêmes champs obligatoires que la Fiche client (FicheClientForm), mais
  // uniquement quand le partenaire est réellement présent dans le foyer —
  // ces champs ne sont d'ailleurs rendus dans le formulaire que dans ce cas.
  const requiresPartnerFields = ['Concubinage', 'Pacsé(e)', 'Marié(e)'].includes(data.statutCouple ?? '');
  if (!requiresPartnerFields) return;

  if (!data.civilitePartenaire) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['civilitePartenaire'], message: 'Veuillez sélectionner une civilité' });
  }
  if (!data.nomPartenaire?.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['nomPartenaire'], message: 'Le nom est obligatoire' });
  }
  if (!data.prenomPartenaire?.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['prenomPartenaire'], message: 'Le prénom est obligatoire' });
  }
  if (!data.dateNaissancePartenaire) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['dateNaissancePartenaire'], message: 'La date de naissance est obligatoire' });
  }
});

type FormData = z.infer<typeof formSchema>;

export function PartnerForm({ onSuccess }: { onSuccess?: () => void } = {}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { data: maritalData, loading, saving, setStatutCouple } = useMaritalStatus();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      personneHandicapee: false,
      residenceFiscaleEtrangerPartenaire: false,
      capaciteJuridique: 'Aucune',
      mandatProtectionFuture: false,
      civilitePartenaire: undefined,
      nomPartenaire: "",
      nomJeuneFillePartenaire: "",
      prenomPartenaire: "",
      profession: "",
      nationalitePartenaire: "",
      doubleNationalitePartenaire: false,
      nationalite2Partenaire: "",
    },
  });

  const statutCouple = useWatch({ control: form.control, name: "statutCouple" });

  useEffect(() => {
    if (maritalData) {
      form.reset({
        statutCouple: maritalData.statut_couple as any,
        civilitePartenaire: maritalData.civilite_conjoint as any,
        nomPartenaire: maritalData.nom_conjoint || "",
        nomJeuneFillePartenaire: maritalData.nom_jeune_fille_conjoint || "",
        prenomPartenaire: maritalData.prenom_conjoint || "",
        dateNaissancePartenaire: maritalData.date_naissance_conjoint ? new Date(maritalData.date_naissance_conjoint) : undefined,
        profession: maritalData.profession_conjoint || maritalData.profession_csp_conjoint || "",
        nationalitePartenaire: maritalData.nationalite_conjoint || "",
        doubleNationalitePartenaire: !!maritalData.nationalite_2_conjoint,
        nationalite2Partenaire: maritalData.nationalite_2_conjoint || "",
        capaciteJuridique: (maritalData.capacite_juridique_conjoint as FormData['capaciteJuridique']) || 'Aucune',
        personneHandicapee: maritalData.personne_handicapee_conjoint || false,
        residenceFiscaleEtrangerPartenaire: maritalData.residence_fiscale_etranger_conjoint || false,
        mandatProtectionFuture: maritalData.mandat_protection_future_conjoint || false,
        dateMandatProtectionFuture: maritalData.date_mandat_protection_future_conjoint ? new Date(maritalData.date_mandat_protection_future_conjoint) : undefined,
      });
    }
  }, [maritalData, form]);

  const onSubmit = async (formData: FormData) => {
    try {
      const supabaseData = {
        civilite_conjoint: formData.civilitePartenaire,
        nom_conjoint: formData.nomPartenaire,
        nom_jeune_fille_conjoint: formData.nomJeuneFillePartenaire,
        prenom_conjoint: formData.prenomPartenaire,
        date_naissance_conjoint: formData.dateNaissancePartenaire instanceof Date ? format(formData.dateNaissancePartenaire, 'yyyy-MM-dd') : undefined,
        profession_conjoint: formData.profession?.trim() || '',
        profession_csp_conjoint: '',
        nationalite_conjoint: formData.nationalitePartenaire,
        nationalite_2_conjoint: formData.doubleNationalitePartenaire ? (formData.nationalite2Partenaire || '') : '',
        personne_handicapee_conjoint: formData.personneHandicapee,
        residence_fiscale_etranger_conjoint: formData.residenceFiscaleEtrangerPartenaire,
        capacite_juridique_conjoint: formData.capaciteJuridique,
        mandat_protection_future_conjoint: formData.mandatProtectionFuture,
        date_mandat_protection_future_conjoint: formData.dateMandatProtectionFuture instanceof Date ? format(formData.dateMandatProtectionFuture, 'yyyy-MM-dd') : undefined,
      };

      await setStatutCouple(formData.statutCouple ?? null, supabaseData);
      toast({ title: "Succès", description: "Les informations ont été sauvegardées avec succès." });
      onSuccess?.();
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Erreur lors de la sauvegarde:', error);
      }
      toast({ title: "Erreur", description: "Une erreur est survenue lors de la sauvegarde.", variant: "destructive" });
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

  const showPartnerFields =
    statutCouple === "Concubinage" || statutCouple === "Pacsé(e)" || statutCouple === "Marié(e)";

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="rounded-md border bg-card p-6 shadow-sm space-y-6">
            {/* Statut & Identité */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Identité</h3>

              {!showPartnerFields && (
                <div className="flex items-start gap-3 rounded-md border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
                  <Info className="h-4 w-4 mt-0.5 shrink-0" />
                  <div className="space-y-3">
                    <p>
                      Le statut matrimonial n'est pas encore renseigné. Rendez-vous sur la fiche personnelle
                      (onglet « Ma famille ») pour définir un statut de couple (Concubinage, Pacsé(e) ou Marié(e))
                      avant de saisir les informations du partenaire.
                    </p>
                    <Button type="button" variant="outline" size="sm" onClick={() => navigate('/dashboard/famille')}>
                      Aller à la fiche personnelle
                    </Button>
                  </div>
                </div>
              )}

              {showPartnerFields && (
                <>
                  <FormField
                    control={form.control}
                    name="civilitePartenaire"
                    render={({ field }) => (
                      <FormItem className="space-y-2 mb-5">
                        <FormLabel>
                          Civilité <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="flex flex-row gap-4"
                          >
                            {[
                              { value: 'M.', label: 'M.' },
                              { value: 'Mme', label: 'Mme' },
                              { value: 'Mlle', label: 'Mlle' },
                              { value: 'Autre', label: 'Autre' },
                            ].map((option) => (
                              <label
                                key={option.value}
                                className={cn(
                                  "flex items-center gap-2 px-4 py-2.5 rounded-md border cursor-pointer transition-all duration-200",
                                  field.value === option.value
                                    ? "border-primary bg-primary/5 text-primary"
                                    : "border-border hover:border-primary/40 hover:bg-muted/50"
                                )}
                              >
                                <RadioGroupItem value={option.value} id={`civ-p-${option.value}`} />
                                <span className="text-sm font-medium">{option.label}</span>
                              </label>
                            ))}
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <FormField
                      control={form.control}
                      name="nomPartenaire"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormControl>
                            <ActionHubInput
                              label="Nom"
                              placeholder="Nom de famille"
                              value={field.value}
                              onChange={field.onChange}
                              required
                              historyEnabled={false}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {(form.watch('civilitePartenaire') === 'Mme' || form.watch('civilitePartenaire') === 'Mlle' || form.watch('civilitePartenaire') === 'Autre') && (
                      <FormField
                        control={form.control}
                        name="nomJeuneFillePartenaire"
                        render={({ field }) => (
                          <FormItem className="space-y-1">
                            <FormControl>
                              <ActionHubInput
                                label="Nom de jeune fille"
                                placeholder="Nom de jeune fille"
                                value={field.value}
                                onChange={field.onChange}
                                historyEnabled={false}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <FormField
                      control={form.control}
                      name="prenomPartenaire"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormControl>
                            <ActionHubInput
                              label="Prénom"
                              placeholder="Prénom"
                              value={field.value}
                              onChange={field.onChange}
                              required
                              historyEnabled={false}
                            />
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
                          <div className="relative w-full flex flex-col gap-1">
                            <FormLabel>
                              Date de naissance <span className="text-destructive">*</span>
                            </FormLabel>
                            <SmartDateInput
                              value={field.value}
                              onChange={field.onChange}
                              className="bg-background border-border shadow-none rounded-md focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/20"
                            />
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </>
              )}
            </div>

            {showPartnerFields && (
              <>
                <Separator />

                {/* Profession & Naissance */}
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Profession & Naissance</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                    <FormField
                      control={form.control}
                      name="profession"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormControl>
                            <ActionHubInput
                              label="Profession"
                              placeholder="Profession"
                              value={field.value}
                              onChange={field.onChange}
                              historyEnabled={false}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <FormField
                      control={form.control}
                      name="nationalitePartenaire"
                      render={({ field }) => (
                        <FormItem>
                          <div className="relative w-full flex flex-col gap-1">
                            <FormLabel>Nationalité</FormLabel>
                            <FormControl>
                              <NationalitySelect
                                value={field.value}
                                onValueChange={field.onChange}
                                placeholder="Sélectionner une nationalité"
                              />
                            </FormControl>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="doubleNationalitePartenaire"
                      render={({ field }) => (
                        <CheckboxWithLabel checked={field.value} onCheckedChange={field.onChange} label="Double nationalité" />
                      )}
                    />

                    {form.watch('doubleNationalitePartenaire') && (
                      <FormField
                        control={form.control}
                        name="nationalite2Partenaire"
                        render={({ field }) => (
                          <FormItem>
                            <div className="relative w-full flex flex-col gap-1">
                              <FormLabel>Deuxième nationalité</FormLabel>
                              <FormControl>
                                <NationalitySelect
                                  value={field.value}
                                  onValueChange={field.onChange}
                                  placeholder="Sélectionner une nationalité"
                                />
                              </FormControl>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                </div>

                <Separator />

                {/* Situation juridique */}
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Situation juridique</h3>

                  <div className="flex flex-wrap items-end gap-6">
                    <FormField
                      control={form.control}
                      name="capaciteJuridique"
                      render={({ field }) => (
                        <FormItem className="w-72">
                          <div className="relative w-full flex flex-col gap-1">
                            <FormLabel>Capacité juridique</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger size="lg" className="bg-background border-border shadow-none rounded-md focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/20">
                                  <SelectValue placeholder="Sélectionner la capacité juridique" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Aucune">Aucune</SelectItem>
                                <SelectItem value="Tutelle">Tutelle</SelectItem>
                                <SelectItem value="Curatelle">Curatelle</SelectItem>
                                <SelectItem value="Sauvegarde de justice">Sauvegarde de justice</SelectItem>
                                <SelectItem value="Habilitation du conjoint">Habilitation du conjoint</SelectItem>
                                <SelectItem value="Habilitation familiale">Habilitation familiale</SelectItem>
                                <SelectItem value="Mesure d'accompagnement">Mesure d'accompagnement</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="personneHandicapee"
                      render={({ field }) => (
                        <CheckboxWithLabel checked={field.value} onCheckedChange={field.onChange} label="Personne handicapée" />
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="residenceFiscaleEtrangerPartenaire"
                      render={({ field }) => (
                        <CheckboxWithLabel checked={field.value} onCheckedChange={field.onChange} label="Résidence fiscale à l'étranger" />
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="mandatProtectionFuture"
                      render={({ field }) => (
                        <CheckboxWithLabel checked={field.value} onCheckedChange={field.onChange} label="Mandat de protection future signé" />
                      )}
                    />

                    {form.watch('mandatProtectionFuture') && (
                      <FormField
                        control={form.control}
                        name="dateMandatProtectionFuture"
                        render={({ field }) => (
                          <FormItem className="w-72">
                            <div className="relative w-full flex flex-col gap-1">
                              <FormLabel>Date du mandat</FormLabel>
                              <SmartDateInput
                                value={field.value}
                                onChange={field.onChange}
                                className="bg-background border-border shadow-none rounded-md focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/20"
                              />
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

        {/* Bouton Enregistrer */}
        <div className="flex justify-end">
          <Button type="submit" disabled={saving} size="lg" className="min-w-[160px]">
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
