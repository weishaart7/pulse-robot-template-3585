import React, { forwardRef, useImperativeHandle, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Loader2, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FamilyLink, FamilyProfile, MaritalStatus } from '@/services/familyService';
import { useFamilyLinkLogic } from '@/hooks/useFamilyLinkLogic';
import { DynamicFamilyForm } from '@/components/family/DynamicFamilyForm';
import { assetIndivisaireService, AssetIndivisaireWithAsset } from '@/services/assetIndivisaireService';
import { Asset } from '@/services/assetService';
import { AssetDetailsDialog } from '@/components/patrimoine/AssetDetailsDialog';
import { useToast } from '@/hooks/use-toast';
import { LINKS_WITH_BRANCHE, LINKS_WITH_EXONERATION, evaluerExonerationFrereSoeur, sanitizeMemberForLink, verifierCoherenceAscendance } from '@/lib/family/familyLinkRules';

export const membreFamilleSchema = z.object({
  lien_familial: z.string().min(1, 'Le lien familial est obligatoire'),
  civilite: z.string().optional(),
  nom: z.string().min(1, 'Le nom est obligatoire'),
  prenom: z.string().optional(),
  date_naissance: z.date().optional(),
  nationalite: z.string().optional(),
  double_nationalite: z.boolean().default(false),
  nationalite_2: z.string().optional(),
  est_decede: z.boolean().default(false),
  date_deces: z.date().optional(),
  handicap: z.boolean().default(false),
  enfant_adopte: z.string().default('Non'),
  adoption_simple_abattement_plein: z.boolean().default(false),
  adoption_simple_motif: z.string().optional(),
  enfant_renoncant: z.boolean().default(false),
  enfant_renoncant_de: z.string().optional(),
  branche_familiale: z.string().optional(),
  enfant_de: z.string().optional(),
  exoneration_succession: z.boolean().default(false),
  exo_frere_soeur_seul: z.boolean().default(false),
  exo_frere_soeur_infirmite: z.boolean().default(false),
  exo_frere_soeur_cohabitation_5_ans: z.boolean().default(false),
  enfant_a_charge: z.boolean().default(false),
  fiscalement_a_charge: z.boolean().default(false),
  mesure_protection_juridique: z.string().default('Aucune'),
  mandat_protection_future: z.boolean().default(false),
  date_mandat_protection_future: z.date().optional(),
  personne_a_charge: z.boolean().default(false),
}).superRefine((data, ctx) => {
  // « Enfant de » : parent_de en dépend (enfant commun / exclusif) pour la
  // dévolution légale — un vide serait dessiné comme enfant commun dans l'arbre
  // mais traité comme enfant du seul client par le moteur.
  if (data.lien_familial === 'Enfant' && !data.enfant_de) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['enfant_de'], message: 'Veuillez indiquer de qui il est l\'enfant' });
  }
  // Branche familiale : sans elle, successionLegale.ts exclut le membre de la fente.
  if (LINKS_WITH_BRANCHE.includes(data.lien_familial) && !data.branche_familiale) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['branche_familiale'], message: 'Veuillez sélectionner une branche' });
  }
  if (data.est_decede && !data.date_deces) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['date_deces'], message: 'La date de décès est obligatoire' });
  }
  if (data.est_decede && data.date_deces && data.date_naissance && data.date_deces < data.date_naissance) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['date_deces'], message: 'La date de décès ne peut pas précéder la date de naissance' });
  }
  if (data.lien_familial === 'Enfant' && data.enfant_renoncant && !data.enfant_renoncant_de) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['enfant_renoncant_de'], message: 'Veuillez indiquer la succession concernée' });
  }
});
export type MembreFamille = z.infer<typeof membreFamilleSchema>;

