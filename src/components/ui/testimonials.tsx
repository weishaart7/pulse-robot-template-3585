import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export default function Testimonials() {
    return (
        <section className="py-16 md:py-32">
            <div className="mx-auto max-w-6xl space-y-8 px-6 md:space-y-16">
                <div className="relative z-10 mx-auto max-w-xl space-y-6 text-center md:space-y-12">
                    <h2 className="text-4xl font-medium lg:text-5xl">Conçu par des experts, approuvé par des professionnels</h2>
                    <p className="text-muted-foreground">PatrimonIA transforme la gestion patrimoniale avec des outils innovants et une vision claire de votre patrimoine.</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-rows-2">
                    <Card className="grid grid-rows-[auto_1fr] gap-8 sm:col-span-2 sm:p-6 lg:row-span-2">
                        <CardHeader>
                            <div className="h-6 w-fit text-2xl font-bold">PatrimonIA</div>
                        </CardHeader>
                        <CardContent>
                            <blockquote className="grid h-full grid-rows-[1fr_auto] gap-6">
                                <p className="text-xl font-medium">PatrimonIA a révolutionné ma façon de gérer mon patrimoine. La vision globale et les simulations de transmission m'ont permis d'optimiser ma fiscalité et de préparer sereinement l'avenir de ma famille. Un outil indispensable pour tout gestionnaire de patrimoine.</p>

                                <div className="grid grid-cols-[auto_1fr] items-center gap-3">
                                    <Avatar className="size-12">
                                        <AvatarFallback>MD</AvatarFallback>
                                    </Avatar>

                                    <div>
                                        <cite className="text-sm font-medium">Marie Dubois</cite>
                                        <span className="text-muted-foreground block text-sm">Entrepreneur</span>
                                    </div>
                                </div>
                            </blockquote>
                        </CardContent>
                    </Card>
                    <Card className="md:col-span-2">
                        <CardContent className="h-full pt-6">
                            <blockquote className="grid h-full grid-rows-[1fr_auto] gap-6">
                                <p className="text-xl font-medium">Une plateforme exceptionnelle qui simplifie la complexité de la gestion patrimoniale. Les outils d'optimisation IFI sont remarquables.</p>

                                <div className="grid grid-cols-[auto_1fr] items-center gap-3">
                                    <Avatar className="size-12">
                                        <AvatarFallback>TL</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <cite className="text-sm font-medium">Thomas Laurent</cite>
                                        <span className="text-muted-foreground block text-sm">Chef d'entreprise</span>
                                    </div>
                                </div>
                            </blockquote>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="h-full pt-6">
                            <blockquote className="grid h-full grid-rows-[1fr_auto] gap-6">
                                <p>La vision globale de mon patrimoine et les simulations de transmission m'ont aidé à prendre les meilleures décisions pour ma famille.</p>

                                <div className="grid items-center gap-3 [grid-template-columns:auto_1fr]">
                                    <Avatar className="size-12">
                                        <AvatarFallback>SM</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <cite className="text-sm font-medium">Sophie Martin</cite>
                                        <span className="text-muted-foreground block text-sm">Investisseur</span>
                                    </div>
                                </div>
                            </blockquote>
                        </CardContent>
                    </Card>
                    <Card className="card variant-mixed">
                        <CardContent className="h-full pt-6">
                            <blockquote className="grid h-full grid-rows-[1fr_auto] gap-6">
                                <p>Un outil professionnel accessible qui me permet de gérer mon patrimoine immobilier et mes sociétés en un seul endroit.</p>

                                <div className="grid grid-cols-[auto_1fr] gap-3">
                                    <Avatar className="size-12">
                                        <AvatarFallback>PR</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="text-sm font-medium">Pierre Rousseau</p>
                                        <span className="text-muted-foreground block text-sm">Gestionnaire de patrimoine</span>
                                    </div>
                                </div>
                            </blockquote>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </section>
    )
}
