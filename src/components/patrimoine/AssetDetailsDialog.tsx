import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Asset } from '@/services/assetService';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Calendar, TrendingUp, User, Building, Coins, Heart, Key, History, Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { NATURES_WITHOUT_ACQUISITION, getNatureDisplayLabel } from '@/constants/assetTypes';
import { useFamilyProfile, useMaritalStatus } from '@/hooks/useFamilyData';
import { useAssetValorisations } from '@/hooks/useAssetValorisations';
import { AssetValorisation } from '@/services/assetValorisationService';
import { format } from 'date-fns';

interface AssetDetailsDialogProps {
  asset: Asset | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AssetDetailsDialog = ({ asset, open, onOpenChange }: AssetDetailsDialogProps) => {
  const { data: familyProfile } = useFamilyProfile();
  const { data: maritalStatus } = useMaritalStatus();
  const { valorisations, createValorisation, updateValorisation, deleteValorisation } = useAssetValorisations(asset?.id);

  if (!asset) return null;

  const formatCurrency = (value: number | undefined | null) => {
    if (!value) return 'Non renseigné';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (date: string | undefined | null) => {
    if (!date) return 'Non renseigné';
    return new Date(date).toLocaleDateString('fr-FR');
  };

  const formatDetenteur = (detenteur: string | undefined) => {
    if (!detenteur) return familyProfile?.prenom || 'Utilisateur';
    
    switch (detenteur.toLowerCase()) {
      case 'user':
      case 'utilisateur':
        return familyProfile?.prenom || 'Utilisateur';
      case 'spouse':
      case 'conjoint':
        return maritalStatus?.prenom_conjoint || 'Conjoint';
      case 'common':
      case 'commun':
      case 'couple':
        return 'Commun';
      default:
        return detenteur;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {asset.denomination || getNatureDisplayLabel(asset.nature)}
          </DialogTitle>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="w-fit">
              {getNatureDisplayLabel(asset.nature)}
            </Badge>
            {asset.mode_detention && asset.mode_detention !== 'Pleine propriété' && (
              <Badge variant="secondary" className="w-fit">
                <Key className="h-3 w-3 mr-1" />
                {asset.mode_detention}
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Valeur et détenteur */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-2 mb-2">
                <Coins className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Valeur estimée</span>
              </div>
              <div className="text-2xl font-bold text-primary">
                {formatCurrency(asset.valeur_estimee)}
              </div>
            </div>

            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Détenteur</span>
              </div>
              <div className="text-lg font-semibold">
                {formatDetenteur(asset.detenteur)}
              </div>
            </div>
          </div>

          {(asset.sous_type_per || asset.cto_multi_actifs) && (
            <>
              <Separator />
              <div>
                <h3 className="text-lg font-semibold mb-3">Détails complémentaires</h3>
                <div className="grid grid-cols-2 gap-4">
                  {asset.sous_type_per && (
                    <div>
                      <span className="text-sm text-muted-foreground">Sous-type</span>
                      <p className="font-medium">{asset.sous_type_per}</p>
                    </div>
                  )}
                  {asset.cto_multi_actifs && asset.cto_nature_sous_jacent && (
                    <div>
                      <span className="text-sm text-muted-foreground">Nature réelle du sous-jacent principal</span>
                      <p className="font-medium">{asset.cto_nature_sous_jacent}</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Informations d'acquisition - masquées pour les actifs liquides */}
          {!NATURES_WITHOUT_ACQUISITION.includes(asset.nature) && (
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Acquisition
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-muted-foreground">Date d'acquisition</span>
                  <p className="font-medium">{formatDate(asset.date_acquisition)}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Valeur d'acquisition</span>
                  <p className="font-medium">{formatCurrency(asset.valeur_acquisition)}</p>
                </div>
                {asset.frais_acquisition && (
                  <div>
                    <span className="text-sm text-muted-foreground">Frais d'acquisition</span>
                    <p className="font-medium">{formatCurrency(asset.frais_acquisition)}</p>
                  </div>
                )}
                {asset.date_estimation && (
                  <div>
                    <span className="text-sm text-muted-foreground">Date d'estimation</span>
                    <p className="font-medium">{formatDate(asset.date_estimation)}</p>
                  </div>
                )}
              </div>
            </div>
          )}


          <Separator />

          {/* Historique de valorisation */}
          <ValorisationHistorySection
            assetId={asset.id!}
            valorisations={valorisations}
            onCreate={createValorisation}
            onUpdate={updateValorisation}
            onDelete={deleteValorisation}
          />

          {/* Établissement */}
          {asset.etablissement && (
            <>
              <Separator />
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Établissement
                </h3>
                <p className="font-medium">{asset.etablissement}</p>
              </div>
            </>
          )}

          {/* Propriété */}
          {(asset.detenteur === 'common' || asset.detenteur === 'commun' || asset.detenteur === 'couple') && (asset.pourcentage_utilisateur || asset.pourcentage_conjoint || asset.mode_detention) && (
            <>
              <Separator />
              <div>
                <h3 className="text-lg font-semibold mb-3">Détails de propriété</h3>
                <div className="grid grid-cols-2 gap-4">
                  {asset.mode_detention && (
                    <div>
                      <span className="text-sm text-muted-foreground">Mode de détention</span>
                      <p className="font-medium">{asset.mode_detention}</p>
                    </div>
                  )}
                  {asset.pourcentage_utilisateur && (
                    <div>
                      <span className="text-sm text-muted-foreground">Part utilisateur</span>
                      <p className="font-medium">{asset.pourcentage_utilisateur}%</p>
                    </div>
                  )}
                  {asset.pourcentage_conjoint && (
                    <div>
                      <span className="text-sm text-muted-foreground">Part conjoint</span>
                      <p className="font-medium">{asset.pourcentage_conjoint}%</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Attachement émotionnel */}
          {asset.attachement_emotionnel && (
            <>
              <Separator />
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Heart className="h-5 w-5" />
                  Attachement émotionnel
                </h3>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${asset.attachement_emotionnel}%` }}
                    />
                  </div>
                  <span className="font-medium">{asset.attachement_emotionnel}/10</span>
                </div>
              </div>
            </>
          )}

          {/* Origine et situations */}
          {(asset.origine_actif?.length || asset.situation_particuliere?.length) && (
            <>
              <Separator />
              <div className="space-y-3">
                {asset.origine_actif && asset.origine_actif.length > 0 && (
                  <div>
                    <span className="text-sm text-muted-foreground">Origine de l'actif</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {asset.origine_actif.map((origine, index) => (
                        <Badge key={index} variant="secondary">{origine}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {asset.situation_particuliere && asset.situation_particuliere.length > 0 && (
                  <div>
                    <span className="text-sm text-muted-foreground">Situations particulières</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {asset.situation_particuliere.map((situation, index) => (
                        <Badge key={index} variant="outline">{situation}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface ValorisationHistorySectionProps {
  assetId: string;
  valorisations: AssetValorisation[];
  onCreate: (valorisation: Omit<AssetValorisation, 'id' | 'user_id' | 'created_at'>) => Promise<any>;
  onUpdate: (id: string, valorisation: Partial<Omit<AssetValorisation, 'id' | 'user_id' | 'created_at'>>) => Promise<any>;
  onDelete: (id: string) => Promise<void>;
}

const ValorisationHistorySection = ({ assetId, valorisations, onCreate, onUpdate, onDelete }: ValorisationHistorySectionProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newDate, setNewDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [newValeur, setNewValeur] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editValeur, setEditValeur] = useState('');

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

  const handleAdd = async () => {
    const valeur = parseFloat(newValeur.replace(',', '.'));
    if (!newDate || isNaN(valeur)) return;
    await onCreate({ asset_id: assetId, date_valorisation: newDate, valeur });
    setNewDate(format(new Date(), 'yyyy-MM-dd'));
    setNewValeur('');
    setIsAdding(false);
  };

  const startEdit = (v: AssetValorisation) => {
    setEditingId(v.id!);
    setEditDate(v.date_valorisation);
    setEditValeur(String(v.valeur));
  };

  const handleUpdate = async (id: string) => {
    const valeur = parseFloat(editValeur.replace(',', '.'));
    if (!editDate || isNaN(valeur)) return;
    await onUpdate(id, { date_valorisation: editDate, valeur });
    setEditingId(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <History className="h-5 w-5" />
          Historique de valorisation
        </h3>
        <Button type="button" variant="outline" size="sm" onClick={() => setIsAdding(prev => !prev)}>
          <Plus className="h-4 w-4 mr-1" />
          Ajouter
        </Button>
      </div>

      {isAdding && (
        <div className="flex items-end gap-2 mb-3 p-3 rounded-lg border bg-muted/30">
          <div className="flex-1">
            <span className="text-xs text-muted-foreground">Date</span>
            <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
          </div>
          <div className="flex-1">
            <span className="text-xs text-muted-foreground">Valeur (€)</span>
            <Input type="text" placeholder="0" value={newValeur} onChange={(e) => setNewValeur(e.target.value)} />
          </div>
          <Button type="button" size="icon" variant="ghost" onClick={handleAdd}>
            <Check className="h-4 w-4" />
          </Button>
          <Button type="button" size="icon" variant="ghost" onClick={() => setIsAdding(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {valorisations.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">Aucune valorisation enregistrée</p>
      ) : (
        <div className="space-y-1">
          {valorisations.map((v) => (
            <div key={v.id} className="flex items-center justify-between py-2 px-3 bg-muted/30 rounded-lg text-sm">
              {editingId === v.id ? (
                <>
                  <div className="flex items-center gap-2 flex-1">
                    <Input type="date" className="h-8 w-40" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
                    <Input type="text" className="h-8 w-32" value={editValeur} onChange={(e) => setEditValeur(e.target.value)} />
                  </div>
                  <div className="flex items-center gap-1">
                    <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleUpdate(v.id!)}>
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                    <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">{format(new Date(v.date_valorisation), 'dd/MM/yyyy')}</span>
                    <span className="font-medium">{formatCurrency(v.valeur)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => startEdit(v)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => onDelete(v.id!)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
