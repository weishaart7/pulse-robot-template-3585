import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Asset } from '@/services/assetService';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar, TrendingUp, User, Building, Coins, Heart, Key } from 'lucide-react';
import { NATURES_WITHOUT_ACQUISITION } from '@/constants/assetTypes';
import { useFamilyProfile, useMaritalStatus } from '@/hooks/useFamilyData';

interface AssetDetailsDialogProps {
  asset: Asset | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AssetDetailsDialog = ({ asset, open, onOpenChange }: AssetDetailsDialogProps) => {
  const { data: familyProfile } = useFamilyProfile();
  const { data: maritalStatus } = useMaritalStatus();

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
            {asset.denomination || asset.nature}
          </DialogTitle>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="w-fit">
              {asset.nature}
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

          {/* Revalorisation */}
          {asset.revalorisation_annuelle && (
            <>
              <Separator />
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Performance
                </h3>
                <div>
                  <span className="text-sm text-muted-foreground">Revalorisation annuelle</span>
                  <p className="font-medium">{asset.revalorisation_annuelle}%</p>
                </div>
              </div>
            </>
          )}

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
