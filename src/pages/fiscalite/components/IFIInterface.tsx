import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import IFISidebar from './ifi/IFISidebar';
import HypothesesSection from './ifi/HypothesesSection';
import SituationsParticulieresSection from './ifi/SituationsParticulieresSection';
import ImmeublesBatisSection from './ifi/ImmeublesBatisSection';
import ImmeublesNonBatisSection from './ifi/ImmeublesNonBatisSection';
import BiensDetenusIndirectementSection from './ifi/BiensDetenusIndirectementSection';

interface IFIInterfaceProps {
  onClose: () => void;
}

const IFIInterface = ({ onClose }: IFIInterfaceProps) => {
  const [activeSection, setActiveSection] = useState('hypotheses');

  const renderContent = () => {
    switch (activeSection) {
      case 'hypotheses':
        return <HypothesesSection />;
      case 'situations-particulieres':
        return <SituationsParticulieresSection />;
      case 'immeubles-batis':
        return <ImmeublesBatisSection />;
      case 'immeubles-non-batis':
        return <ImmeublesNonBatisSection />;
      case 'biens-detenus-indirectement':
        return <BiensDetenusIndirectementSection />;
      default:
        return <HypothesesSection />;
    }
  };

  return (
    <div className="fixed inset-0 bg-background z-50 flex">
      {/* Sidebar */}
      <IFISidebar 
        activeSection={activeSection} 
        onSectionChange={setActiveSection} 
      />
      
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={onClose} size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
            <h1 className="text-2xl font-bold">2042-IFI - Impôt sur la Fortune Immobilière</h1>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <Card>
            <CardContent className="p-6">
              {renderContent()}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default IFIInterface;