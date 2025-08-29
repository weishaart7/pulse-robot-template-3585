import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Home, Globe, TrendingUp, Coins } from 'lucide-react';
import IFIInterface from './IFIInterface';

const FiscalDeclarationsCard = () => {
  const [showIFI, setShowIFI] = useState(false);
  const declarations = [
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

  return (
    <>
      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Déclarations fiscales
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {declarations.map((section, sectionIndex) => (
            <div key={sectionIndex} className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground">
                {section.category}
              </h3>
              <div className="space-y-2">
                {section.items.map((item, itemIndex) => (
                  <Button
                    key={itemIndex}
                    variant="ghost"
                    className="w-full justify-start h-auto p-3 text-left hover:bg-accent/50"
                    onClick={() => {
                      if (item.code === "2042-IFI") {
                        setShowIFI(true);
                      }
                    }}
                  >
                    <div className="flex items-start gap-3 w-full overflow-hidden">
                      <Badge variant="secondary" className="shrink-0 text-xs">
                        {item.code}
                      </Badge>
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <div className="font-medium text-sm leading-tight text-wrap break-words hyphens-auto">
                          {item.title}
                        </div>
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {showIFI && <IFIInterface onClose={() => setShowIFI(false)} />}
    </>
  );
};

export default FiscalDeclarationsCard;