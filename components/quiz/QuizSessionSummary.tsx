import Link from "next/link";
import type { QuizDifficulty } from "@/config/difficulty";
import type { SessionSummary } from "@/lib/quiz/quizAnalytics";

interface QuizSessionSummaryProps {
  summary: SessionSummary;
  difficulty: QuizDifficulty;
  publicLabel: string;
  onPlayAgain: () => void;
}

function formatMs(ms: number): string {
  if (ms === 0) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export default function QuizSessionSummary({
  summary,
  difficulty,
  publicLabel,
  onPlayAgain,
}: QuizSessionSummaryProps) {
  const medal =
    summary.accuracy >= 90
      ? "🥇"
      : summary.accuracy >= 70
      ? "🥈"
      : summary.accuracy >= 50
      ? "🥉"
      : "📍";

  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-slate-50 px-6 py-12 overflow-y-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="text-5xl mb-3">{medal}</div>
        <h1 className="text-3xl font-bold text-slate-900 mb-1">Session complete</h1>
        <p className="text-slate-500 text-sm">{publicLabel} mode</p>
      </div>

      {/* Big score */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 px-10 py-6 mb-6 text-center w-full max-w-sm">
        <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Final score</div>
        <div className="text-5xl font-bold text-blue-700 tabular-nums">
          {summary.totalScore.toLocaleString()}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 w-full max-w-sm mb-6">
        <StatCard label="Accuracy" value={`${summary.accuracy}%`} />
        <StatCard
          label="Correct"
          value={`${summary.correctCount} / ${summary.totalCount}`}
        />
        <StatCard label="Best streak" value={`${summary.bestStreak}`} />
        <StatCard label="Avg time" value={formatMs(summary.averageResponseTimeMs)} />
        {summary.fastestCorrectMs !== null && (
          <StatCard label="Fastest" value={formatMs(summary.fastestCorrectMs)} />
        )}
      </div>

      {/* Most missed */}
      {summary.mostMissed.length > 0 && (
        <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-6">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Missed this session
          </p>
          <ul className="space-y-1">
            {summary.mostMissed.map((m) => (
              <li key={m.id} className="flex items-center gap-2 text-sm text-slate-700">
                <span className="text-slate-400">•</span>
                <span>{m.name}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-3 w-full max-w-sm">
        <button
          onClick={onPlayAgain}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors"
        >
          Play again
        </button>
        <Link
          href="/play"
          className="w-full text-center bg-white hover:bg-slate-50 text-slate-700 font-medium py-3 rounded-xl border border-slate-200 transition-colors"
        >
          Change difficulty
        </Link>
        <Link
          href="/"
          className="w-full text-center text-sm text-slate-400 hover:text-slate-600 py-2 transition-colors"
        >
          ← Home
        </Link>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 text-center">
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      <div className="text-xl font-bold text-slate-800 tabular-nums">{value}</div>
    </div>
  );
}
