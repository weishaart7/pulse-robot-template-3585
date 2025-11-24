import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMaritalStatus } from "@/hooks/useFamilyData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { CalendarIcon, Loader2, Heart, FileText, Gift, History } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { MatrimonialRegimeOptions } from "@/components/famille/MatrimonialRegimeOptions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

const formSchema = z.object({
  conventionPacs: z.enum(['Régime de la séparation des biens', 'Indivision']).default('Régime de la séparation des biens'),
  datePacs: z.date().optional(),
  regimeMatrimonial: z.enum([
    'Communauté réduite aux acquêts (option sans contrat de mariage)',
    'Communauté de meubles et d\'acquêts',
    'Communauté universelle',
    'Séparation de biens',
    'Participation aux acquêts'
  ]).default('Communauté réduite aux acquêts (option sans contrat de mariage)'),
  dateMariage: z.date().optional(),
  lieuMariage: z.string().optional(),
  pasDeContrat: z.boolean().default(false),
  donationDernierVivantPersonne: z.boolean().default(false),
  dateDonationPersonne: z.date().optional(),
  donationDernierVivantConjoint: z.boolean().default(false),
  dateDonationConjoint: z.date().optional(),
  mariagePrecedentPersonne: z.boolean().default(false),
  dureeMariagePrecedentPersonneAnnees: z.number().optional(),
  dureeMariagePrecedentPersonneMois: z.number().optional(),
  mariagePrecedentConjoint: z.boolean().default(false),
  dureeMariagePrecedentConjointAnnees: z.number().optional(),
  dureeMariagePrecedentConjointMois: z.number().optional(),
});

type FormData = z.infer<typeof formSchema>;

type RelationInfoDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  relationStatus: string;
};

type Section = 'informations-generales' | 'clauses-contrat' | 'donation' | 'historique';

