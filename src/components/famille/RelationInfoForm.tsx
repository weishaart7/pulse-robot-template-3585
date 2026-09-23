import { Fragment, useEffect, useState } from "react";
import { z } from "zod";
import { useForm, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMaritalStatus } from "@/hooks/useFamilyData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ActionHubInput from "@/components/ui/action-hub-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Loader2, Heart, FileText, Gift, History, Scale, Coins } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { SmartDateInput } from "@/components/family/SmartDateInput";
import { CheckboxWithLabel } from "@/components/family/CheckboxWithLabel";
import { SectionHeader } from "@/components/family/SectionHeader";
import { QualificationRegimeOptions } from "@/components/famille/matrimonial/QualificationRegimeOptions";
import { RecompensesSection } from "@/components/famille/matrimonial/RecompensesSection";
import { CreancesEntreEpouxSection } from "@/components/famille/matrimonial/CreancesEntreEpouxSection";
import { PatrimoineOriginaireSection } from "@/components/famille/matrimonial/PatrimoineOriginaireSection";
import { PatrimoineFinalSection } from "@/components/famille/matrimonial/PatrimoineFinalSection";
import { determinerRegimeLegal, REGIMES_MATRIMONIAUX } from "@/lib/patrimoine/regimeLegal";
import { getSimplifiedRegime, RegimeType, toRegimeType } from "@/types/matrimonial";
import { buildRelationInfoPayload } from "@/lib/family/relationInfoPayload";

const formSchema = z.object({
  conventionPacs: z.enum(['Régime de la séparation des biens', 'Indivision']).default('Régime de la séparation des biens'),
  datePacs: z.date().optional(),
  regimeMatrimonial: z.enum([
    'Communauté réduite aux acquêts',
    'Communauté de meubles et d\'acquêts',
    'Communauté universelle',
    'Séparation de biens',
    'Séparation de biens avec société d\'acquêts',
    'Participation aux acquêts'
  ]).default('Communauté réduite aux acquêts'),
  dateMariage: z.date().optional(),
  lieuMariage: z.string().optional(),
  pasDeContrat: z.boolean().default(false),
  impositionDistincte: z.boolean().default(false),
  residenceSeparee: z.boolean().default(false),
  separationDeCorps: z.boolean().default(false),
  separationCorpsClauseRenonciation: z.boolean().default(false),
  donationDernierVivantPersonne: z.boolean().default(false),
  dateDonationPersonne: z.date().optional(),
  donationDernierVivantConjoint: z.boolean().default(false),
  dateDonationConjoint: z.date().optional(),
  mariagePrecedentPersonne: z.boolean().default(false),
  dureeMariagePrecedentPersonneAnnees: z.number().min(0).max(100).optional().nullable(),
  dureeMariagePrecedentPersonneMois: z.number().min(0).max(11).optional().nullable(),
  mariagePrecedentConjoint: z.boolean().default(false),
  dureeMariagePrecedentConjointAnnees: z.number().min(0).max(100).optional().nullable(),
  dureeMariagePrecedentConjointMois: z.number().min(0).max(11).optional().nullable(),
});

type FormData = z.infer<typeof formSchema>;
type Section = 'informations-generales' | 'recompenses-creances' | 'participation-acquets' | 'donation' | 'historique';

const SECTION_LABELS: Record<Section, string> = {
  'informations-generales': 'Informations générales',
  'recompenses-creances': 'Récompenses & créances',
  'participation-acquets': 'Participation aux acquêts',
  'donation': 'Donation au dernier vivant',
  'historique': 'Historique matrimonial',
};

const FIELD_TO_SECTION: Partial<Record<keyof FormData, Section>> = {
  dateMariage: 'informations-generales',
  lieuMariage: 'informations-generales',
  regimeMatrimonial: 'informations-generales',
  conventionPacs: 'informations-generales',
  datePacs: 'informations-generales',
  pasDeContrat: 'informations-generales',
  impositionDistincte: 'informations-generales',
  residenceSeparee: 'informations-generales',
  separationDeCorps: 'informations-generales',
  separationCorpsClauseRenonciation: 'informations-generales',
  donationDernierVivantPersonne: 'donation',
  dateDonationPersonne: 'donation',
  donationDernierVivantConjoint: 'donation',
  dateDonationConjoint: 'donation',
  mariagePrecedentPersonne: 'historique',
  dureeMariagePrecedentPersonneAnnees: 'historique',
  dureeMariagePrecedentPersonneMois: 'historique',
  mariagePrecedentConjoint: 'historique',
  dureeMariagePrecedentConjointAnnees: 'historique',
  dureeMariagePrecedentConjointMois: 'historique',
};

