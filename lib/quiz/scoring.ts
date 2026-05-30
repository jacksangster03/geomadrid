import type { QuizDifficulty } from "@/config/difficulty";
import { difficultyConfigs } from "@/config/difficulty";

export interface ScoreBreakdown {
  base: number;
  speedBonus: number;
  streakBonus: number;
  multiplier: number;
  total: number;
}

export function calcSpeedBonus(responseTimeMs: number): number {
  if (responseTimeMs < 3000) return 50;
  if (responseTimeMs < 6000) return 30;
  if (responseTimeMs < 10000) return 15;
  return 0;
}

export function calcStreakBonus(streakBeforeAnswer: number): number {
  return Math.min(streakBeforeAnswer * 10, 100);
}

export function calcRoundScore(
  correct: boolean,
  responseTimeMs: number,
  streakBeforeAnswer: number,
  difficulty: QuizDifficulty
): ScoreBreakdown {
  if (!correct) {
    return { base: 0, speedBonus: 0, streakBonus: 0, multiplier: difficultyConfigs[difficulty].scoreMultiplier, total: 0 };
  }
  const base = 100;
  const speedBonus = calcSpeedBonus(responseTimeMs);
  const streakBonus = calcStreakBonus(streakBeforeAnswer);
  const multiplier = difficultyConfigs[difficulty].scoreMultiplier;
  const total = Math.floor((base + speedBonus + streakBonus) * multiplier);
  return { base, speedBonus, streakBonus, multiplier, total };
}
