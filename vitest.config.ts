import { defineConfig } from "vitest/config";
import path from "path";

// Config vitest séparée de vite.config.ts (dev/build) pour ne pas coupler
// les deux : ce fichier ne sert qu'à exécuter les tests unitaires (`npm test`).
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
  },
});