export function RelationInfoDialog({ open, onOpenChange, relationStatus }: RelationInfoDialogProps) {
  const { toast } = useToast();
  const { data: maritalData, saving, saveData } = useMaritalStatus();
  const [activeSection, setActiveSection] = useState<Section>('informations-generales');

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      conventionPacs: 'Régime de la séparation des biens',
      regimeMatrimonial: 'Communauté réduite aux acquêts (option sans contrat de mariage)',
      lieuMariage: "",
      pasDeContrat: false,
      donationDernierVivantPersonne: false,
      dateDonationPersonne: undefined,
      donationDernierVivantConjoint: false,
      dateDonationConjoint: undefined,
      mariagePrecedentPersonne: false,
      dureeMariagePrecedentPersonneAnnees: undefined,
      dureeMariagePrecedentPersonneMois: undefined,
      mariagePrecedentConjoint: false,
      dureeMariagePrecedentConjointAnnees: undefined,
      dureeMariagePrecedentConjointMois: undefined,
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
        pasDeContrat: false,
        donationDernierVivantPersonne: (maritalData as any).donation_dernier_vivant_personne || false,
        dateDonationPersonne: (maritalData as any).date_donation_personne ? new Date((maritalData as any).date_donation_personne) : undefined,
        donationDernierVivantConjoint: (maritalData as any).donation_dernier_vivant_conjoint || false,
        dateDonationConjoint: (maritalData as any).date_donation_conjoint ? new Date((maritalData as any).date_donation_conjoint) : undefined,
        mariagePrecedentPersonne: maritalData.mariage_precedent_personne || false,
        dureeMariagePrecedentPersonneAnnees: (maritalData as any).duree_mariage_precedent_personne_annees,
        dureeMariagePrecedentPersonneMois: (maritalData as any).duree_mariage_precedent_personne_mois,
        mariagePrecedentConjoint: maritalData.mariage_precedent_conjoint || false,
        dureeMariagePrecedentConjointAnnees: (maritalData as any).duree_mariage_precedent_conjoint_annees,
        dureeMariagePrecedentConjointMois: (maritalData as any).duree_mariage_precedent_conjoint_mois,
      });
    }
  }, [maritalData, form]);

  const onSubmit = async (data: FormData) => {
    try {
      await saveData({
        convention_pacs: data.conventionPacs,
        date_pacs: data.datePacs?.toISOString().split('T')[0],
        regime_matrimonial: data.regimeMatrimonial,
        date_mariage: data.dateMariage?.toISOString().split('T')[0],
        lieu_mariage: data.lieuMariage,
        donation_dernier_vivant_personne: data.donationDernierVivantPersonne,
        date_donation_personne: data.dateDonationPersonne?.toISOString().split('T')[0],
        donation_dernier_vivant_conjoint: data.donationDernierVivantConjoint,
        date_donation_conjoint: data.dateDonationConjoint?.toISOString().split('T')[0],
        mariage_precedent_personne: data.mariagePrecedentPersonne,
        duree_mariage_precedent_personne_annees: data.dureeMariagePrecedentPersonneAnnees,
        duree_mariage_precedent_personne_mois: data.dureeMariagePrecedentPersonneMois,
        mariage_precedent_conjoint: data.mariagePrecedentConjoint,
        duree_mariage_precedent_conjoint_annees: data.dureeMariagePrecedentConjointAnnees,
        duree_mariage_precedent_conjoint_mois: data.dureeMariagePrecedentConjointMois,
      } as any);
      
      toast({
        title: "Succès",
        description: "Les informations ont été enregistrées avec succès.",
      });
      
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur s'est produite lors de l'enregistrement.",
        variant: "destructive",
      });
    }
  };

  const getTitle = () => {
    switch (relationStatus) {
      case 'Marié(e)':
        return 'Informations du mariage';
      case 'Pacsé(e)':
        return 'Informations du PACS';
      case 'Concubinage':
        return 'Informations du concubinage';
      default:
        return 'Informations de la relation';
    }
  };

  const regimeMatrimonial = form.watch("regimeMatrimonial");
  const pasDeContrat = form.watch("pasDeContrat");

  const sections = relationStatus === "Marié(e)" ? [
    { id: 'informations-generales' as Section, label: 'Informations générales', icon: Heart },
    { id: 'clauses-contrat' as Section, label: 'Clauses du contrat', icon: FileText },
    { id: 'donation' as Section, label: 'Donation au dernier vivant', icon: Gift },
    { id: 'historique' as Section, label: 'Historique matrimonial', icon: History },
  ] : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex gap-6 flex-1 overflow-hidden">{relationStatus === "Marié(e)" && (
                <>
                  {/* Sidebar */}
                  <div className="w-56 flex-shrink-0">
                    <nav className="space-y-1">
                      {sections.map((section) => {
                        const Icon = section.icon;
                        return (
                          <button
                            key={section.id}
                            type="button"
                            onClick={() => setActiveSection(section.id)}
                            className={cn(
                              "w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all text-left",
                              activeSection === section.id
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}
                          >
                            <Icon className="h-4 w-4 flex-shrink-0" />
                            <span className="flex-1">{section.label}</span>
                          </button>
                        );
                      })}
                    </nav>
                  </div>

                  {/* Content */}
                  <div className="flex-1 overflow-y-auto pr-2">
                    {activeSection === 'informations-generales' && (
                      <div className="space-y-5">{/* Date et lieu */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <FormField
                            control={form.control}
                            name="dateMariage"
                            render={({ field }) => (
                              <FormItem className="space-y-1">
                                <FormLabel className="text-xs">Date du mariage</FormLabel>
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

                        {/* Régime matrimonial */}
                        <FormField
                          control={form.control}
                          name="regimeMatrimonial"
                          render={({ field }) => (
                            <FormItem className="space-y-1">
                              <FormLabel className="text-xs">Régime matrimonial</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
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

                        {/* Pas de contrat */}
                        <FormField
                          control={form.control}
                          name="pasDeContrat"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel className="text-xs">
                                  Pas de contrat de mariage
                                </FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />
                      </div>
                    )}

                    {activeSection === 'clauses-contrat' && !pasDeContrat && (
                      <div className="space-y-5">
                        <MatrimonialRegimeOptions
                          regimeType={
                            regimeMatrimonial === 'Communauté réduite aux acquêts (option sans contrat de mariage)' ? 'communaute_reduite' :
                            regimeMatrimonial === 'Communauté de meubles et d\'acquêts' ? 'communaute_meubles' :
                            regimeMatrimonial === 'Communauté universelle' ? 'communaute_universelle' :
                            regimeMatrimonial === 'Séparation de biens' ? 'separation_biens' :
                            regimeMatrimonial === 'Participation aux acquêts' ? 'participation_acquets' :
                            'communaute_reduite'
                          }
                        />
                      </div>
                    )}

                    {activeSection === 'clauses-contrat' && pasDeContrat && (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        <p>Pas de contrat de mariage sélectionné</p>
                      </div>
                    )}

                    {activeSection === 'donation' && (
                      <div className="space-y-4">
                        <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
                          <div className="flex items-center gap-2.5 mb-3">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <Gift className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <h3 className="font-medium text-sm text-foreground">Donation au dernier vivant en faveur du conjoint</h3>
                              <p className="text-xs text-muted-foreground">Donation consentie par vous au profit de votre conjoint</p>
                            </div>
                          </div>
                          
                          <div className="space-y-4">
                            <div className="flex items-center gap-4">
                              <FormField
                                control={form.control}
                                name="donationDernierVivantPersonne"
                                render={({ field }) => (
                                  <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                      />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                      <FormLabel className="text-sm font-medium whitespace-nowrap">
                                        J'ai consenti une donation au dernier vivant en faveur de mon conjoint
                                      </FormLabel>
                                    </div>
                                  </FormItem>
                                )}
                              />

                              {form.watch("donationDernierVivantPersonne") && (
                                <FormField
                                  control={form.control}
                                  name="dateDonationPersonne"
                                  render={({ field }) => (
                                    <FormItem className="flex-1">
                                      <Popover>
                                        <PopoverTrigger asChild>
                                          <FormControl>
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              className={cn(
                                                "w-full pl-3 text-left font-normal",
                                                !field.value && "text-muted-foreground"
                                              )}
                                            >
                                              {field.value ? (
                                                format(field.value, "dd/MM/yyyy")
                                              ) : (
                                                <span>Date de l'acte</span>
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
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
                          <div className="flex items-center gap-2.5 mb-3">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <Gift className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <h3 className="font-medium text-sm text-foreground">Donation au dernier vivant reçue du conjoint</h3>
                              <p className="text-xs text-muted-foreground">Donation reçue de votre conjoint à votre profit</p>
                            </div>
                          </div>
                          
                          <div className="space-y-4">
                            <div className="flex items-center gap-4">
                              <FormField
                                control={form.control}
                                name="donationDernierVivantConjoint"
                                render={({ field }) => (
                                  <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                      />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                      <FormLabel className="text-sm font-medium whitespace-nowrap">
                                        J'ai reçu une donation au dernier vivant de la part de mon conjoint
                                      </FormLabel>
                                    </div>
                                  </FormItem>
                                )}
                              />

                              {form.watch("donationDernierVivantConjoint") && (
                                <FormField
                                  control={form.control}
                                  name="dateDonationConjoint"
                                  render={({ field }) => (
                                    <FormItem className="flex-1">
                                      <Popover>
                                        <PopoverTrigger asChild>
                                          <FormControl>
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              className={cn(
                                                "w-full pl-3 text-left font-normal",
                                                !field.value && "text-muted-foreground"
                                              )}
                                            >
                                              {field.value ? (
                                                format(field.value, "dd/MM/yyyy")
                                              ) : (
                                                <span>Date de l'acte</span>
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
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeSection === 'historique' && (
                      <div className="space-y-4">
                        {/* Votre mariage précédent */}
                        <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
                          <div className="flex items-center gap-2.5 mb-3">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <History className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <h3 className="font-medium text-sm text-foreground">Votre mariage précédent</h3>
                              <p className="text-xs text-muted-foreground">Informations sur votre précédent mariage</p>
                            </div>
                          </div>
                          
                          <div className="space-y-4">
                            <FormField
                              control={form.control}
                              name="mariagePrecedentPersonne"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                    />
                                  </FormControl>
                                  <div className="space-y-1 leading-none">
                                    <FormLabel className="text-sm font-medium">
                                      J'ai été marié(e) précédemment
                                    </FormLabel>
                                  </div>
                                </FormItem>
                              )}
                            />

                            {form.watch("mariagePrecedentPersonne") && (
                              <div className="pl-7">
                                <div className="grid grid-cols-2 gap-4">
                                  <FormField
                                    control={form.control}
                                    name="dureeMariagePrecedentPersonneAnnees"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className="text-xs text-muted-foreground">Durée (années)</FormLabel>
                                        <FormControl>
                                          <Input
                                            type="number"
                                            min="0"
                                            placeholder="Ex: 5"
                                            {...field}
                                            value={field.value ?? ''}
                                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={form.control}
                                    name="dureeMariagePrecedentPersonneMois"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className="text-xs text-muted-foreground">Durée (mois)</FormLabel>
                                        <FormControl>
                                          <Input
                                            type="number"
                                            min="0"
                                            max="11"
                                            placeholder="Ex: 3"
                                            {...field}
                                            value={field.value ?? ''}
                                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Mariage précédent du conjoint */}
                        <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
                          <div className="flex items-center gap-2.5 mb-3">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <History className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <h3 className="font-medium text-sm text-foreground">Mariage précédent du conjoint</h3>
                              <p className="text-xs text-muted-foreground">Informations sur le précédent mariage de votre conjoint</p>
                            </div>
                          </div>
                          
                          <div className="space-y-4">
                            <FormField
                              control={form.control}
                              name="mariagePrecedentConjoint"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                    />
                                  </FormControl>
                                  <div className="space-y-1 leading-none">
                                    <FormLabel className="text-sm font-medium">
                                      Mon conjoint a été marié(e) précédemment
                                    </FormLabel>
                                  </div>
                                </FormItem>
                              )}
                            />

                            {form.watch("mariagePrecedentConjoint") && (
                              <div className="pl-7">
                                <div className="grid grid-cols-2 gap-4">
                                  <FormField
                                    control={form.control}
                                    name="dureeMariagePrecedentConjointAnnees"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className="text-xs text-muted-foreground">Durée (années)</FormLabel>
                                        <FormControl>
                                          <Input
                                            type="number"
                                            min="0"
                                            placeholder="Ex: 5"
                                            {...field}
                                            value={field.value ?? ''}
                                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={form.control}
                                    name="dureeMariagePrecedentConjointMois"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className="text-xs text-muted-foreground">Durée (mois)</FormLabel>
                                        <FormControl>
                                          <Input
                                            type="number"
                                            min="0"
                                            max="11"
                                            placeholder="Ex: 3"
                                            {...field}
                                            value={field.value ?? ''}
                                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {relationStatus === "Pacsé(e)" && (
                <div className="space-y-5">
                  <FormField
                    control={form.control}
                    name="conventionPacs"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-xs">Convention de PACS</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
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
                      <FormItem className="space-y-1">
                        <FormLabel className="text-xs">Date du PACS</FormLabel>
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
                </div>
              )}

              {relationStatus === "Concubinage" && (
                <div className="space-y-5">
                  <p className="text-sm text-muted-foreground">
                    Le concubinage est une union de fait, caractérisée par une vie commune présentant un caractère de stabilité et de continuité.
                  </p>
                </div>
              )}
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-2 pt-4 border-t mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
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
                  "Enregistrer"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