type Props = {
  relationStatus: string;
  onSuccess?: () => void;
};

export function RelationInfoForm({ relationStatus, onSuccess }: Props) {
  const { toast } = useToast();
  const { data: maritalData, saving, saveData, setDonationDernierVivant } = useMaritalStatus();
  const [activeSection, setActiveSection] = useState<Section>('informations-generales');
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      conventionPacs: 'Régime de la séparation des biens',
      regimeMatrimonial: 'Communauté réduite aux acquêts',
      lieuMariage: "",
      pasDeContrat: false,
      impositionDistincte: false,
      residenceSeparee: false,
      separationDeCorps: false,
      separationCorpsClauseRenonciation: false,
      donationDernierVivantPersonne: false,
      donationDernierVivantConjoint: false,
      mariagePrecedentPersonne: false,
      mariagePrecedentConjoint: false,
    },
  });

  useEffect(() => {
    if (maritalData) {
      form.reset({
        conventionPacs: (maritalData.convention_pacs as any) || 'Régime de la séparation des biens',
        datePacs: maritalData.date_pacs ? new Date(maritalData.date_pacs) : undefined,
        regimeMatrimonial: (maritalData.regime_matrimonial as any) || 'Communauté réduite aux acquêts',
        dateMariage: maritalData.date_mariage ? new Date(maritalData.date_mariage) : undefined,
        lieuMariage: maritalData.lieu_mariage || "",
        pasDeContrat: maritalData.pas_de_contrat_mariage || false,
        impositionDistincte: maritalData.imposition_distincte || false,
        residenceSeparee: maritalData.residence_separee || false,
        separationDeCorps: maritalData.separation_de_corps || false,
        separationCorpsClauseRenonciation: maritalData.separation_corps_clause_renonciation || false,
        donationDernierVivantPersonne: maritalData.donation_dernier_vivant_personne || false,
        dateDonationPersonne: maritalData.date_donation_personne ? new Date(maritalData.date_donation_personne) : undefined,
        donationDernierVivantConjoint: maritalData.donation_dernier_vivant_conjoint || false,
        dateDonationConjoint: maritalData.date_donation_conjoint ? new Date(maritalData.date_donation_conjoint) : undefined,
        mariagePrecedentPersonne: maritalData.mariage_precedent_personne || false,
        dureeMariagePrecedentPersonneAnnees: maritalData.duree_mariage_precedent_personne_annees,
        dureeMariagePrecedentPersonneMois: maritalData.duree_mariage_precedent_personne_mois,
        mariagePrecedentConjoint: maritalData.mariage_precedent_conjoint || false,
        dureeMariagePrecedentConjointAnnees: maritalData.duree_mariage_precedent_conjoint_annees,
        dureeMariagePrecedentConjointMois: maritalData.duree_mariage_precedent_conjoint_mois,
      });
    }
  }, [maritalData, form]);

  const onSubmit = async (data: FormData) => {
    try {
      const payload = buildRelationInfoPayload(relationStatus, data) as Record<string, unknown>;

      if (relationStatus === 'Marié(e)') {
        const {
          donation_dernier_vivant_personne,
          date_donation_personne,
          donation_dernier_vivant_conjoint,
          date_donation_conjoint,
          ...rest
        } = payload;
        await setDonationDernierVivant(
          {
            donation_dernier_vivant_personne: donation_dernier_vivant_personne as boolean,
            date_donation_personne: date_donation_personne as string | undefined,
            donation_dernier_vivant_conjoint: donation_dernier_vivant_conjoint as boolean,
            date_donation_conjoint: date_donation_conjoint as string | undefined,
          },
          rest
        );
      } else {
        await saveData(payload as any);
      }

      toast({ title: "Succès", description: "Les informations ont été sauvegardées avec succès." });
      onSuccess?.();
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Erreur de sauvegarde:', error);
      }
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la sauvegarde.",
        variant: "destructive",
      });
    }
  };

  const onError = (errors: FieldErrors<FormData>) => {
    const invalidField = (Object.keys(errors) as (keyof FormData)[])[0];
    const targetSection = invalidField ? FIELD_TO_SECTION[invalidField] : undefined;

    if (targetSection && targetSection !== activeSection) {
      setActiveSection(targetSection);
    }

    toast({
      title: "Erreur de saisie",
      description: targetSection
        ? `Veuillez corriger les champs invalides dans l'onglet « ${SECTION_LABELS[targetSection]} ».`
        : "Veuillez corriger les champs invalides avant d'enregistrer.",
      variant: "destructive",
    });
  };

  // Appelé à chaque sélection dans le <Select> du régime (et par la case
  // "pas de contrat de mariage" ci-dessous, avec le régime légal déterminé
  // par la date de mariage).
  const handleRegimeSelect = (nouveauRegime: string) => {
    form.setValue('regimeMatrimonial', nouveauRegime as FormData['regimeMatrimonial']);
  };

  const regimeMatrimonial = form.watch("regimeMatrimonial");
  const separationDeCorps = form.watch("separationDeCorps");
  const pasDeContrat = form.watch("pasDeContrat");
  const dateMariage = form.watch("dateMariage");
  const mariagePrecedentPersonne = form.watch("mariagePrecedentPersonne");
  const mariagePrecedentConjoint = form.watch("mariagePrecedentConjoint");

  useEffect(() => {
    if (pasDeContrat) {
      handleRegimeSelect(determinerRegimeLegal(dateMariage?.toISOString()));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pasDeContrat, dateMariage, form]);

  useEffect(() => {
    if (!mariagePrecedentPersonne) {
      form.setValue('dureeMariagePrecedentPersonneAnnees', null);
      form.setValue('dureeMariagePrecedentPersonneMois', null);
    }
  }, [mariagePrecedentPersonne, form]);

  useEffect(() => {
    if (!mariagePrecedentConjoint) {
      form.setValue('dureeMariagePrecedentConjointAnnees', null);
      form.setValue('dureeMariagePrecedentConjointMois', null);
    }
  }, [mariagePrecedentConjoint, form]);

  // Mécanisme A (cf. src/lib/patrimoine/succession.ts) : recompenses uniquement
  // pertinentes en présence d'une masse commune (régimes communautaires +
  // séparation de biens avec société d'acquêts) ; créances entre époux, elles,
  // s'appliquent dans tous les régimes matrimoniaux (art. 1479, 1543 C. civ.).
  const simplifiedRegimeType: RegimeType = toRegimeType(regimeMatrimonial);
  const hasMasseCommune = getSimplifiedRegime(simplifiedRegimeType) === 'communauté' || simplifiedRegimeType === 'separation_societe_acquets';

  const sections = relationStatus === "Marié(e)" ? [
    { id: 'informations-generales' as Section, label: 'Informations générales', icon: Heart },
    { id: 'recompenses-creances' as Section, label: 'Récompenses & créances', icon: Scale },
    // Pill conditionnée au régime (contrairement à recompenses-creances,
    // toujours affichée) : la participation aux acquêts n'a de sens que sous
    // ce régime, cf. diagnostic chantier participation aux acquêts.
    ...(simplifiedRegimeType === 'participation_acquets'
      ? [{ id: 'participation-acquets' as Section, label: 'Participation aux acquêts', icon: Coins }]
      : []),
    { id: 'donation' as Section, label: 'Donation au dernier vivant', icon: Gift },
    { id: 'historique' as Section, label: 'Historique matrimonial', icon: History },
  ] : [];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit, onError)} className="space-y-8">
        {/* Barre de navigation des sous-sections */}
        {sections.length > 0 && (
          <Breadcrumb>
            <BreadcrumbList className="flex-nowrap overflow-x-auto text-sm sm:flex-wrap">
              {sections.map((section, index) => (
                <Fragment key={section.id}>
                  {index > 0 && <BreadcrumbSeparator />}
                  <BreadcrumbItem className="shrink-0">
                    {activeSection === section.id ? (
                      <BreadcrumbPage className="inline-flex items-center gap-1.5 text-foreground font-medium">
                        <section.icon className="h-3.5 w-3.5" />
                        {section.label}
                      </BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild>
                        <button
                          type="button"
                          onClick={() => setActiveSection(section.id)}
                          className="inline-flex items-center gap-1.5"
                        >
                          <section.icon className="h-3.5 w-3.5" />
                          {section.label}
                        </button>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </Fragment>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        )}

        {/* MARIÉ */}
        {relationStatus === "Marié(e)" && (
          <>
            {activeSection === 'informations-generales' && (
              <div className="rounded-3xl border border-border bg-card p-8 space-y-10">
                <div>
                  <SectionHeader icon={Heart} title="Date & lieu" />
                  <div className="rounded-lg bg-secondary p-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <FormField
                        control={form.control}
                        name="dateMariage"
                        render={({ field }) => (
                          <FormItem>
                            <div className="relative w-full flex flex-col gap-1">
                              <FormLabel>Date du mariage</FormLabel>
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
                      <FormField
                        control={form.control}
                        name="lieuMariage"
                        render={({ field }) => (
                          <FormItem className="space-y-1">
                            <FormControl>
                              <ActionHubInput
                                label="Lieu du mariage"
                                placeholder="Lieu du mariage"
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
                  </div>
                </div>

                <Separator />

                <div>
                  <SectionHeader icon={FileText} title="Régime matrimonial" />
                  <div className="rounded-lg bg-secondary p-5">
                    <FormField
                      control={form.control}
                      name="regimeMatrimonial"
                      render={({ field }) => (
                        <FormItem className="mb-5">
                          <div className="relative w-full flex flex-col gap-1">
                            <FormLabel>Régime</FormLabel>
                            <Select onValueChange={handleRegimeSelect} value={field.value} disabled={pasDeContrat}>
                              <FormControl>
                                <SelectTrigger size="lg" className="bg-background border-border shadow-none rounded-md focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/20">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {REGIMES_MATRIMONIAUX.map(regime => (
                                  <SelectItem key={regime} value={regime}>{regime}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex flex-wrap items-center gap-6">
                      <FormField
                        control={form.control}
                        name="pasDeContrat"
                        render={({ field }) => (
                          <CheckboxWithLabel checked={field.value} onCheckedChange={field.onChange} label="Pas de contrat de mariage" />
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="residenceSeparee"
                        render={({ field }) => (
                          <CheckboxWithLabel checked={field.value} onCheckedChange={field.onChange} label="Résidence séparée" />
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="separationDeCorps"
                        render={({ field }) => (
                          <CheckboxWithLabel checked={field.value} onCheckedChange={field.onChange} label="Séparation de corps" />
                        )}
                      />
                      {/* L'époux séparé de corps reste conjoint successible sauf clause de
                          renonciation dans la convention (C. civ. art. 732, référentiel §5.1) */}
                      <FormField
                        control={form.control}
                        name="separationCorpsClauseRenonciation"
                        render={({ field }) => (
                          <CheckboxWithLabel
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={!separationDeCorps}
                            label="Clause de renonciation aux droits successoraux (convention de séparation)"
                          />
                        )}
                      />
                    </div>

                    {!pasDeContrat && (
                      <div className="mt-5">
                        <QualificationRegimeOptions regimeType={simplifiedRegimeType} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'recompenses-creances' && (
              <div className="space-y-6">
                {hasMasseCommune && <RecompensesSection />}
                <CreancesEntreEpouxSection />
              </div>
            )}

            {/* Régime-gardée en plus du gating de la pill ci-dessus : évite
                d'afficher ce contenu si le régime change pendant que cette
                section reste active (la pill disparaît, pas le state). */}
            {activeSection === 'participation-acquets' && simplifiedRegimeType === 'participation_acquets' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <PatrimoineOriginaireSection />
                <PatrimoineFinalSection />
              </div>
            )}

            {activeSection === 'donation' && (
              <div className="rounded-3xl border border-border bg-card p-8 space-y-10">
                <div>
                  <SectionHeader icon={Gift} title="Donation consentie au conjoint" />
                  <div className="rounded-lg bg-secondary p-5">
                    <div className="flex flex-wrap items-center gap-6">
                      <FormField
                        control={form.control}
                        name="donationDernierVivantPersonne"
                        render={({ field }) => (
                          <CheckboxWithLabel
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            label="J'ai consenti une donation au dernier vivant en faveur de mon conjoint"
                          />
                        )}
                      />
                      {form.watch("donationDernierVivantPersonne") && (
                        <FormField
                          control={form.control}
                          name="dateDonationPersonne"
                          render={({ field }) => (
                            <FormItem className="min-w-[200px]">
                              <div className="relative w-full flex flex-col gap-1">
                                <FormLabel>Date de l'acte</FormLabel>
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
                </div>

                <Separator />

                <div>
                  <SectionHeader icon={Gift} title="Donation reçue du conjoint" />
                  <div className="rounded-lg bg-secondary p-5">
                    <div className="flex flex-wrap items-center gap-6">
                      <FormField
                        control={form.control}
                        name="donationDernierVivantConjoint"
                        render={({ field }) => (
                          <CheckboxWithLabel
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            label="J'ai reçu une donation au dernier vivant de la part de mon conjoint"
                          />
                        )}
                      />
                      {form.watch("donationDernierVivantConjoint") && (
                        <FormField
                          control={form.control}
                          name="dateDonationConjoint"
                          render={({ field }) => (
                            <FormItem className="min-w-[200px]">
                              <div className="relative w-full flex flex-col gap-1">
                                <FormLabel>Date de l'acte</FormLabel>
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
                </div>
              </div>
            )}

            {activeSection === 'historique' && (
              <div className="rounded-3xl border border-border bg-card p-8 space-y-10">
                {[
                  { title: "Votre mariage précédent", flag: "mariagePrecedentPersonne" as const, annees: "dureeMariagePrecedentPersonneAnnees" as const, mois: "dureeMariagePrecedentPersonneMois" as const, label: "J'ai été marié(e) précédemment" },
                  { title: "Mariage précédent du conjoint", flag: "mariagePrecedentConjoint" as const, annees: "dureeMariagePrecedentConjointAnnees" as const, mois: "dureeMariagePrecedentConjointMois" as const, label: "Mon conjoint a été marié(e) précédemment" },
                ].map((cfg, index) => (
                  <Fragment key={cfg.flag}>
                  {index > 0 && <Separator />}
                  <div>
                    <SectionHeader icon={History} title={cfg.title} />
                    <div className="rounded-lg bg-secondary p-5">
                      <FormField
                        control={form.control}
                        name={cfg.flag}
                        render={({ field }) => (
                          <CheckboxWithLabel checked={field.value} onCheckedChange={field.onChange} label={cfg.label} />
                        )}
                      />
                      {form.watch(cfg.flag) && (
                        <div className="grid grid-cols-2 gap-5 mt-4 max-w-md">
                          <FormField
                            control={form.control}
                            name={cfg.annees}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Durée (années)</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    placeholder="Ex: 5"
                                    value={field.value ?? ''}
                                    onChange={(e) => { const v = e.target.value; field.onChange(v === '' ? null : (isNaN(parseInt(v)) ? null : parseInt(v))); }}
                                    className="bg-background border-border shadow-none rounded-md focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/20"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={cfg.mois}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Durée (mois)</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min="0"
                                    max="11"
                                    placeholder="Ex: 3"
                                    value={field.value ?? ''}
                                    onChange={(e) => { const v = e.target.value; field.onChange(v === '' ? null : (isNaN(parseInt(v)) ? null : parseInt(v))); }}
                                    className="bg-background border-border shadow-none rounded-md focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/20"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  </Fragment>
                ))}
              </div>
            )}
          </>
        )}

        {/* PACS */}
        {relationStatus === "Pacsé(e)" && (
          <Fragment>
          <div className="rounded-3xl border border-border bg-card p-8">
            <SectionHeader icon={Heart} title="Convention" />
            <div className="rounded-lg bg-secondary p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <FormField
                  control={form.control}
                  name="conventionPacs"
                  render={({ field }) => (
                    <FormItem>
                      <div className="relative w-full flex flex-col gap-1">
                        <FormLabel>Convention de PACS</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger size="lg" className="bg-background border-border shadow-none rounded-md focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/20">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Régime de la séparation des biens">Régime de la séparation des biens</SelectItem>
                            <SelectItem value="Indivision">Indivision</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="datePacs"
                  render={({ field }) => (
                    <FormItem>
                      <div className="relative w-full flex flex-col gap-1">
                        <FormLabel>Date du PACS</FormLabel>
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
              <div className="mt-5">
                <FormField
                  control={form.control}
                  name="residenceSeparee"
                  render={({ field }) => (
                    <CheckboxWithLabel checked={field.value} onCheckedChange={field.onChange} label="Résidence séparée" />
                  )}
                />
              </div>
            </div>
          </div>

          <CreancesEntreEpouxSection contexte="pacs" />
          </Fragment>
        )}

        {/* CONCUBINAGE */}
        {relationStatus === "Concubinage" && (
          <div className="rounded-3xl border border-border bg-card p-8">
            <SectionHeader icon={Heart} title="Concubinage" />
            <div className="rounded-lg bg-secondary p-5">
              <p className="text-sm text-muted-foreground">
                Le concubinage est une union de fait, caractérisée par une vie commune présentant un caractère de stabilité et de continuité.
              </p>
            </div>
          </div>
        )}

        {/* DIVORCÉ(E) / VEUF-VEUVE — lecture seule des données de l'union dissoute, encore en
            base (cf. "Option A" dans relationInfoPayload.ts : rien n'est effacé au changement de
            statut) mais jusqu'ici jamais affichées pour ces deux statuts. */}
        {(relationStatus === "Divorcé(e)" || relationStatus === "Veuf/Veuve") && (
          <div className="rounded-3xl border border-border bg-card p-8">
            <SectionHeader
              icon={History}
              title={relationStatus === "Divorcé(e)" ? "Régime applicable au mariage dissous" : "Régime applicable au mariage"}
            />
            <div className="rounded-lg bg-secondary p-5">
            {maritalData?.regime_matrimonial || maritalData?.date_mariage ? (
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                {maritalData.regime_matrimonial && (
                  <div>
                    <dt className="text-muted-foreground">Régime matrimonial</dt>
                    <dd className="font-medium">{maritalData.regime_matrimonial}</dd>
                  </div>
                )}
                {maritalData.date_mariage && (
                  <div>
                    <dt className="text-muted-foreground">Date du mariage</dt>
                    <dd className="font-medium">{format(new Date(maritalData.date_mariage), "dd/MM/yyyy")}</dd>
                  </div>
                )}
                {maritalData.lieu_mariage && (
                  <div>
                    <dt className="text-muted-foreground">Lieu du mariage</dt>
                    <dd className="font-medium">{maritalData.lieu_mariage}</dd>
                  </div>
                )}
                {maritalData.donation_dernier_vivant_personne && (
                  <div>
                    <dt className="text-muted-foreground">Donation au dernier vivant consentie</dt>
                    <dd className="font-medium">
                      Oui{maritalData.date_donation_personne ? ` (${format(new Date(maritalData.date_donation_personne), "dd/MM/yyyy")})` : ''}
                    </dd>
                  </div>
                )}
                {maritalData.donation_dernier_vivant_conjoint && (
                  <div>
                    <dt className="text-muted-foreground">Donation au dernier vivant reçue</dt>
                    <dd className="font-medium">
                      Oui{maritalData.date_donation_conjoint ? ` (${format(new Date(maritalData.date_donation_conjoint), "dd/MM/yyyy")})` : ''}
                    </dd>
                  </div>
                )}
              </dl>
            ) : maritalData?.convention_pacs ? (
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div>
                  <dt className="text-muted-foreground">Convention de PACS</dt>
                  <dd className="font-medium">{maritalData.convention_pacs}</dd>
                </div>
                {maritalData.date_pacs && (
                  <div>
                    <dt className="text-muted-foreground">Date du PACS</dt>
                    <dd className="font-medium">{format(new Date(maritalData.date_pacs), "dd/MM/yyyy")}</dd>
                  </div>
                )}
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">Aucune information de régime enregistrée pour cette union.</p>
            )}
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={saving}
            size="lg"
            className="bg-foreground min-w-[160px] text-background hover:opacity-90"
            
          >
            {saving ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enregistrement...</>) : 'Enregistrer'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
