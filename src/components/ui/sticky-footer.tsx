import React from 'react';
import { cn } from '@/lib/utils';
import { motion, useReducedMotion } from 'motion/react';
import {
	FacebookIcon,
	InstagramIcon,
	LinkedinIcon,
	TwitterIcon,
	PieChart,
} from 'lucide-react';
import { Button } from './button';

interface FooterLink {
	title: string;
	href: string;
	icon?: React.ComponentType<{ className?: string }>;
}
interface FooterLinkGroup {
	label: string;
	links: FooterLink[];
}

type StickyFooterProps = React.ComponentProps<'footer'>;

export function StickyFooter({ className, ...props }: StickyFooterProps) {
	return (
		<footer
			className={cn('relative h-[720px] w-full', className)}
			style={{ clipPath: 'polygon(0% 0, 100% 0%, 100% 100%, 0 100%)' }}
			{...props}
		>
			<div className="fixed bottom-0 h-[720px] w-full">
				<div className="sticky top-[calc(100vh-720px)] h-full overflow-y-auto">
					<div className="relative flex size-full flex-col justify-between gap-5 border-t px-4 py-8 md:px-12">
						<div
							aria-hidden
							className="absolute inset-0 isolate z-0 contain-strict"
						>
							<div className="bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,--theme(--color-foreground/.06)_0,hsla(0,0%,55%,.02)_50%,--theme(--color-foreground/.01)_80%)] absolute top-0 left-0 h-320 w-140 -translate-y-87.5 -rotate-45 rounded-full" />
							<div className="bg-[radial-gradient(50%_50%_at_50%_50%,--theme(--color-foreground/.04)_0,--theme(--color-foreground/.01)_80%,transparent_100%)] absolute top-0 left-0 h-320 w-60 [translate:5%_-50%] -rotate-45 rounded-full" />
							<div className="bg-[radial-gradient(50%_50%_at_50%_50%,--theme(--color-foreground/.04)_0,--theme(--color-foreground/.01)_80%,transparent_100%)] absolute top-0 left-0 h-320 w-60 -translate-y-87.5 -rotate-45 rounded-full" />
						</div>
						<div className="mt-10 flex flex-col gap-8 md:flex-row xl:mt-0">
							<AnimatedContainer className="w-full max-w-sm min-w-2xs space-y-4">
								<PieChart className="size-8" />
								<p className="text-muted-foreground mt-8 text-sm md:mt-0">
									Plateforme innovante de gestion patrimoniale qui simplifie le suivi, l'optimisation fiscale et la transmission de votre patrimoine.
								</p>
								<div className="flex gap-2">
									{socialLinks.map((link) => (
										<Button key={link.title} size="icon" variant="outline" className="size-8">
											<link.icon className="size-4" />
										</Button>
									))}
								</div>
							</AnimatedContainer>
							{footerLinkGroups.map((group, index) => (
								<AnimatedContainer
									key={group.label}
									delay={0.1 + index * 0.1}
									className="w-full"
								>
									<div className="mb-10 md:mb-0">
										<h3 className="text-sm uppercase">{group.label}</h3>
										<ul className="text-muted-foreground mt-4 space-y-2 text-sm md:text-xs lg:text-sm">
											{group.links.map((link) => (
												<li key={link.title}>
													<a
														href={link.href}
														className="hover:text-foreground inline-flex items-center transition-all duration-300"
													>
														{link.icon && <link.icon className="me-1 size-4" />}
														{link.title}
													</a>
												</li>
											))}
										</ul>
									</div>
								</AnimatedContainer>
							))}
						</div>
						<div className="text-muted-foreground flex flex-col items-center justify-between gap-2 border-t pt-2 text-sm md:flex-row">
							<p>© 2025 PatrimonIA. Tous droits réservés.</p>
							<p>Made with ❤️ in France</p>
						</div>
					</div>
				</div>
			</div>
		</footer>
	);
}

const socialLinks = [
	{ title: 'Facebook', href: '#', icon: FacebookIcon },
	{ title: 'Instagram', href: '#', icon: InstagramIcon },
	{ title: 'Twitter', href: '#', icon: TwitterIcon },
	{ title: 'LinkedIn', href: '#', icon: LinkedinIcon },
];

const footerLinkGroups: FooterLinkGroup[] = [
	{
		label: 'Fonctionnalités',
		links: [
			{ title: 'Vue Patrimoine', href: '#' },
			{ title: 'Gestion Fiscale', href: '#' },
			{ title: 'Calcul IFI', href: '#' },
			{ title: 'Transmission', href: '#' },
			{ title: 'Immobilier', href: '#' },
			{ title: 'Retraite', href: '#' },
			{ title: 'Budget', href: '#' },
			{ title: 'Rapports PDF', href: '#' },
			{ title: 'Simulation', href: '#' },
			{ title: 'Optimisation', href: '#' },
		],
	},
	{
		label: 'Solutions',
		links: [
			{ title: 'Particuliers', href: '#' },
			{ title: 'Conseillers CGP', href: '#' },
			{ title: 'Family Office', href: '#' },
			{ title: 'Experts-comptables', href: '#' },
			{ title: 'Notaires', href: '#' },
			{ title: 'Banques Privées', href: '#' },
			{ title: 'Entreprises', href: '#' },
		],
	},
	{
		label: 'Ressources',
		links: [
			{ title: 'Blog', href: '#' },
			{ title: 'Guides Pratiques', href: '#' },
			{ title: 'Documentation', href: '#' },
			{ title: 'Fiches Mémoire', href: '#' },
			{ title: 'Vidéos Tutoriels', href: '#' },
			{ title: 'Études de Cas', href: '#' },
			{ title: 'Webinaires', href: '#' },
			{ title: 'FAQ', href: '#' },
			{ title: 'Centre d\'Aide', href: '#' },
		],
	},
	{
		label: 'Entreprise',
		links: [
			{ title: 'À Propos', href: '#' },
			{ title: 'Notre Mission', href: '#' },
			{ title: 'Carrières', href: '#' },
			{ title: 'Presse', href: '#' },
			{ title: 'Partenaires', href: '#' },
			{ title: 'Contact', href: '#' },
			{ title: 'Mentions Légales', href: '#' },
			{ title: 'Politique de Confidentialité', href: '#' },
			{ title: 'CGU', href: '#' },
			{ title: 'Sécurité des Données', href: '#' },
		],
	},
];

type AnimatedContainerProps = React.ComponentProps<typeof motion.div> & {
	children?: React.ReactNode;
	delay?: number;
};

function AnimatedContainer({
	delay = 0.1,
	children,
	...props
}: AnimatedContainerProps) {
	const shouldReduceMotion = useReducedMotion();

	if (shouldReduceMotion) {
		return children;
	}

	return (
		<motion.div
			initial={{ filter: 'blur(4px)', translateY: -8, opacity: 0 }}
			whileInView={{ filter: 'blur(0px)', translateY: 0, opacity: 1 }}
			viewport={{ once: true }}
			transition={{ delay, duration: 0.8 }}
			{...props}
		>
			{children}
		</motion.div>
	);
}
