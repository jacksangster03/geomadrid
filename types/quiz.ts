import type { GeoUnitId } from "./geo";
import type { QuizDifficulty } from "@/config/difficulty";

export interface QuizRound {
  roundNumber: number;
  targetId: GeoUnitId;
  targetName: string;
  clickedId: GeoUnitId | null;
  correct: boolean;
  hintsUsed: number;
  responseTimeMs: number;
  pointsEarned: number;
}

export interface QuizSession {
  sessionId: string;
  difficulty: QuizDifficulty;
  startedAt: number;
  completedAt: number | null;
  rounds: QuizRound[];
  totalScore: number;
  currentStreak: number;
  maxStreak: number;
}

export interface QuizState {
  session: QuizSession | null;
  currentRound: number;
  currentTarget: { id: GeoUnitId; name: string } | null;
  phase: "idle" | "question" | "feedback" | "summary";
  hintsUsed: number;
  roundStartTime: number | null;
}

export type QuizAction =
  | { type: "START_SESSION"; difficulty: QuizDifficulty; targets: Array<{ id: GeoUnitId; name: string }> }
  | { type: "SUBMIT_ANSWER"; clickedId: GeoUnitId }
  | { type: "USE_HINT" }
  | { type: "NEXT_ROUND" }
  | { type: "END_SESSION" }
  | { type: "RESET" };

export interface MunicipalityProgress {
  geoUnitId: GeoUnitId;
  attempts: number;
  correct: number;
  totalTimeMs: number;
  confusedWith: Record<GeoUnitId, number>;
  lastAttemptAt: number;
}

export interface ProgressStore {
  municipalities: Record<GeoUnitId, MunicipalityProgress>;
  sessions: Array<{ sessionId: string; difficulty: QuizDifficulty; score: number; accuracy: number; completedAt: number }>;
}
