import type { GeoUnitId } from "@/types/geo";
import type { MunicipalityIdentity } from "@/lib/data/loader";
import type { QuizAttempt } from "./quizReducer";
import type { QuizProgress, MunicipalityStats } from "./progressStorage";

export function getAccuracy(progress: QuizProgress): number {
  if (progress.totalAttempts === 0) return 0;
  return Math.round((progress.totalCorrect / progress.totalAttempts) * 100);
}

export function getAccuracyByMunicipality(
  progress: QuizProgress,
  geoUnitId: GeoUnitId
): number | null {
  const stats = progress.municipalityStats[geoUnitId];
  if (!stats || stats.attempts === 0) return null;
  return Math.round((stats.correct / stats.attempts) * 100);
}

export function getMostMissedMunicipalities(
  progress: QuizProgress,
  identity: Record<GeoUnitId, MunicipalityIdentity>,
  limit = 5
): Array<{ id: GeoUnitId; name: string; attempts: number; correct: number; accuracy: number }> {
  return Object.entries(progress.municipalityStats)
    .filter(([, s]) => s.attempts > 0 && s.correct < s.attempts)
    .map(([id, s]) => ({
      id,
      name: identity[id]?.nameDisplay ?? id,
      attempts: s.attempts,
      correct: s.correct,
      accuracy: Math.round((s.correct / s.attempts) * 100),
    }))
    .sort((a, b) => a.accuracy - b.accuracy || b.attempts - a.attempts)
    .slice(0, limit);
}

export function getTopConfusionPairs(
  progress: QuizProgress,
  identity: Record<GeoUnitId, MunicipalityIdentity>,
  limit = 5
): Array<{ targetId: GeoUnitId; targetName: string; confusedWithId: GeoUnitId; confusedWithName: string; count: number }> {
  const pairs: Array<{ targetId: GeoUnitId; targetName: string; confusedWithId: GeoUnitId; confusedWithName: string; count: number }> = [];

  for (const [targetId, stats] of Object.entries(progress.municipalityStats)) {
    for (const [confusedWithId, count] of Object.entries(stats.confusedWith)) {
      if (count > 0) {
        pairs.push({
          targetId,
          targetName: identity[targetId]?.nameDisplay ?? targetId,
          confusedWithId,
          confusedWithName: identity[confusedWithId]?.nameDisplay ?? confusedWithId,
          count,
        });
      }
    }
  }

  return pairs.sort((a, b) => b.count - a.count).slice(0, limit);
}

export function getAverageResponseTime(attempts: QuizAttempt[]): number {
  const correct = attempts.filter((a) => a.correct);
  if (correct.length === 0) return 0;
  const total = correct.reduce((sum, a) => sum + a.responseTimeMs, 0);
  return Math.round(total / correct.length);
}

export interface SessionSummary {
  totalScore: number;
  accuracy: number;
  correctCount: number;
  totalCount: number;
  bestStreak: number;
  averageResponseTimeMs: number;
  fastestCorrectMs: number | null;
  mostMissed: Array<{ id: GeoUnitId; name: string }>;
}

export function summariseSession(
  attempts: QuizAttempt[],
  bestStreak: number,
  identity: Record<GeoUnitId, MunicipalityIdentity>
): SessionSummary {
  const totalScore = attempts.reduce((s, a) => s + a.pointsEarned, 0);
  const correctCount = attempts.filter((a) => a.correct).length;
  const accuracy = attempts.length > 0 ? Math.round((correctCount / attempts.length) * 100) : 0;

  const correctAttempts = attempts.filter((a) => a.correct);
  const averageResponseTimeMs = getAverageResponseTime(attempts);
  const fastestCorrectMs =
    correctAttempts.length > 0
      ? Math.min(...correctAttempts.map((a) => a.responseTimeMs))
      : null;

  // Municipalities missed more than once this session
  const missCounts: Record<GeoUnitId, number> = {};
  for (const a of attempts) {
    if (!a.correct) missCounts[a.targetId] = (missCounts[a.targetId] ?? 0) + 1;
  }
  const mostMissed = Object.entries(missCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([id]) => ({ id, name: identity[id]?.nameDisplay ?? id }));

  return {
    totalScore,
    accuracy,
    correctCount,
    totalCount: attempts.length,
    bestStreak,
    averageResponseTimeMs,
    fastestCorrectMs,
    mostMissed,
  };
}
