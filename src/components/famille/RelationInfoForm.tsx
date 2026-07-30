import { useEffect, useState } from "react";
import { z } from "zod";
import { useForm, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMaritalStatus } from "@/hooks/useFamilyData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import SelectMenu from "@/components/ui/select-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CalendarIcon, Loader2, Heart, FileText, Gift, History, Scale, Coins } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { MatrimonialRegimeOptions } from "@/components/famille/MatrimonialRegimeOptions";
import { ClausesPersonnaliseesSection } from "@/components/famille/matrimonial/ClausesPersonnaliseesSection";
import { RecompensesSection } from "@/components/famille/matrimonial/RecompensesSection";
import { CreancesEntreEpouxSection } from "@/components/famille/matrimonial/CreancesEntreEpouxSection";
import { PatrimoineOriginaireSection } from "@/components/famille/matrimonial/PatrimoineOriginaireSection";
import { PatrimoineFinalSection } from "@/components/famille/matrimonial/PatrimoineFinalSection";
import { determinerRegimeLegal, REGIMES_MATRIMONIAUX } from "@/lib/patrimoine/regimeLegal";
import { getSimplifiedRegime, RegimeType, ClausesData } from "@/types/matrimonial";
import { parseClausesData } from "@/utils/transmissionHelpers";
import { toRegimeType, getClausesIncompatibles } from "@/lib/patrimoine/regimeChangeClauses";
import { buildRelationInfoPayload } from "@/lib/family/relationInfoPayload";

