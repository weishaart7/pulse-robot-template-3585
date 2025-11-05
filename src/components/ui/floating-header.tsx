'use client';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MenuToggleIcon } from '@/components/ui/menu-toggle-icon';
import { useScroll } from '@/hooks/use-scroll';
import { useAuth } from '@/contexts/AuthContext';

export function FloatingHeader() {
	const [open, setOpen] = React.useState(false);
	const scrolled = useScroll(10);
	const navigate = useNavigate();
	const { user } = useAuth();

	const links = [
		{
			label: 'Fonctionnalités',
			href: '#features',
		},
		{
			label: 'Tarifs',
			href: '#pricing',
		},
		{
			label: 'À propos',
			href: '#about',
		},
	];

	React.useEffect(() => {
		if (open) {
			// Disable scroll
			document.body.style.overflow = 'hidden';
		} else {
			// Re-enable scroll
			document.body.style.overflow = '';
		}

		// Cleanup when component unmounts
		return () => {
			document.body.style.overflow = '';
		};
	}, [open]);

	return (
		<header
			className={cn(
				'sticky top-0 z-50 mx-auto w-full max-w-5xl border-b border-transparent md:rounded-md md:border md:transition-all md:ease-out',
				{
					'bg-background/95 supports-[backdrop-filter]:bg-background/50 border-border backdrop-blur-lg md:top-4 md:max-w-4xl md:shadow':
						scrolled && !open,
					'bg-background/90': open,
				},
			)}
		>
			<nav
				className={cn(
					'flex h-14 w-full items-center justify-between px-4 md:h-12 md:transition-all md:ease-out',
					{
						'md:px-2': scrolled,
					},
				)}
			>
				<a href="/" className="flex cursor-pointer items-center gap-2">
					<img src="/logo.svg" alt="Logo" className="size-5" />
					<p className="font-mono text-base font-bold">PatrimonIA</p>
				</a>
				<div className="hidden items-center gap-2 md:flex">
					{links.map((link, i) => (
						<a key={i} className={buttonVariants({ variant: 'ghost' })} href={link.href}>
							{link.label}
						</a>
					))}
					{user ? (
						<Button onClick={() => navigate('/dashboard')}>Dashboard</Button>
					) : (
						<>
							<Button variant="outline" onClick={() => navigate('/login')}>
								Connexion
							</Button>
							<Button onClick={() => navigate('/login')}>S'inscrire</Button>
						</>
					)}
				</div>
				<Button size="icon" variant="outline" onClick={() => setOpen(!open)} className="md:hidden">
					<MenuToggleIcon open={open} className="size-5" duration={300} />
				</Button>
			</nav>

			<div
				className={cn(
					'bg-background/90 fixed top-14 right-0 bottom-0 left-0 z-50 flex flex-col overflow-hidden border-y md:hidden',
					open ? 'block' : 'hidden',
				)}
			>
				<div
					data-slot={open ? 'open' : 'closed'}
					className={cn(
						'data-[slot=open]:animate-in data-[slot=open]:zoom-in-95 data-[slot=closed]:animate-out data-[slot=closed]:zoom-out-95 ease-out',
						'flex h-full w-full flex-col justify-between gap-y-2 p-4',
					)}
				>
					<div className="grid gap-y-2">
						{links.map((link) => (
							<a
								key={link.label}
								className={buttonVariants({
									variant: 'ghost',
									className: 'justify-start',
								})}
								href={link.href}
								onClick={() => setOpen(false)}
							>
								{link.label}
							</a>
						))}
					</div>
					<div className="flex flex-col gap-2">
						{user ? (
							<Button
								className="w-full"
								onClick={() => {
									setOpen(false);
									navigate('/dashboard');
								}}
							>
								Dashboard
							</Button>
						) : (
							<>
								<Button
									variant="outline"
									className="w-full"
									onClick={() => {
										setOpen(false);
										navigate('/login');
									}}
								>
									Connexion
								</Button>
								<Button
									className="w-full"
									onClick={() => {
										setOpen(false);
										navigate('/login');
									}}
								>
									S'inscrire
								</Button>
							</>
						)}
					</div>
				</div>
			</div>
		</header>
	);
}
