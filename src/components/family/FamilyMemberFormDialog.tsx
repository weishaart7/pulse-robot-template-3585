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

export const membreFamilleSchema = z.object({
  lien_familial: z.string().min(1, 'Le lien familial est obligatoire'),
  civilite: z.string().optional(),
  nom: z.string().min(1, 'Le nom est obligatoire'),
  prenom: z.string().optional(),
  date_naissance: z.date().optional(),
  est_decede: z.boolean().default(false),
  date_deces: z.date().optional(),
  handicap: z.boolean().default(false),
  enfant_adopte: z.string().default('Non'),
  enfant_renoncant: z.boolean().default(false),
  enfant_renoncant_de: z.string().optional(),
  branche_familiale: z.string().optional(),
  enfant_de: z.string().optional(),
  exoneration_succession: z.boolean().default(false),
  enfant_a_charge: z.boolean().default(false),
  fiscalement_a_charge: z.boolean().default(false)
});
export type MembreFamille = z.infer<typeof membreFamilleSchema>;

const DEFAULT_VALUES: MembreFamille = {
  lien_familial: '',
  nom: '',
  est_decede: false,
  handicap: false,
  enfant_adopte: 'Non',
  enfant_renoncant: false,
  exoneration_succession: false,
  enfant_a_charge: false,
  fiscalement_a_charge: false,
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
        .catch(() => setCoOwnedAssets([]));
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
          est_decede: member.est_decede || false,
          date_deces: member.date_deces ? new Date(member.date_deces) : undefined,
          handicap: member.handicap || false,
          enfant_adopte: member.enfant_adopte || 'Non',
          enfant_renoncant: member.enfant_renoncant || false,
          enfant_renoncant_de: member.enfant_renoncant_de || '',
          branche_familiale: member.branche_familiale || '',
          enfant_de: member.enfant_de || '',
          exoneration_succession: member.exoneration_succession || false,
          enfant_a_charge: member.enfant_a_charge || false,
          fiscalement_a_charge: member.fiscalement_a_charge || false,
        });
        setDialogOpen(true);
      },
    }), [memberForm]);

    const handleMemberSubmit = async (data: MembreFamille) => {
      try {
        const memberData = {
          lien_familial: data.lien_familial,
          civilite: data.civilite,
          nom: data.nom,
          prenom: data.prenom,
          date_naissance: data.date_naissance ? format(data.date_naissance, 'yyyy-MM-dd') : undefined,
          est_decede: data.est_decede,
          date_deces: data.date_deces ? format(data.date_deces, 'yyyy-MM-dd') : undefined,
          handicap: data.handicap,
          enfant_adopte: data.enfant_adopte,
          enfant_renoncant: data.enfant_renoncant,
          enfant_renoncant_de: data.enfant_renoncant_de,
          branche_familiale: data.branche_familiale,
          enfant_de: data.enfant_de,
          parent_de: data.enfant_de,
          exoneration_succession: data.exoneration_succession,
          enfant_a_charge: data.enfant_a_charge,
          fiscalement_a_charge: data.fiscalement_a_charge,
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
        console.error('Erreur lors de la sauvegarde du membre:', error);
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
                        }}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger size="lg">
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
                    parentOptions={familyLinkLogic.getParentOptions(selectedLinkType || editingMember?.lien_familial || '')}
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
