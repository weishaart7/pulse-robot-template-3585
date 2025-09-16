"use client";

import { motion, useReducedMotion } from "framer-motion";

interface BudgetCardProps {
  // Content
  totalRevenus?: number;
  totalCharges?: number;
  soldeMensuel?: number;

  // Styling
  borderColor?: string;
  backgroundColor?: string;
  blurColorBlue?: string;
  blurColorGreen?: string;

  // Dots configuration
  outerDotsCount?: number;
  innerDotsCount?: number;

  // Animation controls
  enableAnimations?: boolean;
}

const defaultProps: Partial<BudgetCardProps> = {
  totalRevenus: 0,
  totalCharges: 0,
  soldeMensuel: 0,
  borderColor: "border-border/30",
  backgroundColor: "bg-muted/20",
  blurColorBlue: "bg-blue-400/10",
  blurColorGreen: "bg-green-400/10",
  outerDotsCount: 48,
  innerDotsCount: 36,
  enableAnimations: true,
};

export function AnimatedBudgetCard(props: BudgetCardProps) {
  const {
    totalRevenus,
    totalCharges,
    soldeMensuel,
    borderColor,
    backgroundColor,
    outerDotsCount,
    innerDotsCount,
    enableAnimations,
  } = { ...defaultProps, ...props };

  const shouldReduceMotion = useReducedMotion();
  const shouldAnimate = enableAnimations && !shouldReduceMotion;

  // Generate circular dots positions
  const generateDots = (count: number, radius: number, centerX: number, centerY: number) => {
    const dots = [];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * 2 * Math.PI;
      const x = Math.round((centerX + radius * Math.cos(angle)) * 1000) / 1000;
      const y = Math.round((centerY + radius * Math.sin(angle)) * 1000) / 1000;
      dots.push({ x, y, angle, delay: i * 0.02 });
    }
    return dots;
  };

  const outerDots = generateDots(outerDotsCount!, 130, 160, 160);
  const innerDots = generateDots(innerDotsCount!, 100, 160, 160);

  // Animation variants
  const containerVariants = {
    hidden: {
      opacity: 0,
      y: 20,
      scale: 0.95
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring" as const,
        stiffness: 300,
        damping: 30,
        staggerChildren: 0.08,
        delayChildren: 0.1,
      }
    }
  };

  const dotVariants = {
    hidden: {
      opacity: 0,
      scale: 0,
    },
    visible: {
      opacity: 0.6,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut" as const,
      }
    }
  };

  return (
    <motion.div
      className="w-full max-w-md"
      initial={shouldAnimate ? "hidden" : "visible"}
      animate="visible"
      variants={shouldAnimate ? containerVariants : {}}
    >
      <motion.div
        className={`${backgroundColor} ${borderColor} border rounded-xl overflow-hidden shadow-lg`}
      >

        {/* Middle Section - Dots */}
        <div className="relative pl-4 pr-8 pb-4 pt-8 overflow-hidden">
          {/* Blur backgrounds */}
          <div className={`absolute inset-0 ${backgroundColor} backdrop-blur-[2px] rounded-lg`} />

          {/* Dots Container */}
          <div className="relative w-[20rem] h-[20rem] mx-auto">
            <svg className="w-full h-full" viewBox="0 0 320 320">
              {/* Outer dots */}
              {outerDots.map((dot, index) => (
                <motion.circle
                  key={`outer-${index}`}
                  cx={dot.x}
                  cy={dot.y}
                  r="10"
                  fill="currentColor"
                  style={{ color: '#5A8CEF' }}
                  variants={shouldAnimate ? dotVariants : {}}
                  initial="hidden"
                  animate="visible"
                />
              ))}

              {/* Inner dots */}
              {innerDots.map((dot, index) => (
                <motion.circle
                  key={`inner-${index}`}
                  cx={dot.x}
                  cy={dot.y}
                  r="10"
                  fill="currentColor"
                  style={{ color: '#4B7A63' }}
                  variants={shouldAnimate ? dotVariants : {}}
                  initial="hidden"
                  animate="visible"
                />
              ))}
            </svg>

            {/* Center Text Overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none -mt-16 -ml-8">
              <div className="text-center" style={{ zIndex: 20 }}>
                <motion.div 
                  className="text-xl font-medium text-foreground mb-2"
                  initial={shouldAnimate ? { opacity: 0, y: -10, scale: 0.95 } : {}}
                  animate={shouldAnimate ? { opacity: 1, y: 0, scale: 1 } : {}}
                  transition={{ 
                    delay: 0.3,
                    type: "spring",
                    stiffness: 400,
                    damping: 25,
                    mass: 0.6
                  }}
                >
                  SOLDE MENSUEL
                </motion.div>
                <motion.div 
                  className={`text-5xl font-bold ${soldeMensuel! >= 0 ? 'text-primary' : 'text-destructive'}`}
                  initial={shouldAnimate ? { opacity: 0, y: 20, scale: 0.8, filter: "blur(4px)" } : {}}
                  animate={shouldAnimate ? { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" } : {}}
                  transition={{ 
                    delay: 0.5,
                    type: "spring",
                    stiffness: 300,
                    damping: 28,
                    mass: 0.8
                  }}
                >
                  {soldeMensuel! >= 0 ? '+' : ''}{soldeMensuel!.toLocaleString('fr-FR')} €
                </motion.div>
              </div>
            </div>
          </div>

          {/* Gradient fade overlay for bottom half - covers entire card */}
          <div
            className="absolute -inset-4 pointer-events-none rounded-xl"
            style={{
              background: 'linear-gradient(to bottom, transparent 0%, transparent 35%, rgb(from var(--card) r g b / 0.8) 45%, rgb(from var(--card) r g b / 0.9) 55%, rgb(from var(--card) r g b / 1) 65%)',
              zIndex: 5
            }}
          />

          {/* Bottom Section */}
          <div className="absolute bottom-0 left-0 right-0 px-6 pb-6 pt-4" style={{ zIndex: 10 }}>
            <div className="flex items-start justify-between">
              {/* Revenus Section */}
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-2">
                  <motion.div
                    className="w-0.5 h-4 rounded-full"
                    style={{ backgroundColor: '#5A8CEF' }}
                    initial={shouldAnimate ? { opacity: 0, scaleY: 0 } : {}}
                    animate={shouldAnimate ? { opacity: 1, scaleY: 1 } : {}}
                    transition={{ delay: 0.4, type: "spring" }}
                  />
                  <motion.div
                    className="text-sm font-medium text-muted-foreground"
                    initial={shouldAnimate ? { opacity: 0, y: 20 } : {}}
                    animate={shouldAnimate ? { opacity: 1, y: 0 } : {}}
                    transition={{ delay: 0.5 }}
                  >
                    Revenus
                  </motion.div>
                </div>
                <div className="flex flex-col">
                  <motion.div
                    className="text-xl font-bold text-primary text-left"
                    initial={shouldAnimate ? { opacity: 0, y: -10 } : {}}
                    animate={shouldAnimate ? { opacity: 1, y: 0 } : {}}
                    transition={{ delay: 0.6 }}
                  >
                    +{totalRevenus!.toLocaleString('fr-FR')} €
                  </motion.div>
                </div>
              </div>

              {/* Charges Section */}
              <div className="flex flex-col items-center gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <motion.div
                    className="w-0.5 h-4 rounded-full"
                    style={{ backgroundColor: '#4B7A63' }}
                    initial={shouldAnimate ? { opacity: 0, scaleY: 0 } : {}}
                    animate={shouldAnimate ? { opacity: 1, scaleY: 1 } : {}}
                    transition={{ delay: 0.8, type: "spring" }}
                  />
                  <motion.div
                    className="text-sm font-medium text-muted-foreground"
                    initial={shouldAnimate ? { opacity: 0, y: 20 } : {}}
                    animate={shouldAnimate ? { opacity: 1, y: 0 } : {}}
                    transition={{ delay: 0.9 }}
                  >
                    Charges
                  </motion.div>
                </div>
                <div className="flex flex-col">
                  <motion.div
                    className="text-xl font-bold text-destructive text-left"
                    initial={shouldAnimate ? { opacity: 0, y: -10 } : {}}
                    animate={shouldAnimate ? { opacity: 1, y: 0 } : {}}
                    transition={{ delay: 1.0 }}
                  >
                    -{totalCharges!.toLocaleString('fr-FR')} €
                  </motion.div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </motion.div>
    </motion.div>
  );
}