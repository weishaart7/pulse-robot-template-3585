import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
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

  const sections = [
    'hypotheses',
    'situations-particulieres', 
    'immeubles-batis',
    'immeubles-non-batis',
    'biens-detenus-indirectement'
  ];

  const currentIndex = sections.indexOf(activeSection);
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === sections.length - 1;

  const handlePrevious = () => {
    if (!isFirst) {
      setActiveSection(sections[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    if (!isLast) {
      setActiveSection(sections[currentIndex + 1]);
    }
  };

  const handleSave = () => {
    // TODO: Logique de sauvegarde
    onClose();
  };

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
              
              {/* Navigation buttons */}
              <Separator className="my-6" />
              <div className="flex justify-between items-center">
                <Button variant="outline" onClick={onClose}>
                  Annuler
                </Button>
                
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={handlePrevious}
                    disabled={isFirst}
                  >
                    Précédent
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleNext}
                    disabled={isLast}
                  >
                    Suivant
                  </Button>
                  <Button onClick={handleSave}>
                    Enregistrer
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default IFIInterface;