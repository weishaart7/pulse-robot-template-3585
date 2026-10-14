import { Link } from "react-router-dom";
import { ElevateNavbar } from "@/components/ui/elevate-navbar";
import { KairosLogo } from "@/components/brand/KairosLogo";

export function LandingNav() {
  return (
    <>
      <Link
        to="/"
        aria-label="Accueil Kairos"
        className="nav-intro fixed left-12 top-12 z-50 hidden h-10 w-10 items-center justify-center text-black md:flex"
      >
        <KairosLogo className="h-8 w-8" />
      </Link>
      <ElevateNavbar />
    </>
  );
}
