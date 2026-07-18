import { ParticipationEdge, ParticipationGraph, IndirectParticipationPath, IndirectParticipationResult } from './types';

export function buildParticipationGraph(edges: ParticipationEdge[]): ParticipationGraph {
  const societeIds = new Set<string>();
  edges.forEach(edge => {
    societeIds.add(edge.societeMereId);
    societeIds.add(edge.societeFilleId);
  });
  return { societeIds: [...societeIds], edges };
}

function buildAdjacency(edges: ParticipationEdge[]): Map<string, ParticipationEdge[]> {
  const adjacency = new Map<string, ParticipationEdge[]>();
  edges.forEach(edge => {
    const list = adjacency.get(edge.societeMereId) ?? [];
    list.push(edge);
    adjacency.set(edge.societeMereId, list);
  });
  return adjacency;
}

/**
 * Tous les chemins depuis `depuisSocieteId` vers chaque société atteignable
 * (directement ou indirectement). Le trigger Postgres empêche déjà la création
 * de cycles, mais le parcours ignore ici toute arête qui reviendrait vers une
 * société déjà présente dans le chemin courant, en défense en profondeur.
 */
export function findAllPaths(graph: ParticipationGraph, depuisSocieteId: string): IndirectParticipationPath[] {
  const adjacency = buildAdjacency(graph.edges);
  const results: IndirectParticipationPath[] = [];

  function dfs(currentId: string, path: string[], pourcentageCumule: number) {
    const outgoing = adjacency.get(currentId) ?? [];
    outgoing.forEach(edge => {
      if (path.includes(edge.societeFilleId)) return; // garde-fou anti-cycle en mémoire
      const nextPourcentage = pourcentageCumule * (edge.pourcentage / 100);
      const nextPath = [...path, edge.societeFilleId];
      results.push({ path: nextPath, pourcentage: nextPourcentage });
      dfs(edge.societeFilleId, nextPath, nextPourcentage);
    });
  }

  dfs(depuisSocieteId, [depuisSocieteId], 100);
  return results;
}

/**
 * Agrège, par société cible atteignable depuis `depuisSocieteId`, la somme des
 * pourcentages de tous les chemins qui y mènent (chemin direct inclus, puisqu'un
 * lien direct est un chemin d'un seul saut). Ne plafonne jamais à 100% : si la
 * somme dépasse 100%, `depasse100` le signale pour affichage d'une alerte.
 */
export function computeTotalParticipations(
  graph: ParticipationGraph,
  depuisSocieteId: string
): IndirectParticipationResult[] {
  const paths = findAllPaths(graph, depuisSocieteId);
  const parCible = new Map<string, IndirectParticipationPath[]>();

  paths.forEach(p => {
    const cibleId = p.path[p.path.length - 1];
    const list = parCible.get(cibleId) ?? [];
    list.push(p);
    parCible.set(cibleId, list);
  });

  return [...parCible.entries()].map(([societeCibleId, cheminsVersCible]) => {
    const pourcentageTotal = cheminsVersCible.reduce((sum, p) => sum + p.pourcentage, 0);
    return {
      societeCibleId,
      pourcentageTotal,
      paths: cheminsVersCible,
      depasse100: pourcentageTotal > 100,
    };
  });
}

/**
 * Participation totale (directe + indirecte, tous chemins confondus) de
 * `depuisSocieteId` vers `versSocieteId`. Retourne un résultat à 0% si la cible
 * n'est pas atteignable.
 */
export function computeTotalParticipation(
  graph: ParticipationGraph,
  depuisSocieteId: string,
  versSocieteId: string
): IndirectParticipationResult {
  const results = computeTotalParticipations(graph, depuisSocieteId);
  const found = results.find(r => r.societeCibleId === versSocieteId);
  return (
    found ?? {
      societeCibleId: versSocieteId,
      pourcentageTotal: 0,
      paths: [],
      depasse100: false,
    }
  );
}
