/* ═══════════════════════════════════════════════════
   SHARED DESIGN TOKENS  — import in every component
   Usage:  import { tk } from "../theme"
           const t = tk(dark)   → gives you the right palette
═══════════════════════════════════════════════════ */

export const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:ital,wght@0,400;0,500;1,400&display=swap');`

export const CATEGORY_BADGE = {
  urgent:          { bg:"#3b0f0f", color:"#f87171", border:"#7f1d1d", dot:"#ef4444" },
  action_required: { bg:"#3b2409", color:"#fbbf24", border:"#78350f", dot:"#f59e0b" },
  fyi:             { bg:"#1e1b4b", color:"#a5b4fc", border:"#3730a3", dot:"#6366f1" },
  spam:            { bg:"#1e293b", color:"#94a3b8", border:"#334155", dot:"#475569" },
}

export const CATEGORY_BADGE_LIGHT = {
  urgent:          { bg:"#fff1f2", color:"#be123c", border:"#fecdd3", dot:"#ef4444" },
  action_required: { bg:"#fffbeb", color:"#b45309", border:"#fde68a", dot:"#f59e0b" },
  fyi:             { bg:"#eef2ff", color:"#4338ca", border:"#c7d2fe", dot:"#6366f1" },
  spam:            { bg:"#f8fafc", color:"#475569", border:"#e2e8f0", dot:"#94a3b8" },
}

export const CATEGORY_COLORS = {
  urgent:"#ef4444", action_required:"#f59e0b", fyi:"#6366f1", spam:"#475569",
}

const dark = {
  appBg:         "#080e1c",
  sidebarBg:     "#0d1424",
  sidebarBorder: "#1a2540",
  mainBg:        "#0b1120",
  headerBg:      "rgba(11,17,32,0.92)",
  headerBorder:  "#1a2540",
  cardBg:        "#131c30",
  cardBorder:    "#1e2d4a",
  inputBg:       "#0d1424",
  inputBorder:   "#1e2d4a",
  inputFocus:    "rgba(99,102,241,0.5)",
  inputFocusShadow:"rgba(99,102,241,0.12)",
  textPrimary:   "#ffffff",
  textSecondary: "#f1f5f9",
  textMuted:     "#cbd5e1",
  textFaint:     "#94a3b8",
  accentIndigo:  "#818cf8",
  accentDim:     "rgba(99,102,241,0.1)",
  accentBorder:  "rgba(99,102,241,0.22)",
  accentGlow:    "rgba(99,102,241,0.18)",
  gridLine:      "rgba(99,102,241,0.025)",
  orbColor:      "rgba(79,70,229,0.12)",
  navActiveBg:   "rgba(99,102,241,0.12)",
  navActiveText: "#e0e7ff",
  navIconActive: "rgba(99,102,241,0.2)",
  navIconColor:  "#818cf8",
  rowHover:      "#1a2540",
  divider:       "#111c30",
  scrollThumb:   "#1e2d4a",
  badge:         CATEGORY_BADGE,
  isDark:        true,
}

const light = {
  appBg:         "#f0f4ff",
  sidebarBg:     "#ffffff",
  sidebarBorder: "#d1d9f0",
  mainBg:        "#eef2fc",
  headerBg:      "rgba(238,242,252,0.92)",
  headerBorder:  "#d1d9f0",
  cardBg:        "#ffffff",
  cardBorder:    "#dde3f5",
  inputBg:       "#f5f7ff",
  inputBorder:   "#d1d9f0",
  inputFocus:    "rgba(79,70,229,0.4)",
  inputFocusShadow:"rgba(79,70,229,0.1)",
  textPrimary:   "#0f172a",
  textSecondary: "#1e293b",
  textMuted:     "#64748b",
  textFaint:     "#94a3b8",
  accentIndigo:  "#4f46e5",
  accentDim:     "rgba(79,70,229,0.08)",
  accentBorder:  "rgba(79,70,229,0.2)",
  accentGlow:    "rgba(79,70,229,0.12)",
  gridLine:      "rgba(99,102,241,0.04)",
  orbColor:      "rgba(79,70,229,0.08)",
  navActiveBg:   "rgba(99,102,241,0.12)",
  navActiveText: "#1e1b4b",
  navIconActive: "rgba(99,102,241,0.15)",
  navIconColor:  "#4f46e5",
  rowHover:      "#f5f7ff",
  divider:       "#eef2fc",
  scrollThumb:   "#d1d9f0",
  badge:         CATEGORY_BADGE_LIGHT,
  isDark:        false,
}

export const tk = (isDark) => isDark ? dark : light