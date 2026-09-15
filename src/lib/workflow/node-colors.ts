import type { NodeCategory } from "@/types/workflow";

export interface NodeColorSet {
  /** Icon chip / handle accent color. */
  accent: string;
  /** Soft tint used behind the icon chip. */
  tint: string;
  /** Text color that pairs with the accent (used on chips). */
  text: string;
}

export const NODE_CATEGORY_META: Record<
  NodeCategory,
  { label: string; defaultAccent: string }
> = {
  trigger: { label: "Trigger", defaultAccent: "#39ff14" },
  action: { label: "Action", defaultAccent: "#3d7bfd" },
  logic: { label: "Logic", defaultAccent: "#8b5cf6" },
};

export const NODE_CATEGORY_ORDER: NodeCategory[] = [
  "trigger",
  "action",
  "logic",
];

export function hexToRgba(hex: string, alpha: number): string {
  const value = hex.replace("#", "");
  const full =
    value.length === 3
      ? value
          .split("")
          .map((c) => c + c)
          .join("")
      : value;
  const num = parseInt(full, 16);
  if (Number.isNaN(num) || full.length !== 6) return hex;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** A readable ink color that sits on top of a given accent color. */
export function readableOnAccent(accent: string): string {
  const value = accent.replace("#", "");
  const full =
    value.length === 3
      ? value
          .split("")
          .map((c) => c + c)
          .join("")
      : value;
  const num = parseInt(full, 16);
  if (Number.isNaN(num) || full.length !== 6) return "#2c2c2c";
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  // Perceived luminance (ITU-R BT.601)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#143314" : "#ffffff";
}

export function categoryColorSet(
  category: NodeCategory,
  accentOverride?: string,
): NodeColorSet {
  const accent = accentOverride ?? NODE_CATEGORY_META[category].defaultAccent;
  return {
    accent,
    tint: hexToRgba(accent, 0.14),
    text: readableOnAccent(accent),
  };
}