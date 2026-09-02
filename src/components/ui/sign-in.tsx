import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import loginDoorImage from '@/assets/login-door.png';

// --- TYPE DEFINITIONS ---

interface SignInPageProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  heroTitle?: React.ReactNode;
  onSignIn?: (event: React.FormEvent<HTMLFormElement>) => void;
  onResetPassword?: () => void;
  onCreateAccount?: () => void;
  isLoading?: boolean;
  emailValue?: string;
  passwordValue?: string;
  onEmailChange?: (value: string) => void;
  onPasswordChange?: (value: string) => void;
  emailError?: string;
  passwordError?: string;
  isSignUp?: boolean;
}

// --- SUB-COMPONENTS ---

const InputField = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-lg border border-border bg-background transition-colors focus-within:border-[var(--lp-blue)] focus-within:ring-1 focus-within:ring-[var(--lp-blue)]/30">
    {children}
  </div>
);

// --- MAIN COMPONENT ---

export const SignInPage: React.FC<SignInPageProps> = ({
  title = 'Connexion',
  description = 'Accédez à votre espace pour continuer',
  heroTitle = (
    <>
      Suivez votre patrimoine,
      <br />
      posez vos questions.
    </>
  ),
  onSignIn,
  onResetPassword,
  onCreateAccount,
  isLoading = false,
  emailValue = '',
  passwordValue = '',
  onEmailChange,
  onPasswordChange,
  emailError,
  passwordError,
  isSignUp = false,
}) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-h-[100dvh] w-full bg-[var(--lp-mist,#f5f5f5)] flex items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-6xl grid md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] rounded-2xl overflow-hidden border border-border shadow-sm md:min-h-[640px]">
      {/* Left column: sign-in form */}
      <div className="relative bg-white flex items-center justify-center p-8 md:p-12">
        <div className="w-full max-w-sm flex flex-col items-center text-center gap-6">
            <a href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
              <span
                aria-hidden
                className="h-6 w-6 rounded-full"
                style={{ background: 'linear-gradient(180deg, #4a7ff2 0%, #c98ab5 100%)' }}
              />
              <span className="text-lg font-medium text-foreground">Kairos</span>
            </a>

            <div className="flex flex-col gap-2">
              <h1 className="font-playfair text-3xl md:text-4xl font-light tracking-tight text-foreground">
                {isSignUp ? 'Créer un compte' : title}
              </h1>
              <p className="text-sm text-muted-foreground">
                {isSignUp ? 'Créez votre compte pour accéder au tableau de bord' : description}
              </p>
            </div>

            <form className="w-full flex flex-col gap-4 text-left" onSubmit={onSignIn}>
              <div>
                <InputField>
                  <input
                    name="email"
                    type="email"
                    placeholder="Email"
                    value={emailValue}
                    onChange={(e) => onEmailChange?.(e.target.value)}
                    className="w-full bg-transparent text-sm px-4 py-3.5 rounded-lg focus:outline-none text-foreground placeholder:text-muted-foreground"
                  />
                </InputField>
                {emailError && <p className="text-sm text-destructive mt-1">{emailError}</p>}
              </div>

              <div>
                <InputField>
                  <div className="relative">
                    <input
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Mot de passe"
                      value={passwordValue}
                      onChange={(e) => onPasswordChange?.(e.target.value)}
                      className="w-full bg-transparent text-sm px-4 py-3.5 pr-11 rounded-lg focus:outline-none text-foreground placeholder:text-muted-foreground"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-3 flex items-center"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4 text-muted-foreground hover:text-foreground transition-colors" />
                      ) : (
                        <Eye className="w-4 h-4 text-muted-foreground hover:text-foreground transition-colors" />
                      )}
                    </button>
                  </div>
                </InputField>
                {passwordError && <p className="text-sm text-destructive mt-1">{passwordError}</p>}
              </div>

              {!isSignUp && (
                <div className="flex items-center justify-end text-sm -mt-1">
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      onResetPassword?.();
                    }}
                    className="text-muted-foreground hover:text-foreground hover:underline transition-colors"
                  >
                    Mot de passe oublié ?
                  </a>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full text-sm font-bold uppercase tracking-wide py-3.5 hover:opacity-85 transition-opacity duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#04052e', color: '#ffffff' }}
              >
                {isLoading
                  ? isSignUp
                    ? 'Création...'
                    : 'Connexion...'
                  : isSignUp
                    ? 'Créer un compte'
                    : 'Se connecter'}
              </button>
            </form>

            <p className="text-sm text-muted-foreground">
              {isSignUp ? 'Déjà un compte ?' : 'Pas encore de compte ?'}{' '}
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  onCreateAccount?.();
                }}
                className="text-foreground font-medium hover:underline transition-colors"
              >
                {isSignUp ? 'Se connecter' : 'Créer un compte'}
              </a>
            </p>
        </div>
      </div>

      {/* Right column: branded night panel */}
      <div className="hidden md:block relative overflow-hidden bg-[#05070f]">
          <img
            src={loginDoorImage}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover object-[38%_center]"
          />
          {/* readability gradient so the overlaid copy stays legible over the artwork */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(180deg, rgba(5,7,15,0.55) 0%, rgba(5,7,15,0.05) 30%, rgba(5,7,15,0.1) 55%, rgba(5,7,15,0.75) 100%)',
            }}
          />
          <div className="absolute inset-0 flex flex-col items-center justify-between px-10 py-12">
            <h2 className="font-playfair text-3xl lg:text-4xl leading-snug text-white/95 text-center drop-shadow-[0_2px_12px_rgba(0,0,0,0.5)]">
              {heroTitle}
            </h2>

            <div className="w-full max-w-xs rounded-xl bg-white/10 backdrop-blur-md border border-white/10 p-5 text-left shadow-[0_8px_32px_rgba(0,0,0,0.35)]">
              <p className="text-[11px] tracking-wide uppercase text-white/50">Patrimoine net</p>
              <div className="mt-1 flex items-baseline gap-2">
                <p className="text-2xl font-semibold text-white">1 284 500 €</p>
                <span className="text-sm font-semibold" style={{ color: '#9bf00d' }}>+4,2 %</span>
              </div>
              <svg viewBox="0 0 240 70" className="mt-4 w-full h-14">
                <path
                  d="M0,55 C30,52 45,40 65,38 C90,35 100,20 130,15 C160,10 190,18 240,5"
                  fill="none"
                  stroke="rgba(255,255,255,0.85)"
                  strokeWidth="2"
                />
                <path
                  d="M0,55 C30,52 45,40 65,38 C90,35 100,20 130,15 C160,10 190,18 240,5 L240,70 L0,70 Z"
                  fill="url(#chartFade)"
                  stroke="none"
                />
                <defs>
                  <linearGradient id="chartFade" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.25)" />
                    <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>
      </div>
      </div>
    </div>
  );
};
