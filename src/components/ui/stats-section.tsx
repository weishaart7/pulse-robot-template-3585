export default function StatsSection() {
    return (
        <section className="py-12 md:py-20">
            <div className="mx-auto max-w-5xl space-y-8 px-6 md:space-y-16">
                <div className="relative z-10 mx-auto max-w-xl space-y-6 text-center">
                    <h2 className="text-4xl font-medium lg:text-5xl">Nos résultats en chiffres</h2>
                    <p>Découvrez l'impact de notre plateforme de gestion patrimoniale auprès de nos utilisateurs et partenaires.</p>
                </div>

                <div className="grid gap-12 divide-y *:text-center md:grid-cols-3 md:gap-2 md:divide-x md:divide-y-0">
                    <div className="space-y-4">
                        <div className="text-5xl font-bold">15M</div>
                        <p>Encours sous gestion</p>
                    </div>
                    <div className="space-y-4">
                        <div className="text-5xl font-bold">500</div>
                        <p>Utilisateurs satisfaits</p>
                    </div>
                    <div className="space-y-4">
                        <div className="text-5xl font-bold">4,88</div>
                        <p>Note sur 5</p>
                    </div>
                </div>
            </div>
        </section>
    )
}