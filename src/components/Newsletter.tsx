import React, { useState } from "react";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-4xl sm:text-5xl font-semibold text-foreground mb-6 tracking-tight">
          Restez informé
        </h2>
        <p className="text-lg text-muted-foreground mb-12">
          Recevez les dernières actualités et conseils patrimoniaux
        </p>
        
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center max-w-2xl mx-auto">
          <input 
            type="email" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            placeholder="Votre adresse email" 
            className="flex-1 px-6 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all" 
            required 
          />
          <Button 
            type="submit" 
            disabled={isSubmitting}
            size="lg"
          >
            {isSubmitting ? "Envoi..." : "S'inscrire"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Newsletter;