import React from "react";

interface GhaafeediLogoProps {
  height?: number;
  /** "navbar" = 44px compact | "footer" = 140px | "page" = 80px */
  variant?: "navbar" | "footer" | "page";
  style?: React.CSSProperties;
}

const SIZES: Record<string, number> = {
  navbar: 44,
  footer: 140,
  page:   80,
};

const GLOWS: Record<string, string> = {
  navbar: "drop-shadow(0 0 12px rgba(212,175,55,0.40))",
  footer: "drop-shadow(0 0 20px rgba(212,175,55,0.45))",
  page:   "drop-shadow(0 0 20px rgba(212,175,55,0.45))",
};

const GLOWS_HOVER: Record<string, string> = {
  navbar: "drop-shadow(0 0 20px rgba(212,175,55,0.75))",
  footer: "drop-shadow(0 0 32px rgba(212,175,55,0.70))",
  page:   "drop-shadow(0 0 28px rgba(212,175,55,0.68))",
};

/**
 * Ghaafeedi Music logo — standard component used in Navbar, Footer, Pages.
 * The HERO treatment is handled by LivingLogoBackground (background watermark) +
 * a text eyebrow in HeroSection. DO NOT use this component inside HeroSection.
 */
export function GhaafeediLogo({ height, variant = "navbar", style }: GhaafeediLogoProps) {
  const h         = height ?? SIZES[variant];
  const filterBase  = GLOWS[variant];
  const filterHover = GLOWS_HOVER[variant];

  return (
    <img
      src="/assets/ghaafeedi-logo-dark.webp"
      alt="Ghaafeedi Music"
      style={{
        height: h,
        width:  "auto",
        objectFit: "contain",
        display: "block",
        filter: filterBase,
        transition: "filter 0.25s ease, transform 0.25s ease",
        cursor: "pointer",
        flexShrink: 0,
        ...style,
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLImageElement;
        el.style.filter    = filterHover;
        el.style.transform = "scale(1.03)";
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLImageElement;
        el.style.filter    = filterBase;
        el.style.transform = "scale(1)";
      }}
    />
  );
}
