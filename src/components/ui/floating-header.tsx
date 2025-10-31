import React from 'react';
import { Grid2x2PlusIcon, MenuIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetFooter } from '@/components/ui/sheet';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

export function FloatingHeader() {
	const [open, setOpen] = React.useState(false);
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

	return (
		<header
			className={cn(
				'sticky top-5 z-50',
				'mx-auto w-full max-w-3xl rounded-lg border shadow',
				'bg-background/95 supports-[backdrop-filter]:bg-background/80 backdrop-blur-lg',
			)}
		>
			<nav className="mx-auto flex items-center justify-between p-1.5">
				<a href="/" className="hover:bg-accent flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 duration-100">
					<img src="/logo.svg" alt="Logo" className="size-5" />
					<p className="font-mono text-base font-bold">PatrimonIA</p>
				</a>
				<div className="hidden items-center gap-1 lg:flex">
					{links.map((link) => (
						<a
							key={link.href}
							className={buttonVariants({ variant: 'ghost', size: 'sm' })}
							href={link.href}
						>
							{link.label}
						</a>
					))}
				</div>
				<div className="flex items-center gap-2">
					{user ? (
						<Button size="sm" onClick={() => navigate('/dashboard')}>
							Dashboard
						</Button>
					) : (
						<>
							<Button size="sm" variant="outline" onClick={() => navigate('/login')}>
								Connexion
							</Button>
							<Button size="sm" onClick={() => navigate('/login')}>
								S'inscrire
							</Button>
						</>
					)}
					<Sheet open={open} onOpenChange={setOpen}>
						<Button
							size="icon"
							variant="outline"
							onClick={() => setOpen(!open)}
							className="lg:hidden"
						>
							<MenuIcon className="size-4" />
						</Button>
						<SheetContent
							className="bg-background/95 supports-[backdrop-filter]:bg-background/80 gap-0 backdrop-blur-lg"
							showClose={false}
							side="left"
						>
							<div className="grid gap-y-2 overflow-y-auto px-4 pt-12 pb-5">
								{links.map((link) => (
									<a
										key={link.href}
										className={buttonVariants({
											variant: 'ghost',
											className: 'justify-start',
										})}
										href={link.href}
									>
										{link.label}
									</a>
								))}
							</div>
							<SheetFooter>
								{user ? (
									<Button onClick={() => {
										setOpen(false);
										navigate('/dashboard');
									}}>
										Dashboard
									</Button>
								) : (
									<>
										<Button variant="outline" onClick={() => {
											setOpen(false);
											navigate('/login');
										}}>
											Connexion
										</Button>
										<Button onClick={() => {
											setOpen(false);
											navigate('/login');
										}}>
											S'inscrire
										</Button>
									</>
								)}
							</SheetFooter>
						</SheetContent>
					</Sheet>
				</div>
			</nav>
		</header>
	);
}
