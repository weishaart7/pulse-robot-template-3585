import React from 'react';
import { SocieteFinancesComptables } from './SocieteFinancesComptables';
import { SocieteFinancesValorisation } from './SocieteFinancesValorisation';
import { SocieteFinancesDividendes } from './SocieteFinancesDividendes';
import { SocieteFinancesEmprunts } from './SocieteFinancesEmprunts';
import { SocieteFinancesImpactFiscal } from './SocieteFinancesImpactFiscal';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';

interface SocieteFormData {
  denomination: string;
  type_societe: string;
  siret?: string;
  date_creation?: string;
  rue_adresse?: string;
  code_postal?: string;
  commune?: string;
  pays?: string;
  regime_fiscal?: string;
  activite?: string;
  holding?: string;
  forme_societe_civile?: string;
  jour_cloture?: string;
  mois_cloture?: string;
  capital_social?: number;
  nombre_titres?: number;
  nombre_salaries?: number;
  valeur_estimee?: number;
  pourcentage_ifi?: number;
  valeur_ifi?: number;
  pourcentage_utilisateur?: number;
  pourcentage_conjoint?: number;
  // New financial fields
  chiffre_affaires?: number;
  resultat_net?: number;
  tresorerie_disponible?: number;
  compte_courant_associes?: number;
  reserves?: number;
  date_dernier_bilan?: string;
}

interface SocieteFinancesProps {
  societeId: string | null;
  formData: SocieteFormData;
  onFormDataChange: (data: SocieteFormData) => void;
  onSave?: () => void;
  isSaving?: boolean;
}

export const SocieteFinances: React.FC<SocieteFinancesProps> = ({
  societeId,
  formData,
  onFormDataChange,
  onSave,
  isSaving = false,
}) => {
  const handleFieldChange = (field: keyof SocieteFormData, value: any) => {
    onFormDataChange({
      ...formData,
      [field]: value,
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-280px)]">
      <ScrollArea className="flex-1">
        <div className="space-y-6 pr-4">
          <SocieteFinancesComptables
            formData={formData}
            onFieldChange={handleFieldChange}
          />

          <SocieteFinancesValorisation
            societeId={societeId}
            valeurEstimee={formData.valeur_estimee}
            nombreTitres={formData.nombre_titres}
          />

          <SocieteFinancesDividendes
            societeId={societeId}
            valeurEstimee={formData.valeur_estimee}
          />

          <SocieteFinancesEmprunts
            societeId={societeId}
          />

          <SocieteFinancesImpactFiscal
            formData={formData}
          />
        </div>
      </ScrollArea>

      {onSave && (
        <div className="pt-4 border-t mt-4">
          <Button onClick={onSave} disabled={isSaving} className="w-full sm:w-auto">
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Enregistrement...' : 'Enregistrer les modifications'}
          </Button>
        </div>
      )}
    </div>
  );
};
