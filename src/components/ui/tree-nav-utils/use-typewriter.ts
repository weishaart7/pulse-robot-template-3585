import * as React from "react";

// true si l'utilisateur a demandé à réduire les animations (réglage système).
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(() =>
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}
