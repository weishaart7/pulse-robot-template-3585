import { Link } from "react-router-dom";
import { ElevateNavbar } from "@/components/ui/elevate-navbar";
import { AureviaLogo } from "@/components/brand/AureviaLogo";

export function LandingNav() {
  return (
    <>
      <Link
        to="/"
        aria-label="Accueil Aurevia"
        className="nav-intro absolute left-12 top-12 z-50 hidden h-10 w-10 items-center justify-center text-black md:flex"
      >
        <AureviaLogo className="h-11 w-11 shrink-0" />
      </Link>
      <ElevateNavbar />
    </>
  );
}
