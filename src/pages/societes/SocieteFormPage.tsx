import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SocieteForm } from '@/components/societes/SocieteForm';
import { societeService, type Societe } from '@/services/societeService';
import { useAssets } from '@/hooks/useAssets';
import { toast } from 'sonner';
import { ArrowLeft, ChevronRight, ChevronLeft, Building2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SidebarProvider, Sidebar, SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarGroupContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

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

export const SocieteFormPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const societeId = searchParams.get('id');
  const [initialData, setInitialData] = useState<SocieteFormData | null>(null);
  const [loading, setLoading] = useState(false);
  const [societes, setSocietes] = useState<Societe[]>([]);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
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

  const checkScrollButtons = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  useEffect(() => {
    checkScrollButtons();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScrollButtons);
      window.addEventListener('resize', checkScrollButtons);
      return () => {
        container.removeEventListener('scroll', checkScrollButtons);
        window.removeEventListener('resize', checkScrollButtons);
      };
    }
  }, [societes]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 200;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
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
    pays: societe.pays || '',
    typeActivite: societe.type_activite || '',
    regimeFiscal: societe.regime_fiscal || '',
    valeurIFI: societe.valeur_ifi || 0,
    activite: societe.activite,
    holding: societe.holding,
    formeSocieteCivile: societe.forme_societe_civile,
    transfertVersActifs: true
  });

  const formDataToSociete = (formData: SocieteFormData) => ({
    denomination: formData.denomination,
    type_societe: formData.typeSociete,
    date_creation: formData.dateCreation || undefined,
    valeur_estimee: formData.valeurEstimee || undefined,
    pourcentage_ifi: formData.pourcentageIFI || undefined,
    capital_social: formData.capitalSocial || undefined,
    nombre_titres: formData.nombreTitres || undefined,
    nombre_salaries: formData.nombreSalaries || undefined,
    jour_cloture: formData.jourCloture || undefined,
    mois_cloture: formData.moisCloture || undefined,
    siret: formData.siret || undefined,
    rue_adresse: formData.rueAdresse || undefined,
    code_postal: formData.codePostal || undefined,
    commune: formData.commune || undefined,
    pays: formData.pays || undefined,
    type_activite: formData.typeActivite || undefined,
    regime_fiscal: formData.regimeFiscal || undefined,
    valeur_ifi: formData.valeurIFI || undefined,
    activite: formData.activite || undefined,
    holding: formData.holding || undefined,
    forme_societe_civile: formData.formeSocieteCivile || undefined
  });

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        {/* Sidebar */}
        <Sidebar className="border-r">
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Navigation</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton className="bg-muted">
                      <FileText className="h-4 w-4" />
                      <span>Informations générales</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Top Banner with Companies List */}
          <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center gap-2 px-4 h-14">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                className="shrink-0"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              
              {societes.length > 0 && (
                <>
                  <div className="h-8 w-px bg-border" />
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => scroll('left')}
                    disabled={!canScrollLeft}
                    className="shrink-0 h-8 w-8 p-0"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>

                  <div 
                    ref={scrollContainerRef}
                    className="flex-1 overflow-x-auto scrollbar-hide"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                  >
                    <div className="flex gap-2 items-center">
                      {societes.map((societe) => (
                        <button
                          key={societe.id}
                          onClick={() => navigate(`/societes/form?id=${societe.id}`)}
                          className={cn(
                            "shrink-0 px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-2",
                            societeId === societe.id
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <Building2 className="h-3.5 w-3.5" />
                          {societe.denomination}
                        </button>
                      ))}
                      <button
                        onClick={() => navigate('/societes/form')}
                        className={cn(
                          "shrink-0 px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
                          !societeId
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground"
                        )}
                      >
                        + Nouvelle société
                      </button>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => scroll('right')}
                    disabled={!canScrollRight}
                    className="shrink-0 h-8 w-8 p-0"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Form Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto">
              <h1 className="text-2xl font-bold mb-6">
                {societeId ? 'Modifier la société' : 'Ajouter une société'}
              </h1>
              
              <div className="bg-background rounded-lg p-6 border">
                <SocieteForm
                  onSubmit={handleSubmit}
                  onCancel={handleCancel}
                  initialData={initialData}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
};
