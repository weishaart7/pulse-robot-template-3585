import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Calculator, PieChart, TrendingUp } from 'lucide-react';
import { THEME_INK } from '@/lib/theme';
import FiscalDeclarationsCard from './components/FiscalDeclarationsCard';
import FiscalOverviewCard from './components/FiscalOverviewCard';
import TaxRateCard from './components/TaxRateCard';

const FiscaliteSection = () => {
  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div>
          <h1 className="text-[34px] font-bold" style={{ color: THEME_INK, letterSpacing: '-0.02em' }}>Fiscalité</h1>
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