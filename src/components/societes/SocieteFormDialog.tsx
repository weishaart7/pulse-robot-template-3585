import React, { useEffect, useState } from 'react';
import { SocieteForm } from '@/components/societes/SocieteForm';
import { societeService, type Societe } from '@/services/societeService';
import { useAssets } from '@/hooks/useAssets';
import { toast } from 'sonner';
import { Building2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface SocieteFormData {
  denomination: string;
  typeSociete: string;
  dateCreation: string;
  valeurEstimee: number;
  pourcentageIFI: number;
  capitalSocial: number;
  nombreTitres: number;
  nombreSalaries: number;
  jourCloture: string;
  moisCloture: string;
  siret: string;
  rueAdresse: string;
  codePostal: string;
  commune: string;
  pays: string;
  typeActivite: string;
  regimeFiscal: string;
  valeurIFI: number;
  activite?: string;
  holding?: string;
  formeSocieteCivile?: string;
  transfertVersActifs?: boolean;
  natureActif?: string;
}

interface SocieteFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  societeId?: string | null;
  onSuccess?: () => void;
}

export const SocieteFormDialog = ({ open, onOpenChange, societeId, onSuccess }: SocieteFormDialogProps) => {
  const [initialData, setInitialData] = useState<SocieteFormData | null>(null);
  const [loading, setLoading] = useState(false);
  const [societes, setSocietes] = useState<Societe[]>([]);
  const [selectedSocieteId, setSelectedSocieteId] = useState<string | null>(societeId || null);
  const { createAsset } = useAssets();

  useEffect(() => {
    if (open) {
      loadSocietes();
      if (selectedSocieteId) {
        loadSociete(selectedSocieteId);
      } else {
        setInitialData(null);
      }
    }
  }, [open, selectedSocieteId]);

  const loadSocietes = async () => {
    try {
      const data = await societeService.getAll();
      setSocietes(data);
    } catch (error) {
      console.error('Error loading societes:', error);
    }
  };

  const loadSociete = async (id: string) => {
    try {
      setLoading(true);
      const societe = await societeService.getById(id);
      setInitialData(societeToFormData(societe));
    } catch (error) {
      console.error('Error loading societe:', error);
      toast.error('Erreur lors du chargement de la société');
    } finally {
      setLoading(false);
    }
  };

  const societeToFormData = (societe: Societe): SocieteFormData => ({
    denomination: societe.denomination,
    typeSociete: societe.type_societe,
    dateCreation: societe.date_creation || '',
    valeurEstimee: societe.valeur_estimee || 0,
    pourcentageIFI: societe.pourcentage_ifi || 0,
    capitalSocial: societe.capital_social || 0,
    nombreTitres: societe.nombre_titres || 0,
    nombreSalaries: societe.nombre_salaries || 0,
    jourCloture: societe.jour_cloture || '',
    moisCloture: societe.mois_cloture || '',
    siret: societe.siret || '',
    rueAdresse: societe.rue_adresse || '',
    codePostal: societe.code_postal || '',
    commune: societe.commune || '',
    pays: societe.pays || 'France',
    typeActivite: societe.type_activite || '',
    regimeFiscal: societe.regime_fiscal || '',
    valeurIFI: societe.valeur_ifi || 0,
    activite: societe.activite,
    holding: societe.holding,
    formeSocieteCivile: societe.forme_societe_civile,
    transfertVersActifs: false,
    natureActif: ''
  });

  const formDataToSociete = (data: SocieteFormData) => ({
    denomination: data.denomination,
    type_societe: data.typeSociete,
    date_creation: data.dateCreation,
    valeur_estimee: data.valeurEstimee,
    pourcentage_ifi: data.pourcentageIFI,
    capital_social: data.capitalSocial,
    nombre_titres: data.nombreTitres,
    nombre_salaries: data.nombreSalaries,
    jour_cloture: data.jourCloture,
    mois_cloture: data.moisCloture,
    siret: data.siret,
    rue_adresse: data.rueAdresse,
    code_postal: data.codePostal,
    commune: data.commune,
    pays: data.pays,
    type_activite: data.typeActivite,
    regime_fiscal: data.regimeFiscal,
    valeur_ifi: data.valeurIFI,
    activite: data.activite,
    holding: data.holding,
    forme_societe_civile: data.formeSocieteCivile
  });

  const handleSubmit = async (data: Omit<SocieteFormData, 'id'>) => {
    try {
      const societeData = formDataToSociete(data);

      if (selectedSocieteId) {
        await societeService.update(selectedSocieteId, societeData);
        toast.success('Société mise à jour avec succès');
      } else {
        const newSociete = await societeService.create(societeData);
        toast.success('Société créée avec succès');

        if (data.transfertVersActifs && data.natureActif && newSociete) {
          try {
            await createAsset({
              nature: data.natureActif,
              valeur_estimee: data.valeurEstimee,
              denomination: `Parts sociales - ${data.denomination}`,
              date_estimation: data.dateCreation
            });
            toast.success('Actif créé avec succès');
          } catch (error) {
            console.error('Error creating asset:', error);
            toast.error('Erreur lors de la création de l\'actif');
          }
        }
      }

      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving societe:', error);
      toast.error('Erreur lors de l\'enregistrement de la société');
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[85vh] p-0 overflow-hidden">
        <div className="flex h-full">
          {/* Sidebar - 1/5 width */}
          <div className="w-1/5 bg-muted/50 p-4 rounded-l-lg overflow-y-auto">
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-semibold">Sociétés</span>
              </div>
              
              <Button
                variant={!selectedSocieteId ? "secondary" : "ghost"}
                size="sm"
                onClick={() => {
                  setSelectedSocieteId(null);
                  setInitialData(null);
                }}
                className="w-full justify-start"
              >
                <FileText className="h-4 w-4 mr-2" />
                Nouvelle société
              </Button>

              {societes.length > 0 && (
                <div className="pt-2 mt-2 space-y-1">
                  {societes.map((societe) => (
                    <Button
                      key={societe.id}
                      variant={selectedSocieteId === societe.id ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => setSelectedSocieteId(societe.id)}
                      className="w-full justify-start text-left"
                    >
                      <span className="truncate">{societe.denomination}</span>
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Main content - 4/5 width */}
          <div className="flex-1 flex flex-col rounded-r-lg overflow-hidden">
            <div className="px-6 py-4 bg-background">
              <h1 className="text-2xl font-bold">
                {selectedSocieteId ? 'Modifier la société' : 'Nouvelle société'}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedSocieteId ? 'Mettez à jour les informations de la société' : 'Créez une nouvelle société'}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-4 text-muted-foreground">Chargement...</p>
                  </div>
                </div>
              ) : (
                <SocieteForm 
                  initialData={initialData} 
                  onSubmit={handleSubmit}
                  onCancel={handleCancel}
                />
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
