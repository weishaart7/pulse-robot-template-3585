import { assetService } from '@/services/assetService';
import type { Requalification } from '@/lib/patrimoine/requalification';

// Écrit en lot les requalifications confirmées (cf. lib/patrimoine/requalification.ts).
export const appliquerRequalifications = (changements: Requalification[]) =>
  Promise.all(changements.map((c) => assetService.updateAsset(c.asset.id!, c.patch)));
