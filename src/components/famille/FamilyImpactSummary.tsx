import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { FamilyImpacts } from '@/hooks/useFamilyImpacts';
import { Users, TrendingUp, Shield, AlertCircle, Award } from 'lucide-react';

interface FamilyImpactSummaryProps {
  impacts: FamilyImpacts;
}

export function FamilyImpactSummary({ impacts }: FamilyImpactSummaryProps) {
  return (
    <Card className="p-6 bg-gradient-to-br from-background to-muted/20 border-primary/10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold text-foreground mb-1">
            Impacts Successoraux
          </h3>
          <p className="text-sm text-muted-foreground">
            Synthèse en temps réel de votre situation familiale
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-muted-foreground mb-1">Complétude du profil</p>
            <div className="flex items-center gap-2">
              <Progress value={impacts.completenessScore} className="w-24 h-2" />
              <span className="text-sm font-semibold text-foreground">
                {impacts.completenessScore}%
              </span>
            </div>
          </div>
          {impacts.completenessScore >= 80 && (
            <Award className="w-6 h-6 text-primary" />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {/* Réserve héréditaire */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium text-muted-foreground">Réserve Héréditaire</span>
          </div>
          <div className="text-2xl font-bold text-foreground">
            {(impacts.reserveHereditaire * 100).toFixed(0)}%
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {impacts.nombreEnfants > 0 
              ? `${impacts.nombreEnfants} enfant${impacts.nombreEnfants > 1 ? 's' : ''} réservataire${impacts.nombreEnfants > 1 ? 's' : ''}`
              : 'Aucun héritier réservataire'}
          </p>
        </div>

        {/* Quotité disponible */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-accent" />
            <span className="text-xs font-medium text-muted-foreground">Quotité Disponible</span>
          </div>
          <div className="text-2xl font-bold text-foreground">
            {(impacts.quotiteDisponible * 100).toFixed(0)}%
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Libre disposition
          </p>
        </div>

        {/* Héritiers */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-secondary" />
            <span className="text-xs font-medium text-muted-foreground">Héritiers Potentiels</span>
          </div>
          <div className="text-2xl font-bold text-foreground">
            {impacts.membersImpacts.length}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Membres de la famille
          </p>
        </div>

        {/* Abattements totaux */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Award className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium text-muted-foreground">Abattements Fiscaux</span>
          </div>
          <div className="text-2xl font-bold text-foreground">
            {(impacts.totalAbattementsDisponibles / 1000).toFixed(0)}k€
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Total disponible
          </p>
        </div>
      </div>

      {/* Détail des abattements par catégorie */}
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Abattements par bénéficiaire
        </h4>
        <div className="flex flex-wrap gap-2">
          {impacts.membersImpacts
            .sort((a, b) => b.abattementFiscal - a.abattementFiscal)
            .map(member => (
              <Badge
                key={member.id}
                variant={member.estReservataire ? 'default' : 'outline'}
                className="flex items-center gap-2 px-3 py-1"
              >
                <span className="font-medium">
                  {member.prenom} {member.nom}
                </span>
                <span className="text-xs opacity-75">
                  {(member.abattementFiscal / 1000).toFixed(0)}k€
                </span>
                {member.estReservataire && (
                  <Shield className="w-3 h-3" />
                )}
              </Badge>
            ))}
        </div>
      </div>

      {/* Alertes */}
      {impacts.alerts.length > 0 && (
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-foreground mb-2">
                Points d'attention
              </h4>
              <ul className="space-y-1">
                {impacts.alerts.map((alert, idx) => (
                  <li key={idx} className="text-sm text-muted-foreground">
                    {alert}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
