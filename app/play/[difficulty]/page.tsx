"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { difficultyConfigs, type QuizDifficulty } from "@/config/difficulty";
import { loadGeoJSON, loadAttributeBundle } from "@/lib/data/loader";
import type { MunicipalityIdentity } from "@/lib/data/loader";
import QuizGame from "@/components/quiz/QuizGame";

interface PageProps {
  params: Promise<{ difficulty: string }>;
}

export default function QuizPage({ params }: PageProps) {
  const { difficulty } = use(params);
  const config = difficultyConfigs[difficulty as QuizDifficulty];
  if (!config) notFound();

  const [geojson, setGeojson] = useState<GeoJSON.FeatureCollection | null>(null);
  const [identity, setIdentity] = useState<Record<string, MunicipalityIdentity>>({});
  const [dataError, setDataError] = useState(false);

  useEffect(() => {
    Promise.all([loadGeoJSON(), loadAttributeBundle()]).then(([geo, bundle]) => {
      if (!geo) {
        setDataError(true);
        return;
      }
      setGeojson(geo);
      setIdentity(bundle.identity);
    });
  }, []);

  if (dataError) {
    return (
      <main className="flex flex-col items-center justify-center h-screen bg-slate-50 gap-4 px-8 text-center">
        <div className="text-4xl">📂</div>
        <h2 className="text-lg font-semibold text-slate-700">Boundary data not found</h2>
        <p className="text-sm text-slate-500 max-w-sm">
          Run the data pipeline to generate the official municipality boundaries.
        </p>
        <code className="text-xs bg-slate-100 px-3 py-2 rounded-lg text-slate-600 font-mono">
          python data/pipeline/download_wfs.py && python data/pipeline/build_municipalities.py
        </code>
        <Link href="/play" className="mt-2 text-sm text-blue-600 hover:underline">
          ← Back to difficulty select
        </Link>
      </main>
    );
  }

  if (!geojson || Object.keys(identity).length === 0) {
    return (
      <main className="flex flex-col items-center justify-center h-screen bg-slate-50 gap-3">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-500">Loading map data…</p>
      </main>
    );
  }

  return (
    <main className="flex flex-col h-screen bg-slate-50 overflow-hidden">
      {/* Nav bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-slate-200 shrink-0">
        <Link href="/play" className="text-sm text-slate-400 hover:text-slate-600 transition-colors">
          ← Modes
        </Link>
        <span className="text-sm font-semibold text-slate-700">{config.publicLabel}</span>
        <div className="w-14" />
      </div>

      {/* Quiz fills remaining height */}
      <div className="flex-1 flex flex-col min-h-0">
        <QuizGame geojson={geojson} identity={identity} config={config} />
      </div>
    </main>
  );
}
