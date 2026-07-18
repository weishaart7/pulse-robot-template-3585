export interface ParticipationEdge {
  id: string;
  societeMereId: string;
  societeFilleId: string;
  pourcentage: number; // 0-100, quote-part directe
}

export interface ParticipationGraph {
  societeIds: string[];
  edges: ParticipationEdge[];
}

export interface IndirectParticipationPath {
  path: string[]; // séquence de societeId, de la racine à la cible (racine incluse)
  pourcentage: number; // produit des pourcentages du chemin, en %
}

export interface IndirectParticipationResult {
  societeCibleId: string;
  pourcentageTotal: number; // somme sur tous les chemins vers la cible
  paths: IndirectParticipationPath[];
  depasse100: boolean; // pourcentageTotal > 100 — jamais plafonné, seulement signalé
}
