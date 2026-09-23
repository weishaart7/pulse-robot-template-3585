// Adapted from Hyperiux Vault (https://vault.hyperiux.com) "Elevate Navbar"
// for Kairos: pure black pill, no logo, no dropdown thumbnails, CTA = login.

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";

/* ---------- inline icons ---------- */
function ChevronDown({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
function ChevronRight({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
function Menu({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}
function X({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

/* ---------- shared types + defaults ---------- */
export interface ElevateDropdownItem {
  title: string;
  href: string;
}
export interface ElevateMenuItem {
  name: string;
  href: string;
  isDropdown: boolean;
  dropdown?: ElevateDropdownItem[] | null;
}
export interface ElevateCta {
  label: string;
  href: string;
}

const DEFAULT_MENU_ITEMS: ElevateMenuItem[] = [
  { name: "Fonctionnalités", href: "#fonctionnalites", isDropdown: false, dropdown: null },
  { name: "Tarifs", href: "#tarifs", isDropdown: false, dropdown: null },
  { name: "À propos", href: "#a-propos", isDropdown: false, dropdown: null },
];

const DEFAULT_CTA: ElevateCta = { label: "Se connecter", href: "/login" };

/* ---------- focus trap ---------- */
const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

const isVisible = (element?: HTMLElement | null): boolean => {
  if (!element || element.hidden) {
    return false;
  }

  const style = window.getComputedStyle(element);

  if (style.visibility === "hidden" || style.visibility === "collapse") {
    return false;
  }

  return element.getClientRects().length > 0;
};

const getFocusableElements = (container?: HTMLElement | null): HTMLElement[] => {
  if (!container) {
    return [];
  }

  return (
    Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)) as HTMLElement[]
  ).filter(isVisible);
};

interface UseFocusTrapParams {
  active: boolean;
  containerRef: RefObject<HTMLElement | null>;
  initialFocusRef?: RefObject<HTMLElement | null>;
  onEscape?: () => void;
}

function useFocusTrap({
  active,
  containerRef,
  initialFocusRef,
  onEscape,
}: UseFocusTrapParams) {
  const onEscapeRef = useRef(onEscape);
  onEscapeRef.current = onEscape;

  useEffect(() => {
    if (!active) {
      return;
    }

    const container = containerRef.current;

    if (!container) {
      return;
    }

    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const focusInitial = () => {
      const target =
        initialFocusRef?.current ??
        getFocusableElements(container)[0] ??
        container;

      if (!(target instanceof HTMLElement)) {
        return;
      }

      if (target === container && !container.hasAttribute("tabindex")) {
        container.setAttribute("tabindex", "-1");
      }

      target.focus();
    };

    const focusFrame = requestAnimationFrame(focusInitial);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onEscapeRef.current?.();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusable = getFocusableElements(container);

      if (!focusable.length) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey) {
        if (activeElement === first || !container.contains(activeElement)) {
          event.preventDefault();
          last.focus();
        }

        return;
      }

      if (activeElement === last || !container.contains(activeElement)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", onKeyDown);

      if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus();
      }
    };
  }, [active, containerRef, initialFocusRef]);
}

/* ---------- desktop nav ---------- */
const DROPDOWN_ITEM_OFFSET_Y = -8;
const NAV_TEXT_DURATION = 0.35;
const CTA_DURATION = 0.4;
const DROPDOWN_POINTER_DELAY = 0.03;

const DIMMED_TEXT_COLOR = "rgba(255,255,255,0.5)";
const ACTIVE_TEXT_COLOR = "rgba(255,255,255,1)";
const DEFAULT_CTA_BACKGROUND = "#fff";
const HOVER_CTA_BACKGROUND = "#000";

interface ElevateTextSwapData {
  defaultText: Element | null;
  hoverText: Element | null;
}

interface ElevateNavbarDesktopProps {
  menuItems?: ElevateMenuItem[];
  cta?: ElevateCta;
  navTextDuration?: number;
  ctaDuration?: number;
  activeColor?: string;
  inactiveColor?: string;
  ease?: string;
  dropdownItemOffsetY?: number;
  dropdownPointerDelay?: number;
  staggerItems?: boolean;
  ctaBackground?: string;
  ctaHoverBackground?: string;
}

function ElevateNavbarDesktop({
  menuItems = DEFAULT_MENU_ITEMS,
  cta = DEFAULT_CTA,
  navTextDuration = NAV_TEXT_DURATION,
  ctaDuration = CTA_DURATION,
  activeColor = ACTIVE_TEXT_COLOR,
  inactiveColor = DIMMED_TEXT_COLOR,
  ease = "power2.out",
  dropdownItemOffsetY = DROPDOWN_ITEM_OFFSET_Y,
  dropdownPointerDelay = DROPDOWN_POINTER_DELAY,
  staggerItems = true,
  ctaBackground = DEFAULT_CTA_BACKGROUND,
  ctaHoverBackground = HOVER_CTA_BACKGROUND,
}: ElevateNavbarDesktopProps) {
  const navWrapRef = useRef<HTMLDivElement | null>(null);
  const navLinksRef = useRef<(HTMLAnchorElement | null)[]>([]);
  const ctaRef = useRef<HTMLAnchorElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const dropdownItemsRef = useRef<(HTMLDivElement | null)[]>([]);
  const dropdownTextDataRef = useRef<(ElevateTextSwapData | null)[]>([]);
  const linkDataRef = useRef<(ElevateTextSwapData | null)[]>([]);

  const activeDropdownIndexRef = useRef<number | null>(null);
  const isPointerInsideDropdownRef = useRef(false);
  const hideCallRef = useRef<gsap.core.Tween | null>(null);
  const switchTweenRef = useRef<gsap.core.Tween | null>(null);
  const itemTweenRef = useRef<gsap.core.Timeline | gsap.core.Tween | null>(null);

  const [renderedDropdownIndex, setRenderedDropdownIndexState] = useState<number | null>(null);
  const [activeChevronIndex, setActiveChevronIndex] = useState<number | null>(null);
  const reduceMotion = useCallback(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true,
    []
  );

  const killHideCall = useCallback(() => {
    if (!hideCallRef.current) return;

    hideCallRef.current.kill();
    hideCallRef.current = null;
  }, []);

  const killSwitchTween = useCallback(() => {
    if (!switchTweenRef.current) return;

    switchTweenRef.current.kill();
    switchTweenRef.current = null;
  }, []);

  const killItemTween = useCallback(() => {
    if (!itemTweenRef.current) return;

    itemTweenRef.current.kill();
    itemTweenRef.current = null;
  }, []);

  const getCurrentDropdownItems = useCallback(() => {
    return dropdownItemsRef.current.filter(Boolean) as HTMLDivElement[];
  }, []);

  const setRenderedDropdownIndex = useCallback((index: number | null) => {
    dropdownItemsRef.current = [];
    dropdownTextDataRef.current = [];
    setRenderedDropdownIndexState(index);
  }, []);

  const showWrapper = useCallback(() => {
    if (!dropdownRef.current) return;

    gsap.set(dropdownRef.current, {
      autoAlpha: 1,
      pointerEvents: "auto",
    });
  }, []);

  const hideWrapper = useCallback(() => {
    if (!dropdownRef.current) return;

    gsap.set(dropdownRef.current, {
      autoAlpha: 0,
      pointerEvents: "none",
    });
  }, []);

  const setNavVisualState = useCallback((activeIndex: number | null) => {
    navLinksRef.current.forEach((linkElement, index) => {
      if (!linkElement) return;

      const color =
        activeIndex !== null && index !== activeIndex
          ? inactiveColor
          : activeColor;

      if (reduceMotion()) {
        gsap.set(linkElement, { color });
        return;
      }

      gsap.to(linkElement, {
        color,
        duration: navTextDuration,
        ease,
        overwrite: true,
      });
    });
  }, [activeColor, ease, inactiveColor, navTextDuration, reduceMotion]);

  const animateTextSwap = useCallback((item: ElevateTextSwapData | null, isEntering: boolean) => {
    if (!item) return;

    if (reduceMotion()) {
      gsap.set(item.defaultText, { yPercent: 0 });
      gsap.set(item.hoverText, { yPercent: 100 });
      return;
    }

    gsap
      .timeline({
        defaults: {
          duration: navTextDuration,
          ease,
          overwrite: true,
        },
      })
      .to(item.defaultText, { yPercent: isEntering ? -100 : 0 }, 0)
      .to(item.hoverText, { yPercent: isEntering ? 0 : 100 }, 0);
  }, [ease, navTextDuration, reduceMotion]);

  const initDropdownItemText = useCallback(() => {
    dropdownTextDataRef.current = dropdownItemsRef.current.map((itemElement) => {
      if (!itemElement) return null;

      return {
        defaultText: itemElement.querySelector("[data-default]"),
        hoverText: itemElement.querySelector("[data-hover]"),
      };
    });

    dropdownTextDataRef.current.forEach((item) => {
      if (!item) return;

      gsap.set(item.defaultText, { yPercent: 0 });
      gsap.set(item.hoverText, { yPercent: 100 });
    });
  }, []);

  const animateDropdownItemsIn = useCallback(() => {
    const dropdownItems = getCurrentDropdownItems();

    if (!dropdownItems.length) return;

    killItemTween();
    gsap.killTweensOf(dropdownItems);

    if (reduceMotion()) {
      gsap.set(dropdownItems, {
        opacity: 1,
        y: 0,
        pointerEvents: "auto",
      });
      return;
    }

    gsap.set(dropdownItems, {
      opacity: 0,
      y: dropdownItemOffsetY,
      pointerEvents: "auto",
    });

    itemTweenRef.current = gsap.timeline({
      overwrite: true,
    });

    itemTweenRef.current.to(dropdownItems, {
      y: 0,
      opacity: 1,
      duration: navTextDuration,
      stagger: staggerItems ? 0.025 : 0,
      ease,
    });
  }, [dropdownItemOffsetY, ease, getCurrentDropdownItems, killItemTween, navTextDuration, reduceMotion, staggerItems]);

  const animateDropdownItemsOut = useCallback(
    (onComplete?: () => void) => {
      const dropdownItems = getCurrentDropdownItems();

      if (!dropdownItems.length) {
        onComplete?.();
        return;
      }

      killItemTween();
      gsap.killTweensOf(dropdownItems);

      if (reduceMotion()) {
        gsap.set(dropdownItems, {
          y: dropdownItemOffsetY,
          opacity: 0,
          pointerEvents: "none",
        });
        onComplete?.();
        return;
      }

      itemTweenRef.current = gsap.timeline({
        overwrite: true,
        onStart: () => {
          gsap.set(dropdownItems, {
            pointerEvents: "none",
          });
        },
        onComplete,
      });

      itemTweenRef.current.to(dropdownItems, {
        y: dropdownItemOffsetY,
        opacity: 0,
        duration: navTextDuration,
        stagger: staggerItems ? 0.015 : 0,
        ease,
      });
    },
    [dropdownItemOffsetY, ease, getCurrentDropdownItems, killItemTween, navTextDuration, reduceMotion, staggerItems]
  );

  const closeDropdown = useCallback(() => {
    killHideCall();
    killSwitchTween();

    activeDropdownIndexRef.current = null;
    setActiveChevronIndex(null);

    animateDropdownItemsOut(() => {
      if (
        activeDropdownIndexRef.current !== null ||
        isPointerInsideDropdownRef.current
      ) {
        return;
      }

      setRenderedDropdownIndex(null);
      hideWrapper();
    });
  }, [
    animateDropdownItemsOut,
    hideWrapper,
    killHideCall,
    killSwitchTween,
    setRenderedDropdownIndex,
  ]);

  const openDropdownForIndex = useCallback(
    (index: number) => {
      const menuItem = menuItems[index];

      killHideCall();
      killSwitchTween();

      if (!menuItem?.isDropdown) return;

      activeDropdownIndexRef.current = index;
      isPointerInsideDropdownRef.current = false;

      showWrapper();

      if (renderedDropdownIndex === null) {
        setRenderedDropdownIndex(index);
        return;
      }

      if (renderedDropdownIndex === index) {
        const dropdownItems = getCurrentDropdownItems();

        if (!dropdownItems.length) return;

        killItemTween();
        gsap.killTweensOf(dropdownItems);

        if (reduceMotion()) {
          gsap.set(dropdownItems, {
            y: 0,
            opacity: 1,
            pointerEvents: "auto",
          });
          return;
        }

        gsap.set(dropdownItems, {
          pointerEvents: "auto",
        });

        itemTweenRef.current = gsap.to(dropdownItems, {
          y: 0,
          opacity: 1,
          duration: navTextDuration,
          stagger: 0.02,
          ease,
          overwrite: true,
        });

        return;
      }

      switchTweenRef.current = gsap.delayedCall(0, () => {
        animateDropdownItemsOut(() => {
          if (activeDropdownIndexRef.current === null) return;

          setRenderedDropdownIndex(activeDropdownIndexRef.current);
        });
      });
    },
    [
      animateDropdownItemsOut,
      ease,
      getCurrentDropdownItems,
      killHideCall,
      killItemTween,
      killSwitchTween,
      menuItems,
      navTextDuration,
      reduceMotion,
      renderedDropdownIndex,
      setRenderedDropdownIndex,
      showWrapper,
    ]
  );

  const scheduleCloseDropdown = useCallback(() => {
    killHideCall();

    if (reduceMotion()) {
      if (isPointerInsideDropdownRef.current) return;
      closeDropdown();
      return;
    }

    hideCallRef.current = gsap.delayedCall(dropdownPointerDelay, () => {
      if (isPointerInsideDropdownRef.current) return;

      closeDropdown();
    });
  }, [closeDropdown, dropdownPointerDelay, killHideCall, reduceMotion]);

  const onHeaderMouseEnter = useCallback(() => {
    killHideCall();
  }, [killHideCall]);

  const onHeaderMouseLeave = useCallback(() => {
    killHideCall();
    killSwitchTween();

    activeDropdownIndexRef.current = null;
    isPointerInsideDropdownRef.current = false;

    setActiveChevronIndex(null);
    setNavVisualState(null);

    animateDropdownItemsOut(() => {
      setRenderedDropdownIndex(null);
      hideWrapper();
    });
  }, [
    animateDropdownItemsOut,
    hideWrapper,
    killHideCall,
    killSwitchTween,
    setNavVisualState,
    setRenderedDropdownIndex,
  ]);

  const onNavItemEnter = useCallback(
    (index: number) => {
      const item = linkDataRef.current[index];

      if (!item) return;

      killHideCall();
      animateTextSwap(item, true);
      setNavVisualState(index);

      if (menuItems[index]?.isDropdown) {
        setActiveChevronIndex(index);
        activeDropdownIndexRef.current = index;
        openDropdownForIndex(index);
        return;
      }

      setActiveChevronIndex(null);
      activeDropdownIndexRef.current = null;
      closeDropdown();
    },
    [
      animateTextSwap,
      closeDropdown,
      killHideCall,
      menuItems,
      openDropdownForIndex,
      setNavVisualState,
    ]
  );

  const onNavItemLeave = useCallback(
    (index: number) => {
      const item = linkDataRef.current[index];

      if (!item) return;

      animateTextSwap(item, false);

      if (menuItems[index]?.isDropdown) {
        return;
      }

      setNavVisualState(null);
    },
    [animateTextSwap, menuItems, setNavVisualState]
  );

  const onCtaHover = useCallback((isEntering: boolean = true) => {
    const ctaElement = ctaRef.current;

    if (!ctaElement) return;

    const defaultText = ctaElement.querySelector("[data-default]");
    const hoverText = ctaElement.querySelector("[data-hover]");

    if (reduceMotion()) {
      gsap.set(ctaElement, {
        backgroundColor: isEntering
          ? ctaHoverBackground
          : ctaBackground,
        color: isEntering ? "#fff" : "#000",
      });
      gsap.set(defaultText, { yPercent: 0 });
      gsap.set(hoverText, { yPercent: 100 });
      return;
    }

    gsap
      .timeline({
        defaults: {
          duration: ctaDuration,
          ease,
          overwrite: true,
        },
      })
      .to(
        ctaElement,
        {
          backgroundColor: isEntering
            ? ctaHoverBackground
            : ctaBackground,
        },
        0
      )
      .to(defaultText, { yPercent: isEntering ? -100 : 0 }, 0)
      .to(hoverText, { yPercent: isEntering ? 0 : 100 }, 0);
  }, [ctaBackground, ctaDuration, ctaHoverBackground, ease, reduceMotion]);

  const onDropdownMouseEnter = useCallback(() => {
    isPointerInsideDropdownRef.current = true;
    killHideCall();
    showWrapper();
  }, [killHideCall, showWrapper]);

  const onDropdownMouseLeave = useCallback(() => {
    isPointerInsideDropdownRef.current = false;
    scheduleCloseDropdown();
  }, [scheduleCloseDropdown]);

  const onDropdownItemEnter = useCallback(
    (index: number) => {
      animateTextSwap(dropdownTextDataRef.current[index], true);
    },
    [animateTextSwap]
  );

  const onDropdownItemLeave = useCallback(
    (index: number) => {
      animateTextSwap(dropdownTextDataRef.current[index], false);
    },
    [animateTextSwap]
  );

  useLayoutEffect(() => {
    const context = gsap.context(() => {
      linkDataRef.current = navLinksRef.current.map((linkElement) => {
        if (!linkElement) return null;

        return {
          defaultText: linkElement.querySelector("[data-default]"),
          hoverText: linkElement.querySelector("[data-hover]"),
        };
      });

      linkDataRef.current.forEach((item) => {
        if (!item) return;

        gsap.set(item.defaultText, { yPercent: 0 });
        gsap.set(item.hoverText, { yPercent: 100 });
      });

      if (ctaRef.current) {
        const defaultText = ctaRef.current.querySelector("[data-default]");
        const hoverText = ctaRef.current.querySelector("[data-hover]");

        gsap.set(defaultText, { yPercent: 0 });
        gsap.set(hoverText, { yPercent: 100 });
      }

      hideWrapper();
    }, navWrapRef);

    return () => context.revert();
  }, [hideWrapper]);

  useLayoutEffect(() => {
    if (renderedDropdownIndex === null) return;

    initDropdownItemText();
    animateDropdownItemsIn();
  }, [animateDropdownItemsIn, initDropdownItemText, renderedDropdownIndex]);

  useEffect(() => {
    return () => {
      killHideCall();
      killSwitchTween();
      killItemTween();
    };
  }, [killHideCall, killItemTween, killSwitchTween]);

  const dropdownItems =
    renderedDropdownIndex !== null
      ? menuItems[renderedDropdownIndex]?.dropdown || []
      : [];

  return (
    <div
      ref={navWrapRef}
      onMouseEnter={onHeaderMouseEnter}
      onMouseLeave={onHeaderMouseLeave}
      className="nav-intro-centered fixed left-1/2 top-12 z-50 -translate-x-1/2 rounded-xl bg-black px-1.5 py-1.5 pl-4 text-xs"
    >
      <div className="relative flex h-full w-full items-center gap-6">
        <div className="flex h-full items-center gap-6">
          {menuItems.map((item, index) => {
            const isDropdownActive = activeChevronIndex === index;

            return (
              <a
                key={item.name}
                ref={(element) => {
                  navLinksRef.current[index] = element;
                }}
                href={item.href}
                className="relative flex items-center gap-1 whitespace-nowrap py-1.5 font-mono text-xs uppercase leading-none tracking-wider"
                style={{ color: inactiveColor }}
                onMouseEnter={() => onNavItemEnter(index)}
                onMouseLeave={() => onNavItemLeave(index)}
              >
                <div className="relative h-4 overflow-hidden">
                  <span data-default className="flex h-full items-center">
                    {item.name}
                  </span>

                  <span
                    data-hover
                    className="absolute inset-0 flex items-center"
                  >
                    {item.name}
                  </span>
                </div>

                {item.isDropdown && (
                  <ChevronDown
                    className={`h-3.5 w-3.5 shrink-0 transition-transform duration-100 ease-out motion-reduce:rotate-0 motion-reduce:transition-none ${
                      isDropdownActive ? "-rotate-180" : "rotate-0"
                    }`}
                  />
                )}
              </a>
            );
          })}
        </div>

        <Link
          ref={ctaRef}
          to={cta.href}
          className="relative overflow-hidden whitespace-nowrap rounded-lg bg-white px-4 py-1.5 font-mono text-xs uppercase leading-none tracking-wider text-black"
          onMouseEnter={() => onCtaHover(true)}
          onMouseLeave={() => onCtaHover(false)}
        >
          <span data-default className="block">
            {cta.label}
          </span>

          <span
            data-hover
            className="absolute inset-0 flex items-center justify-center text-white"
          >
            {cta.label}
          </span>
        </Link>

        <div
          ref={dropdownRef}
          onMouseEnter={onDropdownMouseEnter}
          onMouseLeave={onDropdownMouseLeave}
          className="absolute left-0 top-full h-fit w-full pt-2"
        >
          <div className="space-y-2">
            {dropdownItems.map((item, index) => (
              <div
                key={`${renderedDropdownIndex}-${item.title}`}
                ref={(element) => {
                  dropdownItemsRef.current[index] = element;
                }}
                className="link-btns"
              >
                <a
                  href={item.href}
                  onMouseEnter={() => onDropdownItemEnter(index)}
                  onMouseLeave={() => onDropdownItemLeave(index)}
                  className="flex items-center justify-between rounded-lg bg-black px-3 py-2 font-mono text-xs uppercase tracking-wider text-white transition-all duration-300 hover:scale-[1.02] hover:bg-white hover:text-black! motion-reduce:scale-100 motion-reduce:bg-black motion-reduce:text-white! motion-reduce:transition-none"
                >
                  <div className="relative h-4 overflow-hidden uppercase">
                    <span data-default className="flex h-full items-center">
                      {item.title}
                    </span>

                    <span
                      data-hover
                      className="absolute inset-0 flex items-center"
                    >
                      {item.title}
                    </span>
                  </div>

                  <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- mobile nav ---------- */
const PANEL_OFFSET_Y = -20;

interface ElevateNavbarMobileProps {
  menuItems?: ElevateMenuItem[];
  cta?: ElevateCta;
  duration?: number;
  ease?: string;
  activeColor?: string;
  inactiveColor?: string;
}

function ElevateNavbarMobile({
  menuItems = DEFAULT_MENU_ITEMS,
  cta = DEFAULT_CTA,
  duration = 0.35,
  ease = "power3.out",
  inactiveColor = "rgba(255,255,255,0.85)",
}: ElevateNavbarMobileProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeDropdownIndex, setActiveDropdownIndex] = useState<number | null>(null);

  const panelRef = useRef<HTMLDivElement | null>(null);
  const backdropRef = useRef<HTMLDivElement | null>(null);
  const sectionsRef = useRef<(HTMLDivElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const toggleButtonRef = useRef<HTMLButtonElement | null>(null);
  const reduceMotion = () =>
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
  const motionDuration = Math.max(0.05, Number(duration) || 0.35);

  useFocusTrap({
    active: isMenuOpen,
    containerRef,
    initialFocusRef: toggleButtonRef,
    onEscape: () => setIsMenuOpen(false),
  });

  useEffect(() => {
    const panelElement = panelRef.current;
    const backdropElement = backdropRef.current;

    if (!panelElement || !backdropElement) return;

    if (isMenuOpen) {
      gsap.set(panelElement, {
        pointerEvents: "auto",
      });

      if (reduceMotion()) {
        gsap.set(backdropElement, { autoAlpha: 1 });
        gsap.set(panelElement, {
          autoAlpha: 1,
          y: 0,
        });
        return;
      }

      gsap.to(backdropElement, {
        autoAlpha: 1,
        duration: motionDuration * 0.6,
      });

      gsap.fromTo(
        panelElement,
        {
          autoAlpha: 0,
          y: PANEL_OFFSET_Y,
        },
        {
          autoAlpha: 1,
          y: 0,
          duration: motionDuration,
          ease,
        }
      );

      return;
    }

    if (reduceMotion()) {
      gsap.set(panelElement, {
        autoAlpha: 0,
        y: PANEL_OFFSET_Y,
        pointerEvents: "none",
      });
      gsap.set(backdropElement, {
        autoAlpha: 0,
      });
      return;
    }

    gsap.to(panelElement, {
      autoAlpha: 0,
      y: PANEL_OFFSET_Y,
      duration: motionDuration * 0.7,
      onComplete: () => {
        gsap.set(panelElement, {
          pointerEvents: "none",
        });
      },
    });

    gsap.to(backdropElement, {
      autoAlpha: 0,
      duration: motionDuration * 0.6,
    });
  }, [ease, isMenuOpen, motionDuration]);

  useEffect(() => {
    sectionsRef.current.forEach((sectionElement, index) => {
      if (!sectionElement) return;

      const isSectionOpen = activeDropdownIndex === index;

      if (reduceMotion()) {
        gsap.set(sectionElement, {
          height: isSectionOpen ? sectionElement.scrollHeight : 0,
          autoAlpha: isSectionOpen ? 1 : 0,
        });
        return;
      }

      gsap.to(sectionElement, {
        height: isSectionOpen ? sectionElement.scrollHeight : 0,
        autoAlpha: isSectionOpen ? 1 : 0,
        duration: motionDuration,
        ease,
      });
    });
  }, [activeDropdownIndex, ease, motionDuration]);

  return (
    <div
      ref={containerRef}
      className="fixed left-1/2 top-12 z-[999] h-fit -translate-x-1/2"
    >
      <div
        ref={backdropRef}
        onClick={() => setIsMenuOpen(false)}
        className="fixed inset-0 opacity-0"
        style={{ pointerEvents: "none" }}
      />

      <div className="nav-intro flex items-center justify-end rounded-xl border border-white/10 bg-black px-1.5 py-1.5">
        <button
          ref={toggleButtonRef}
          type="button"
          onClick={() => setIsMenuOpen((currentValue) => !currentValue)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-white transition hover:bg-white/10 motion-reduce:transition-none"
          aria-label={isMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
        >
          {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <div
        ref={panelRef}
        className="mt-2 w-[86vw] max-w-xs rounded-xl border border-white/10 bg-black p-2"
        style={{
          pointerEvents: "none",
          opacity: 0,
        }}
      >
        <div className="space-y-1">
          {menuItems.map((item, index) => {
            const hasDropdown = Boolean(item.dropdown);
            const isDropdownOpen = activeDropdownIndex === index;

            if (!hasDropdown) {
              return (
                <a
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center justify-between rounded-lg px-3 py-2 font-mono text-xs uppercase tracking-wider text-white/85 transition hover:bg-white/10 motion-reduce:transition-none"
                  style={{ color: inactiveColor }}
                >
                  {item.name}
                </a>
              );
            }

            return (
              <div key={item.name}>
                <button
                  type="button"
                  onClick={() =>
                    setActiveDropdownIndex((currentIndex) =>
                      currentIndex === index ? null : index
                    )
                  }
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 font-mono text-xs uppercase tracking-wider text-white/85 transition hover:bg-white/10 motion-reduce:transition-none"
                  style={{ color: inactiveColor }}
                >
                  {item.name}

                  <ChevronDown
                    className={`h-4 w-4 transition-transform motion-reduce:rotate-0 motion-reduce:transition-none ${
                      isDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                <div
                  ref={(element) => {
                    sectionsRef.current[index] = element;
                  }}
                  className="overflow-hidden pl-2"
                  style={{
                    height: 0,
                    opacity: 0,
                  }}
                >
                  <div className="space-y-1 pt-1">
                    {(item.dropdown as ElevateDropdownItem[]).map((dropdownItem) => (
                      <a
                        key={dropdownItem.title}
                        href={dropdownItem.href}
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center rounded-xl bg-white/5 px-3 py-2 text-sm uppercase text-white/80 transition hover:bg-white/10 motion-reduce:transition-none"
                        style={{ color: inactiveColor }}
                      >
                        {dropdownItem.title}
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}

          <div className="pt-2">
            <Link
              to={cta.href}
              onClick={() => setIsMenuOpen(false)}
              className="block w-full rounded-lg bg-white py-2.5 text-center font-mono text-xs uppercase tracking-wider text-black"
            >
              {cta.label}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- public wrapper ---------- */
export interface ElevateNavbarProps {
  menuItems?: ElevateMenuItem[];
  cta?: ElevateCta;
  activeColor?: string;
  inactiveColor?: string;
  duration?: number;
  ease?: string;
  staggerItems?: boolean;
}

export function ElevateNavbar({
  menuItems = DEFAULT_MENU_ITEMS,
  cta = DEFAULT_CTA,
  activeColor = ACTIVE_TEXT_COLOR,
  inactiveColor = DIMMED_TEXT_COLOR,
  duration = 0.35,
  ease = "power2.out",
  staggerItems = true,
}: ElevateNavbarProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    const check = () => {
      setIsMobile(window.innerWidth < 768);
    };
    check();
    setHasMounted(true);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (!hasMounted) return null;

  return isMobile ? (
    <ElevateNavbarMobile
      menuItems={menuItems}
      cta={cta}
      duration={duration}
      ease={ease}
      activeColor={activeColor}
      inactiveColor={inactiveColor}
    />
  ) : (
    <ElevateNavbarDesktop
      menuItems={menuItems}
      cta={cta}
      navTextDuration={duration}
      ctaDuration={duration}
      staggerItems={staggerItems}
      activeColor={activeColor}
      inactiveColor={inactiveColor}
      ease={ease}
      ctaBackground="#ffffff"
      ctaHoverBackground="#000000"
    />
  );
}