const formSchema = z.object({
  conventionPacs: z.enum(['Régime de la séparation des biens', 'Indivision']).default('Régime de la séparation des biens'),
  datePacs: z.date().optional(),
  regimeMatrimonial: z.enum([
    'Communauté réduite aux acquêts (option sans contrat de mariage)',
    'Communauté de meubles et d\'acquêts',
    'Communauté universelle',
    'Séparation de biens',
    'Séparation de biens avec société d\'acquêts',
    'Participation aux acquêts'
  ]).default('Communauté réduite aux acquêts (option sans contrat de mariage)'),
  dateMariage: z.date().optional(),
  lieuMariage: z.string().optional(),
  pasDeContrat: z.boolean().default(false),
  impositionDistincte: z.boolean().default(false),
  residenceSeparee: z.boolean().default(false),
  // Éléments d'extranéité du régime matrimonial (DIP, §4.4, §12.1) : simple
  // signalement déclaratif, sans validation de format ni automatisation des
  // régimes de rattachement (Convention de La Haye 1978, Règlement Rome III).
  loiApplicableRegime: z.string().optional(),
  paysPremierDomicileMatrimonial: z.string().optional(),
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
type Section = 'informations-generales' | 'clauses-contrat' | 'recompenses-creances' | 'participation-acquets' | 'donation' | 'historique';

const SECTION_LABELS: Record<Section, string> = {
  'informations-generales': 'Informations générales',
  'clauses-contrat': 'Clauses du contrat',
  'recompenses-creances': 'Récompenses & créances',
  'participation-acquets': 'Participation aux acquêts',
  'donation': 'Donation au dernier vivant',
  'historique': 'Historique matrimonial',
};

const FIELD_TO_SECTION: Partial<Record<keyof FormData, Section>> = {
  dateMariage: 'informations-generales',
  lieuMariage: 'informations-generales',
  regimeMatrimonial: 'informations-generales',
  pasDeContrat: 'informations-generales',
  impositionDistincte: 'informations-generales',
  residenceSeparee: 'informations-generales',
  loiApplicableRegime: 'informations-generales',
  paysPremierDomicileMatrimonial: 'informations-generales',
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
  // Changement de régime en attente de confirmation : rempli uniquement
  // quand au moins une clause active (clauses_contrat, lu depuis l'instance
  // locale de maritalData — cf. diagnostic étape B, désynchronisation
  // possible mais acceptée avec l'onglet "Clauses du contrat") devient
  // incompatible avec le nouveau régime sélectionné.
  const [pendingRegimeChange, setPendingRegimeChange] = useState<{
    nouveauRegime: FormData['regimeMatrimonial'];
    clausesIncompatibles: { key: string; label: string }[];
    // Origine de la demande : distingue une sélection manuelle (Select) d'un
    // changement forcé par la case "pas de contrat de mariage", pour que
    // cancelRegimeChange puisse redécocher pasDeContrat dans ce dernier cas.
    origin: 'manual' | 'pasDeContrat';
  } | null>(null);
  const [disablingClauses, setDisablingClauses] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      conventionPacs: 'Régime de la séparation des biens',
      regimeMatrimonial: 'Communauté réduite aux acquêts (option sans contrat de mariage)',
      lieuMariage: "",
      pasDeContrat: false,
      impositionDistincte: false,
      residenceSeparee: false,
      loiApplicableRegime: "",
      paysPremierDomicileMatrimonial: "",
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
        regimeMatrimonial: (maritalData.regime_matrimonial as any) || 'Communauté réduite aux acquêts (option sans contrat de mariage)',
        dateMariage: maritalData.date_mariage ? new Date(maritalData.date_mariage) : undefined,
        lieuMariage: maritalData.lieu_mariage || "",
        pasDeContrat: maritalData.pas_de_contrat_mariage || false,
        impositionDistincte: maritalData.imposition_distincte || false,
        residenceSeparee: maritalData.residence_separee || false,
        loiApplicableRegime: maritalData.loi_applicable_regime || "",
        paysPremierDomicileMatrimonial: maritalData.pays_premier_domicile_matrimonial || "",
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

      onSuccess?.();
    } catch (error) {
      console.error('Erreur de sauvegarde:', error);
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

  // Appelé à chaque sélection dans le <Select> du régime, AVANT que
  // field.onChange ne mette à jour l'état du formulaire. Compare les clauses
  // actuellement enabled: true (maritalData.clauses_contrat, instance locale
  // de ce composant) à la liste des clauses compatibles avec le régime
  // candidat — si au moins une clause active en devient incompatible,
  // suspend le changement dans une boîte de confirmation plutôt que de
  // l'appliquer directement (cf. diagnostic étape B : le garde-fou de
  // l'étape A reste le filet de sécurité si un résidu passe malgré tout).
  const handleRegimeSelect = (nouveauRegime: string, origin: 'manual' | 'pasDeContrat' = 'manual') => {
    const nouveauRegimeType = toRegimeType(nouveauRegime);
    const clausesActuelles = parseClausesData((maritalData as any)?.clauses_contrat);
    const clausesIncompatibles = getClausesIncompatibles(clausesActuelles, nouveauRegimeType);

    if (clausesIncompatibles.length === 0) {
      form.setValue('regimeMatrimonial', nouveauRegime as FormData['regimeMatrimonial']);
      return;
    }

    setPendingRegimeChange({
      nouveauRegime: nouveauRegime as FormData['regimeMatrimonial'],
      clausesIncompatibles,
      origin,
    });
  };

  // Confirmation : applique le changement de régime ET désactive les
  // clauses incompatibles en base, via le même saveData (donc le même
  // upsert partiel Supabase) que celui déjà utilisé par
  // useMatrimonialClauses.ts::performSave pour clauses_contrat — pas de
  // nouveau chemin de sauvegarde.
  // regime_matrimonial est inclus dans ce même appel (et non laissé au seul
  // form.setValue ci-dessous) : sinon le saveData({clauses_contrat}) seul
  // renvoie une ligne avec l'ancien régime, ce qui retrigger le useEffect de
  // reset du formulaire (cf. plus haut) et écrase silencieusement le
  // form.setValue — le nouveau régime n'était alors jamais persisté malgré
  // le message du dialogue.
  const confirmRegimeChange = async () => {
    if (!pendingRegimeChange) return;

    try {
      setDisablingClauses(true);
      const clausesActuelles = parseClausesData((maritalData as any)?.clauses_contrat);
      const clausesMisesAJour: ClausesData = { ...clausesActuelles };
      pendingRegimeChange.clausesIncompatibles.forEach(({ key }) => {
        clausesMisesAJour[key] = { enabled: false };
      });

      await saveData({
        clauses_contrat: clausesMisesAJour,
        regime_matrimonial: pendingRegimeChange.nouveauRegime,
      } as any);
      form.setValue('regimeMatrimonial', pendingRegimeChange.nouveauRegime);
    } catch (error) {
      console.error('Erreur lors de la désactivation des clauses incompatibles:', error);
    } finally {
      setDisablingClauses(false);
      setPendingRegimeChange(null);
    }
  };

  // Annulation : aucune modification du régime, le <Select> reste sur le
  // régime précédent car field.onChange n'a jamais été appelé pour ce
  // candidat. Si la demande provenait de la case "pas de contrat de mariage"
  // (useEffect ci-dessous), on la redécoche pour revenir intégralement à
  // l'état d'avant — sinon la case resterait cochée sans que le régime légal
  // ne soit jamais appliqué, un état visuellement incohérent.
  const cancelRegimeChange = () => {
    if (pendingRegimeChange?.origin === 'pasDeContrat') {
      form.setValue('pasDeContrat', false);
    }
    setPendingRegimeChange(null);
  };

  const regimeMatrimonial = form.watch("regimeMatrimonial");
  const conventionPacs = form.watch("conventionPacs");
  const residenceSeparee = form.watch("residenceSeparee");
  const pasDeContrat = form.watch("pasDeContrat");
  const dateMariage = form.watch("dateMariage");
  const mariagePrecedentPersonne = form.watch("mariagePrecedentPersonne");
  const mariagePrecedentConjoint = form.watch("mariagePrecedentConjoint");

  useEffect(() => {
    // Garde contre la réouverture répétée du dialogue : ne relance pas
    // handleRegimeSelect tant qu'un changement (manuel ou issu de cet effet)
    // est déjà en attente de confirmation.
    if (pasDeContrat && !pendingRegimeChange) {
      handleRegimeSelect(determinerRegimeLegal(dateMariage?.toISOString()), 'pasDeContrat');
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

  // Imposition distincte (art. 6, 4-a CGI) : réservée aux régimes séparation de
  // biens / participation aux acquêts, et seulement si la résidence séparée est
  // renseignée. Un régime communautaire ou une résidence commune l'exclut.
  // Ne force aucune correction si la case est déjà cochée en base pour un
  // profil qui ne remplit plus ces conditions (ex. changement de régime après
  // coup) : le champ reste simplement grisé, sans écraser la valeur existante.
  const impositionDistincteEligible =
    (regimeMatrimonial === 'Séparation de biens' || regimeMatrimonial === 'Participation aux acquêts') &&
    residenceSeparee;

  // Idem pour le PACS : pas d'équivalent "participation aux acquêts", donc un
  // seul critère de régime (convention de PACS en séparation de biens).
  const impositionDistinctePacsEligible =
    conventionPacs === 'Régime de la séparation des biens' && residenceSeparee;

  const sections = relationStatus === "Marié(e)" ? [
    { id: 'informations-generales' as Section, label: 'Informations générales', icon: Heart },
    { id: 'clauses-contrat' as Section, label: 'Clauses du contrat', icon: FileText },
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
        {/* Pills */}
        {sections.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {sections.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
                  activeSection === section.id
                    ? "bg-[#62706d] text-[#ebf1f1] shadow-sm"
                    : "bg-[#ebf1f1] text-[#62706d] hover:opacity-90"
                )}
              >
                <section.icon className="h-4 w-4" />
                {section.label}
              </button>
            ))}
          </div>
        )}

        {/* MARIÉ */}
        {relationStatus === "Marié(e)" && (
          <>
            {activeSection === 'informations-generales' && (
              <div className="space-y-6">
                <div className="rounded-md border bg-card p-6 shadow-sm">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Date & lieu</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <FormField
                      control={form.control}
                      name="dateMariage"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-xs">Date du mariage</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                  {field.value ? format(field.value, "dd/MM/yyyy") : <span>Sélectionner une date</span>}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date()} initialFocus className="p-3 pointer-events-auto" />
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
                        <FormItem className="space-y-1">
                          <FormLabel className="text-xs">Lieu du mariage</FormLabel>
                          <FormControl>
                            <Input placeholder="Lieu du mariage" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="rounded-md border bg-card p-6 shadow-sm">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Régime matrimonial</h3>
                  <FormField
                    control={form.control}
                    name="regimeMatrimonial"
                    render={({ field }) => (
                      <FormItem className="space-y-1 mb-5">
                        <FormLabel className="text-xs">Régime</FormLabel>
                        <Select onValueChange={handleRegimeSelect} value={field.value} disabled={pasDeContrat}>
                          <FormControl>
                            <SelectTrigger size="lg" className="bg-muted border-transparent shadow-none rounded-[5px] focus-visible:bg-background focus-visible:border-ring">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {REGIMES_MATRIMONIAUX.map(regime => (
                              <SelectItem key={regime} value={regime}>{regime}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex flex-col gap-3">
                    <FormField
                      control={form.control}
                      name="pasDeContrat"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                          <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                          <FormLabel className="text-sm">Pas de contrat de mariage</FormLabel>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="residenceSeparee"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                          <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                          <FormLabel className="text-sm">Résidence séparée</FormLabel>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="impositionDistincte"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              disabled={!impositionDistincteEligible}
                            />
                          </FormControl>
                          <FormLabel className={cn("text-sm", !impositionDistincteEligible && "text-muted-foreground")}>
                            Imposition distincte
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                    {!impositionDistincteEligible && (
                      <p className="text-xs text-muted-foreground">
                        Réservée aux régimes séparation de biens ou participation aux acquêts, avec résidence séparée (art. 6, 4-a CGI).
                      </p>
                    )}
                  </div>

                  {/* Éléments d'extranéité (DIP, §4.4, §12.1) : signalement déclaratif
                      uniquement, sans automatisation des régimes de rattachement
                      (Convention de La Haye 1978, Règlement Rome III). */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
                    <FormField
                      control={form.control}
                      name="paysPremierDomicileMatrimonial"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-xs">Pays du premier domicile matrimonial</FormLabel>
                          <FormControl>
                            <SelectMenu
                              value={field.value}
                              onValueChange={field.onChange}
                              placeholder="Sélectionner un pays"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="loiApplicableRegime"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-xs">Loi applicable au régime matrimonial</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex : loi française" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'clauses-contrat' && (
              <div className="space-y-6">
                <div className="rounded-md border bg-card p-6 shadow-sm">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Clauses du contrat</h3>
                  {pasDeContrat ? (
                    <p className="text-sm text-muted-foreground">Pas de contrat de mariage sélectionné</p>
                  ) : (
                    <MatrimonialRegimeOptions regimeType={simplifiedRegimeType} />
                  )}
                </div>

                <ClausesPersonnaliseesSection />
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
              <div className="space-y-6">
                <div className="rounded-md border bg-card p-6 shadow-sm">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Donation consentie au conjoint</h3>
                  <div className="flex flex-wrap items-center gap-4">
                    <FormField
                      control={form.control}
                      name="donationDernierVivantPersonne"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                          <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                          <FormLabel className="text-sm">J'ai consenti une donation au dernier vivant en faveur de mon conjoint</FormLabel>
                        </FormItem>
                      )}
                    />
                    {form.watch("donationDernierVivantPersonne") && (
                      <FormField
                        control={form.control}
                        name="dateDonationPersonne"
                        render={({ field }) => (
                          <FormItem className="min-w-[200px]">
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button variant="outline" size="sm" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                    {field.value ? format(field.value, "dd/MM/yyyy") : <span>Date de l'acte</span>}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date()} initialFocus className="p-3 pointer-events-auto" />
                              </PopoverContent>
                            </Popover>
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                </div>

                <div className="rounded-md border bg-card p-6 shadow-sm">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Donation reçue du conjoint</h3>
                  <div className="flex flex-wrap items-center gap-4">
                    <FormField
                      control={form.control}
                      name="donationDernierVivantConjoint"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                          <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                          <FormLabel className="text-sm">J'ai reçu une donation au dernier vivant de la part de mon conjoint</FormLabel>
                        </FormItem>
                      )}
                    />
                    {form.watch("donationDernierVivantConjoint") && (
                      <FormField
                        control={form.control}
                        name="dateDonationConjoint"
                        render={({ field }) => (
                          <FormItem className="min-w-[200px]">
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button variant="outline" size="sm" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                    {field.value ? format(field.value, "dd/MM/yyyy") : <span>Date de l'acte</span>}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date()} initialFocus className="p-3 pointer-events-auto" />
                              </PopoverContent>
                            </Popover>
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'historique' && (
              <div className="space-y-6">
                {[
                  { title: "Votre mariage précédent", flag: "mariagePrecedentPersonne" as const, annees: "dureeMariagePrecedentPersonneAnnees" as const, mois: "dureeMariagePrecedentPersonneMois" as const, label: "J'ai été marié(e) précédemment" },
                  { title: "Mariage précédent du conjoint", flag: "mariagePrecedentConjoint" as const, annees: "dureeMariagePrecedentConjointAnnees" as const, mois: "dureeMariagePrecedentConjointMois" as const, label: "Mon conjoint a été marié(e) précédemment" },
                ].map((cfg) => (
                  <div key={cfg.flag} className="rounded-md border bg-card p-6 shadow-sm">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">{cfg.title}</h3>
                    <FormField
                      control={form.control}
                      name={cfg.flag}
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                          <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                          <FormLabel className="text-sm">{cfg.label}</FormLabel>
                        </FormItem>
                      )}
                    />
                    {form.watch(cfg.flag) && (
                      <div className="grid grid-cols-2 gap-5 mt-4 max-w-md">
                        <FormField
                          control={form.control}
                          name={cfg.annees}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Durée (années)</FormLabel>
                              <FormControl>
                                <Input type="number" min="0" max="100" placeholder="Ex: 5" value={field.value ?? ''} onChange={(e) => { const v = e.target.value; field.onChange(v === '' ? null : (isNaN(parseInt(v)) ? null : parseInt(v))); }} />
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
                              <FormLabel className="text-xs">Durée (mois)</FormLabel>
                              <FormControl>
                                <Input type="number" min="0" max="11" placeholder="Ex: 3" value={field.value ?? ''} onChange={(e) => { const v = e.target.value; field.onChange(v === '' ? null : (isNaN(parseInt(v)) ? null : parseInt(v))); }} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* PACS */}
        {relationStatus === "Pacsé(e)" && (
          <div className="space-y-6">
            <div className="rounded-md border bg-card p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Convention</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <FormField
                  control={form.control}
                  name="conventionPacs"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-xs">Convention de PACS</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger size="lg" className="bg-muted border-transparent shadow-none rounded-[5px] focus-visible:bg-background focus-visible:border-ring">
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
                    <FormItem className="space-y-1">
                      <FormLabel className="text-xs">Date du PACS</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                              {field.value ? format(field.value, "dd/MM/yyyy") : <span>Sélectionner une date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date()} initialFocus className="p-3 pointer-events-auto" />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="mt-5 flex flex-col gap-3">
                <FormField
                  control={form.control}
                  name="residenceSeparee"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                      <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      <FormLabel className="text-sm">Résidence séparée</FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="impositionDistincte"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={!impositionDistinctePacsEligible}
                        />
                      </FormControl>
                      <FormLabel className={cn("text-sm", !impositionDistinctePacsEligible && "text-muted-foreground")}>
                        Imposition distincte
                      </FormLabel>
                    </FormItem>
                  )}
                />
                {!impositionDistinctePacsEligible && (
                  <p className="text-xs text-muted-foreground">
                    Réservée à la convention de PACS en séparation de biens, avec résidence séparée (art. 6, 4-a CGI).
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* CONCUBINAGE */}
        {relationStatus === "Concubinage" && (
          <div className="rounded-md border bg-card p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Concubinage</h3>
            <p className="text-sm text-muted-foreground">
              Le concubinage est une union de fait, caractérisée par une vie commune présentant un caractère de stabilité et de continuité.
            </p>
          </div>
        )}

        <div className="flex justify-end">
          <Button type="submit" disabled={saving} size="lg" className="min-w-[160px]">
            {saving ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enregistrement...</>) : 'Enregistrer'}
          </Button>
        </div>
      </form>

      <AlertDialog open={!!pendingRegimeChange} onOpenChange={(open) => { if (!open) cancelRegimeChange(); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clause(s) devenue(s) incompatible(s) avec ce régime</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingRegimeChange && (
                <>
                  Passer au régime « {pendingRegimeChange.nouveauRegime} » rend incompatible{pendingRegimeChange.clausesIncompatibles.length > 1 ? 's' : ''} la clause suivante{pendingRegimeChange.clausesIncompatibles.length > 1 ? 's' : ''} actuellement active{pendingRegimeChange.clausesIncompatibles.length > 1 ? 's' : ''} :
                  <ul className="list-disc pl-5 mt-2">
                    {pendingRegimeChange.clausesIncompatibles.map((c) => (
                      <li key={c.key}>{c.label}</li>
                    ))}
                  </ul>
                  <p className="mt-2">Confirmer changera le régime ET désactivera ce{pendingRegimeChange.clausesIncompatibles.length > 1 ? 's' : ''} clause{pendingRegimeChange.clausesIncompatibles.length > 1 ? 's' : ''}. Annuler ne modifie rien.</p>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelRegimeChange}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRegimeChange} disabled={disablingClauses}>
              {disablingClauses ? 'Application...' : 'Confirmer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Form>
  );
}
