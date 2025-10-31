import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
    document.body.style.overflow = !isMenuOpen ? 'hidden' : '';
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (isMenuOpen) {
      setIsMenuOpen(false);
      document.body.style.overflow = '';
    }
  };

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 py-4 transition-all duration-300",
        isScrolled 
          ? "bg-[#f3f3f3]/95 backdrop-blur-md shadow-lg" 
          : "bg-[#f3f3f3]"
      )}
    >
      <div className="container flex items-center justify-between px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <a 
          href="#" 
          className="flex items-center space-x-2"
          onClick={(e) => {
            e.preventDefault();
            scrollToTop();
          }}
          aria-label="Pulse"
        >
          <img 
            src="/logo.svg" 
            alt="Logo" 
            className="h-8 sm:h-10 w-8 sm:w-10" 
          />
          <span className="font-display text-xl sm:text-2xl font-bold text-gray-900">
            PULSE
          </span>
        </a>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-8">
          <a href="#features" className="text-gray-700 hover:text-gray-900 transition-colors font-medium">
            Fonctionnalités
          </a>
          <a href="#showcase" className="text-gray-700 hover:text-gray-900 transition-colors font-medium">
            Découvrir
          </a>
          <a href="#testimonials" className="text-gray-700 hover:text-gray-900 transition-colors font-medium">
            Témoignages
          </a>

          {isAuthenticated ? (
            <>
              <Button 
                onClick={() => navigate('/dashboard')}
                variant="outline" 
                className="bg-white text-gray-900 hover:bg-gray-100 border-gray-300"
              >
                Dashboard
              </Button>
              <Button 
                onClick={logout}
                variant="ghost"
                className="text-gray-700 hover:bg-gray-200"
              >
                Déconnexion
              </Button>
            </>
          ) : (
            <Button 
              onClick={() => navigate('/login')}
              className="bg-gray-900 text-white hover:bg-gray-800 font-bold rounded-2xl"
            >
              Se connecter
            </Button>
          )}
        </nav>

        {/* Mobile menu button */}
        <button
          onClick={toggleMenu}
          className="md:hidden relative z-50 p-2"
          aria-label="Toggle menu"
        >
          <div className="w-6 h-5 flex flex-col justify-between">
            <span className={`block h-0.5 w-full bg-gray-900 transition-all duration-300 ${
              isMenuOpen ? 'rotate-45 translate-y-2' : ''
            }`} />
            <span className={`block h-0.5 w-full bg-gray-900 transition-all duration-300 ${
              isMenuOpen ? 'opacity-0' : ''
            }`} />
            <span className={`block h-0.5 w-full bg-gray-900 transition-all duration-300 ${
              isMenuOpen ? '-rotate-45 -translate-y-2' : ''
            }`} />
          </div>
        </button>
      </div>

      {/* Mobile Navigation Menu */}
      <div className={`md:hidden fixed inset-0 bg-[#f3f3f3] z-40 transition-transform duration-300 ${
        isMenuOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="flex flex-col items-center justify-center h-full space-y-8 text-center">
          <a 
            href="#features" 
            onClick={toggleMenu}
            className="text-2xl font-medium text-gray-900 hover:text-gray-700 transition-colors"
          >
            Fonctionnalités
          </a>
          <a 
            href="#showcase" 
            onClick={toggleMenu}
            className="text-2xl font-medium text-gray-900 hover:text-gray-700 transition-colors"
          >
            Découvrir
          </a>
          <a 
            href="#testimonials" 
            onClick={toggleMenu}
            className="text-2xl font-medium text-gray-900 hover:text-gray-700 transition-colors"
          >
            Témoignages
          </a>

          {isAuthenticated ? (
            <>
              <Button 
                onClick={() => {
                  toggleMenu();
                  navigate('/dashboard');
                }}
                variant="outline"
                size="lg"
                className="w-48 bg-white text-gray-900 hover:bg-gray-100 border-gray-300"
              >
                Dashboard
              </Button>
              <Button 
                onClick={() => {
                  toggleMenu();
                  logout();
                }}
                variant="ghost"
                size="lg"
                className="w-48 text-gray-700 hover:bg-gray-200"
              >
                Déconnexion
              </Button>
            </>
          ) : (
            <Button 
              onClick={() => {
                toggleMenu();
                navigate('/login');
              }}
              size="lg"
              className="w-48 bg-gray-900 text-white hover:bg-gray-800 font-bold rounded-2xl"
            >
              Se connecter
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
