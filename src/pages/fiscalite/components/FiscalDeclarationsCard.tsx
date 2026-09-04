import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Home, Globe, TrendingUp, Coins, LucideIcon } from 'lucide-react';
import IFIInterface from './IFIInterface';
import Declaration2042Interface from './Declaration2042Interface';

interface FiscalDeclarationsCardProps {
  /** Appelé à la fermeture de la 2042 pour rafraîchir la Vision générale (voir useFiscalOverview.ts). */
  onDeclarationClosed?: () => void;
}

interface DeclarationItem {
  code: string;
  title: string;
  icon: LucideIcon;
}

const FiscalDeclarationsCard = ({ onDeclarationClosed }: FiscalDeclarationsCardProps) => {
  const [showIFI, setShowIFI] = useState(false);
  const [show2042, setShow2042] = useState(false);
  const declarations: { category: string; items: DeclarationItem[] }[] = [
    {
      category: "Impôt sur le revenu",
      items: [
        { code: "2042", title: "Déclaration générale", icon: FileText },
        { code: "2044", title: "Revenus fonciers", icon: Home },
        { code: "2047", title: "Revenus perçus à l'étranger", icon: Globe },
        { code: "2074", title: "Plus ou moins values de cession", icon: TrendingUp },
        { code: "2086", title: "Plus ou moins values de cession d'actifs numériques", icon: Coins }
      ]
    },
    {
      category: "Impôt sur la fortune immobilière",
      items: [
        { code: "2042-IFI", title: "Impôt sur la fortune immobilière", icon: Home }
      ]
    }
  ];

  const openDeclaration = (code: string) => {
    if (code === "2042-IFI") setShowIFI(true);
    else if (code === "2042") setShow2042(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Déclarations fiscales
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {declarations.map((section, sectionIndex) => (
            <div key={sectionIndex} className="space-y-2">
              <h3 className="font-semibold text-sm text-muted-foreground px-1">
                {section.category}
              </h3>
              <div className="space-y-1.5">
                {section.items.map((item, itemIndex) => {
                  const clickable = item.code === "2042" || item.code === "2042-IFI";
                  return (
                    <button
                      key={itemIndex}
                      type="button"
                      disabled={!clickable}
                      onClick={() => openDeclaration(item.code)}
                      className="flex w-full items-center gap-3 rounded-md p-2.5 text-left transition-colors enabled:hover:bg-muted/50 disabled:cursor-default"
                    >
                      <div className="h-8 w-8 shrink-0 rounded-full bg-[#05aaa4]/10 flex items-center justify-center">
                        <item.icon className="h-4 w-4 text-[#05aaa4]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium leading-snug text-wrap break-words">
                          {item.title}
                        </div>
                      </div>
                      <Badge variant="secondary" className="shrink-0 text-xs">
                        {item.code}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {showIFI && <IFIInterface onClose={() => setShowIFI(false)} />}
      {show2042 && <Declaration2042Interface onClose={() => { setShow2042(false); onDeclarationClosed?.(); }} />}
    </>
  );
};

export default FiscalDeclarationsCard;
