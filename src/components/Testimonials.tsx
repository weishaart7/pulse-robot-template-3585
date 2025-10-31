import React from "react";

interface TestimonialProps {
  content: string;
  author: string;
  role: string;
}

const testimonials: TestimonialProps[] = [
  {
    content: "Une plateforme complète et intuitive qui m'a permis d'optimiser ma fiscalité et de préparer ma transmission en toute sérénité.",
    author: "Marie Dubois",
    role: "Entrepreneur"
  },
  {
    content: "Grâce à cet outil, j'ai pu identifier des opportunités d'optimisation IFI que je n'avais jamais envisagées. Un vrai gain de temps.",
    author: "Thomas Laurent",
    role: "Chef d'entreprise"
  },
  {
    content: "La vision globale de mon patrimoine et les simulations de transmission m'ont aidé à prendre les meilleures décisions pour ma famille.",
    author: "Sophie Martin",
    role: "Investisseur"
  },
  {
    content: "Un outil professionnel accessible qui me permet de gérer mon patrimoine immobilier et mes sociétés en un seul endroit.",
    author: "Pierre Rousseau",
    role: "Gestionnaire de patrimoine"
  }
];

const TestimonialCard = ({ content, author, role }: TestimonialProps) => {
  return (
    <div className="bg-card rounded-xl p-8 h-full flex flex-col justify-between border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
      <div>
        <p className="text-lg mb-6 leading-relaxed text-foreground">{`"${content}"`}</p>
        <div>
          <h4 className="font-semibold text-lg text-foreground">{author}</h4>
          <p className="text-muted-foreground text-sm">{role}</p>
        </div>
      </div>
    </div>
  );
};

const Testimonials = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-16">
        <h2 className="text-4xl sm:text-5xl font-semibold text-foreground mb-6 tracking-tight">
          Ils nous font confiance
        </h2>
        <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
          Découvrez les témoignages de nos clients
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {testimonials.map((testimonial, index) => (
          <TestimonialCard 
            key={index} 
            content={testimonial.content} 
            author={testimonial.author} 
            role={testimonial.role}
          />
        ))}
      </div>
    </div>
  );
};

export default Testimonials;