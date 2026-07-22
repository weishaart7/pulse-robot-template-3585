import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export function LandingNav() {
  return (
    <div className="fixed top-4 left-1/2 z-50 w-[calc(100%-2rem)] -translate-x-1/2 sm:top-5">
      <nav
        className="flex items-center justify-between rounded-[6px] py-1 pl-4 pr-1 backdrop-blur-[24px]"
        style={{
          background: "rgba(255,255,255,0.55)",
          fontFamily: "'Roboto Mono', ui-monospace, monospace",
        }}
      >
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="h-6 w-6 rounded-full"
            style={{ background: "linear-gradient(180deg, #4a7ff2 0%, #c98ab5 100%)" }}
          />
          <span className="text-[18px] font-medium text-[var(--lp-ink)]">Kairos</span>
        </div>
        <div className="flex items-center gap-5">
          <a
            href="#"
            className="text-sm font-normal text-[var(--lp-ink)] hover:opacity-70"
          >
            Tarifs
          </a>
          <Link
            to="/login"
            className="flex items-center gap-1.5 rounded-[6px] bg-white px-5 py-4 text-sm font-medium text-[var(--lp-ink)] transition-opacity hover:opacity-90"
          >
            Se connecter
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </nav>
    </div>
  );
}
