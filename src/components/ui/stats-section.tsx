export default function StatsSection() {
    return (
        <section className="py-16 md:py-32">
            <div className="mx-auto max-w-5xl space-y-8 px-6 md:space-y-12">
                <div className="relative z-10 max-w-xl space-y-6">
                    <h2 className="text-4xl font-medium lg:text-5xl">Notre écosystème réunit nos expertises.</h2>
                    <p>
                        Notre plateforme évolue pour être plus qu'un simple outil. <span className="font-medium">Elle supporte un écosystème complet</span> — des produits aux API et plateformes aidant les conseillers et entreprises à innover.
                    </p>
                </div>
                <div className="grid gap-6 sm:grid-cols-2 md:gap-12 lg:gap-24">
                    <div>
                        <p>Elle supporte un écosystème complet — des produits aux API et plateformes aidant les conseillers et entreprises à innover dans la gestion patrimoniale</p>
                        <div className="mb-12 mt-12 grid grid-cols-2 gap-2 md:mb-0">
                            <div className="space-y-4">
                                <div className="bg-linear-to-r from-zinc-950 to-zinc-600 bg-clip-text text-5xl font-bold text-transparent dark:from-white dark:to-zinc-800">15M</div>
                                <p>Encours sous gestion</p>
                            </div>
                            <div className="space-y-4">
                                <div className="bg-linear-to-r from-zinc-950 to-zinc-600 bg-clip-text text-5xl font-bold text-transparent dark:from-white dark:to-zinc-800">500</div>
                                <p>Utilisateurs satisfaits</p>
                            </div>
                        </div>
                    </div>
                    <div className="relative">
                        <blockquote className="border-l-4 pl-4">
                            <p>Utiliser cette plateforme a été comme débloquer un super-pouvoir en gestion patrimoniale. C'est la fusion parfaite entre simplicité et polyvalence, nous permettant de créer des stratégies aussi performantes qu'elles sont adaptées aux clients.</p>

                            <div className="mt-6 space-y-3">
                                <cite className="block font-medium">Marie Dubois, Conseillère en Gestion de Patrimoine</cite>
                                <div className="text-2xl font-bold">4,88/5</div>
                            </div>
                        </blockquote>
                    </div>
                </div>
            </div>
        </section>
    )
}