import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useAssets } from '@/hooks/useAssets';
import { useFamilyData } from '@/hooks/useFamilyData';
import { useToast } from '@/hooks/use-toast';
import { liberaliteService, Liberalite, LiberaliteTypeImputation } from '@/services/liberaliteService';
import { X } from 'lucide-react';

interface LegsFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Lignes existantes partageant un même groupe_id, à modifier. Undefined =
  // création. Même sémantique "remplacement du groupe" que DonationForm.
  editingGroup?: Liberalite[];
  onSaved?: () => void;
}

const TYPE_LEG_TO_IMPUTATION: Record<string, LiberaliteTypeImputation> = {
  'Sur part successorale': 'avance_part',
  'Hors part successorale': 'hors_part',
};

const IMPUTATION_TO_TYPE_LEG: Record<string, string> = {
  avance_part: 'Sur part successorale',
  hors_part: 'Hors part successorale',
};

const DEFAULT_FORM_DATA = {
  libelle: 'Leg n°1',
  nature: '',
  typeLeg: '',
  realiseePar: '',
  testamentRealise: '',
  biensSelectionnes: [] as string[],
  clausesSelectionnees: [] as string[],
  legataires: [] as { id: string; nom: string; pourcentage: number }[]
};

export const LegsForm: React.FC<LegsFormProps> = ({ open, onOpenChange, editingGroup, onSaved }) => {
  const { assets } = useAssets();
  const { familyMembers: familyLinks } = useFamilyData();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState(DEFAULT_FORM_DATA);

  const naturesOptions = [
    'Legs universel',
    'Legs à titre universel', 
    'Legs particulier'
  ];

  const typesLegOptions = [
    'Hors part successorale',
    'Sur part successorale'
  ];

  const realiseParOptions = [
    'Époux 1',
    'Époux 2',
    'Communauté'
  ];

  const testamentOptions = [
    'Oui',
    'Non',
    'Non et je souhaiterais être accompagné'
  ];

  const clausesOptions = [
    'Le legs à deux bénéficiaires successifs',
    'Le legs résiduel',
    'Le legs graduel',
    'Le legs avec charges',
    'Le legs en démembrement de propriété'
  ];

  const handleBienToggle = (bienId: string) => {
    setFormData(prev => ({
      ...prev,
      biensSelectionnes: prev.biensSelectionnes.includes(bienId)
        ? prev.biensSelectionnes.filter(id => id !== bienId)
        : [...prev.biensSelectionnes, bienId]
    }));
  };

  const handleClauseToggle = (clause: string) => {
    setFormData(prev => ({
      ...prev,
      clausesSelectionnees: prev.clausesSelectionnees.includes(clause)
        ? prev.clausesSelectionnees.filter(c => c !== clause)
        : [...prev.clausesSelectionnees, clause]
    }));
  };

  const handleLegataireToggle = (familyMember: any) => {
    const isSelected = formData.legataires.some(l => l.id === familyMember.id);
    
    setFormData(prev => ({
      ...prev,
      legataires: isSelected
        ? prev.legataires.filter(l => l.id !== familyMember.id)
        : [...prev.legataires, {
            id: familyMember.id,
            nom: `${familyMember.nom} ${familyMember.prenom || ''}`.trim(),
            pourcentage: 0
          }]
    }));
  };

  const handlePourcentageChange = (legataireId: string, pourcentage: number) => {
    setFormData(prev => ({
      ...prev,
      legataires: prev.legataires.map(l =>
        l.id === legataireId ? { ...l, pourcentage } : l
      )
    }));
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return '0 €';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const totalPourcentage = formData.legataires.reduce((sum, l) => sum + l.pourcentage, 0);

  // Montant calculé automatiquement, lecture seule : somme des valeurs
  // actuelles des biens légués sélectionnés. Jamais stocké tel quel en base
  // pour un legs — le moteur de calcul le relit en live depuis assets, ce
  // montant ne sert ici qu'à vérifier la saisie à l'écran.
  const montantTotal = assets
    .filter(asset => formData.biensSelectionnes.includes(asset.id!))
    .reduce((sum, asset) => sum + (asset.valeur_estimee || 0), 0);

  // Pré-remplissage (édition) ou réinitialisation (création), à chaque
  // ouverture du dialogue.
  useEffect(() => {
    if (!open) return;

    if (editingGroup && editingGroup.length > 0) {
      const first = editingGroup[0];
      setFormData({
        libelle: first.denomination,
        nature: first.nature || '',
        typeLeg: first.type_imputation ? (IMPUTATION_TO_TYPE_LEG[first.type_imputation] || '') : '',
        realiseePar: first.realise_par || '',
        testamentRealise: first.testament_realise || '',
        biensSelectionnes: (first.biens || []).map(b => b.asset_id),
        clausesSelectionnees: first.clauses || [],
        legataires: [],
      });
    } else {
      setFormData(DEFAULT_FORM_DATA);
    }
  }, [open, editingGroup]);

  // Reconstruction des légataires : nécessite familyLinks chargé pour
  // retrouver nom/prénom à partir de beneficiaire_id.
  useEffect(() => {
    if (!open || !editingGroup || editingGroup.length === 0 || familyLinks.length === 0) return;
    const rebuilt = editingGroup
      .map(row => {
        const member = familyLinks.find(m => m.id === row.beneficiaire_id);
        if (!member) return null;
        return {
          id: member.id!,
          nom: `${member.nom} ${member.prenom || ''}`.trim(),
          pourcentage: row.pourcentage ?? 100,
        };
      })
      .filter((l): l is { id: string; nom: string; pourcentage: number } => l !== null);
    setFormData(prev => ({ ...prev, legataires: rebuilt }));
  }, [open, editingGroup, familyLinks]);

  const handleSubmit = async () => {
    if (formData.legataires.length === 0) {
      toast({
        title: "Erreur",
        description: "Sélectionnez au moins un légataire.",
        variant: "destructive",
      });
      return;
    }

    if (Math.abs(totalPourcentage - 100) > 0.01) {
      toast({
        title: "Erreur",
        description: `La somme des pourcentages des légataires doit être égale à 100% (actuellement ${totalPourcentage.toFixed(2)}%).`,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    const createdIds: string[] = [];
    try {
      const biens = formData.biensSelectionnes.map(assetId => ({ asset_id: assetId }));
      const groupeId = formData.legataires.length > 1 ? crypto.randomUUID() : undefined;

      // Ordre inversé : on crée les nouvelles lignes avant de toucher aux
      // anciennes. Pas de RPC/transaction Postgres côté projet — c'est
      // l'ordre qui garantit qu'un échec ne laisse jamais le groupe vide.
      for (const legataire of formData.legataires) {
        const created = await liberaliteService.createLiberalite({
          type: 'legs',
          denomination: formData.libelle,
          beneficiaire_id: legataire.id,
          beneficiaire_nom: legataire.nom,
          groupe_id: groupeId,
          // Proratise la valeur relue en live des biens légués entre les
          // légataires (cf. buildTransmissionLiberalites) — sans ça, un legs
          // à plusieurs légataires compterait sa valeur totale sur chaque ligne.
          pourcentage: legataire.pourcentage,
          nature: formData.nature || undefined,
          type_imputation: TYPE_LEG_TO_IMPUTATION[formData.typeLeg],
          realise_par: formData.realiseePar || undefined,
          clauses: formData.clausesSelectionnees.length > 0 ? formData.clausesSelectionnees : undefined,
          biens: biens.length > 0 ? biens : undefined,
          testament_realise: formData.testamentRealise || undefined,
        });
        createdIds.push(created.id!);
      }

      if (editingGroup && editingGroup.length > 0) {
        try {
          for (const oldRow of editingGroup) {
            await liberaliteService.deleteLiberalite(oldRow.id!);
          }
        } catch (deleteError) {
          console.error('Error deleting previous legs rows:', deleteError);
          toast({
            title: "Attention",
            description: "Le legs a été mis à jour, mais l'ancienne version n'a pas pu être supprimée automatiquement. Supprimez-la manuellement dans le tableau.",
            variant: "destructive",
          });
          onSaved?.();
          onOpenChange(false);
          return;
        }
      }

      toast({
        title: "Succès",
        description: editingGroup ? "Legs modifié avec succès" : "Legs enregistré avec succès",
      });
      onSaved?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving legs:', error);
      // Création interrompue en cours de route : nettoyage best-effort des
      // lignes déjà créées. Les anciennes lignes (si édition) sont intactes.
      for (const id of createdIds) {
        try {
          await liberaliteService.deleteLiberalite(id);
        } catch (cleanupError) {
          console.error('Cleanup error after failed legs save:', cleanupError);
        }
      }
      toast({
        title: "Erreur",
        description: editingGroup
          ? "Impossible de modifier le legs. Vos données d'origine sont intactes."
          : "Impossible d'enregistrer le legs",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl">
              {editingGroup ? 'Modifier le legs' : 'Legs (Testament)'}
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informations générales */}
          <Card>
            <CardHeader>
              <CardTitle>Informations générales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="libelle">Libellé</Label>
                  <Input
                    id="libelle"
                    value={formData.libelle}
                    onChange={(e) => setFormData(prev => ({ ...prev, libelle: e.target.value }))}
                  />
                </div>

                <div>
                  <Label>Nature</Label>
                  <Select value={formData.nature} onValueChange={(value) => setFormData(prev => ({ ...prev, nature: value }))}>
                    <SelectTrigger size="lg">
                      <SelectValue placeholder="Sélectionner la nature" />
                    </SelectTrigger>
                    <SelectContent>
                      {naturesOptions.map((option) => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Type de legs</Label>
                  <Select value={formData.typeLeg} onValueChange={(value) => setFormData(prev => ({ ...prev, typeLeg: value }))}>
                    <SelectTrigger size="lg">
                      <SelectValue placeholder="Sélectionner le type" />
                    </SelectTrigger>
                    <SelectContent>
                      {typesLegOptions.map((option) => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Réalisée par</Label>
                  <Select value={formData.realiseePar} onValueChange={(value) => setFormData(prev => ({ ...prev, realiseePar: value }))}>
                    <SelectTrigger size="lg">
                      <SelectValue placeholder="Sélectionner qui réalise" />
                    </SelectTrigger>
                    <SelectContent>
                      {realiseParOptions.map((option) => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Avez-vous déjà réalisé votre testament ?</Label>
                <Select value={formData.testamentRealise} onValueChange={(value) => setFormData(prev => ({ ...prev, testamentRealise: value }))}>
                  <SelectTrigger size="lg" className="w-full">
                    <SelectValue placeholder="Sélectionner une réponse" />
                  </SelectTrigger>
                  <SelectContent>
                    {testamentOptions.map((option) => (
                      <SelectItem key={option} value={option}>{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Sélection des biens légués */}
          <Card>
            <CardHeader>
              <CardTitle>Sélection des biens légués</CardTitle>
            </CardHeader>
            <CardContent>
              {assets.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  Aucun bien disponible dans votre patrimoine
                </p>
              ) : (
                <div className="space-y-3">
                  {assets.map((asset) => (
                    <div key={asset.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          checked={formData.biensSelectionnes.includes(asset.id!)}
                          onCheckedChange={() => handleBienToggle(asset.id!)}
                        />
                        <div>
                          <p className="font-medium">{asset.denomination || asset.nature}</p>
                          <p className="text-sm text-muted-foreground">{asset.nature}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(asset.valeur_estimee)}</p>
                        <p className="text-sm text-muted-foreground">Valeur estimée</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {formData.biensSelectionnes.length > 0 && (
                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium">
                    Montant total du legs (calculé automatiquement) : {formatCurrency(montantTotal)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Recalculé à partir de la valeur actuelle des biens sélectionnés — non figé, la valeur retenue au décès pourra différer.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Clauses insérées */}
          <Card>
            <CardHeader>
              <CardTitle>Clauses insérées</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {clausesOptions.map((clause) => (
                  <div key={clause} className="flex items-center space-x-3">
                    <Checkbox
                      checked={formData.clausesSelectionnees.includes(clause)}
                      onCheckedChange={() => handleClauseToggle(clause)}
                    />
                    <Label className="font-medium">{clause}</Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Légataires */}
          <Card>
            <CardHeader>
              <CardTitle>Légataires</CardTitle>
            </CardHeader>
            <CardContent>
              {familyLinks.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  Aucun membre de famille disponible dans la section liens familiaux
                </p>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-3">
                    {familyLinks.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Checkbox
                            checked={formData.legataires.some(l => l.id === member.id)}
                            onCheckedChange={() => handleLegataireToggle(member)}
                          />
                          <div>
                            <p className="font-medium">{member.nom} {member.prenom}</p>
                            <p className="text-sm text-muted-foreground">{member.lien_familial}</p>
                          </div>
                        </div>
                        {formData.legataires.some(l => l.id === member.id) && (
                          <div className="flex items-center space-x-2">
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              placeholder="0"
                              className="w-20"
                              value={formData.legataires.find(l => l.id === member.id)?.pourcentage || ''}
                              onChange={(e) => handlePourcentageChange(member.id!, parseFloat(e.target.value) || 0)}
                            />
                            <span className="text-sm">%</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {formData.legataires.length > 0 && (
                    <div className="pt-2 border-t">
                      <p className={`text-sm font-medium ${totalPourcentage > 100 ? 'text-destructive' : 'text-muted-foreground'}`}>
                        Total: {totalPourcentage.toFixed(2)}%
                        {totalPourcentage > 100 && ' (dépasse 100%)'}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Separator />

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Annuler
            </Button>
            <Button
              disabled={totalPourcentage > 100 || isSubmitting}
              onClick={handleSubmit}
            >
              Enregistrer le legs
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};