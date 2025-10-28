import React, { useState } from "react";
import { toast } from "@/components/ui/use-toast";
import { Sparkles } from "lucide-react";

const Newsletter = () => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({
        title: "Veuillez entrer votre adresse email",
        variant: "destructive"
      });
      return;
    }
    setIsSubmitting(true);

    // Simulate API call
    setTimeout(() => {
      toast({
        title: "Merci de vous être inscrit !",
        description: "Vous recevrez bientôt nos actualités."
      });
      setEmail("");
      setIsSubmitting(false);
    }, 1000);
  };
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
      {/* Decorative sparkles */}
      <Sparkles className="absolute top-10 right-1/4 w-6 h-6 text-secondary animate-pulse-slow" />
      <Sparkles className="absolute top-32 left-1/4 w-5 h-5 text-accent animate-pulse-slow" style={{ animationDelay: '300ms' }} />
      <Sparkles className="absolute bottom-10 right-1/3 w-7 h-7 text-secondary/60 animate-pulse-slow" style={{ animationDelay: '600ms' }} />
      
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-primary-foreground mb-6 tracking-tight lowercase">
          restez informé
        </h2>
        <p className="text-lg sm:text-xl text-primary-foreground/90 mb-12">
          Recevez les dernières actualités et conseils patrimoniaux
        </p>
        
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center max-w-2xl mx-auto">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Votre adresse email"
            className="flex-1 px-6 py-4 rounded-2xl border-2 border-secondary/20 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary transition-all"
            required
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-secondary hover:bg-secondary/90 text-white font-bold py-4 px-8 rounded-2xl transition-all duration-300 hover:shadow-2xl hover:shadow-secondary/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Envoi..." : "S'inscrire"}
          </button>
        </form>
      </div>
    </div>
  );
};
export default Newsletter;