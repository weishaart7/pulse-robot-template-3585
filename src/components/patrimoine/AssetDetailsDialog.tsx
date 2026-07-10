import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Asset } from '@/services/assetService';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Calendar, TrendingUp, User, Building, Coins, Heart, Key, History, Plus, Pencil, Trash2, Check, X, Banknote, FileText, Scale, Link2 } from 'lucide-react';
import { NATURES_WITHOUT_ACQUISITION, getNatureDisplayLabel } from '@/constants/assetTypes';
import { useFamilyProfile, useMaritalStatus, useFamilyLinks } from '@/hooks/useFamilyData';
import { useAssetValorisations } from '@/hooks/useAssetValorisations';
import { AssetValorisation } from '@/services/assetValorisationService';
import { useAssetRevenus } from '@/hooks/useAssetRevenus';
import { AssetRevenu } from '@/services/assetService';
import { qualifierBien } from '@/lib/patrimoine/qualification';
import { assetDemembrementService, AssetDemembrement } from '@/services/assetDemembrementService';
import { computeAge, getTrancheBaremeForYoungest } from '@/lib/patrimoine/bareme669CGI';
import { passifService, Emprunt } from '@/services/passifService';
import { format } from 'date-fns';

const NATURE_DROITS_A_ROYALTIES = 'Droits à royalties';

