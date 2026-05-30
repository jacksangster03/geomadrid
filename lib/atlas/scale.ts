// Colour scale utilities for atlas numeric layers

const GRADIENT_COLORS = {
  blue: ["#eff3ff", "#bdd7e7", "#6baed6", "#2171b5", "#084594"],
  orange: ["#feedde", "#fdbe85", "#fd8d3c", "#e6550d", "#a63603"],
  green: ["#edf8e9", "#bae4b3", "#74c476", "#31a354", "#006d2c"],
  red: ["#fee5d9", "#fcae91", "#fb6a4a", "#de2d26", "#a50f15"],
  purple: ["#f2f0f7", "#cbc9e2", "#9e9ac8", "#756bb1", "#54278f"],
  diverging: ["#d73027", "#fc8d59", "#fee090", "#e0f3f8", "#91bfdb", "#4575b4"],
};

export function numericToColor(
  value: number,
  min: number,
  max: number,
  palette: keyof typeof GRADIENT_COLORS = "blue"
): string {
  const colors = GRADIENT_COLORS[palette];
  if (max === min) return colors[Math.floor(colors.length / 2)];
  const ratio = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const idx = ratio * (colors.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.min(colors.length - 1, Math.ceil(idx));
  if (lower === upper) return colors[lower];
  const t = idx - lower;
  return interpolateHex(colors[lower], colors[upper], t);
}

function interpolateHex(a: string, b: string, t: number): string {
  const ra = parseInt(a.slice(1, 3), 16);
  const ga = parseInt(a.slice(3, 5), 16);
  const ba = parseInt(a.slice(5, 7), 16);
  const rb = parseInt(b.slice(1, 3), 16);
  const gb = parseInt(b.slice(3, 5), 16);
  const bb = parseInt(b.slice(5, 7), 16);
  const r = Math.round(ra + (rb - ra) * t);
  const g = Math.round(ga + (gb - ga) * t);
  const blue = Math.round(ba + (bb - ba) * t);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${blue.toString(16).padStart(2, "0")}`;
}

export function computeExtent(values: number[]): { min: number; max: number } {
  const valid = values.filter((v) => v != null && !isNaN(v));
  if (!valid.length) return { min: 0, max: 1 };
  return { min: Math.min(...valid), max: Math.max(...valid) };
}

export const NULL_COLOR = "#e5e7eb";
export const HOVER_COLOR = "#fbbf24";
export const SELECTED_COLOR = "#f97316";
export const CORRECT_COLOR = "#22c55e";
export const WRONG_COLOR = "#ef4444";
export const DEFAULT_FILL = "#dbeafe";
export const DEFAULT_OUTLINE = "#93c5fd";