const DEFAULT_VALUES: MembreFamille = {
  lien_familial: '',
  nom: '',
  prenom: '',
  double_nationalite: false,
  est_decede: false,
  handicap: false,
  enfant_adopte: 'Non',
  adoption_simple_abattement_plein: false,
  enfant_renoncant: false,
  exoneration_succession: false,
  exo_frere_soeur_seul: false,
  exo_frere_soeur_infirmite: false,
  exo_frere_soeur_cohabitation_5_ans: false,
  enfant_a_charge: false,
  fiscalement_a_charge: false,
  mesure_protection_juridique: 'Aucune',
  mandat_protection_future: false,
  personne_a_charge: false,
};

export interface FamilyMemberFormDialogHandle {
  openForAdd: () => void;
  openForEdit: (member: FamilyLink) => void;
}

interface FamilyMemberFormDialogProps {
  familyLinks: FamilyLink[];
  familyProfile: FamilyProfile | null;
  maritalStatus: MaritalStatus | null;
  saving: boolean;
  addLink: (link: Omit<FamilyLink, 'id' | 'user_id'>) => Promise<FamilyLink>;
  updateLink: (id: string, link: Partial<FamilyLink>) => Promise<FamilyLink>;
}

export const FamilyMemberFormDialog = forwardRef<FamilyMemberFormDialogHandle, FamilyMemberFormDialogProps>(
  ({ familyLinks, familyProfile, maritalStatus, saving, addLink, updateLink }, ref) => {
    const { toast } = useToast();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingMember, setEditingMember] = useState<FamilyLink | null>(null);
    const [selectedLinkType, setSelectedLinkType] = useState('');
    const familyLinkLogic = useFamilyLinkLogic(familyLinks, familyProfile, maritalStatus);
    const [coOwnedAssets, setCoOwnedAssets] = useState<AssetIndivisaireWithAsset[]>([]);
    const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
    const [assetDetailsOpen, setAssetDetailsOpen] = useState(false);

    useEffect(() => {
      if (!dialogOpen || !editingMember?.id) {
        setCoOwnedAssets([]);
        return;
      }
      assetIndivisaireService.getByFamilyLink(editingMember.id)
        .then(setCoOwnedAssets)
        .catch((error) => {
          if (import.meta.env.DEV) {
            console.error('Erreur lors du chargement des actifs codétenus:', error);
          }
          setCoOwnedAssets([]);
          toast({
            title: "Erreur",
            description: "Impossible de charger les actifs codétenus de ce membre.",
            variant: "destructive",
          });
        });
    }, [dialogOpen, editingMember?.id]);

    const memberForm = useForm<MembreFamille>({
      resolver: zodResolver(membreFamilleSchema),
      defaultValues: DEFAULT_VALUES,
    });

    useImperativeHandle(ref, () => ({
      openForAdd: () => {
        setEditingMember(null);
        setSelectedLinkType('');
        memberForm.reset(DEFAULT_VALUES);
        setDialogOpen(true);
      },
      openForEdit: (member: FamilyLink) => {
        setEditingMember(member);
        setSelectedLinkType(member.lien_familial);
        memberForm.reset({
          lien_familial: member.lien_familial,
          civilite: member.civilite || '',
          nom: member.nom,
          prenom: member.prenom || '',
          date_naissance: member.date_naissance ? new Date(member.date_naissance) : undefined,
          nationalite: member.nationalite || '',
          double_nationalite: !!member.nationalite_2,
          nationalite_2: member.nationalite_2 || '',
          est_decede: member.est_decede || false,
          date_deces: member.date_deces ? new Date(member.date_deces) : undefined,
          handicap: member.handicap || false,
          enfant_adopte: member.enfant_adopte || 'Non',
          adoption_simple_abattement_plein: member.adoption_simple_abattement_plein || false,
          adoption_simple_motif: member.adoption_simple_motif || '',
          enfant_renoncant: member.enfant_renoncant || false,
          enfant_renoncant_de: member.enfant_renoncant_de || '',
          branche_familiale: member.branche_familiale || '',
          enfant_de: member.enfant_de || '',
          exoneration_succession: member.exoneration_succession || false,
          exo_frere_soeur_seul: member.exo_frere_soeur_seul || false,
          exo_frere_soeur_infirmite: member.exo_frere_soeur_infirmite || false,
          exo_frere_soeur_cohabitation_5_ans: member.exo_frere_soeur_cohabitation_5_ans || false,
          enfant_a_charge: member.enfant_a_charge || false,
          fiscalement_a_charge: member.fiscalement_a_charge || false,
          mesure_protection_juridique: member.mesure_protection_juridique || 'Aucune',
          mandat_protection_future: member.mandat_protection_future || false,
          date_mandat_protection_future: member.date_mandat_protection_future ? new Date(member.date_mandat_protection_future) : undefined,
          personne_a_charge: member.personne_a_charge || false,
        });
        setDialogOpen(true);
        // Membre saisi avant que la branche ne soit obligatoire : erreur affichée dès l'ouverture.
        if (LINKS_WITH_BRANCHE.includes(member.lien_familial) && !member.branche_familiale) {
          setTimeout(() => memberForm.trigger('branche_familiale'), 0);
        }
      },
    }), [memberForm]);

    const handleMemberSubmit = async (rawData: MembreFamille) => {
      // Champs masqués pour ce lien (ou rendus sans objet) remis à zéro avant
      // enregistrement, cf. familyLinkRules.ts.
      const data = sanitizeMemberForLink(rawData);
      // R1-R5 : deux parents au plus par personne, ascendant né avant son enfant.
      const erreurs = verifierCoherenceAscendance({
        lien_familial: data.lien_familial ?? '',
        enfant_de: data.enfant_de,
        date_naissance: data.date_naissance,
      }, familyLinks, {
        editingId: editingMember?.id,
        dateNaissanceClient: familyProfile?.date_naissance,
        dateNaissanceConjoint: maritalStatus?.date_naissance_conjoint,
      });
      if (erreurs.length > 0) {
        erreurs.forEach(e => memberForm.setError(e.path, { type: 'custom', message: e.message }));
        return;
      }
      try {
        const memberData = {
          lien_familial: data.lien_familial,
          civilite: data.civilite,
          nom: data.nom,
          prenom: data.prenom,
          date_naissance: data.date_naissance ? format(data.date_naissance, 'yyyy-MM-dd') : undefined,
          nationalite: data.nationalite,
          nationalite_2: data.double_nationalite ? (data.nationalite_2 || '') : '',
          est_decede: data.est_decede,
          date_deces: data.date_deces ? format(data.date_deces, 'yyyy-MM-dd') : null,
          handicap: data.handicap,
          enfant_adopte: data.enfant_adopte,
          adoption_simple_abattement_plein: data.adoption_simple_abattement_plein,
          adoption_simple_motif: data.adoption_simple_motif,
          enfant_renoncant: data.enfant_renoncant,
          enfant_renoncant_de: data.enfant_renoncant_de,
          branche_familiale: data.branche_familiale,
          enfant_de: data.enfant_de,
          // parent_de n'a de sens que pour lien_familial === 'Enfant' (valeurs
          // 'user'/'spouse'/'both_parents' lues par transmissionHelpers.ts pour
          // la dévolution légale) — null explicite sinon, pour ne pas laisser
          // traîner un id de membre sans signification sur les autres types de lien.
          parent_de: data.lien_familial === 'Enfant' ? data.enfant_de : null,
          // Dérivé des trois conditions de l'art. 796-0 ter CGI (lu tel quel par le moteur DMTG).
          exoneration_succession: LINKS_WITH_EXONERATION.includes(data.lien_familial) && evaluerExonerationFrereSoeur({
            seul: data.exo_frere_soeur_seul,
            infirmite: data.exo_frere_soeur_infirmite,
            cohabitation5Ans: data.exo_frere_soeur_cohabitation_5_ans,
            dateNaissance: data.date_naissance,
          }).exonere,
          exo_frere_soeur_seul: data.exo_frere_soeur_seul,
          exo_frere_soeur_infirmite: data.exo_frere_soeur_infirmite,
          exo_frere_soeur_cohabitation_5_ans: data.exo_frere_soeur_cohabitation_5_ans,
          enfant_a_charge: data.enfant_a_charge,
          fiscalement_a_charge: data.fiscalement_a_charge,
          mesure_protection_juridique: data.mesure_protection_juridique,
          mandat_protection_future: data.mandat_protection_future,
          date_mandat_protection_future: data.date_mandat_protection_future ? format(data.date_mandat_protection_future, 'yyyy-MM-dd') : undefined,
          personne_a_charge: data.personne_a_charge,
        };
        if (editingMember) {
          await updateLink(editingMember.id!, memberData);
        } else {
          await addLink(memberData);
        }
        setDialogOpen(false);
        setEditingMember(null);
        setSelectedLinkType('');
        memberForm.reset(DEFAULT_VALUES);
      } catch (error) {
        // Notification déjà affichée par useFamilyLinks : la fenêtre reste ouverte.
        if (import.meta.env.DEV) {
          console.error('Erreur lors de la sauvegarde du membre:', error);
        }
      }
    };

    return (
      <>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingMember ? 'Modifier un membre' : 'Ajouter un membre de la famille'}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-6">
            <Form {...memberForm}>
              <form onSubmit={memberForm.handleSubmit(handleMemberSubmit)} className="space-y-6">
                <FormField
                  control={memberForm.control}
                  name="lien_familial"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lien familial *</FormLabel>
                      <Select
                        onValueChange={value => {
                          field.onChange(value);
                          setSelectedLinkType(value);
                          // Valeur par défaut réellement écrite (et non seulement affichée),
                          // uniquement sur un choix de lien : un membre existant sans branche
                          // doit rester signalé comme incomplet à l'ouverture.
                          if (LINKS_WITH_BRANCHE.includes(value) && !memberForm.getValues('branche_familiale')) {
                            memberForm.setValue('branche_familiale', 'Branche paternelle');
                          }
                        }}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger
                            size="lg"
                            className="bg-background border-border shadow-none rounded-md focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/20"
                          >
                            <SelectValue placeholder="Sélectionner un lien" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {familyLinkLogic.availableLinks.map(linkOption => (
                            <SelectItem key={linkOption.value} value={linkOption.value}>
                              {linkOption.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {(selectedLinkType || editingMember) && (
                  <DynamicFamilyForm
                    linkType={selectedLinkType || editingMember?.lien_familial || ''}
                    parentOptions={familyLinkLogic.getParentOptions(selectedLinkType || editingMember?.lien_familial || '', editingMember?.id)}
                    parentsForRenunciation={familyLinkLogic.getParentsForRenunciation()}
                  />
                )}

                {coOwnedAssets.length > 0 && (
                  <div className="space-y-2 pt-2 border-t">
                    <p className="text-sm font-medium">Actifs codétenus</p>
                    <div className="space-y-2">
                      {coOwnedAssets.filter((item) => item.assets).map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setSelectedAsset(item.assets);
                            setAssetDetailsOpen(true);
                          }}
                          className="w-full flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-left hover:bg-muted/50 transition-colors"
                        >
                          <span className="flex items-center gap-2 text-sm font-medium truncate">
                            <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                            {item.assets!.denomination || item.assets!.nature}
                          </span>
                          <span className="text-sm text-muted-foreground shrink-0">
                            {item.pourcentage}%
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setDialogOpen(false);
                      setEditingMember(null);
                      memberForm.reset(DEFAULT_VALUES);
                    }}
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
                    ) : editingMember ? 'Modifier' : 'Ajouter'}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>

      <AssetDetailsDialog
        asset={selectedAsset}
        open={assetDetailsOpen}
        onOpenChange={setAssetDetailsOpen}
      />
    </>
    );
  }
);
FamilyMemberFormDialog.displayName = 'FamilyMemberFormDialog';
