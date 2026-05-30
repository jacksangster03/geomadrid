import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-6 py-16 bg-slate-50">
      {/* Header */}
      <div className="text-center mb-16">
        <h1 className="text-5xl font-bold tracking-tight text-slate-900 mb-3">
          GeoMadrid
        </h1>
        <p className="text-lg text-slate-500 max-w-md">
          179 official municipalities. One map. How well do you know the
          Community of Madrid?
        </p>
      </div>

      {/* Mode cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl">
        <Link
          href="/play"
          className="group flex flex-col gap-3 p-8 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all"
        >
          <div className="text-3xl">🗺️</div>
          <h2 className="text-xl font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">
            Play
          </h2>
          <p className="text-slate-500 text-sm leading-relaxed">
            Find the correct municipality on the map. Three difficulty modes:
            full labels, outlines only, or blank map.
          </p>
          <div className="flex gap-2 mt-auto pt-2">
            {["Learn", "Challenge", "Master"].map((label) => (
              <span
                key={label}
                className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600 font-medium"
              >
                {label}
              </span>
            ))}
          </div>
        </Link>

        <Link
          href="/explore"
          className="group flex flex-col gap-3 p-8 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all"
        >
          <div className="text-3xl">🔍</div>
          <h2 className="text-xl font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors">
            Explore
          </h2>
          <p className="text-slate-500 text-sm leading-relaxed">
            Interactive research atlas. Click any municipality for its profile,
            filter by layers, and compare corridors.
          </p>
          <div className="flex gap-2 mt-auto pt-2">
            {["Area", "Corridor", "Difficulty"].map((label) => (
              <span
                key={label}
                className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600 font-medium"
              >
                {label}
              </span>
            ))}
          </div>
        </Link>
      </div>

      {/* Dataset note */}
      <p className="mt-12 text-xs text-slate-400 text-center max-w-sm">
        Boundaries from{" "}
        <span className="font-medium text-slate-500">CNIG/IGN</span> — official
        Spanish national cartography. 179 municipalities, Community of Madrid.
      </p>
    </main>
  );
}
