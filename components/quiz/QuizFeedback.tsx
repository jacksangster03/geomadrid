import type { QuizDifficulty } from "@/config/difficulty";
import type { ScoreBreakdown } from "@/lib/quiz/scoring";
import { calcRoundScore } from "@/lib/quiz/scoring";

interface QuizFeedbackProps {
  correct: boolean;
  targetName: string;
  clickedName: string;
  responseTimeMs: number;
  pointsEarned: number;
  streakBefore: number;
  difficulty: QuizDifficulty;
  feedbackLevel: "detailed" | "standard" | "minimal";
  onNext: () => void;
  isLastRound: boolean;
}

function formatTime(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export default function QuizFeedback({
  correct,
  targetName,
  clickedName,
  responseTimeMs,
  pointsEarned,
  streakBefore,
  difficulty,
  feedbackLevel,
  onNext,
  isLastRound,
}: QuizFeedbackProps) {
  const breakdown = correct
    ? calcRoundScore(true, responseTimeMs, streakBefore, difficulty)
    : null;

  return (
    <div
      className={`absolute bottom-0 left-0 right-0 z-10 border-t shadow-lg transition-all
        ${correct ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}
    >
      <div className="flex items-center justify-between px-5 py-4 gap-4">
        {/* Result */}
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-2xl">{correct ? "✓" : "✗"}</span>
          <div className="min-w-0">
            <p
              className={`text-sm font-semibold ${
                correct ? "text-emerald-800" : "text-red-800"
              }`}
            >
              {correct ? "Correct" : "Wrong"}
            </p>
            {!correct && (
              <p className="text-xs text-slate-600 truncate">
                You clicked: <span className="font-medium">{clickedName || "—"}</span>
                {" · "}Correct: <span className="font-medium">{targetName}</span>
              </p>
            )}
            {correct && feedbackLevel !== "minimal" && (
              <p className="text-xs text-slate-500">{targetName}</p>
            )}
          </div>
        </div>

        {/* Score breakdown (detailed / standard) */}
        {correct && breakdown && feedbackLevel !== "minimal" && (
          <div className="flex items-center gap-3 shrink-0 text-center">
            {feedbackLevel === "detailed" && (
              <>
                <ScorePill label="Base" value={breakdown.base} />
                {breakdown.speedBonus > 0 && (
                  <ScorePill label="Speed" value={`+${breakdown.speedBonus}`} accent="blue" />
                )}
                {breakdown.streakBonus > 0 && (
                  <ScorePill label="Streak" value={`+${breakdown.streakBonus}`} accent="violet" />
                )}
                {breakdown.multiplier > 1 && (
                  <ScorePill label="×" value={`${breakdown.multiplier}`} accent="amber" />
                )}
              </>
            )}
            <ScorePill label="Points" value={`+${pointsEarned}`} accent="emerald" large />
          </div>
        )}

        {/* Time */}
        {feedbackLevel !== "minimal" && (
          <div className="text-center shrink-0">
            <div className="text-xs text-slate-400">Time</div>
            <div className="text-sm font-semibold text-slate-700 tabular-nums">
              {formatTime(responseTimeMs)}
            </div>
          </div>
        )}

        {/* Next button */}
        <button
          onClick={onNext}
          className={`shrink-0 px-5 py-2 rounded-lg text-sm font-semibold transition-colors
            ${
              correct
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : "bg-slate-700 hover:bg-slate-800 text-white"
            }`}
        >
          {isLastRound ? "Results" : "Next →"}
        </button>
      </div>
    </div>
  );
}

function ScorePill({
  label,
  value,
  accent = "slate",
  large,
}: {
  label: string;
  value: string | number;
  accent?: "slate" | "blue" | "violet" | "amber" | "emerald";
  large?: boolean;
}) {
  const colors: Record<string, string> = {
    slate: "bg-slate-100 text-slate-700",
    blue: "bg-blue-50 text-blue-700",
    violet: "bg-violet-50 text-violet-700",
    amber: "bg-amber-50 text-amber-700",
    emerald: "bg-emerald-100 text-emerald-800",
  };
  return (
    <div className={`px-2 py-1 rounded-lg text-center ${colors[accent]} ${large ? "px-3" : ""}`}>
      <div className="text-xs opacity-70">{label}</div>
      <div className={`font-bold tabular-nums ${large ? "text-base" : "text-sm"}`}>{value}</div>
    </div>
  );
}
