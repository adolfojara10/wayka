"use client";

import { AnimatePresence, motion } from "framer-motion";

import { useTheme } from "@/components/ThemeProvider";
import type { ThemeChoice } from "@/lib/theme";

/**
 * Cycle order: light → dark → system → light → …
 */
const NEXT_CHOICE: Record<ThemeChoice, ThemeChoice> = {
  light: "dark",
  dark: "system",
  system: "light",
};

const LABELS: Record<ThemeChoice, string> = {
  light: "Tema claro (cambiar a oscuro)",
  dark: "Tema oscuro (cambiar a sistema)",
  system: "Tema del sistema (cambiar a claro)",
};

interface IconProps {
  className?: string;
}

function SunIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
    </svg>
  );
}

function SystemIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </svg>
  );
}

const ICONS: Record<ThemeChoice, (props: IconProps) => React.ReactElement> = {
  light: SunIcon,
  dark: MoonIcon,
  system: SystemIcon,
};

export interface ThemeToggleProps {
  className?: string;
}

/**
 * Accessible animated theme toggle.
 *
 * - Fixed 40×40 hit area so swapping icons never causes layout shift.
 * - Framer Motion cross-fades the icon for the active theme.
 * - Cycles light → dark → system → light on each click.
 */
export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const Icon = ICONS[theme];
  const label = LABELS[theme];

  return (
    <button
      type="button"
      onClick={() => setTheme(NEXT_CHOICE[theme])}
      aria-label={label}
      title={label}
      data-theme-choice={theme}
      className={[
        "relative inline-flex h-10 w-10 items-center justify-center",
        "border-foreground/15 rounded-full border",
        "bg-background/70 backdrop-blur-sm",
        "text-foreground transition-colors",
        "hover:bg-foreground/5 focus-visible:outline-none",
        "focus-visible:ring-terracotta focus-visible:ring-2 focus-visible:ring-offset-2",
        "focus-visible:ring-offset-background",
        className ?? "",
      ].join(" ")}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          initial={{ opacity: 0, rotate: -45, scale: 0.6 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, rotate: 45, scale: 0.6 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <Icon className="h-5 w-5" />
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
