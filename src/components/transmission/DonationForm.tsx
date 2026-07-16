import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarIcon, X } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAssets } from '@/hooks/useAssets';
import { useToast } from '@/hooks/use-toast';
import { liberaliteService, Liberalite, LiberaliteTypeImputation } from '@/services/liberaliteService';

interface FamilyMember {
  id: string;
  nom: string;
  prenom: string;
  lien_familial: string;
}

interface Beneficiary {
  id: string;
  nom: string;
  prenom: string;
  lien_familial: string;
  pourcentage: number;
}

interface DonationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Lignes existantes partageant un même groupe_id, à modifier. Undefined =
  // création. L'enregistrement recrée systématiquement toutes les lignes du
  // groupe puis supprime les anciennes (cf. handleSubmit) : il n'y a pas de
  // mise à jour ligne à ligne, donc pas de risque de désynchronisation du
  // groupe (garde-fou (c) de la Phase 7).
  editingGroup?: Liberalite[];
  onSaved?: () => void;
}

const DEFAULT_FORM_DATA = {
  libelle: 'Donation appartement Rue de la Paix',
  nature: '',
  demembrement: 'aucun',
  typeDonation: '',
  droitsParDonateur: false,
  realiseePar: '',
  date: undefined as Date | undefined,
};

export const DonationForm = ({ open, onOpenChange, editingGroup, onSaved }: DonationFormProps) => {
  const { assets, loading } = useAssets();
  const { toast } = useToast();

  const [formData, setFormData] = useState(DEFAULT_FORM_DATA);

  const [selectedClauses, setSelectedClauses] = useState<string[]>([]);
  const [showClauses, setShowClauses] = useState(false);
  const [selectedAssets, setSelectedAssets] = useState<{id: string, valeurDonation: number}[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const naturesOptions = [
    'Donation simple',
    'Dons familiaux de sommes d\'argent',
    'Don d\'argent exonéré',
    'Don d\'argent pour résidence principale (2025)',
    'Don d\'argent sous condition de remploi (2020)',
    'Donation-partage',
    'Donation graduelle',
    'Donation résiduelle',
    'Donation-partage transgénérationnelle',
    'Donation-partage conjonctive'
  ];

  const clausesOptions = [
    'Inaliénabilité : empêche de vendre le bien (temporaire, intérêt légitime)',
    'Retour conventionnel : le bien retourne au donateur si le donataire décède',
    'Dispense de rapport : la donation n\'est pas rapportée à la succession',
    'Rapport forfaitaire : fixer contractuellement une valeur figée au rapport',
    'Exclusion ou inclusion dans la communauté : déterminer si le bien reste propre',
    'Administration spéciale : désigner un administrateur autre que les parents',
    'Obligation d\'emploi : imposer une affectation précise des fonds',
    'Gestion d\'un bien démembré : prévoir sort du prix en cas de cession',
    'Usufruit réservé : le donateur conserve l\'usage du bien',
    'Usufruit successif : usufruit transmis successivement',
    'Délivrance à terme : remise du bien différée'
  ];

  const handleClauseToggle = (clause: string) => {
    setSelectedClauses(prev => 
      prev.includes(clause) 
        ? prev.filter(c => c !== clause)
        : [...prev, clause]
    );
  };

  const fetchFamilyMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('family_links')
        .select('id, nom, prenom, lien_familial')
        .order('nom');

      if (error) throw error;
      setFamilyMembers(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des liens familiaux:', error);
    }
  };

  const handleAssetToggle = (assetId: string, valeurEstimee: number) => {
    setSelectedAssets(prev => {
      const exists = prev.find(a => a.id === assetId);
      if (exists) {
        return prev.filter(a => a.id !== assetId);
      } else {
        return [...prev, { id: assetId, valeurDonation: valeurEstimee }];
      }
    });
  };

  const updateAssetDonationValue = (assetId: string, value: number) => {
    setSelectedAssets(prev => 
      prev.map(a => a.id === assetId ? { ...a, valeurDonation: value } : a)
    );
  };

  const handleBeneficiaryToggle = (member: FamilyMember) => {
    setBeneficiaries(prev => {
      const exists = prev.find(b => b.id === member.id);
      if (exists) {
        return prev.filter(b => b.id !== member.id);
      } else {
        return [...prev, { ...member, pourcentage: 0 }];
      }
    });
  };

  const updateBeneficiaryPercentage = (beneficiaryId: string, percentage: number) => {
    setBeneficiaries(prev => 
      prev.map(b => b.id === beneficiaryId ? { ...b, pourcentage: percentage } : b)
    );
  };

  // Pré-remplissage (édition) ou réinitialisation (création) des champs qui
  // ne dépendent pas de familyMembers, à chaque ouverture du dialogue.
  useEffect(() => {
    if (!open) return;
    fetchFamilyMembers();

    if (editingGroup && editingGroup.length > 0) {
      const first = editingGroup[0];
      setFormData({
        libelle: first.denomination,
        nature: first.nature || '',
        demembrement: first.demembrement || 'aucun',
        typeDonation: first.type_imputation || '',
        droitsParDonateur: first.prise_en_charge_droits || false,
        realiseePar: first.realise_par || '',
        date: first.date_acte ? new Date(first.date_acte) : undefined,
      });
      setSelectedClauses(first.clauses || []);
      setSelectedAssets((first.biens || []).map(b => ({ id: b.asset_id, valeurDonation: b.valeur || 0 })));
    } else {
      setFormData(DEFAULT_FORM_DATA);
      setSelectedClauses([]);
      setSelectedAssets([]);
      setBeneficiaries([]);
    }
  }, [open, editingGroup]);

  // Reconstruction des donataires : nécessite familyMembers chargé pour
  // retrouver nom/prénom/lien à partir de beneficiaire_id.
  useEffect(() => {
    if (!open || !editingGroup || editingGroup.length === 0 || familyMembers.length === 0) return;
    const rebuilt = editingGroup
      .map(row => {
        const member = familyMembers.find(m => m.id === row.beneficiaire_id);
        if (!member) return null;
        return { ...member, pourcentage: row.pourcentage ?? 100 };
      })
      .filter((b): b is Beneficiary => b !== null);
    setBeneficiaries(rebuilt);
  }, [open, editingGroup, familyMembers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const totalPourcentage = beneficiaries.reduce((sum, b) => sum + b.pourcentage, 0);

    if (beneficiaries.length === 0) {
      toast({
        title: "Erreur",
        description: "Sélectionnez au moins un donataire.",
        variant: "destructive",
      });
      return;
    }

    if (Math.abs(totalPourcentage - 100) > 0.01) {
      toast({
        title: "Erreur",
        description: `La somme des pourcentages des donataires doit être égale à 100% (actuellement ${totalPourcentage.toFixed(2)}%).`,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    const createdIds: string[] = [];
    try {
      const montantTotal = selectedAssets.reduce((sum, a) => sum + a.valeurDonation, 0);
      const biens = selectedAssets.map(a => ({ asset_id: a.id, valeur: a.valeurDonation }));
      const groupeId = beneficiaries.length > 1 ? crypto.randomUUID() : undefined;
      const dateActe = formData.date ? formData.date.toISOString().split('T')[0] : undefined;

      // Ordre inversé : on crée les nouvelles lignes avant de toucher aux
      // anciennes. Pas de RPC/transaction Postgres côté projet — c'est
      // l'ordre qui garantit qu'un échec ne laisse jamais le groupe vide.
      for (const beneficiaire of beneficiaries) {
        const created = await liberaliteService.createLiberalite({
          type: 'donation',
          denomination: formData.libelle,
          beneficiaire_id: beneficiaire.id,
          beneficiaire_nom: `${beneficiaire.prenom || ''} ${beneficiaire.nom}`.trim(),
          groupe_id: groupeId,
          montant: montantTotal * (beneficiaire.pourcentage / 100),
          pourcentage: beneficiaire.pourcentage,
          date_acte: dateActe,
          nature: formData.nature || undefined,
          type_imputation: (formData.typeDonation || undefined) as LiberaliteTypeImputation | undefined,
          realise_par: formData.realiseePar || undefined,
          clauses: selectedClauses.length > 0 ? selectedClauses : undefined,
          biens: biens.length > 0 ? biens : undefined,
          demembrement: formData.demembrement !== 'aucun' ? formData.demembrement : undefined,
          prise_en_charge_droits: formData.droitsParDonateur,
        });
        createdIds.push(created.id!);
      }

      if (editingGroup && editingGroup.length > 0) {
        try {
          for (const oldRow of editingGroup) {
            await liberaliteService.deleteLiberalite(oldRow.id!);
          }
        } catch (deleteError) {
          console.error('Error deleting previous donation rows:', deleteError);
          toast({
            title: "Attention",
            description: "La donation a été mise à jour, mais l'ancienne version n'a pas pu être supprimée automatiquement. Supprimez-la manuellement dans le tableau.",
            variant: "destructive",
          });
          onSaved?.();
          onOpenChange(false);
          return;
        }
      }

      toast({
        title: "Succès",
        description: editingGroup ? "Donation modifiée avec succès" : "Donation enregistrée avec succès",
      });
      onSaved?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving donation:', error);
      // La création a échoué en cours de route : nettoyage best-effort des
      // lignes déjà créées pour ne pas laisser de doublons partiels. Les
      // anciennes lignes (si édition) n'ont pas été touchées.
      for (const id of createdIds) {
        try {
          await liberaliteService.deleteLiberalite(id);
        } catch (cleanupError) {
          console.error('Cleanup error after failed donation save:', cleanupError);
        }
      }
      toast({
        title: "Erreur",
        description: editingGroup
          ? "Impossible de modifier la donation. Vos données d'origine sont intactes."
          : "Impossible d'enregistrer la donation",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {editingGroup ? 'Modifier la donation' : 'Donations'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Libellé */}
          <div>
            <Label htmlFor="libelle">Libellé</Label>
            <Input
              id="libelle"
              value={formData.libelle}
              onChange={(e) => setFormData({ ...formData, libelle: e.target.value })}
              placeholder="Donation appartement Rue de la Paix"
            />
          </div>

          {/* Nature */}
          <div>
            <Label>Nature</Label>
            <Select value={formData.nature} onValueChange={(value) => setFormData({ ...formData, nature: value })}>
              <SelectTrigger size="lg">
                <SelectValue placeholder="Sélectionnez la nature" />
              </SelectTrigger>
              <SelectContent>
                {naturesOptions.map((nature) => (
                  <SelectItem key={nature} value={nature}>
                    {nature}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Démembrement */}
          <div>
            <Label>Démembrement</Label>
            <Select value={formData.demembrement} onValueChange={(value) => setFormData({ ...formData, demembrement: value })}>
              <SelectTrigger size="lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="aucun">Aucun</SelectItem>
                <SelectItem value="reserve_usufruit">Réserve d'usufruit</SelectItem>
                <SelectItem value="reserve_usufruit_reversible">Réserve d'usufruit réversible au conjoint survivant</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Type de donation */}
          <div>
            <Label>Type de donation</Label>
            <Select value={formData.typeDonation} onValueChange={(value) => setFormData({ ...formData, typeDonation: value })}>
              <SelectTrigger size="lg">
                <SelectValue placeholder="Sélectionnez le type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="avance_part">Par avance de part successorale</SelectItem>
                <SelectItem value="hors_part">Hors part successorale</SelectItem>
                <SelectItem value="partage">Partage</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Clauses insérées */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Clauses insérée(s)
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowClauses(!showClauses)}
                >
                  {showClauses ? 'Fermer' : 'Ouvrir'}
                </Button>
              </CardTitle>
            </CardHeader>
            {showClauses && (
              <CardContent className="space-y-3">
                {clausesOptions.map((clause) => (
                  <div key={clause} className="flex items-start space-x-2">
                    <Checkbox
                      id={clause}
                      checked={selectedClauses.includes(clause)}
                      onCheckedChange={() => handleClauseToggle(clause)}
                    />
                    <Label htmlFor={clause} className="text-sm leading-5">
                      {clause}
                    </Label>
                  </div>
                ))}
              </CardContent>
            )}
          </Card>

          {/* Prise en charge des droits */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="droitsParDonateur"
              checked={formData.droitsParDonateur}
              onCheckedChange={(checked) => setFormData({ ...formData, droitsParDonateur: checked as boolean })}
            />
            <Label htmlFor="droitsParDonateur">Prise en charge des droits par le donateur</Label>
          </div>

          {/* Réalisée par */}
          <div>
            <Label>Réalisée par</Label>
            <Select value={formData.realiseePar} onValueChange={(value) => setFormData({ ...formData, realiseePar: value })}>
              <SelectTrigger size="lg">
                <SelectValue placeholder="Sélectionnez qui a réalisé" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="epoux1">Époux 1</SelectItem>
                <SelectItem value="epoux2">Époux 2</SelectItem>
                <SelectItem value="communaute">Communauté</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div>
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.date ? format(formData.date, "PPP", { locale: fr }) : "Sélectionnez une date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.date}
                  onSelect={(date) => setFormData({ ...formData, date })}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Sélection des biens donnés */}
          <Card>
            <CardHeader>
              <CardTitle>Sélection des biens donnés</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-muted-foreground">Chargement des biens...</p>
              ) : assets.length === 0 ? (
                <p className="text-muted-foreground">Aucun bien disponible</p>
              ) : (
                <div className="space-y-4">
                  {assets.map((asset) => {
                    const isSelected = selectedAssets.find(a => a.id === asset.id);
                    return (
                      <div key={asset.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-start space-x-3">
                          <Checkbox
                            id={asset.id}
                            checked={!!isSelected}
                            onCheckedChange={() => handleAssetToggle(asset.id!, asset.valeur_estimee || 0)}
                          />
                          <div className="flex-1 space-y-2">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label className="text-sm font-medium text-muted-foreground">Dénomination</Label>
                                <p className="text-sm">{asset.denomination}</p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium text-muted-foreground">Nature</Label>
                                <p className="text-sm">{asset.nature}</p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium text-muted-foreground">Détenteur</Label>
                                <p className="text-sm">{asset.detenteur}</p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium text-muted-foreground">Valeur actuelle</Label>
                                <p className="text-sm">{asset.valeur_estimee?.toLocaleString('fr-FR')} €</p>
                              </div>
                            </div>
                            {isSelected && (
                              <div className="mt-3">
                                <Label htmlFor={`valeur-${asset.id}`} className="text-sm font-medium">
                                  Valeur au jour de la donation
                                </Label>
                                <Input
                                  id={`valeur-${asset.id}`}
                                  type="number"
                                  value={isSelected.valeurDonation}
                                  onChange={(e) => updateAssetDonationValue(asset.id!, Number(e.target.value))}
                                  placeholder="Valeur de donation"
                                  className="mt-1"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Donataires */}
          <Card>
            <CardHeader>
              <CardTitle>Donataires</CardTitle>
            </CardHeader>
            <CardContent>
              {familyMembers.length === 0 ? (
                <p className="text-muted-foreground">
                  Aucun lien familial renseigné. Ajoutez des membres de famille dans la section "Liens familiaux" pour les sélectionner comme donataires.
                </p>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground mb-4">
                    Sélectionnez les personnes qui recevront cette donation et indiquez le pourcentage reçu par chacune.
                  </p>
                  {familyMembers.map((member) => {
                    const isSelected = beneficiaries.find(b => b.id === member.id);
                    return (
                      <div key={member.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-start space-x-3">
                          <Checkbox
                            id={`beneficiary-${member.id}`}
                            checked={!!isSelected}
                            onCheckedChange={() => handleBeneficiaryToggle(member)}
                          />
                          <div className="flex-1">
                            <div className="grid grid-cols-3 gap-4 mb-3">
                              <div>
                                <Label className="text-sm font-medium text-muted-foreground">Nom</Label>
                                <p className="text-sm">{member.nom}</p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium text-muted-foreground">Prénom</Label>
                                <p className="text-sm">{member.prenom || 'Non renseigné'}</p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium text-muted-foreground">Lien de parenté</Label>
                                <p className="text-sm">{member.lien_familial}</p>
                              </div>
                            </div>
                            {isSelected && (
                              <div className="mt-3">
                                <Label htmlFor={`percentage-${member.id}`} className="text-sm font-medium">
                                  Pourcentage reçu (%)
                                </Label>
                                <Input
                                  id={`percentage-${member.id}`}
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.01"
                                  value={isSelected.pourcentage}
                                  onChange={(e) => updateBeneficiaryPercentage(member.id, Number(e.target.value))}
                                  placeholder="Ex: 50"
                                  className="mt-1 w-32"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {beneficiaries.length > 0 && (
                    <div className="mt-4 p-3 bg-muted rounded-lg">
                      <div className="text-sm">
                        <span className="font-medium">Total des pourcentages : </span>
                        <span className={`${
                          beneficiaries.reduce((sum, b) => sum + b.pourcentage, 0) === 100 
                            ? 'text-green-600' 
                            : 'text-orange-600'
                        } font-medium`}>
                          {beneficiaries.reduce((sum, b) => sum + b.pourcentage, 0).toFixed(2)}%
                        </span>
                      </div>
                      {beneficiaries.reduce((sum, b) => sum + b.pourcentage, 0) !== 100 && (
                        <p className="text-xs text-orange-600 mt-1">
                          Le total doit être égal à 100% pour une donation complète
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              Enregistrer
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};