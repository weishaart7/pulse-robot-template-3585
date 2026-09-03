import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Calculator, PieChart, TrendingUp } from 'lucide-react';
import { THEME_INK } from '@/lib/theme';
import FiscalDeclarationsCard from './components/FiscalDeclarationsCard';
import FiscalOverviewCard from './components/FiscalOverviewCard';
import TaxRateCard from './components/TaxRateCard';
import { MenageForm } from '@/components/fiscalite/MenageForm';
import { SyntheseFoyerFiscal } from '@/components/fiscalite/SyntheseFoyerFiscal';
import { FoyerFiscalInput } from '@/lib/fiscalite';

const FOYER_INITIAL: FoyerFiscalInput = {
  situationFamille: 'celibataire',
  lieuResidence: 'metropole',
  enfantsCharge: [],
  personnesInvalidesCharge: [],
  enfantsMajeursRattaches: 0,
  parentIsole: false,
  ancienParentIsole: false,
  invaliditeDeclarant1: false,
  invaliditeDeclarant2: false,
  ancienCombattantDeclarant1: false,
  ancienCombattantDeclarant2: false,
  veufAncienCombattant: false,
  veuveDeGuerre: false,
};

const FiscaliteSection = () => {
  const [foyerDraft, setFoyerDraft] = useState<FoyerFiscalInput>(FOYER_INITIAL);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div>
          <h1 className="text-[34px] font-bold" style={{ color: THEME_INK, letterSpacing: '-0.02em' }}>Fiscalité</h1>
        </div>
      </div>

      {/* Foyer fiscal — état civil / nombre de parts (déclaration 2042) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <MenageForm onChange={setFoyerDraft} />
        </div>
        <div className="lg:col-span-1">
          <SyntheseFoyerFiscal foyer={foyerDraft} />
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Fiscal declarations */}
        <div className="lg:col-span-1">
          <FiscalDeclarationsCard />
        </div>

        {/* Right columns - Overview and details */}
        <div className="lg:col-span-2 space-y-6">
          <FiscalOverviewCard />
          <TaxRateCard />
        </div>
      </div>
    </div>
  );
};

export default FiscaliteSection;