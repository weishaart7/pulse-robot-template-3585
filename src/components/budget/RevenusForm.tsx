import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Revenu } from '@/services/budgetService';
import { REVENUS_CATEGORIES, getNaturesByCategory } from '@/constants/budgetCategories';
import { useFamilyData, useFamilyProfile, useMaritalStatus } from '@/hooks/useFamilyData';
import { useSecureForm } from '@/hooks/useSecureForm';
import { useAuth } from '@/contexts/AuthContext';
import { sanitizeTextInput, sanitizeNumericInput } from '@/lib/security';

const PERIODICITE_OPTIONS = [
  { value: 'mensuel', label: 'Mensuel' },
  { value: 'trimestriel', label: 'Trimestriel' },
  { value: 'semestriel', label: 'Semestriel' },
  { value: 'annuel', label: 'Annuel' },
  { value: 'ponctuel', label: 'Ponctuel' },
];

const formSchema = z.object({
  categorie: z.string().min(1, "La catégorie est requise"),
  nature: z.string().min(1, "La nature est requise"),
  libelle: z.string().min(1, "Le libellé est requis"),
  beneficiaire: z.string().optional(),
  montant: z.string().min(1, "Le montant est requis"),
  periodicite: z.string().default('mensuel'),
  date_debut: z.string().optional(),
  date_fin: z.string().optional(),
  jour_fixe: z.string().optional(),
  commentaire: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface RevenusFormProps {
  revenu?: Revenu;
  onSubmit: (data: Omit<Revenu, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  onCancel: () => void;
  open: boolean;
}

export const RevenusForm: React.FC<RevenusFormProps> = ({ revenu, onSubmit, onCancel, open }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLibellePrefilled, setIsLibellePrefilled] = useState(false);
  const [inputMode, setInputMode] = useState<'annuel' | 'mensuel'>('annuel');
  const { familyMembers } = useFamilyData();
  const { data: familyProfile } = useFamilyProfile();
  const { data: maritalStatus } = useMaritalStatus();
  const { user } = useAuth();
  const { submitSecureForm } = useSecureForm({ 
    formName: 'budget_revenus',
    enableRateLimit: true,
    maxAttempts: 10,
    windowMs: 60000
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      categorie: revenu ? Object.keys(REVENUS_CATEGORIES).find(cat => 
        getNaturesByCategory(REVENUS_CATEGORIES, cat).includes(revenu.nature)
      ) || "" : "",
      nature: revenu?.nature || "",
      libelle: revenu?.libelle || "",
      beneficiaire: revenu?.beneficiaire || "",
      montant: revenu?.montant?.toString() || "",
      periodicite: revenu?.periodicite || "mensuel",
      date_debut: revenu?.date_debut || "",
      date_fin: revenu?.date_fin || "",
      jour_fixe: revenu?.jour_fixe?.toString() || "",
      commentaire: revenu?.commentaire || "",
    },
  });

  const selectedCategory = form.watch("categorie");
  const selectedNature = form.watch("nature");
  const montantValue = form.watch("montant");
  
  // Calculer la valeur convertie pour l'affichage
  const convertedValue = useMemo(() => {
    const value = parseFloat(montantValue) || 0;
    if (value === 0) return null;
    return inputMode === 'annuel' ? (value / 12).toFixed(2) : (value * 12).toFixed(2);
  }, [montantValue, inputMode]);
  
  const availableNatures = useMemo(() => {
    if (!selectedCategory) return [];
    return getNaturesByCategory(REVENUS_CATEGORIES, selectedCategory);
  }, [selectedCategory]);

  // Pré-remplir le libellé avec la nature sélectionnée
  useEffect(() => {
    if (selectedNature && !form.getValues("libelle")) {
      form.setValue("libelle", selectedNature);
      setIsLibellePrefilled(true);
    }
  }, [selectedNature, form]);

  const handleSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      // Convertir le montant saisi en montant annuel pour le stockage
      const montantSaisi = sanitizeNumericInput(data.montant) || 0;
      const montantAnnuel = inputMode === 'mensuel' ? montantSaisi * 12 : montantSaisi;
      
      const formData = {
        nature: sanitizeTextInput(data.nature),
        libelle: sanitizeTextInput(data.libelle),
        beneficiaire: sanitizeTextInput(data.beneficiaire),
        montant: montantAnnuel,
        revenu_disponible: false,
        periodicite: data.periodicite || 'mensuel',
        date_debut: data.date_debut || null,
        date_fin: data.date_fin || null,
        jour_fixe: data.jour_fixe ? parseInt(data.jour_fixe) : null,
        commentaire: sanitizeTextInput(data.commentaire),
      };

      const success = await submitSecureForm(
        formData,
        async (sanitizedData) => {
          await onSubmit(sanitizedData);
        },
        user?.id
      );

      if (success) {
        form.reset();
        // Ne pas appeler onCancel() ici car handleSubmitRevenu ferme déjà le formulaire
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Préparer les options pour les selects
  const categories = Object.keys(REVENUS_CATEGORIES).map(cat => ({
    value: cat,
    label: cat
  }));

  const natureOptions = availableNatures;

  const beneficiaires = useMemo(() => {
    const userFullName = familyProfile?.prenom && familyProfile?.nom 
      ? `${familyProfile.prenom} ${familyProfile.nom}` 
      : "Moi";

    const statut = maritalStatus?.statut_couple || "";
    const hasSpouse = ["Marié(e)", "Pacsé(e)", "Concubinage"].includes(statut);

    if (!hasSpouse) {
      return [userFullName];
    }

    const spouseFullName = maritalStatus?.prenom_conjoint && maritalStatus?.nom_conjoint
      ? `${maritalStatus.prenom_conjoint} ${maritalStatus.nom_conjoint}`
      : "Conjoint";

    return [userFullName, spouseFullName, "Le couple"];
  }, [familyProfile, maritalStatus]);

  // Réinitialiser le formulaire quand le dialogue s'ouvre/ferme
  useEffect(() => {
    if (open && !revenu) {
      // Réinitialiser pour un nouveau revenu
      form.reset({
        categorie: "",
        nature: "",
        libelle: "",
        beneficiaire: "",
        montant: "",
        periodicite: "mensuel",
        date_debut: "",
        date_fin: "",
        jour_fixe: "",
        commentaire: "",
      });
      setIsLibellePrefilled(false);
      setIsSubmitting(false);
      setInputMode('annuel');
    } else if (open && revenu) {
      // Charger les données existantes pour modification (toujours en annuel)
      form.reset({
        categorie: Object.keys(REVENUS_CATEGORIES).find(cat => 
          getNaturesByCategory(REVENUS_CATEGORIES, cat).includes(revenu.nature)
        ) || "",
        nature: revenu.nature || "",
        libelle: revenu.libelle || "",
        beneficiaire: revenu.beneficiaire || "",
        montant: revenu.montant?.toString() || "",
        periodicite: revenu.periodicite || "mensuel",
        date_debut: revenu.date_debut || "",
        date_fin: revenu.date_fin || "",
        jour_fixe: revenu.jour_fixe?.toString() || "",
        commentaire: revenu.commentaire || "",
      });
      setIsLibellePrefilled(false);
      setIsSubmitting(false);
      setInputMode('annuel');
    } else if (!open) {
      // Nettoyer complètement quand le Dialog se ferme
      setIsSubmitting(false);
      setIsLibellePrefilled(false);
    }
  }, [open, revenu, form]);

  return (
    <Dialog 
      open={open} 
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          onCancel();
        }
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{revenu ? 'Modifier le revenu' : 'Ajouter un revenu'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="categorie"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Catégorie</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={(value) => {
                      field.onChange(value);
                      form.setValue("nature", ""); // Reset nature when category changes
                    }}>
                      <SelectTrigger size="lg">
                        <SelectValue placeholder="Sélectionner une catégorie" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.value} value={category.value}>
                            {category.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="nature"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nature du revenu</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger size="lg">
                        <SelectValue placeholder="Sélectionner une nature" />
                      </SelectTrigger>
                      <SelectContent>
                        {natureOptions.map((nature) => (
                          <SelectItem key={nature} value={nature}>
                            {nature}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="libelle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Libellé</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="Saisissez le libellé" 
                      className={isLibellePrefilled && field.value === selectedNature ? "text-muted-foreground/50" : ""}
                      onChange={(e) => {
                        field.onChange(e);
                        setIsLibellePrefilled(false);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="beneficiaire"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Bénéficiaire</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger size="lg">
                        <SelectValue placeholder="Sélectionnez le bénéficiaire" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {beneficiaires.map((beneficiaire) => (
                        <SelectItem key={beneficiaire} value={beneficiaire}>
                          {beneficiaire}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="montant"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Montant (€)</FormLabel>
                    <div className="flex items-center gap-1 text-xs">
                      <button
                        type="button"
                        onClick={() => setInputMode('mensuel')}
                        className={`px-2 py-1 rounded transition-colors ${inputMode === 'mensuel' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                      >
                        Mensuel
                      </button>
                      <button
                        type="button"
                        onClick={() => setInputMode('annuel')}
                        className={`px-2 py-1 rounded transition-colors ${inputMode === 'annuel' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                      >
                        Annuel
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <FormControl>
                      <Input {...field} type="number" step="0.01" placeholder="0.00" className="flex-1" />
                    </FormControl>
                    {convertedValue && (
                      <span className="text-sm text-muted-foreground whitespace-nowrap">
                        = {convertedValue} € / {inputMode === 'annuel' ? 'mois' : 'an'}
                      </span>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="periodicite"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Périodicité</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger size="lg">
                        <SelectValue placeholder="Sélectionner la périodicité" />
                      </SelectTrigger>
                      <SelectContent>
                        {PERIODICITE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date_debut"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date de début</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="date_fin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date de fin (optionnel)</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="jour_fixe"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Jour fixe du mois (optionnel)</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" min="1" max="31" placeholder="ex: 15" />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">Pour les prélèvements à date fixe (1-31)</p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="commentaire"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Commentaire</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
              <Button type="button" variant="outline" onClick={onCancel}>
                Annuler
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};