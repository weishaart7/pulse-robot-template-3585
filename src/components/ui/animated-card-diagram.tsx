"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// --- Utility Function (from @/lib/utils) ---

/**
 * A utility function to conditionally join class names.
 * Requires `clsx` and `tailwind-merge` to be installed.
 * `npm install clsx tailwind-merge`
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Card Components ---

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export function AnimatedCard({ className, ...props }: CardProps) {
  return (
    <div
      role="region"
      aria-labelledby="card-title"
      aria-describedby="card-description"
      className={cn(
        "group/animated-card relative w-full overflow-hidden rounded-2xl border-0 shadow-sm",
        className
      )}
      {...props}
    />
  );
}

export function CardBody({ className, ...props }: CardProps) {
  return (
    <div
      role="group"
      className={cn(
        "flex flex-col space-y-1.5 p-6",
        className
      )}
      {...props}
    />
  );
}

interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

export function CardTitle({ className, ...props }: CardTitleProps) {
  return (
    <h3
      className={cn(
        "text-xs font-medium mb-1",
        className
      )}
      {...props}
    />
  );
}

interface CardDescriptionProps
  extends React.HTMLAttributes<HTMLParagraphElement> {}

export function CardDescription({ className, ...props }: CardDescriptionProps) {
  return (
    <p
      className={cn(
        "text-3xl font-bold",
        className
      )}
      {...props}
    />
  );
}

export function CardVisual({ className, ...props }: CardProps) {
  return (
    <div
      className={cn("h-[140px] w-full overflow-hidden", className)}
      {...props}
    />
  );
}

// --- Visual2 Component and its Sub-components ---

interface Visual2Props {
  mainColor?: string;
  secondaryColor?: string;
  gridColor?: string;
  percentage?: number;
  amount?: string;
}

export function Visual2({
  mainColor = "#1B3EB3",
  secondaryColor = "#E3F4FF",
  gridColor = "#1B3EB315",
  percentage = 75,
  amount = "0 €",
}: Visual2Props) {
  const [hovered, setHovered] = useState(false);

  return (
    <>
      <div
        className="absolute inset-0 z-20"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={
          {
            "--color": mainColor,
            "--secondary-color": secondaryColor,
          } as React.CSSProperties
        }
      />
      <div className="relative h-[140px] w-full overflow-hidden rounded-t-2xl">
        <Layer1
          hovered={hovered}
          color={mainColor}
          secondaryColor={secondaryColor}
          percentage={percentage}
        />
        <Layer2 color={mainColor} amount={amount} />
        <Layer3 color={mainColor} />
        <Layer4
          color={mainColor}
          secondaryColor={secondaryColor}
          hovered={hovered}
        />
        <EllipseGradient color={mainColor} />
        <GridLayer color={gridColor} />
      </div>
    </>
  );
}

interface LayerProps {
  color: string;
  secondaryColor?: string;
  hovered?: boolean;
  percentage?: number;
  amount?: string;
}

const EllipseGradient: React.FC<{ color: string }> = ({ color }) => {
  return (
    <div className="absolute inset-0 z-[5] flex h-full w-full items-center justify-center">
      <svg
        width="100%"
        height="140"
        viewBox="0 0 356 140"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        <rect width="356" height="140" fill="url(#paint0_radial_12_207)" />
        <defs>
          <radialGradient
            id="paint0_radial_12_207"
            cx="0"
            cy="0"
            r="1"
            gradientUnits="userSpaceOnUse"
            gradientTransform="translate(178 70) rotate(90) scale(70 178)"
          >
            <stop stopColor={color} stopOpacity="0.25" />
            <stop offset="0.34" stopColor={color} stopOpacity="0.15" />
            <stop offset="1" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>
    </div>
  );
};

const GridLayer: React.FC<{ color: string }> = ({ color }) => {
  return (
    <div
      style={{ "--grid-color": color } as React.CSSProperties}
      className="pointer-events-none absolute inset-0 z-[4] h-full w-full bg-transparent bg-[linear-gradient(to_right,var(--grid-color)_1px,transparent_1px),linear-gradient(to_bottom,var(--grid-color)_1px,transparent_1px)] bg-[size:20px_20px] bg-center opacity-70 [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_60%,transparent_100%)]"
    />
  );
};

const Layer1: React.FC<LayerProps> = ({ hovered, color, secondaryColor, percentage = 75 }) => {
  const [mainProgress, setMainProgress] = useState(percentage);
  const [secondaryProgress, setSecondaryProgress] = useState(0);

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    if (hovered) {
      timeout = setTimeout(() => {
        setMainProgress(90);
        setSecondaryProgress(100);
      }, 200);
    } else {
      setMainProgress(percentage);
      setSecondaryProgress(0);
    }

    return () => {
      clearTimeout(timeout);
    };
  }, [hovered, percentage]);

  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const mainDashoffset = circumference - (mainProgress / 100) * circumference;
  const secondaryDashoffset =
    circumference - (secondaryProgress / 100) * circumference;

  return (
    <div className="ease-[cubic-bezier(0.6, 0.6, 0, 1)] absolute top-0 left-0 z-[7] flex h-[280px] w-full transform items-center justify-center transition-transform duration-500 group-hover/animated-card:-translate-y-[70px] group-hover/animated-card:scale-110">
      <div className="relative flex h-[100px] w-[100px] items-center justify-center">
        <div className="donut-chart-container relative">
          <svg width="100" height="100" viewBox="0 0 80 80">
            <circle
              cx="40"
              cy="40"
              r={radius}
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              opacity={0.2}
              style={{ color: secondaryColor }}
            />
            <circle
              cx="40"
              cy="40"
              r={radius}
              stroke={color}
              strokeWidth="8"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={mainDashoffset}
              transform="rotate(-90 40 40)"
              style={{
                transition:
                  "stroke-dashoffset 0.5s cubic-bezier(0.6, 0.6, 0, 1)",
              }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-bold text-lg" style={{ color }}>
              {hovered
                ? secondaryProgress > 66
                  ? secondaryProgress
                  : mainProgress
                : mainProgress}
              %
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const Layer2: React.FC<{ color: string; amount?: string }> = ({ color, amount }) => {
  return (
    <div
      className="relative h-full w-full"
      style={{ "--color": color } as React.CSSProperties}
    >
      <div className="ease-[cubic-bezier(0.6, 0.6, 0, 1)] absolute inset-0 z-[6] flex w-full translate-y-0 items-start justify-center bg-transparent p-4 transition-transform duration-500 group-hover/animated-card:translate-y-full">
        <div className="ease-[cubic-bezier(0.6, 0.6, 0, 1)] rounded-md border px-2 py-1.5 opacity-100 backdrop-blur-sm transition-opacity duration-500 group-hover/animated-card:opacity-0" 
             style={{ 
               borderColor: color + '40', 
               backgroundColor: color + '25',
               color: color 
             }}>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 shrink-0 rounded-full bg-[var(--color)]" />
            <p className="text-xs font-medium">Budget mensuel</p>
          </div>
          <p className="mt-1 text-xs opacity-80">
            {amount}
          </p>
        </div>
      </div>
    </div>
  );
};

const Layer3: React.FC<{ color: string }> = ({ color }) => {
  return (
    <div className="ease-[cubic-bezier(0.6, 0.6, 0, 1)] absolute inset-0 z-[6] flex translate-y-full items-center justify-center opacity-0 transition-all duration-500 group-hover/animated-card:translate-y-0 group-hover/animated-card:opacity-100">
      <svg
        width="100%"
        height="140"
        viewBox="0 0 356 140"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        <rect width="356" height="140" fill="url(#paint0_linear_29_3)" />
        <defs>
          <linearGradient
            id="paint0_linear_29_3"
            x1="178"
            y1="0"
            x2="178"
            y2="140"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0.35" stopColor={color} stopOpacity="0" />
            <stop offset="1" stopColor={color} stopOpacity="0.3" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
};

const Layer4: React.FC<LayerProps> = ({ color, secondaryColor, hovered }) => {
  const items = [
    { id: 1, translateX: "80", translateY: "40", text: "Revenus" },
    { id: 2, translateX: "80", translateY: "-40", text: "Charges" },
    { id: 3, translateX: "100", translateY: "0", text: "Épargne" },
    { id: 4, translateX: "-100", translateY: "0", text: "Solde" },
    { id: 5, translateX: "-80", translateY: "40", text: "Objectifs" },
    { id: 6, translateX: "-80", translateY: "-40", text: "Budgets" },
  ];

  return (
    <div className="ease-[cubic-bezier(0.6, 0.6, 0, 1)] absolute inset-0 z-[7] flex items-center justify-center opacity-0 transition-opacity duration-500 group-hover/animated-card:opacity-100">
      {items.map((item, index) => (
        <div
          key={item.id}
          className="ease-[cubic-bezier(0.6, 0.6, 0, 1)] absolute flex items-center justify-center gap-1 rounded-full px-1.5 py-0.5 backdrop-blur-sm transition-all duration-500"
          style={{
            transform: hovered
              ? `translate(${item.translateX}px, ${item.translateY}px)`
              : "translate(0px, 0px)",
            borderColor: color + '40',
            backgroundColor: (index < 3 ? color : secondaryColor) + '70',
            color: color
          }}
        >
          <div
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: index < 3 ? color : secondaryColor }}
          />
          <span className="ml-1 text-[10px] font-medium">
            {item.text}
          </span>
        </div>
      ))}
    </div>
  );
};