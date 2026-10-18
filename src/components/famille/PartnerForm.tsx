import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMaritalStatus } from "@/hooks/useFamilyData";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import ActionHubInput from "@/components/ui/action-hub-input";
import NationalitySelect from "@/components/ui/nationality-select";
import { Info, User, Briefcase, ShieldCheck } from "lucide-react";
import { LogoSpinner } from "@/components/brand/LogoSpinner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { SmartDateInput } from "@/components/family/SmartDateInput";
import { CheckboxWithLabel } from "@/components/family/CheckboxWithLabel";
import { OuiNonToggle } from "@/components/family/OuiNonToggle";
import { SectionHeader } from "@/components/family/SectionHeader";
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { WorkspaceHeader } from "@/components/layout/workspace-panel";
import { isCoupleStatus } from '@/lib/family/maritalStatus';

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
  mandatProtectionFuture: z.boolean().default(false),
  dateMandatProtectionFuture: z.union([z.date(), z.literal(''), z.undefined()]).optional(),
}).superRefine((data, ctx) => {
  // Mêmes champs obligatoires que la Fiche client (FicheClientForm), mais
  // uniquement quand le partenaire est réellement présent dans le foyer —
  // ces champs ne sont d'ailleurs rendus dans le formulaire que dans ce cas.
  const requiresPartnerFields = isCoupleStatus(data.statutCouple);
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

interface PartnerFormProps {
  onSuccess?: () => void;
  onBack?: () => void;
  title: string;
  summary?: string;
}

export function PartnerForm({ onSuccess, onBack, title, summary }: PartnerFormProps) {
  const navigate = useNavigate();
  const { data: maritalData, loading, saving, setStatutCouple } = useMaritalStatus();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      personneHandicapee: false,
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
        statutCouple: maritalData.statut_couple as FormData['statutCouple'],
        civilitePartenaire: maritalData.civilite_conjoint as FormData['civilitePartenaire'],
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
        date_naissance_conjoint: formData.dateNaissancePartenaire instanceof Date ? format(formData.dateNaissancePartenaire, 'yyyy-MM-dd') : null,
        profession_conjoint: formData.profession?.trim() || '',
        nationalite_conjoint: formData.nationalitePartenaire,
        nationalite_2_conjoint: formData.doubleNationalitePartenaire ? (formData.nationalite2Partenaire || '') : '',
        personne_handicapee_conjoint: formData.personneHandicapee,
        capacite_juridique_conjoint: formData.capaciteJuridique,
        mandat_protection_future_conjoint: formData.mandatProtectionFuture,
        date_mandat_protection_future_conjoint: formData.mandatProtectionFuture && formData.dateMandatProtectionFuture instanceof Date ? format(formData.dateMandatProtectionFuture, 'yyyy-MM-dd') : null,
      };

      await setStatutCouple(formData.statutCouple ?? null, supabaseData);
      onSuccess?.();
    } catch (error) {
      // Notification déjà affichée par useMaritalStatus.
      if (import.meta.env.DEV) {
        console.error('Erreur lors de la sauvegarde:', error);
      }
    }
  };

  if (loading) {
    return (
      <LoadingSpinner text="Chargement des données..." />
    );
  }

  const showPartnerFields =
    isCoupleStatus(statutCouple);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="workspace-panel -mx-4 -mt-3 md:-m-6">
        <WorkspaceHeader
          icon={<User strokeWidth={1.75} />}
          trail={['Famille', 'Foyer', 'Conjoint']}
          actions={
            <>
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="inline-flex h-8 items-center rounded-[2px] border border-border px-3 text-[12.5px] font-medium text-foreground transition-colors hover:bg-secondary"
                >
                  Retour
                </button>
              )}
              <Button type="submit" disabled={saving} size="sm" className="h-8 rounded-[2px] bg-foreground px-3.5 text-[12.5px] text-background hover:opacity-90">
                {saving ? (<><LogoSpinner />Enregistrement...</>) : 'Enregistrer'}
              </Button>
            </>
          }
        />

        <div className="px-8 pt-6 pb-4">
          <h1 className="text-[24px] font-medium leading-tight tracking-[-0.02em]">{title}</h1>
          {summary && <p className="mt-1 text-[12.5px] text-muted-foreground">{summary}</p>}
        </div>

        <div className="divide-y divide-border border-t border-border">
            {/* Statut & Identité */}
            <div className="px-8 py-6">
              <SectionHeader icon={User} title="Identité" />

              {!showPartnerFields && (
                <div className="flex items-start gap-3 text-[13px] text-muted-foreground">
                  <Info className="h-4 w-4 mt-0.5 shrink-0" />
                  <div className="space-y-3">
                    <p>
                      Le statut matrimonial n'est pas encore renseigné. Rendez-vous sur la fiche personnelle
                      (page Foyer) pour définir un statut de couple (Concubinage, Pacsé(e) ou Marié(e))
                      avant de saisir les informations du partenaire.
                    </p>
                    <Button type="button" variant="outline" size="sm" onClick={() => navigate('/dashboard/famille')}>
                      Aller au Foyer
                    </Button>
                  </div>
                </div>
              )}

              {showPartnerFields && (
                <div className="space-y-5">
                  <FormField
                    control={form.control}
                    name="civilitePartenaire"
                    render={({ field }) => (
                      <FormItem className="flex flex-col items-start gap-3 space-y-0">
                        <FormLabel>
                          Civilité <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <div role="radiogroup" className="inline-grid grid-cols-4 gap-[3px] rounded-[5px] border border-border bg-muted/40 p-[3px]">
                            {['M.', 'Mme', 'Mlle', 'Autre'].map((option) => (
                              <button
                                key={option}
                                type="button"
                                role="radio"
                                aria-checked={field.value === option}
                                onClick={() => field.onChange(option)}
                                className={cn(
                                  "h-8 rounded-[2px] border px-4 text-[12.5px] transition-colors",
                                  field.value === option ? "border-foreground bg-foreground text-background" : "border-transparent text-muted-foreground hover:text-foreground"
                                )}
                              >
                                {option}
                              </button>
                            ))}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
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
                              className="bg-background border-border shadow-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/20"
                            />
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}
            </div>

            {showPartnerFields && (
              <>
                {/* Profession & Nationalité */}
                <div className="px-8 py-6">
                  <SectionHeader icon={Briefcase} title="Profession & Nationalité" />

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
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
                      <div className="md:self-end">
                        <FormField
                          control={form.control}
                          name="doubleNationalitePartenaire"
                          render={({ field }) => (
                            <CheckboxWithLabel checked={field.value} onCheckedChange={field.onChange} label="Double nationalité" />
                          )}
                        />
                      </div>
                      {form.watch('doubleNationalitePartenaire') && (
                        <div className="md:col-start-2">
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
                        </div>
                      )}
                    </div>
                </div>

                {/* Situation juridique */}
                <div className="px-8 py-6">
                  <SectionHeader icon={ShieldCheck} title="Situation juridique" />

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      <FormField
                        control={form.control}
                        name="capaciteJuridique"
                        render={({ field }) => (
                          <FormItem>
                            <div className="relative w-full flex flex-col gap-1">
                              <FormLabel>Capacité juridique</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger size="lg" className="bg-background border-border shadow-none rounded-md">
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
                          <FormItem className="flex flex-col gap-1 space-y-0">
                            <FormLabel>Personne handicapée</FormLabel>
                            <FormControl>
                              <OuiNonToggle value={!!field.value} onChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="mandatProtectionFuture"
                        render={({ field }) => (
                          <FormItem className="flex flex-col gap-1 space-y-0">
                            <FormLabel>Mandat de protection future</FormLabel>
                            <FormControl>
                              <OuiNonToggle value={!!field.value} onChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                    {/* Date du mandat sous sa case, dans la même colonne. */}
                    {form.watch('mandatProtectionFuture') && (
                      <div className="md:col-start-3">
                        <FormField
                          control={form.control}
                          name="dateMandatProtectionFuture"
                          render={({ field }) => (
                            <FormItem>
                              <div className="relative w-full flex flex-col gap-1">
                                <FormLabel>Date du mandat</FormLabel>
                                <SmartDateInput
                                  value={field.value}
                                  onChange={field.onChange}
                                  className="bg-background border-border shadow-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/20"
                                />
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                    </div>
                </div>
              </>
            )}
          </div>

      </form>
    </Form>
  );
}
