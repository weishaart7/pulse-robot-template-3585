import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Asset } from '@/services/assetService';
import { formatCurrency } from '@/lib/patrimoine/utils';
import { Shield, FileText, AlertTriangle, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

const AV_NATURES = [
  "Contrat d'assurance-vie",
  "Contrat vie-génération",
  "PEP assurance vie",
  "Bons & contrats de capitalisation",
];

export const AssuranceVie = () => {
  const [contracts, setContracts] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAVContracts = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('assets')
          .select('*')
          .eq('user_id', user.id)
          .in('nature', AV_NATURES)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setContracts(data || []);
      } catch (error) {
        console.error('Error fetching AV contracts:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAVContracts();
  }, []);

  const totalValeur = contracts.reduce((sum, c) => sum + (c.valeur_estimee || 0), 0);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map(i => (
          <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (contracts.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <Shield className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Aucun contrat d'assurance-vie</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Ajoutez vos contrats d'assurance-vie dans la section Patrimoine pour les visualiser ici.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => navigate('/dashboard/patrimoine')}
              className="gap-2"
            >
              Aller au Patrimoine
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Résumé */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Nombre de contrats</p>
                <p className="text-2xl font-bold">{contracts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Valeur totale</p>
                <p className="text-2xl font-bold">{formatCurrency(totalValeur)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fiscalité transmission</p>
                <p className="text-sm font-medium text-muted-foreground">
                  Hors succession (art. L132-12)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Liste des contrats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contrats d'assurance-vie</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {contracts.map((contract, index) => (
            <React.Fragment key={contract.id}>
              {index > 0 && <Separator />}
              <div className="flex items-center justify-between py-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">
                      {contract.denomination || contract.nature}
                    </p>
                    <Badge variant="secondary" className="text-xs">
                      {contract.nature}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {contract.etablissement && (
                      <span>{contract.etablissement}</span>
                    )}
                    {contract.detenteur && (
                      <span>Détenteur : {contract.detenteur}</span>
                    )}
                    {contract.date_acquisition && (
                      <span>Ouvert le {new Date(contract.date_acquisition).toLocaleDateString('fr-FR')}</span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-lg">
                    {formatCurrency(contract.valeur_estimee || 0)}
                  </p>
                  {contract.mode_detention && (
                    <p className="text-xs text-muted-foreground">{contract.mode_detention}</p>
                  )}
                </div>
              </div>
            </React.Fragment>
          ))}
        </CardContent>
      </Card>

      {/* Note fiscale */}
      <Card className="border-amber-500/20 bg-amber-500/5">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-2 text-sm">
              <p className="font-medium">Régime fiscal de l'assurance-vie en cas de décès</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li><strong>Primes versées avant 70 ans :</strong> abattement de 152 500 € par bénéficiaire, puis prélèvement de 20 % jusqu'à 700 000 € et 31,25 % au-delà (art. 990 I CGI)</li>
                <li><strong>Primes versées après 70 ans :</strong> abattement global de 30 500 € tous bénéficiaires confondus, excédent soumis aux droits de succession (art. 757 B CGI)</li>
                <li><strong>Conjoint / partenaire PACS :</strong> exonéré dans tous les cas</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
