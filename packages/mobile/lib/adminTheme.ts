/**
 * Ghaafeedi Music — Admin theme tokens (mobile)
 * Matches web admin: deep navy, gold accents.
 */

export const C = {
  bg:         "#050B1A",
  surface:    "#0B1736",
  surface2:   "#112044",
  border:     "#1A2F5E",
  gold:       "#D4AF37",
  goldLight:  "#F4D27A",
  text:       "#FFFFFF",
  textMuted:  "#94A3B8",
  green:      "#22C55E",
  red:        "#EF4444",
  amber:      "#F59E0B",
  blue:       "#3B82F6",
  grey:       "#64748B",
} as const;

export const T = {
  h1: { fontSize: 22, fontWeight: "700" as const, color: C.text },
  h2: { fontSize: 17, fontWeight: "700" as const, color: C.text },
  h3: { fontSize: 14, fontWeight: "600" as const, color: C.text },
  body: { fontSize: 13, color: C.text },
  muted: { fontSize: 12, color: C.textMuted },
  gold: { fontSize: 13, fontWeight: "600" as const, color: C.gold },
} as const;
