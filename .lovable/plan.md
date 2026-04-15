

## Problem

In `Synthese.tsx`, the transmission calculation flow is:
1. `computeTransmission()` calculates `transmissionNette` using its own `totalDroitsSuccession` (civil engine)
2. Then `combinedResult` replaces `totalDroitsSuccession` with DMTG values (`dmtgResult.totals.droitsTotaux`)
3. But `transmissionNette` is **never recalculated** with the new DMTG tax amounts

This means the value shown in the center of the donut chart is wrong — it uses stale civil tax numbers instead of the actual DMTG taxes.

## Fix

In `Synthese.tsx`, after building `combinedResult` (around line 177), recalculate `transmissionNette` using the correct formula:

```
Transmission nette = Patrimoine Net - Droits DMTG - Montant AV - Frais de notaire
```

Concretely, update the `combinedResult` object to include:
```typescript
transmissionNette: patrimoineNet - dmtgResult.totals.droitsTotaux - totalAV - civilResult.fraisNotaire
```

Where `patrimoineNet = totalActifs - totalPassifs` (already available from `patrimony`).

### Files to modify
- **`src/components/transmission/Synthese.tsx`** — Recalculate `transmissionNette` in the `combinedResult` block using the DMTG `droitsTotaux` instead of the civil engine's value.

### Technical detail
The fix adds ~3 lines: compute `patrimoineNet` from `patrimony.biensExistants - patrimony.passifs`, then override `transmissionNette` in the combined result with the corrected formula.

