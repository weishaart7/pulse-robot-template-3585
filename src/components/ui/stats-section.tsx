export default function StatsSection() {
  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 max-w-5xl mx-auto text-center">
          {/* Stat 1 */}
          <div className="space-y-2">
            <div className="text-6xl md:text-7xl font-bold text-foreground">
              100+
            </div>
            <p className="text-muted-foreground text-lg">
              fonctionnalités disponibles
            </p>
          </div>

          {/* Stat 2 */}
          <div className="space-y-2">
            <div className="text-6xl md:text-7xl font-bold text-foreground">
              #1
            </div>
            <p className="text-muted-foreground text-lg">
              plateforme de gestion patrimoniale
            </p>
          </div>

          {/* Stat 3 */}
          <div className="space-y-2">
            <div className="text-6xl md:text-7xl font-bold text-foreground">
              15M+
            </div>
            <p className="text-muted-foreground text-lg">
              d&apos;encours sous gestion
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}