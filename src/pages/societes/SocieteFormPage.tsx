import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SocieteForm } from '@/components/societes/SocieteForm';
import { societeService, type Societe } from '@/services/societeService';
import { useAssets } from '@/hooks/useAssets';
import { toast } from 'sonner';
import { ArrowLeft, Building2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type SocieteFormData, societeToFormData, formDataToSociete } from '@/lib/societes/formMapping';

export const SocieteFormPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const societeId = searchParams.get('id');
  const [initialData, setInitialData] = useState<SocieteFormData | null>(null);
  const [loading, setLoading] = useState(false);
  const [societes, setSocietes] = useState<Societe[]>([]);
  const { createAsset } = useAssets();

  useEffect(() => {
    loadSocietes();
    if (societeId) {
      loadSociete(societeId);
    } else {
      setInitialData(null);
    }
  }, [societeId]);

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
      navigate('/dashboard/societes');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data: SocieteFormData) => {
    try {
      const societeData = formDataToSociete(data);
      
      if (societeId) {
        await societeService.update(societeId, societeData);
        toast.success('Société modifiée avec succès');
      } else {
        const savedSociete = await societeService.create(societeData);
        toast.success('Société ajoutée avec succès');

        // Create asset if transfertVersActifs is checked
        if (data.transfertVersActifs && data.natureActif) {
          try {
            await createAsset({
              nature: data.natureActif,
              denomination: data.denomination,
              valeur_estimee: data.valeurEstimee || 0,
              date_estimation: new Date().toISOString().split('T')[0],
              detenteur: 'user',
              mode_detention: 'Pleine propriété'
            });
            toast.success('Actif créé avec succès');
          } catch (assetError) {
            console.error('Error creating asset:', assetError);
            toast.error('Société créée mais erreur lors de la création de l\'actif');
          }
        }
      }
      
      navigate('/dashboard/societes');
    } catch (error) {
      console.error('Error saving societe:', error);
      toast.error('Erreur lors de la sauvegarde de la société');
    }
  };

  const handleCancel = () => {
    navigate('/dashboard/societes');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-8">
      <div className="container mx-auto">
        {/* Main content with sidebar */}
        <div className="bg-card rounded-lg shadow-lg overflow-hidden">
          <div className="flex h-[85vh]">
            {/* Sidebar - 1/5 width */}
            <div className="w-1/5 bg-muted/50 p-4 rounded-l-lg overflow-y-auto">
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm font-semibold">Sociétés</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleCancel}
                    className="h-8 w-8"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </div>
                
                <Button
                  variant={!societeId ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => navigate('/societes/form')}
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
                        variant={societeId === societe.id ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => navigate(`/societes/form?id=${societe.id}`)}
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
                  {societeId ? 'Modifier la société' : 'Nouvelle société'}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {societeId ? 'Mettez à jour les informations de la société' : 'Créez une nouvelle société'}
                </p>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-4">
                <SocieteForm 
                  initialData={initialData} 
                  onSubmit={handleSubmit}
                  onCancel={handleCancel}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
