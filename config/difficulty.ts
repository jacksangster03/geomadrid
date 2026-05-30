export type QuizDifficulty = "easy" | "medium" | "hard";

export interface DifficultyConfig {
  id: QuizDifficulty;
  label: string;
  publicLabel: string;
  tagline: string;
  description: string;
  scoreMultiplier: number;
  totalRounds: number;
  showTerrain: boolean;
  showRoads: boolean;
  showRivers: boolean;
  showReservoirs: boolean;
  showTownLabels: boolean;
  showMunicipalityLabels: boolean;
  showHoverHighlight: boolean;
  showHoverName: boolean;
  showTooltip: boolean;
  allowHints: boolean;
  maxHints: number;
  hintPenalty: number;
  allowSearchDuringQuiz: boolean;
  allowZoom: boolean;
  allowPan: boolean;
  feedbackLevel: "detailed" | "standard" | "minimal";
  basemapStyle: "terrain" | "light" | "blank";
  outlineWeight: number;
  speedBonusMax: number;
  speedBonusWindowMs: number;
}

export const difficultyConfigs: Record<QuizDifficulty, DifficultyConfig> = {
  easy: {
    id: "easy",
    label: "easy",
    publicLabel: "Learn",
    tagline: "Full map with labels, terrain and hints.",
    description:
      "The full learning map. See terrain, towns, rivers and municipality names. Use hints if you get stuck.",
    scoreMultiplier: 1.0,
    totalRounds: 20,
    showTerrain: true,
    showRoads: true,
    showRivers: true,
    showReservoirs: true,
    showTownLabels: true,
    showMunicipalityLabels: true,
    showHoverHighlight: true,
    showHoverName: true,
    showTooltip: true,
    allowHints: true,
    maxHints: 6,
    hintPenalty: 20,
    allowSearchDuringQuiz: true,
    allowZoom: true,
    allowPan: true,
    feedbackLevel: "detailed",
    basemapStyle: "terrain",
    outlineWeight: 1.5,
    speedBonusMax: 30,
    speedBonusWindowMs: 5000,
  },
  medium: {
    id: "medium",
    label: "medium",
    publicLabel: "Challenge",
    tagline: "Outlines only. No labels.",
    description:
      "Municipal outlines with no labels or names. Navigate by shape and position.",
    scoreMultiplier: 1.5,
    totalRounds: 20,
    showTerrain: false,
    showRoads: false,
    showRivers: false,
    showReservoirs: false,
    showTownLabels: false,
    showMunicipalityLabels: false,
    showHoverHighlight: true,
    showHoverName: false,
    showTooltip: false,
    allowHints: false,
    maxHints: 0,
    hintPenalty: 0,
    allowSearchDuringQuiz: false,
    allowZoom: true,
    allowPan: true,
    feedbackLevel: "standard",
    basemapStyle: "light",
    outlineWeight: 1.5,
    speedBonusMax: 50,
    speedBonusWindowMs: 8000,
  },
  hard: {
    id: "hard",
    label: "hard",
    publicLabel: "Master",
    tagline: "Blank map. No labels, no hints.",
    description:
      "A blank administrative map. Thin outlines only. No context, no assistance.",
    scoreMultiplier: 2.0,
    totalRounds: 20,
    showTerrain: false,
    showRoads: false,
    showRivers: false,
    showReservoirs: false,
    showTownLabels: false,
    showMunicipalityLabels: false,
    showHoverHighlight: false,
    showHoverName: false,
    showTooltip: false,
    allowHints: false,
    maxHints: 0,
    hintPenalty: 0,
    allowSearchDuringQuiz: false,
    allowZoom: true,
    allowPan: true,
    feedbackLevel: "minimal",
    basemapStyle: "blank",
    outlineWeight: 0.8,
    speedBonusMax: 80,
    speedBonusWindowMs: 12000,
  },
};

export function getDifficultyConfig(id: QuizDifficulty): DifficultyConfig {
  return difficultyConfigs[id];
}

export function calcSpeedBonus(
  config: DifficultyConfig,
  responseTimeMs: number
): number {
  if (responseTimeMs >= config.speedBonusWindowMs) return 0;
  const ratio = 1 - responseTimeMs / config.speedBonusWindowMs;
  return Math.round(config.speedBonusMax * ratio);
}

export function calcStreakMultiplier(streak: number): number {
  return Math.min(1 + streak * 0.1, 2.5);
}

export function calcRoundScore(
  config: DifficultyConfig,
  correct: boolean,
  hintsUsed: number,
  responseTimeMs: number,
  streak: number
): number {
  if (!correct) return 0;
  const base = 100;
  const hintDeduction = hintsUsed * config.hintPenalty;
  const speedBonus = calcSpeedBonus(config, responseTimeMs);
  const streakMult = calcStreakMultiplier(streak);
  return Math.max(
    0,
    Math.round((base - hintDeduction + speedBonus) * config.scoreMultiplier * streakMult)
  );
}