interface AssetDetailsDialogProps {
  asset: Asset | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AssetDetailsDialog = ({ asset, open, onOpenChange }: AssetDetailsDialogProps) => {
  const { data: familyProfile } = useFamilyProfile();
  const { data: maritalStatus } = useMaritalStatus();
  const { data: familyLinks } = useFamilyLinks();
  const { valorisations, createValorisation, updateValorisation, deleteValorisation } = useAssetValorisations(asset?.id);
  const { revenus, createRevenu, updateRevenu, deleteRevenu } = useAssetRevenus(asset?.id);
  const [demembrements, setDemembrements] = useState<AssetDemembrement[]>([]);
  const [empruntsLies, setEmpruntsLies] = useState<Emprunt[]>([]);

  useEffect(() => {
    if (asset?.id) {
      assetDemembrementService.getByAsset(asset.id)
        .then(setDemembrements)
        .catch(() => setDemembrements([]));
      passifService.getEmpruntsByAssetId(asset.id)
        .then(setEmpruntsLies)
        .catch(() => setEmpruntsLies([]));
    } else {
      setDemembrements([]);
      setEmpruntsLies([]);
    }
  }, [asset?.id]);

  if (!asset) return null;

  const isDemembre = asset.mode_detention === 'Usufruit' || asset.mode_detention === 'Nue-propriété';
  const demembrementCounterpartRole = asset.mode_detention === 'Usufruit' ? 'Nu-propriétaire' : 'Usufruitier';
  const clientIsUsufruitier = asset.mode_detention === 'Usufruit';
  const clientAgesForDemembrement: number[] = [];
  if (isDemembre) {
    const detenteurLower = (asset.detenteur || '').toLowerCase();
    if (detenteurLower === 'user' || detenteurLower === 'utilisateur' || !asset.detenteur) {
      const age = computeAge(familyProfile?.date_naissance);
      if (age !== null) clientAgesForDemembrement.push(age);
    } else if (detenteurLower === 'spouse' || detenteurLower === 'conjoint') {
      const age = computeAge(maritalStatus?.date_naissance_conjoint);
      if (age !== null) clientAgesForDemembrement.push(age);
    } else if (detenteurLower === 'common' || detenteurLower === 'commun' || detenteurLower === 'couple') {
      const ageUser = computeAge(familyProfile?.date_naissance);
      const ageSpouse = computeAge(maritalStatus?.date_naissance_conjoint);
      if (ageUser !== null) clientAgesForDemembrement.push(ageUser);
      if (ageSpouse !== null) clientAgesForDemembrement.push(ageSpouse);
    }
  }
  const counterpartAgesForDemembrement: number[] = isDemembre
    ? demembrements
        .map((d) => d.type_partie === 'tiers'
          ? computeAge(d.date_naissance_tiers)
          : computeAge(familyLinks.find((m) => m.id === d.family_link_id)?.date_naissance))
        .filter((a): a is number => a !== null)
    : [];
  const usufruitierAgesForDemembrement = clientIsUsufruitier ? clientAgesForDemembrement : counterpartAgesForDemembrement;
  const trancheBareme669 = isDemembre ? getTrancheBaremeForYoungest(usufruitierAgesForDemembrement) : null;

  // Qualification bien propre/commun : recalculée à la volée (pas persistée)
  // pour rester cohérente si le régime matrimonial change après coup.
  const qualificationAuto = asset.qualification_auto !== false;
  const qualificationResult = qualifierBien({
    statutCouple: maritalStatus?.statut_couple,
    regimeMatrimonial: maritalStatus?.regime_matrimonial,
    dateMariage: maritalStatus?.date_mariage,
    conventionPacs: maritalStatus?.convention_pacs,
    dateAcquisition: asset.date_acquisition,
    origineActif: asset.origine_actif,
    modeDetention: asset.mode_detention,
    detenteur: asset.detenteur,
    clauseEntreeCommunaute: asset.clause_entree_communaute,
    clauseRemploi: asset.clause_remploi,
  });
  const displayedQualification = qualificationAuto
    ? qualificationResult.qualification
    : (asset.qualification_bien || qualificationResult.qualification);
  const displayedQualificationRaison = qualificationAuto
    ? qualificationResult.raison
    : 'Qualification définie manuellement.';

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

          <div className="p-4 rounded-lg border bg-card">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Qualification du bien</span>
            </div>
            <Badge variant="outline" className="w-fit">{displayedQualification}</Badge>
            <p className="text-xs text-muted-foreground italic mt-2">{displayedQualificationRaison}</p>
          </div>

          {empruntsLies.length > 0 && (
            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-2 mb-2">
                <Link2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Financé par</span>
              </div>
              <div className="space-y-1">
                {empruntsLies.map((e) => (
                  <p key={e.id} className="font-medium">{e.libelle} <span className="text-sm text-muted-foreground font-normal">({e.nature})</span></p>
                ))}
              </div>
            </div>
          )}

          {isDemembre && (
            <>
              <Separator />
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Scale className="h-5 w-5" />
                  Démembrement de propriété
                </h3>
                <div className="p-4 rounded-lg border bg-card mb-3">
                  {trancheBareme669 ? (
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <span className="text-sm text-muted-foreground">Valeur pleine propriété</span>
                        <p className="font-medium">{formatCurrency(asset.valeur_estimee)}</p>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">Valeur usufruit ({(trancheBareme669.usufruit * 100).toFixed(0)}%)</span>
                        <p className="font-medium">{formatCurrency((asset.valeur_estimee || 0) * trancheBareme669.usufruit)}</p>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">Valeur nue-propriété ({(trancheBareme669.nuePropriete * 100).toFixed(0)}%)</span>
                        <p className="font-medium">{formatCurrency((asset.valeur_estimee || 0) * trancheBareme669.nuePropriete)}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Valeur démembrée non calculable : âge de l'usufruitier non renseigné.
                    </p>
                  )}
                </div>
                {demembrements.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-sm text-muted-foreground">{demembrementCounterpartRole}(s) — contrepartie</span>
                    {demembrements.map((d) => {
                      const label = d.type_partie === 'tiers'
                        ? (d.nom_libre || 'Tiers')
                        : (() => {
                            const m = familyLinks.find((fl) => fl.id === d.family_link_id);
                            return m ? (m.prenom ? `${m.prenom} ${m.nom}` : m.nom) : 'Membre de la famille';
                          })();
                      return (
                        <p key={d.id} className="text-sm font-medium">{label}</p>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

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

          {/* Revenus associés - uniquement pour les droits à royalties */}
          {asset.nature === NATURE_DROITS_A_ROYALTIES && (
            <>
              <Separator />
              <RevenusAssociesSection
                assetId={asset.id!}
                revenus={revenus}
                onCreate={createRevenu}
                onUpdate={updateRevenu}
                onDelete={deleteRevenu}
              />
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

interface RevenuDraft {
  nature: string;
  montant: string;
  periodicite: AssetRevenu['periodicite'];
  date_debut: string;
  date_fin: string;
  commentaire: string;
  impact_budget: boolean;
}

const emptyRevenuDraft = (): RevenuDraft => ({
  nature: '',
  montant: '',
  periodicite: 'Mensuelle',
  date_debut: format(new Date(), 'yyyy-MM-dd'),
  date_fin: '',
  commentaire: '',
  impact_budget: false,
});

const PERIODICITE_REVENU_OPTIONS: AssetRevenu['periodicite'][] = ['Mensuelle', 'Trimestrielle', 'Annuelle'];

interface RevenusAssocieesSectionProps {
  assetId: string;
  revenus: AssetRevenu[];
  onCreate: (revenu: Omit<AssetRevenu, 'id' | 'created_at' | 'updated_at'>) => Promise<any>;
  onUpdate: (id: string, revenu: Partial<AssetRevenu>) => Promise<any>;
  onDelete: (id: string) => Promise<void>;
}

const RevenusAssociesSection = ({ assetId, revenus, onCreate, onUpdate, onDelete }: RevenusAssocieesSectionProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const [draft, setDraft] = useState<RevenuDraft>(emptyRevenuDraft());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<RevenuDraft>(emptyRevenuDraft());

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

  const handleAdd = async () => {
    const montant = parseFloat(draft.montant.replace(',', '.'));
    if (!draft.nature || !draft.date_debut || isNaN(montant)) return;
    await onCreate({
      asset_id: assetId,
      nature: draft.nature,
      montant,
      periodicite: draft.periodicite,
      date_debut: draft.date_debut,
      date_fin: draft.date_fin || undefined,
      commentaire: draft.commentaire || undefined,
      impact_budget: draft.impact_budget,
    });
    setDraft(emptyRevenuDraft());
    setIsAdding(false);
  };

  const startEdit = (r: AssetRevenu) => {
    setEditingId(r.id!);
    setEditDraft({
      nature: r.nature,
      montant: String(r.montant),
      periodicite: r.periodicite,
      date_debut: r.date_debut,
      date_fin: r.date_fin || '',
      commentaire: r.commentaire || '',
      impact_budget: r.impact_budget || false,
    });
  };

  const handleUpdate = async (id: string) => {
    const montant = parseFloat(editDraft.montant.replace(',', '.'));
    if (!editDraft.nature || !editDraft.date_debut || isNaN(montant)) return;
    await onUpdate(id, {
      nature: editDraft.nature,
      montant,
      periodicite: editDraft.periodicite,
      date_debut: editDraft.date_debut,
      date_fin: editDraft.date_fin || undefined,
      commentaire: editDraft.commentaire || undefined,
      impact_budget: editDraft.impact_budget,
    });
    setEditingId(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Banknote className="h-5 w-5" />
          Revenus associés
        </h3>
        <Button type="button" variant="outline" size="sm" onClick={() => setIsAdding(prev => !prev)}>
          <Plus className="h-4 w-4 mr-1" />
          Ajouter
        </Button>
      </div>

      {isAdding && (
        <div className="space-y-3 mb-3 p-3 rounded-lg border bg-muted/30">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-xs text-muted-foreground">Nature du revenu</span>
              <Input placeholder="Ex. Royalties musique" value={draft.nature} onChange={(e) => setDraft({ ...draft, nature: e.target.value })} />
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Montant (€)</span>
              <Input type="text" placeholder="0" value={draft.montant} onChange={(e) => setDraft({ ...draft, montant: e.target.value })} />
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Périodicité</span>
              <Select value={draft.periodicite} onValueChange={(v) => setDraft({ ...draft, periodicite: v as AssetRevenu['periodicite'] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PERIODICITE_REVENU_OPTIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Date de début</span>
              <Input type="date" value={draft.date_debut} onChange={(e) => setDraft({ ...draft, date_debut: e.target.value })} />
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Date de fin (optionnelle)</span>
              <Input type="date" value={draft.date_fin} onChange={(e) => setDraft({ ...draft, date_fin: e.target.value })} />
            </div>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Commentaire</span>
            <Textarea value={draft.commentaire} onChange={(e) => setDraft({ ...draft, commentaire: e.target.value })} />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox checked={draft.impact_budget} onCheckedChange={(checked) => setDraft({ ...draft, impact_budget: checked === true })} />
            <span className="text-sm">Impact sur le budget</span>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => { setIsAdding(false); setDraft(emptyRevenuDraft()); }}>Annuler</Button>
            <Button type="button" size="sm" onClick={handleAdd}>Enregistrer</Button>
          </div>
        </div>
      )}

      {revenus.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">Aucun revenu associé</p>
      ) : (
        <div className="space-y-1">
          {revenus.map((r) => (
            <div key={r.id} className="py-2 px-3 bg-muted/30 rounded-lg text-sm">
              {editingId === r.id ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <Input value={editDraft.nature} onChange={(e) => setEditDraft({ ...editDraft, nature: e.target.value })} />
                    <Input type="text" value={editDraft.montant} onChange={(e) => setEditDraft({ ...editDraft, montant: e.target.value })} />
                    <Select value={editDraft.periodicite} onValueChange={(v) => setEditDraft({ ...editDraft, periodicite: v as AssetRevenu['periodicite'] })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PERIODICITE_REVENU_OPTIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input type="date" value={editDraft.date_debut} onChange={(e) => setEditDraft({ ...editDraft, date_debut: e.target.value })} />
                    <Input type="date" value={editDraft.date_fin} onChange={(e) => setEditDraft({ ...editDraft, date_fin: e.target.value })} />
                  </div>
                  <Textarea value={editDraft.commentaire} onChange={(e) => setEditDraft({ ...editDraft, commentaire: e.target.value })} />
                  <div className="flex items-center gap-2">
                    <Checkbox checked={editDraft.impact_budget} onCheckedChange={(checked) => setEditDraft({ ...editDraft, impact_budget: checked === true })} />
                    <span className="text-sm">Impact sur le budget</span>
                  </div>
                  <div className="flex justify-end gap-1">
                    <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleUpdate(r.id!)}>
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                    <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {r.nature} — {formatCurrency(r.montant)}{' '}
                      <span className="text-muted-foreground font-normal">({r.periodicite})</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Du {format(new Date(r.date_debut), 'dd/MM/yyyy')}
                      {r.date_fin ? ` au ${format(new Date(r.date_fin), 'dd/MM/yyyy')}` : ''}
                      {r.impact_budget ? ' · Impact budget' : ''}
                    </p>
                    {r.commentaire && <p className="text-xs text-muted-foreground/80 mt-0.5">{r.commentaire}</p>}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => startEdit(r)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => onDelete(r.id!)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
