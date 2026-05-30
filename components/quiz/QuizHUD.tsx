interface QuizHUDProps {
  roundNumber: number;
  totalRounds: number;
  score: number;
  streak: number;
  elapsedMs: number;
  publicLabel: string;
  scoreMultiplier: number;
}

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${s}s`;
}

export default function QuizHUD({
  roundNumber,
  totalRounds,
  score,
  streak,
  elapsedMs,
  publicLabel,
  scoreMultiplier,
}: QuizHUDProps) {
  const progress = totalRounds > 0 ? (roundNumber - 1) / totalRounds : 0;

  return (
    <div className="bg-white border-b border-slate-200 shrink-0">
      {/* Progress bar */}
      <div className="h-1 bg-slate-100">
        <div
          className="h-1 bg-blue-500 transition-all duration-300"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <div className="flex items-center justify-between px-5 py-2">
        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-400 font-medium">{publicLabel}</span>
          <span className="text-xs text-slate-400">{scoreMultiplier}×</span>
        </div>
        <div className="flex items-center gap-5">
          <Stat label="Round" value={`${roundNumber}/${totalRounds}`} />
          <Stat label="Score" value={score.toLocaleString()} highlight />
          <Stat label="Streak" value={`${streak}`} />
          <Stat label="Time" value={formatTime(elapsedMs)} />
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="text-center min-w-[40px]">
      <div className="text-xs text-slate-400">{label}</div>
      <div
        className={`text-sm font-semibold tabular-nums ${
          highlight ? "text-blue-700" : "text-slate-800"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
