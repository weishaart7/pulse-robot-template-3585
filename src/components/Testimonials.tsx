import React, { useRef } from "react";
import { Sparkles } from "lucide-react";
interface TestimonialProps {
  content: string;
  author: string;
  role: string;
  gradient: string;
  backgroundImage?: string;
}
const testimonials: TestimonialProps[] = [{
  content: "Atlas transformed our production line, handling repetitive tasks while our team focuses on innovation. 30% increase in output within three months.",
  author: "Sarah Chen",
  role: "VP of Operations, Axion Manufacturing",
  gradient: "from-blue-700 via-indigo-800 to-purple-900",
  backgroundImage: "/background-section1.png"
}, {
  content: "Implementing Atlas in our fulfillment centers reduced workplace injuries by 40% while improving order accuracy. The learning capabilities are remarkable.",
  author: "Michael Rodriguez",
  role: "Director of Logistics, GlobalShip",
  gradient: "from-indigo-900 via-purple-800 to-orange-500",
  backgroundImage: "/background-section2.png"
}, {
  content: "Atlas adapted to our lab protocols faster than any system we've used. It's like having another researcher who never gets tired and maintains perfect precision.",
  author: "Dr. Amara Patel",
  role: "Lead Scientist, BioAdvance Research",
  gradient: "from-purple-800 via-pink-700 to-red-500",
  backgroundImage: "/background-section3.png"
}, {
  content: "As a mid-size business, we never thought advanced robotics would be accessible to us. Atlas changed that equation entirely with its versatility and ease of deployment.",
  author: "Jason Lee",
  role: "CEO, Innovative Solutions Inc.",
  gradient: "from-orange-600 via-red-500 to-purple-600",
  backgroundImage: "/background-section1.png"
}];
const TestimonialCard = ({
  content,
  author,
  role,
  backgroundImage = "/background-section1.png"
}: TestimonialProps) => {
  return <div className="bg-background rounded-3xl p-8 h-full flex flex-col justify-between border-2 border-secondary/20 hover:border-secondary transition-all duration-300 hover:shadow-2xl hover:shadow-secondary/20 hover:-translate-y-2 relative overflow-hidden">
      <div className="absolute top-4 right-4 w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center">
        <span className="text-3xl">💬</span>
      </div>
      
      <div className="relative z-10">
        <p className="text-lg mb-8 font-medium leading-relaxed text-foreground pr-16">{`"${content}"`}</p>
        <div>
          <h4 className="font-bold text-xl text-primary lowercase">{author}</h4>
          <p className="text-foreground/70">{role}</p>
        </div>
      </div>
    </div>;
};
const Testimonials = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  return <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
      {/* Decorative sparkles */}
      <Sparkles className="absolute top-10 left-1/4 w-6 h-6 text-secondary animate-pulse-slow" />
      
      <Sparkles className="absolute bottom-20 left-1/3 w-7 h-7 text-secondary/60 animate-pulse-slow" style={{
      animationDelay: '600ms'
    }} />
      
      <div className="text-center mb-16">
        <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-primary-foreground mb-6 tracking-tight lowercase">
          Ce que nos clients disent
        </h2>
        <p className="text-lg sm:text-xl text-primary-foreground/90 max-w-3xl mx-auto">
          Ils nous font confiance pour gérer leur patrimoine
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        {testimonials.map((testimonial, index) => <TestimonialCard key={index} content={testimonial.content} author={testimonial.author} role={testimonial.role} gradient={testimonial.gradient} backgroundImage={testimonial.backgroundImage} />)}
      </div>
    </div>;
};
export default Testimonials;