import Link from "next/link";
import { difficultyConfigs } from "@/config/difficulty";

const ICONS: Record<string, string> = {
  easy: "📖",
  medium: "🧭",
  hard: "⚔️",
};

const ACCENT: Record<string, string> = {
  easy: "hover:border-emerald-300 hover:shadow-emerald-100",
  medium: "hover:border-blue-300 hover:shadow-blue-100",
  hard: "hover:border-red-300 hover:shadow-red-100",
};

const BADGE: Record<string, string> = {
  easy: "bg-emerald-50 text-emerald-700",
  medium: "bg-blue-50 text-blue-700",
  hard: "bg-red-50 text-red-700",
};

export default function PlayPage() {
  const configs = Object.values(difficultyConfigs);

  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-6 py-16 bg-slate-50">
      <div className="text-center mb-12">
        <Link
          href="/"
          className="text-sm text-slate-400 hover:text-slate-600 transition-colors mb-4 inline-block"
        >
          ← GeoMadrid
        </Link>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 mb-2">
          Choose difficulty
        </h1>
        <p className="text-slate-500">
          179 municipalities. Same boundaries, different visual help.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-3xl">
        {configs.map((config) => (
          <Link
            key={config.id}
            href={`/play/${config.id}`}
            className={`group flex flex-col gap-4 p-8 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all ${ACCENT[config.id]}`}
          >
            <div className="text-3xl">{ICONS[config.id]}</div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-semibold text-slate-900">
                  {config.publicLabel}
                </h2>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${BADGE[config.id]}`}
                >
                  {config.scoreMultiplier}×
                </span>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed">
                {config.description}
              </p>
            </div>

            <ul className="mt-auto text-xs text-slate-400 space-y-1">
              <li>{config.showMunicipalityLabels ? "✓" : "✗"} Municipality labels</li>
              <li>{config.allowHints ? "✓" : "✗"} Hints available</li>
              <li>{config.showTerrain ? "✓" : "✗"} Terrain context</li>
              <li>{config.totalRounds} rounds per session</li>
            </ul>
          </Link>
        ))}
      </div>

      <p className="mt-10 text-xs text-slate-400 text-center">
        Score multiplier increases with difficulty. Streak bonuses apply in all
        modes.
      </p>
    </main>
  );
}
