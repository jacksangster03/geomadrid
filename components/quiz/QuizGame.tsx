"use client";

import { useReducer, useEffect, useRef, useState, useCallback } from "react";
import type { DifficultyConfig } from "@/config/difficulty";
import type { MunicipalityIdentity } from "@/lib/data/loader";
import { quizReducer, initialState } from "@/lib/quiz/quizReducer";
import { buildTargetList } from "@/lib/quiz/targetSelection";
import { mergeSessionIntoProgress } from "@/lib/quiz/progressStorage";
import { summariseSession } from "@/lib/quiz/quizAnalytics";
import MapWrapper from "@/components/map/MapWrapper";
import QuizHUD from "./QuizHUD";
import QuizPrompt from "./QuizPrompt";
import QuizFeedback from "./QuizFeedback";
import QuizSessionSummary from "./QuizSessionSummary";

interface QuizGameProps {
  geojson: GeoJSON.FeatureCollection;
  identity: Record<string, MunicipalityIdentity>;
  config: DifficultyConfig;
}

export default function QuizGame({ geojson, identity, config }: QuizGameProps) {
  const [state, dispatch] = useReducer(quizReducer, undefined, initialState);
  const [hoveredName, setHoveredName] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const summaryFlushed = useRef(false);

  // Start session immediately when data is ready
  useEffect(() => {
    if (state.status === "idle" && Object.keys(identity).length > 0) {
      const targets = buildTargetList(identity, config.totalRounds);
      dispatch({
        type: "START_SESSION",
        difficulty: config.id,
        targets,
        totalRounds: config.totalRounds,
      });
    }
  }, [identity, config, state.status]);

  // Timer: tick while playing
  useEffect(() => {
    if (state.status === "playing" && state.roundStartedAt !== null) {
      setElapsedMs(0);
      timerRef.current = setInterval(() => {
        setElapsedMs(Date.now() - (state.roundStartedAt ?? Date.now()));
      }, 100);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state.status, state.roundStartedAt]);

  // Persist to localStorage when session completes (once)
  useEffect(() => {
    if (state.status === "complete" && !summaryFlushed.current) {
      summaryFlushed.current = true;
      mergeSessionIntoProgress(
        state.attempts,
        state.score,
        state.bestStreak,
        state.difficulty
      );
    }
  }, [state.status, state.attempts, state.score, state.bestStreak, state.difficulty]);

  const handlePolygonClick = useCallback(
    (id: string, name: string) => {
      if (state.status !== "playing") return;
      dispatch({ type: "SUBMIT_GUESS", clickedId: id, clickedName: name });
    },
    [state.status]
  );

  const handleNext = useCallback(() => {
    dispatch({ type: "NEXT_ROUND" });
    setElapsedMs(0);
  }, []);

  const handlePlayAgain = useCallback(() => {
    summaryFlushed.current = false;
    const targets = buildTargetList(identity, config.totalRounds);
    dispatch({
      type: "START_SESSION",
      difficulty: config.id,
      targets,
      totalRounds: config.totalRounds,
    });
  }, [identity, config]);

  // Session summary screen
  if (state.status === "complete") {
    const summary = summariseSession(state.attempts, state.bestStreak, identity);
    return (
      <QuizSessionSummary
        summary={summary}
        difficulty={state.difficulty}
        publicLabel={config.publicLabel}
        onPlayAgain={handlePlayAgain}
      />
    );
  }

  // Map color overrides during feedback
  const correctId = state.status === "answered" ? state.targetId ?? undefined : undefined;
  const wrongId =
    state.status === "answered" && !state.lastCorrect
      ? state.lastClickedId ?? undefined
      : undefined;

  const isLastRound = state.roundNumber >= state.totalRounds;

  return (
    <div className="flex flex-col h-full">
      {/* HUD */}
      {state.status !== "idle" && (
        <QuizHUD
          roundNumber={state.roundNumber}
          totalRounds={state.totalRounds}
          score={state.score}
          streak={state.streak}
          elapsedMs={elapsedMs}
          publicLabel={config.publicLabel}
          scoreMultiplier={config.scoreMultiplier}
        />
      )}

      {/* Prompt */}
      {(state.status === "playing" || state.status === "answered") && (
        <div className="relative shrink-0">
          <QuizPrompt
            targetName={state.targetName}
            hoveredName={hoveredName}
            showHoverName={config.showHoverName}
          />
        </div>
      )}

      {/* Map — fills remaining space */}
      <div className="flex-1 relative min-h-0">
        <MapWrapper
          geojson={geojson}
          difficulty={config}
          mode="quiz"
          correctId={correctId}
          wrongId={wrongId}
          onPolygonClick={handlePolygonClick}
          onPolygonHover={(_id, name) => setHoveredName(name)}
        />

        {/* Feedback panel overlaid at bottom of map */}
        {state.status === "answered" && (
          <QuizFeedback
            correct={state.lastCorrect ?? false}
            targetName={state.targetName}
            clickedName={state.lastClickedName}
            responseTimeMs={
              state.answeredAt && state.roundStartedAt
                ? state.answeredAt - state.roundStartedAt
                : 0
            }
            pointsEarned={state.lastPointsEarned}
            streakBefore={state.lastCorrect ? state.streak - 1 : state.streak}
            difficulty={state.difficulty}
            feedbackLevel={config.feedbackLevel}
            onNext={handleNext}
            isLastRound={isLastRound}
          />
        )}
      </div>
    </div>
  );
}
