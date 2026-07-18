import { ParticipationGraph } from './types';

export interface ParticipationGraphNode {
  id: string;
  depth: number; // plus courte distance depuis une racine (société sans participation entrante)
}

/**
 * Profondeur de chaque société du graphe, pour le positionnement vertical de la
 * vue en graphe (racines = sociétés sans participation entrante = profondeur 0).
 * Calculée par parcours en largeur multi-sources pour garantir la profondeur la
 * plus courte quand une société est atteignable par plusieurs chemins.
 */
export function computeNodeDepths(graph: ParticipationGraph): ParticipationGraphNode[] {
  const hasIncoming = new Set(graph.edges.map(edge => edge.societeFilleId));
  const roots = graph.societeIds.filter(id => !hasIncoming.has(id));

  const adjacency = new Map<string, string[]>();
  graph.edges.forEach(edge => {
    const list = adjacency.get(edge.societeMereId) ?? [];
    list.push(edge.societeFilleId);
    adjacency.set(edge.societeMereId, list);
  });

  const depths = new Map<string, number>();
  const queue: Array<{ id: string; depth: number }> = roots.map(id => ({ id, depth: 0 }));

  while (queue.length > 0) {
    const { id, depth } = queue.shift()!;
    if (depths.has(id)) continue;
    depths.set(id, depth);
    (adjacency.get(id) ?? []).forEach(childId => {
      if (!depths.has(childId)) queue.push({ id: childId, depth: depth + 1 });
    });
  }

  // Une société non atteinte depuis une racine ne devrait pas se produire dans un
  // graphe acyclique (garanti par le trigger DB) : profondeur 0 par défaut si tel
  // était le cas malgré tout.
  return graph.societeIds.map(id => ({ id, depth: depths.get(id) ?? 0 }));
}
