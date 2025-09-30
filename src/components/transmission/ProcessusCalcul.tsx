import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calculator, Users, Scale, FileText, PiggyBank, Receipt, TrendingUp } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export const ProcessusCalcul = () => {
  const calculSteps = [
    {
      icon: Users,
      title: "1. Dévolution civile",
      description: "Détermination des héritiers légaux et de leurs parts civiles",
      details: [
        "Identification du conjoint survivant (si applicable)",
        "Détermination des enfants héritiers",
        "Calcul des parts héréditaires selon le Code civil",
        "Prise en compte de l'option du conjoint (1/4 PP, usufruit total, ou mixte)"
      ],
      formula: "Parts = f(nombre d'enfants, présence conjoint, option choisie)"
    },
    {
      icon: Calculator,
      title: "2. Masse de calcul",
      description: "Reconstitution du patrimoine fictif pour le calcul de la réserve",
      details: [
        "Actif existant au jour du décès",
        "+ Donations antérieures (réunion fictive)",
        "+ Legs consentis",
        "- Passifs déductibles"
      ],
      formula: "Masse de calcul = Actif net + Donations + Legs"
    },
    {
      icon: Scale,
      title: "3. Réserve héréditaire et quotité disponible",
      description: "Calcul de la part protégée et de la part librement disponible",
      details: [
        "Réserve héréditaire : part minimale garantie aux héritiers réservataires",
        "Quotité disponible : part dont le défunt peut disposer librement",
        "Barème selon nombre d'enfants :",
        "• 1 enfant : réserve 1/2, QD 1/2",
        "• 2 enfants : réserve 2/3, QD 1/3",
        "• 3 enfants ou + : réserve 3/4, QD 1/4"
      ],
      formula: "Réserve = Masse × (nb_enfants / (nb_enfants + 1))"
    },
    {
      icon: FileText,
      title: "4. Imputation des libéralités",
      description: "Vérification que les donations et legs respectent la réserve",
      details: [
        "Imputation d'abord sur la quotité disponible",
        "Si QD dépassée : imputation sur la réserve",
        "Ordre : donations puis legs",
        "Respect du principe d'égalité entre héritiers"
      ],
      formula: "Imputation QD puis Réserve si QD < Total libéralités"
    },
    {
      icon: TrendingUp,
      title: "5. Réduction des libéralités",
      description: "Réduction des libéralités excessives pour protéger la réserve",
      details: [
        "Réduction si la réserve est entamée",
        "Ordre de réduction : legs d'abord, puis donations (des plus récentes aux plus anciennes)",
        "Réduction au prorata si plusieurs libéralités de même nature",
        "Maintien des donations si possible"
      ],
      formula: "Réduction = Max(0, Total libéralités - QD - Réserve entamée)"
    },
    {
      icon: PiggyBank,
      title: "6. Rapport des donations",
      description: "Égalisation des parts entre héritiers lors du partage",
      details: [
        "Les donations rapportables sont réintégrées fictivement",
        "Permet d'égaliser les parts entre cohéritiers",
        "Calcul de la masse partageable",
        "Détermination de la part finale de chaque héritier"
      ],
      formula: "Masse partageable = Actif net - libéralités hors part + rapports"
    },
    {
      icon: Receipt,
      title: "7. Fiscalité de la transmission",
      description: "Calcul des droits de succession et prélèvements",
      details: [
        "Droits de succession selon le barème progressif et le lien de parenté",
        "Abattements applicables (100 000 € pour enfants, exonération conjoint)",
        "Prélèvement 990 I sur assurance-vie (capitaux > 152 500 €)",
        "Frais de notaire (environ 2,5% de l'actif brut)"
      ],
      formula: "Droits = f(base taxable, abattement, barème lien familial)"
    }
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            Processus de calcul de transmission
          </CardTitle>
          <CardDescription>
            Méthodologie complète de calcul de la transmission successorale
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {calculSteps.map((step, index) => (
            <div key={index} className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <step.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 space-y-2">
                  <h3 className="text-lg font-semibold">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                  
                  <div className="space-y-2 pt-2">
                    <h4 className="text-sm font-medium">Détails du calcul :</h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {step.details.map((detail, idx) => (
                        <li key={idx} className="pl-4">
                          {detail.startsWith('•') ? detail : `• ${detail}`}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-4 rounded-lg bg-muted/50 p-3">
                    <p className="text-sm font-mono text-foreground">{step.formula}</p>
                  </div>
                </div>
              </div>
              
              {index < calculSteps.length - 1 && (
                <Separator className="my-6" />
              )}
            </div>
          ))}

          <div className="mt-8 rounded-lg border border-primary/20 bg-primary/5 p-6">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Synthèse du processus
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Le calcul de transmission successorale suit un processus en 7 étapes interdépendantes. 
              Chaque étape s'appuie sur les résultats de la précédente pour aboutir à la détermination 
              des parts finales de chaque héritier et du coût fiscal global de la transmission. 
              Ce processus garantit le respect des règles du Code civil (protection de la réserve héréditaire) 
              tout en permettant d'optimiser la fiscalité selon les dispositifs légaux disponibles.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};