export const CORRIDOR_COLORS: Record<string, string> = {
  "Madrid capital": "#1e3a5f",
  "A-1 / North": "#2563eb",
  "A-2 / Henares": "#7c3aed",
  "A-3 / Southeast": "#db2777",
  "A-4 / South": "#dc2626",
  "A-5 / Southwest": "#ea580c",
  "A-6 / Northwest": "#d97706",
  "M-607 / Colmenar": "#65a30d",
  "Sierra Norte": "#059669",
  "Sierra Oeste": "#0891b2",
  "Vegas / Tajuña / Jarama": "#0284c7",
};

export const DIFFICULTY_COLORS: Record<string, string> = {
  Beginner: "#22c55e",
  Easy: "#84cc16",
  Medium: "#eab308",
  Hard: "#f97316",
  Expert: "#ef4444",
  Nightmare: "#7c3aed",
};

export const POLITICAL_COLORS: Record<string, string> = {
  PP: "#1d4ed8",
  PSOE: "#dc2626",
  "Más Madrid": "#059669",
  Vox: "#84cc16",
  Ciudadanos: "#f97316",
  Other: "#6b7280",
};

export const POPULATION_SIZE_COLORS: Record<string, string> = {
  "Madrid capital": "#1e3a5f",
  "Large city": "#1d4ed8",
  "Mid-sized city": "#3b82f6",
  "Small city": "#60a5fa",
  Town: "#93c5fd",
  Village: "#bfdbfe",
  "Micro municipality": "#eff6ff",
};

export function getCategoryColor(
  layerId: string,
  value: string | null | undefined
): string {
  if (!value) return "#e5e7eb";

  if (layerId === "corridor") return CORRIDOR_COLORS[value] ?? "#9ca3af";
  if (layerId === "learning_difficulty") return DIFFICULTY_COLORS[value] ?? "#9ca3af";
  if (layerId === "municipal_winner") return POLITICAL_COLORS[value] ?? "#9ca3af";
  if (layerId === "population_size") return POPULATION_SIZE_COLORS[value] ?? "#9ca3af";

  return "#9ca3af";
}
