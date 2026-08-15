import { Link } from "react-router-dom";
import { Sparkle } from "lucide-react";

const NAV_LINKS = [
  { label: "Fonctionnalités", href: "#" },
  { label: "Tarifs", href: "#" },
  { label: "À propos", href: "#" },
  { label: "Blog", href: "#" },
  { label: "Contact", href: "#" },
];

export function LandingNav() {
  return (
    <div className="fixed top-6 left-1/2 z-50 w-[80%] -translate-x-1/2">
      <nav
        className="flex items-center justify-between rounded-full border border-black/5 bg-white py-2.5 pl-5 pr-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)]"
        style={{ fontFamily: "'Figtree', sans-serif" }}
      >
        <div className="flex shrink-0 items-center gap-2">
          <Sparkle className="h-5 w-5 fill-black text-black" strokeWidth={1.5} />
          <span className="whitespace-nowrap text-[18px] font-semibold text-black">Kairos</span>
        </div>
        <div className="hidden flex-1 items-center justify-center gap-8 px-6 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="whitespace-nowrap text-xs font-medium uppercase tracking-wider text-black/80 transition-colors hover:text-black"
            >
              {link.label}
            </a>
          ))}
        </div>
        <Link
          to="/login"
          className="shrink-0 whitespace-nowrap rounded-full bg-black px-6 py-2.5 text-xs font-medium uppercase tracking-wider text-white transition-opacity hover:opacity-85"
        >
          Se connecter
        </Link>
      </nav>
    </div>
  );
}
