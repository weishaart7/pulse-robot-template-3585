import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Link } from 'react-router-dom';

// --- TYPE DEFINITIONS ---

interface SignInPageProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
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
  <div className="rounded-[4px] border border-black/15 bg-white transition-colors focus-within:border-[#0d1b1e]">
    {children}
  </div>
);

// --- MAIN COMPONENT ---

export const SignInPage: React.FC<SignInPageProps> = ({
  title = 'Connexion',
  description = 'Accédez à votre espace pour continuer',
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
    <div className="landing-portal relative flex min-h-[100dvh] w-full items-center justify-center px-6 py-16">
      {/* même fond mesh que le hero de la landing, inset avec coins arrondis */}
      <div
        aria-hidden
        className="absolute inset-2.5 rounded-[18px] sm:inset-5"
        style={{
          backgroundImage: "url('/hero-mesh.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      <div className="relative z-10 w-full max-w-[440px] rounded-[18px] bg-white p-8 shadow-[0_8px_40px_rgba(13,27,30,0.10)] sm:p-10">
        <div className="flex w-full flex-col items-center gap-6 text-center">
            <Link to="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
              <span
                aria-hidden
                className="h-6 w-6 rounded-full"
                style={{ background: 'linear-gradient(180deg, #4a7ff2 0%, #c98ab5 100%)' }}
              />
              <span className="text-lg font-medium" style={{ color: '#0d1b1e' }}>Kairos</span>
            </Link>

            <div className="flex flex-col gap-2">
              <h1
                className="text-[32px] leading-tight"
                style={{
                  color: '#0d1b1e',
                  fontFamily: "'Instrument Sans', 'Inter', ui-sans-serif, sans-serif",
                  fontWeight: 500,
                }}
              >
                {isSignUp ? 'Créer un compte' : title}
              </h1>
              <p className="text-sm text-[var(--lp-smoke)]">
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
                    className="w-full bg-transparent text-sm px-4 py-3.5 rounded-[4px] focus:outline-none text-[#0d1b1e] placeholder:text-[var(--lp-smoke)]"
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
                      className="w-full bg-transparent text-sm px-4 py-3.5 pr-11 rounded-[4px] focus:outline-none text-[#0d1b1e] placeholder:text-[var(--lp-smoke)]"
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
                    className="text-[var(--lp-smoke)] hover:text-[#0d1b1e] hover:underline transition-colors"
                  >
                    Mot de passe oublié ?
                  </a>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-[4px] bg-[#0d1b1e] px-6 py-3.5 text-sm font-semibold text-white transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 sm:text-base"
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

            <p className="text-sm text-[var(--lp-smoke)]">
              {isSignUp ? 'Déjà un compte ?' : 'Pas encore de compte ?'}{' '}
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  onCreateAccount?.();
                }}
                className="font-medium text-[#0d1b1e] hover:underline transition-colors"
              >
                {isSignUp ? 'Se connecter' : 'Créer un compte'}
              </a>
            </p>
        </div>
      </div>
    </div>
  );
};
