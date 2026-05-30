import type { GeoUnitId } from "@/types/geo";
import type { QuizDifficulty } from "@/config/difficulty";
import type { QuizTarget } from "./targetSelection";
import { calcRoundScore } from "./scoring";

export interface QuizAttempt {
  roundNumber: number;
  targetId: GeoUnitId;
  targetName: string;
  clickedId: GeoUnitId;
  clickedName: string;
  correct: boolean;
  responseTimeMs: number;
  pointsEarned: number;
  difficulty: QuizDifficulty;
  timestamp: number;
}

export type QuizStatus = "idle" | "playing" | "answered" | "complete";

export interface QuizState {
  status: QuizStatus;
  difficulty: QuizDifficulty;
  roundNumber: number;
  totalRounds: number;
  targets: QuizTarget[];           // pre-shuffled list for this session
  usedTargetIds: Set<GeoUnitId>;
  targetId: GeoUnitId | null;
  targetName: string;
  score: number;
  streak: number;
  bestStreak: number;
  roundStartedAt: number | null;
  answeredAt: number | null;
  lastClickedId: GeoUnitId | null;
  lastClickedName: string;
  lastCorrect: boolean | null;
  lastPointsEarned: number;
  attempts: QuizAttempt[];
}

export type QuizAction =
  | {
      type: "START_SESSION";
      difficulty: QuizDifficulty;
      targets: QuizTarget[];
      totalRounds: number;
    }
  | { type: "SUBMIT_GUESS"; clickedId: GeoUnitId; clickedName: string }
  | { type: "NEXT_ROUND" }
  | { type: "RESET_SESSION" };

export function initialState(): QuizState {
  return {
    status: "idle",
    difficulty: "medium",
    roundNumber: 0,
    totalRounds: 20,
    targets: [],
    usedTargetIds: new Set(),
    targetId: null,
    targetName: "",
    score: 0,
    streak: 0,
    bestStreak: 0,
    roundStartedAt: null,
    answeredAt: null,
    lastClickedId: null,
    lastClickedName: "",
    lastCorrect: null,
    lastPointsEarned: 0,
    attempts: [],
  };
}

export function quizReducer(state: QuizState, action: QuizAction): QuizState {
  switch (action.type) {
    case "START_SESSION": {
      const first = action.targets[0] ?? null;
      return {
        ...initialState(),
        status: "playing",
        difficulty: action.difficulty,
        totalRounds: action.totalRounds,
        targets: action.targets,
        targetId: first?.id ?? null,
        targetName: first?.name ?? "",
        usedTargetIds: first ? new Set([first.id]) : new Set(),
        roundNumber: 1,
        roundStartedAt: Date.now(),
      };
    }

    case "SUBMIT_GUESS": {
      if (state.status !== "playing" || state.targetId === null) return state;

      const responseTimeMs = state.roundStartedAt
        ? Date.now() - state.roundStartedAt
        : 0;
      const correct = action.clickedId === state.targetId;
      const streakBefore = correct ? state.streak : 0;
      const breakdown = calcRoundScore(
        correct,
        responseTimeMs,
        streakBefore,
        state.difficulty
      );
      const newStreak = correct ? state.streak + 1 : 0;
      const newBestStreak = Math.max(state.bestStreak, newStreak);

      const attempt: QuizAttempt = {
        roundNumber: state.roundNumber,
        targetId: state.targetId,
        targetName: state.targetName,
        clickedId: action.clickedId,
        clickedName: action.clickedName,
        correct,
        responseTimeMs,
        pointsEarned: breakdown.total,
        difficulty: state.difficulty,
        timestamp: Date.now(),
      };

      return {
        ...state,
        status: "answered",
        score: state.score + breakdown.total,
        streak: newStreak,
        bestStreak: newBestStreak,
        answeredAt: Date.now(),
        lastClickedId: action.clickedId,
        lastClickedName: action.clickedName,
        lastCorrect: correct,
        lastPointsEarned: breakdown.total,
        attempts: [...state.attempts, attempt],
      };
    }

    case "NEXT_ROUND": {
      if (state.status !== "answered") return state;

      const isLastRound = state.roundNumber >= state.totalRounds;
      if (isLastRound) {
        return { ...state, status: "complete" };
      }

      // Pick next target from pre-shuffled list
      const nextIndex = state.roundNumber; // 0-based index = current roundNumber (1-based)
      const nextTarget = state.targets[nextIndex] ?? null;

      if (!nextTarget) {
        return { ...state, status: "complete" };
      }

      return {
        ...state,
        status: "playing",
        roundNumber: state.roundNumber + 1,
        targetId: nextTarget.id,
        targetName: nextTarget.name,
        usedTargetIds: new Set([...state.usedTargetIds, nextTarget.id]),
        roundStartedAt: Date.now(),
        answeredAt: null,
        lastClickedId: null,
        lastClickedName: "",
        lastCorrect: null,
        lastPointsEarned: 0,
      };
    }

    case "RESET_SESSION": {
      return initialState();
    }

    default:
      return state;
  }
}
