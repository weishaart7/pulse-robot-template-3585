import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { SignInPage, Testimonial } from '@/components/ui/sign-in';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  
  const { login, signup, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};
    
    if (!email) {
      newErrors.email = 'L\'email est requis';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'L\'email n\'est pas valide';
    }
    
    if (!password) {
      newErrors.password = 'Le mot de passe est requis';
    } else if (password.length < 6) {
      newErrors.password = 'Le mot de passe doit contenir au moins 6 caractères';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    
    try {
      const result = isSignUp ? await signup(email, password) : await login(email, password);
      
      if (result.success) {
        if (isSignUp) {
          toast({
            title: "Compte créé avec succès",
            description: "Vérifiez votre email pour confirmer votre compte",
          });
          // Reste sur la page pour que l'utilisateur puisse se connecter après confirmation
          setIsSignUp(false);
        } else {
          toast({
            title: "Connexion réussie",
            description: "Vous êtes maintenant connecté",
          });
          navigate('/dashboard');
        }
      } else {
        const errorMessage = result.error || "Une erreur s'est produite";
        let friendlyMessage = errorMessage;
        
        // Messages d'erreur plus conviviaux
        if (errorMessage.includes('User already registered')) {
          friendlyMessage = 'Un compte avec cet email existe déjà';
        } else if (errorMessage.includes('Invalid login credentials')) {
          friendlyMessage = 'Email ou mot de passe incorrect. Vérifiez vos identifiants ou créez un compte.';
        } else if (errorMessage.includes('Password should be at least')) {
          friendlyMessage = 'Le mot de passe doit contenir au moins 6 caractères';
        } else if (errorMessage.includes('Unable to validate email address')) {
          friendlyMessage = 'Adresse email invalide';
        } else if (errorMessage.includes('Email not confirmed')) {
          friendlyMessage = 'Veuillez confirmer votre email avant de vous connecter';
        }
        
        toast({
          title: isSignUp ? "Erreur lors de l'inscription" : "Erreur de connexion",
          description: friendlyMessage,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur inattendue s'est produite",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sampleTestimonials: Testimonial[] = [
    {
      avatarSrc: "https://randomuser.me/api/portraits/women/57.jpg",
      name: "Sophie Martin",
      handle: "@sophiefinance",
      text: "Une plateforme exceptionnelle pour gérer mon patrimoine. Interface intuitive et fonctionnalités puissantes."
    },
    {
      avatarSrc: "https://randomuser.me/api/portraits/men/64.jpg",
      name: "Thomas Dubois",
      handle: "@thomasinvest",
      text: "Cet outil a transformé ma gestion patrimoniale. Design épuré et analyses précises."
    },
    {
      avatarSrc: "https://randomuser.me/api/portraits/men/32.jpg",
      name: "Pierre Laurent",
      handle: "@pierregestion",
      text: "J'ai testé plusieurs plateformes, mais celle-ci se démarque vraiment. Fiable et efficace."
    },
  ];

  return (
    <SignInPage
      title={<span className="font-light text-foreground tracking-tighter">Connexion</span>}
      description="Connectez-vous à votre compte pour accéder au tableau de bord"
      heroImageSrc="https://images.unsplash.com/photo-1642615835477-d303d7dc9ee9?w=2160&q=80"
      testimonials={sampleTestimonials}
      onSignIn={handleSubmit}
      onResetPassword={() => {
        toast({
          title: "Réinitialisation du mot de passe",
          description: "Cette fonctionnalité sera bientôt disponible",
        });
      }}
      onCreateAccount={() => {
        setIsSignUp(!isSignUp);
        setErrors({});
      }}
      isLoading={isLoading}
      emailValue={email}
      passwordValue={password}
      onEmailChange={setEmail}
      onPasswordChange={setPassword}
      emailError={errors.email}
      passwordError={errors.password}
      isSignUp={isSignUp}
    />
  );
};

export default Login;