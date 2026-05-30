"use client";

import type { GeoUnitId } from "@/types/geo";
import type { QuizDifficulty } from "@/config/difficulty";
import type { QuizAttempt } from "./quizReducer";

const STORAGE_KEY = "geomadrid.quizProgress.v1";
const SCHEMA_VERSION = 1;

export interface MunicipalityStats {
  attempts: number;
  correct: number;
  totalTimeMs: number;
  confusedWith: Record<GeoUnitId, number>;
}

export interface QuizProgress {
  version: number;
  sessionsPlayed: number;
  totalAttempts: number;
  totalCorrect: number;
  bestScoreByDifficulty: Partial<Record<QuizDifficulty, number>>;
  bestStreakByDifficulty: Partial<Record<QuizDifficulty, number>>;
  municipalityStats: Record<GeoUnitId, MunicipalityStats>;
}

function emptyProgress(): QuizProgress {
  return {
    version: SCHEMA_VERSION,
    sessionsPlayed: 0,
    totalAttempts: 0,
    totalCorrect: 0,
    bestScoreByDifficulty: {},
    bestStreakByDifficulty: {},
    municipalityStats: {},
  };
}

function isValidProgress(data: unknown): data is QuizProgress {
  if (typeof data !== "object" || data === null) return false;
  const d = data as Record<string, unknown>;
  return typeof d.version === "number" && typeof d.sessionsPlayed === "number";
}

export function loadProgress(): QuizProgress {
  if (typeof window === "undefined") return emptyProgress();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyProgress();
    const parsed: unknown = JSON.parse(raw);
    if (!isValidProgress(parsed)) return emptyProgress();
    // Migrate old schema if version mismatch
    if (parsed.version !== SCHEMA_VERSION) return emptyProgress();
    return parsed;
  } catch {
    return emptyProgress();
  }
}

function saveProgress(progress: QuizProgress): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Storage quota exceeded or unavailable — silently ignore
  }
}

export function mergeSessionIntoProgress(
  attempts: QuizAttempt[],
  finalScore: number,
  bestStreak: number,
  difficulty: QuizDifficulty
): void {
  const progress = loadProgress();

  progress.sessionsPlayed += 1;
  progress.totalAttempts += attempts.length;
  progress.totalCorrect += attempts.filter((a) => a.correct).length;

  // Best score per difficulty
  const prevBest = progress.bestScoreByDifficulty[difficulty] ?? 0;
  if (finalScore > prevBest) {
    progress.bestScoreByDifficulty[difficulty] = finalScore;
  }

  // Best streak per difficulty
  const prevBestStreak = progress.bestStreakByDifficulty[difficulty] ?? 0;
  if (bestStreak > prevBestStreak) {
    progress.bestStreakByDifficulty[difficulty] = bestStreak;
  }

  // Per-municipality stats
  for (const attempt of attempts) {
    const existing = progress.municipalityStats[attempt.targetId] ?? {
      attempts: 0,
      correct: 0,
      totalTimeMs: 0,
      confusedWith: {},
    };
    existing.attempts += 1;
    if (attempt.correct) existing.correct += 1;
    existing.totalTimeMs += attempt.responseTimeMs;
    if (!attempt.correct && attempt.clickedId !== attempt.targetId) {
      existing.confusedWith[attempt.clickedId] =
        (existing.confusedWith[attempt.clickedId] ?? 0) + 1;
    }
    progress.municipalityStats[attempt.targetId] = existing;
  }

  saveProgress(progress);
}

export function clearProgress(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
